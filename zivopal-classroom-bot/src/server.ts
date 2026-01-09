import Fastify, { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import fastifyHelmet from '@fastify/helmet';
import fastifyRateLimit from '@fastify/rate-limit';
import fastifyCors from '@fastify/cors';
import crypto from 'crypto';
import { config } from './config';
import { logger } from './logger';
import { TelegramWebhookHandler } from './telegram/webhook-handler';
import { ZivoPalClient } from './clients/zivopal-client';
import { createClassifier, ModerationResult } from './modules/moderation/llm-classifier';
import { ModerationPolicyEngine } from './modules/moderation/policy-engine';
import { EngagementScoreEngine } from './modules/engagement/score-engine';
import { CurriculumService } from './modules/curriculum/service';
import { I18nService } from './modules/i18n/service';

export class Server {
  private fastify: FastifyInstance;
  private telegramHandler: TelegramWebhookHandler;
  private zivoPalClient: ZivoPalClient;
  private moderationEngine: ModerationPolicyEngine;
  private engagementEngine: EngagementScoreEngine;
  private classificationEngine: ReturnType<typeof createClassifier>;
  private curriculumService: CurriculumService;
  private i18nService: I18nService;

  constructor() {
    this.fastify = Fastify({
      logger: logger,
      trustProxy: true,
    });

    this.telegramHandler = new TelegramWebhookHandler(config.telegram.botToken);
    this.zivoPalClient = new ZivoPalClient();
    this.moderationEngine = new ModerationPolicyEngine();
    this.engagementEngine = new EngagementScoreEngine();
    this.classificationEngine = createClassifier(config.llm.provider, {
      apiKey: config.llm.apiKey,
      model: config.llm.model,
    });
    this.curriculumService = new CurriculumService();
    this.i18nService = new I18nService();

    this.setupMiddleware();
    this.setupRoutes();
  }

  /**
   * Setup security and utility middleware
   */
  private setupMiddleware(): void {
    // Security middleware
    this.fastify.register(fastifyHelmet, {
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
        },
      },
    });

    // CORS
    this.fastify.register(fastifyCors, {
      origin: true,
    });

    // Rate limiting
    if (config.rateLimit.enabled) {
      this.fastify.register(fastifyRateLimit, {
        max: config.rateLimit.max,
        timeWindow: `${config.rateLimit.windowMs}ms`,
      });
    }

    // Global error handler
    this.fastify.setErrorHandler((error, request, reply) => {
      logger.error({ error, path: request.url }, 'Unhandled error');
      reply.status(500).send({
        error: 'Internal Server Error',
        requestId: request.id,
      });
    });
  }

  /**
   * Setup all routes
   */
  private setupRoutes(): void {
    // Health check
    this.fastify.get('/health', async (_request, reply) => {
      reply.send({ status: 'ok', timestamp: new Date().toISOString() });
    });

    // Readiness check
    this.fastify.get('/readiness', async (_request, reply) => {
      reply.send({
        ready: true,
        services: {
          telegram: true,
          zivopal: true,
        },
      });
    });

    // Telegram webhook
    this.fastify.post('/webhook', async (request: FastifyRequest, reply: FastifyReply) => {
      const signature = request.headers['x-telegram-bot-api-secret-sha256'];

      // Validate webhook authenticity
      if (!this.validateWebhookSignature(request.body as Record<string, unknown>, signature as string)) {
        logger.warn('Invalid webhook signature');
        reply.status(401).send({ error: 'Unauthorized' });
        return;
      }

      try {
        await this.telegramHandler.handleUpdate(request.body);
        reply.status(200).send({ ok: true });
      } catch (error) {
        logger.error({ error }, 'Webhook processing failed');
        reply.status(500).send({ error: 'Processing failed' });
      }
    });

    // Teacher API routes
    this.setupTeacherRoutes();
  }

  /**
   * Setup teacher dashboard and management routes
   */
  private setupTeacherRoutes(): void {
    // Get class engagement report
    this.fastify.get<{ Params: { classId: string } }>(
      '/api/v1/teachers/classes/:classId/report',
      async (request, reply) => {
        const { classId } = request.params;

        const leaderboard = this.engagementEngine.getLeaderboard(classId);
        const struggling = this.engagementEngine.detectStrugglingStudents(classId);

        reply.send({
          classId,
          timestamp: new Date().toISOString(),
          leaderboard: leaderboard.slice(0, 10),
          strugglingStudents: struggling,
          generatedAt: new Date().toISOString(),
        });
      }
    );

    // Get student metrics
    this.fastify.get<{ Params: { classId: string; studentId: string } }>(
      '/api/v1/teachers/classes/:classId/students/:studentId/metrics',
      async (request, reply) => {
        const { classId, studentId } = request.params;

        const metrics = this.engagementEngine.calculateMetrics(classId, studentId);
        reply.send(metrics);
      }
    );

    // Mute/unmute student
    this.fastify.post<{ Params: { classId: string; studentId: string }; Body: { duration: number; reason: string } }>(
      '/api/v1/teachers/classes/:classId/students/:studentId/mute',
      async (request, reply) => {
        const { classId, studentId } = request.params;
        const { duration, reason } = request.body;

        try {
          const mutedUntil = new Date(Date.now() + duration).toISOString();
          await this.zivoPalClient.setMuteStatus(classId, studentId, mutedUntil, reason);
          reply.send({ success: true, mutedUntil });
        } catch (error) {
          logger.error({ error }, 'Failed to mute student');
          reply.status(500).send({ error: 'Failed to mute student' });
        }
      }
    );

    // Get curriculum topics
    this.fastify.get<{ Params: { framework: string }; Querystring: { keyword?: string } }>(
      '/api/v1/curriculum/:framework/search',
      async (request, reply) => {
        const { framework } = request.params;
        const { keyword = '' } = request.query;

        if (keyword) {
          const topics = this.curriculumService.findRelatedTopics(framework as any, keyword);
          reply.send({ topics });
        } else {
          const metadata = this.curriculumService.getFrameworkMetadata(framework as any);
          reply.send(metadata || { error: 'Framework not found' });
        }
      }
    );

    // OpenAPI/Swagger documentation
    this.fastify.get('/api/docs', async (_request, reply) => {
      reply.send({
        openapi: '3.0.0',
        info: {
          title: 'ZivoPal Classroom Bot API',
          version: '1.0.0',
          description: 'Teacher dashboard and management endpoints',
        },
        servers: [
          {
            url: config.zivopal.apiUrl,
            description: 'Production API',
          },
        ],
        paths: {
          '/api/v1/teachers/classes/{classId}/report': {
            get: {
              summary: 'Get class engagement report',
              parameters: [
                {
                  name: 'classId',
                  in: 'path',
                  required: true,
                  schema: { type: 'string' },
                },
              ],
              responses: {
                '200': {
                  description: 'Success',
                },
              },
            },
          },
        },
      });
    });
  }

  /**
   * Validate incoming webhook signature
   */
  private validateWebhookSignature(body: Record<string, unknown>, signature: string): boolean {
    const secretHash = crypto
      .createHmac('sha256', config.telegram.webhookSecret)
      .update(JSON.stringify(body))
      .digest('hex');

    return secretHash === signature;
  }

  /**
   * Start the server
   */
  public async start(): Promise<void> {
    try {
      config.validateConfig?.();
      await this.fastify.listen({ port: config.server.port, host: '0.0.0.0' });
      logger.info(`Server listening on port ${config.server.port}`);
    } catch (error) {
      logger.error({ error }, 'Failed to start server');
      throw error;
    }
  }

  /**
   * Stop the server gracefully
   */
  public async stop(): Promise<void> {
    try {
      await this.fastify.close();
      logger.info('Server stopped gracefully');
    } catch (error) {
      logger.error({ error }, 'Error stopping server');
      throw error;
    }
  }

  /**
   * Get instances for injection
   */
  public getInstances() {
    return {
      zivoPalClient: this.zivoPalClient,
      moderationEngine: this.moderationEngine,
      engagementEngine: this.engagementEngine,
      classificationEngine: this.classificationEngine,
      curriculumService: this.curriculumService,
      i18nService: this.i18nService,
      telegramHandler: this.telegramHandler,
    };
  }
}
