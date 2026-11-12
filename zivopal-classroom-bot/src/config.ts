import dotenv from 'dotenv';

dotenv.config();

export interface Config {
  telegram: {
    botToken: string;
    webhookSecret: string;
    webhookUrl: string;
  };
  zivopal: {
    apiUrl: string;
    clientId: string;
    clientSecret: string;
    serviceName: string;
  };
  server: {
    port: number;
    nodeEnv: 'development' | 'production' | 'test';
  };
  logging: {
    level: 'debug' | 'info' | 'warn' | 'error';
  };
  redis: {
    enabled: boolean;
    url: string;
  };
  llm: {
    provider: 'core' | 'openai' | 'mock';
    model: string;
    apiKey?: string;
  };
  rateLimit: {
    enabled: boolean;
    max: number;
    windowMs: number;
  };
  moderation: {
    enabled: boolean;
    confidenceThreshold: number;
  };
  i18n: {
    defaultLanguage: string;
    supportedLanguages: string[];
  };
  sentry?: {
    enabled: boolean;
    dsn: string;
  };
}

export const config: Config = {
  telegram: {
    botToken: process.env.TELEGRAM_BOT_TOKEN || '',
    webhookSecret: process.env.TELEGRAM_WEBHOOK_SECRET || '',
    webhookUrl: process.env.TELEGRAM_WEBHOOK_URL || '',
  },
  zivopal: {
    apiUrl: process.env.ZIVOPAL_API_URL || 'https://api.zivopal.com',
    clientId: process.env.ZIVOPAL_CLIENT_ID || '',
    clientSecret: process.env.ZIVOPAL_CLIENT_SECRET || '',
    serviceName: process.env.ZIVOPAL_SERVICE_NAME || 'zivopal-classroom-bot',
  },
  server: {
    port: parseInt(process.env.PORT || '3000', 10),
    nodeEnv: (process.env.NODE_ENV as 'development' | 'production' | 'test') || 'development',
  },
  logging: {
    level: (process.env.LOG_LEVEL as 'debug' | 'info' | 'warn' | 'error') || 'info',
  },
  redis: {
    enabled: process.env.REDIS_ENABLED === 'true',
    url: process.env.REDIS_URL || 'redis://localhost:6379',
  },
  llm: {
    provider: (process.env.LLM_PROVIDER as 'core' | 'openai' | 'mock') || (process.env.NODE_ENV === 'production' ? 'core' : 'mock'),
    model: process.env.LLM_MODEL || 'gpt-3.5-turbo',
    apiKey: process.env.OPENAI_API_KEY,
  },
  rateLimit: {
    enabled: process.env.RATE_LIMIT_ENABLED !== 'false',
    max: parseInt(process.env.RATE_LIMIT_MAX || '100', 10),
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000', 10),
  },
  moderation: {
    enabled: process.env.MODERATION_ENABLED !== 'false',
    confidenceThreshold: parseFloat(process.env.MODERATION_CONFIDENCE_THRESHOLD || '0.7'),
  },
  i18n: {
    defaultLanguage: process.env.DEFAULT_LANGUAGE || 'en',
    supportedLanguages: (process.env.SUPPORTED_LANGUAGES || 'en,sn').split(','),
  },
  sentry: process.env.SENTRY_ENABLED === 'true'
    ? {
        enabled: true,
        dsn: process.env.SENTRY_DSN || '',
      }
    : undefined,
};

export function validateConfig(): void {
  const requiredEnvVars = [
    'TELEGRAM_BOT_TOKEN',
    'TELEGRAM_WEBHOOK_SECRET',
    'ZIVOPAL_API_URL',
    'ZIVOPAL_AI_SERVICE_KEY',
  ];

  for (const envVar of requiredEnvVars) {
    if (!process.env[envVar]) {
      throw new Error(`Missing required environment variable: ${envVar}`);
    }
  }
  if (!/^[A-Za-z0-9_-]{32,256}$/.test(process.env.TELEGRAM_WEBHOOK_SECRET ?? '')) {
    throw new Error('TELEGRAM_WEBHOOK_SECRET must contain 32–256 URL-safe characters.');
  }
}
