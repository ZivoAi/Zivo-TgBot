import { Context, Bot } from 'grammy';
import { logger } from '../logger';
import { CoreTutorClient, CoreTutorError, PrivateIdentity } from '../clients/core-tutor';

export class TelegramWebhookHandler {
  private bot: Bot;
  private core = new CoreTutorClient();

  constructor(botToken: string) {
    this.bot = new Bot(botToken, { client: { timeoutSeconds: 10 } });
    this.setupHandlers();
  }

  /**
   * Setup message handlers
   */
  private setupHandlers(): void {
    this.bot.command(['start', 'help'], async ctx => {
      if (ctx.chat.type !== 'private') return;
      await ctx.reply('Zivo AI private tutoring: open your ZivoPal profile → Connections to generate a linking code. Send /link CODE here, then return to ZivoPal to confirm the matching Telegram ID. Use /identity to check that ID. After confirmation, send a written question. Voice, files and assignments are not connected here yet. Disconnect in ZivoPal at any time.');
    });
    this.bot.command('identity', async ctx => {
      if (ctx.chat.type !== 'private') return;
      await ctx.reply(`Your Telegram ID is ${ctx.from?.id}. Confirm only this ID in your own ZivoPal account.`);
    });
    this.bot.command('link', async ctx => {
      const identity = this.identity(ctx);
      if (!identity) return;
      const code = String(ctx.match ?? '').trim();
      if (!/^[A-Za-z0-9_-]{43}$/.test(code)) {
        await ctx.reply('Use /link followed by the current code from your own ZivoPal profile. Never send your password or login token.');
        return;
      }
      try {
        await this.core.link(identity, code);
      } catch (error) {
        await ctx.reply(error instanceof CoreTutorError ? error.message : 'Linking is unavailable.');
        return;
      }
      await ctx.reply(`Return to ZivoPal and confirm Telegram ID ${identity.telegramUserId}. This code alone has not activated access.`);
    });
    this.bot.on('message:text', async ctx => {
      const identity = this.identity(ctx);
      if (!identity || ctx.message.text.startsWith('/')) return;
      let reply: string;
      try {
        reply = await this.core.chat(identity, String(ctx.update.update_id), ctx.message.text);
      } catch (error) {
        await ctx.reply(error instanceof CoreTutorError ? error.message : 'Zivo AI is unavailable.');
        return;
      }
      await ctx.reply(reply); // Plain text, never untrusted HTML/Markdown.
    });
    this.bot.on('message', async ctx => {
      if (!this.identity(ctx)) return;
      await ctx.reply('This connection currently supports written questions only. Voice, file submissions and private assessment results are not connected yet.');
    });
  }

  private identity(ctx: Context): PrivateIdentity | null {
    if (ctx.chat?.type !== 'private' || !ctx.from || ctx.from.is_bot ||
        ctx.chat.id !== ctx.from.id || !Number.isSafeInteger(ctx.from.id) || !Number.isSafeInteger(ctx.me.id)) return null;
    return { botId: String(ctx.me.id), telegramUserId: String(ctx.from.id), chatId: String(ctx.chat.id), chatType: 'private', messageDate: ctx.message?.date ?? 0 };
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
      await this.bot.init();
      await this.bot.handleUpdate(update as Parameters<Bot['handleUpdate']>[0]);
    } catch (error) {
      logger.error('Telegram update processing failed');
      throw new Error('Telegram update processing failed');
    }
  }
}
