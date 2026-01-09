import { Server } from './server';
import { logger } from './logger';

async function main(): Promise<void> {
  const server = new Server();

  // Graceful shutdown handlers
  process.on('SIGTERM', async () => {
    logger.info('SIGTERM received, shutting down gracefully...');
    try {
      await server.stop();
      process.exit(0);
    } catch (error) {
      logger.error({ error }, 'Error during graceful shutdown');
      process.exit(1);
    }
  });

  process.on('SIGINT', async () => {
    logger.info('SIGINT received, shutting down gracefully...');
    try {
      await server.stop();
      process.exit(0);
    } catch (error) {
      logger.error({ error }, 'Error during graceful shutdown');
      process.exit(1);
    }
  });

  try {
    await server.start();
  } catch (error) {
    logger.error({ error }, 'Failed to start application');
    process.exit(1);
  }
}

main();
