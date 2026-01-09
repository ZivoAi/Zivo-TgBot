import pino, { Logger } from 'pino';
import { config } from './config';

const pinoConfig: pino.LoggerOptions = {
  level: config.logging.level,
  transport:
    config.server.nodeEnv === 'development'
      ? {
          target: 'pino-pretty',
          options: {
            colorize: true,
            singleLine: false,
            translateTime: 'SYS:standard',
          },
        }
      : undefined,
  serializers: {
    req: pino.stdSerializers.req,
    res: pino.stdSerializers.res,
    err: pino.stdSerializers.err,
  },
};

export const logger: Logger = pino(pinoConfig);

/**
 * Redact sensitive data from log objects
 */
export function redactSensitive(obj: Record<string, unknown>): Record<string, unknown> {
  const sensitiveKeys = ['password', 'token', 'secret', 'apiKey', 'clientSecret'];
  const redacted = { ...obj };

  for (const key of sensitiveKeys) {
    if (key in redacted) {
      redacted[key] = '[REDACTED]';
    }
  }

  return redacted;
}

/**
 * Structure audit log for delivery to zivopal-core
 */
export interface AuditLog {
  timestamp: string;
  eventType: string;
  classId: string;
  userId: string;
  action: string;
  severity: 'info' | 'warn' | 'error' | 'critical';
  metadata: Record<string, unknown>;
  rationale?: string;
}

export function createAuditLog(
  eventType: string,
  classId: string,
  userId: string,
  action: string,
  severity: 'info' | 'warn' | 'error' | 'critical',
  metadata: Record<string, unknown>,
  rationale?: string
): AuditLog {
  return {
    timestamp: new Date().toISOString(),
    eventType,
    classId,
    userId,
    action,
    severity,
    metadata: redactSensitive(metadata),
    rationale,
  };
}
