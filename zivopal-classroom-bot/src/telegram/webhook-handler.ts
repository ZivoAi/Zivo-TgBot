import { Context, Bot } from 'grammy';
import { logger } from '../../logger';
import { config } from '../../config';

export class TelegramWebhookHandler {
  private bot: Bot;

  constructor(botToken: string) {
    this.bot = new Bot(botToken);
    this.setupHandlers();
  }

  /**
   * Setup message handlers
   */
  private setupHandlers(): void {
    this.bot.on('message', async (ctx: Context) => {
      try {
        logger.debug(
          {
            chatId: ctx.chat?.id,
            userId: ctx.from?.id,
            messageId: ctx.message?.message_id,
          },
          'Received message'
        );

        // Handlers will be added via middleware
        await ctx.next?.();
      } catch (error) {
        logger.error({ error }, 'Error handling message');
        await ctx.reply('Sorry, an error occurred processing your message.');
      }
    });

    this.bot.on('document', async (ctx: Context) => {
      try {
        logger.debug(
          {
            chatId: ctx.chat?.id,
            userId: ctx.from?.id,
            documentId: ctx.message?.document?.file_id,
          },
          'Received document'
        );

        await ctx.next?.();
      } catch (error) {
        logger.error({ error }, 'Error handling document');
        await ctx.reply('Sorry, an error occurred processing your document.');
      }
    });

    this.bot.command('start', async (ctx: Context) => {
      await ctx.reply('Welcome to ZivoPal Classroom Bot!');
    });

    this.bot.command('help', async (ctx: Context) => {
      const helpText = `
ZivoPal Classroom Bot - Available Commands:
/help - Show this help message
/status - Check your current status
/leaderboard - View class engagement leaderboard
/assignments - List pending assignments
      `;
      await ctx.reply(helpText);
    });
  }

  /**
   * Get the bot instance (for middleware setup)
   */
  public getBot(): Bot {
    return this.bot;
  }

  /**
   * Handle incoming webhook updates
   */
  public async handleUpdate(update: unknown): Promise<void> {
    try {
      await this.bot.handleUpdate(update);
    } catch (error) {
      logger.error({ error, update }, 'Error handling Telegram update');
      throw error;
    }
  }
}
