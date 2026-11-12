process.env.LOG_LEVEL = 'silent';
import { TelegramWebhookHandler } from '../telegram/webhook-handler';
import { CoreTutorClient, CoreTutorError } from '../clients/core-tutor';
const fixtureBot = { id: 777, is_bot: true, first_name: 'Fixture', username: 'Fixture_bot' };
const messageDate = Math.floor(Date.now() / 1000);
let handler: TelegramWebhookHandler, replies: Record<string, any>[];
let link: jest.SpyInstance, chat: jest.SpyInstance;
beforeEach(() => {
  replies = [];
  link = jest.spyOn(CoreTutorClient.prototype, 'link').mockResolvedValue(undefined);
  chat = jest.spyOn(CoreTutorClient.prototype, 'chat').mockResolvedValue('Synthetic reply');
  handler = new TelegramWebhookHandler('777:synthetic-token');
  handler.getBot().api.config.use(async (_previous, method, payload) => {
    if (method === 'getMe') return { ok: true, result: fixtureBot } as any;
    if (method === 'sendMessage') {
      replies.push(payload as any);
      return { ok: true, result: { message_id: replies.length, date: 0, chat: { id: 12345, type: 'private' } } } as any;
    }
    throw new Error('External Telegram request refused');
  });
});
afterEach(() => jest.restoreAllMocks());
function update(text: string, options: { type?: string; fromId?: number; chatId?: number; isBot?: boolean; document?: boolean } = {}) {
  const type = options.type ?? 'private', fromId = options.fromId ?? 12345;
  return { update_id: 1, message: { message_id: 1, date: messageDate,
    from: { id: fromId, is_bot: options.isBot ?? false, first_name: 'Fixture' },
    chat: { id: options.chatId ?? (type === 'private' ? fromId : -1001), type },
    ...(options.document ? { document: { file_id: 'fixture-file', file_unique_id: 'fixture-file' } } : {
      text, ...(text.startsWith('/') ? { entities: [{ type: 'bot_command', offset: 0, length: text.split(' ')[0].length }] } : {}),
    }) } };
}
test('resolves private identity from actual bot and sender info', async () => {
  await handler.handleUpdate(update('Synthetic'));
  expect(chat).toHaveBeenCalledWith({ botId: '777', telegramUserId: '12345', chatId: '12345', chatType: 'private', messageDate }, '1', 'Synthetic');
  expect(replies[0].text).toBe('Synthetic reply');
});
test.each(['group', 'supergroup', 'channel'])('does not expose private AI or linking in %s', async type => {
  for (const text of ['Synthetic question', '/link ' + 'a'.repeat(43), '/start', '/help', '/identity']) await handler.handleUpdate(update(text, { type }));
  expect(chat).not.toHaveBeenCalled(); expect(link).not.toHaveBeenCalled(); expect(replies).toEqual([]);
});
test.each([{ chatId: 54321 }, { isBot: true }, { fromId: Number.MAX_SAFE_INTEGER + 1 }])('rejects mismatched or nonhuman identities %j', async options => {
  await handler.handleUpdate(update('Synthetic', options));
  expect(chat).not.toHaveBeenCalled(); expect(replies).toEqual([]);
});
test('handles private start/help/identity without calling the provider', async () => {
  for (const command of ['/start', '/help', '/identity']) await handler.handleUpdate(update(command));
  expect(replies[0].text).toContain('confirmation');
  expect(replies[2].text).toContain('12345');
  expect(chat).not.toHaveBeenCalled();
});
test('requires a well-formed linking code and explains the second confirmation', async () => {
  await handler.handleUpdate(update('/link invalid'));
  expect(link).not.toHaveBeenCalled();
  await handler.handleUpdate(update('/link ' + 'a'.repeat(43)));
  expect(link).toHaveBeenCalledTimes(1);
  expect(replies[1].text).toContain('has not activated access');
});
test('reveals only safe linking errors', async () => {
  link.mockRejectedValueOnce(new CoreTutorError('Safe linking error')).mockRejectedValueOnce(new Error('sensitive'));
  await handler.handleUpdate(update('/link ' + 'a'.repeat(43)));
  await handler.handleUpdate(update('/link ' + 'a'.repeat(43)));
  expect(replies.map(r => r.text)).toEqual(['Safe linking error', 'Linking is unavailable.']);
});
test('reveals only safe tutoring errors and explicitly refuses attachments', async () => {
  chat.mockRejectedValueOnce(new CoreTutorError('Safe tutoring error')).mockRejectedValueOnce(new Error('sensitive'));
  await handler.handleUpdate(update('Synthetic'));
  await handler.handleUpdate(update('Synthetic again'));
  await handler.handleUpdate(update('', { document: true }));
  await handler.handleUpdate(update('/unknown'));
  expect(replies.map(r => r.text)).toEqual(['Safe tutoring error', 'Zivo AI is unavailable.',
    'This connection currently supports written questions only. Voice, file submissions and private assessment results are not connected yet.']);
  expect(chat).toHaveBeenCalledTimes(2);
});
test('does not echo raw Telegram delivery errors', async () => {
  handler.getBot().api.config.use(async () => { throw new Error('sensitive-token-and-payload'); });
  await expect(handler.handleUpdate(update('Synthetic'))).rejects.toThrow('Telegram update processing failed');
  expect(replies).toHaveLength(0);
});
