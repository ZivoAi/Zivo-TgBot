import { configureTelegramWebhook } from '../telegram/webhook-setup';

describe('operator-only Telegram webhook setup', () => {
  const options = {
    enabled: true,
    url: 'https://synthetic-bot.example/webhook',
    secret: 'synthetic_'.repeat(5),
  };
  const api = () => ({
    getWebhookInfo: jest.fn().mockResolvedValue({ url: '' }),
    setWebhook: jest.fn().mockResolvedValue(true),
  });

  it('does not contact Telegram without explicit opt-in', async () => {
    const client = api();
    await expect(configureTelegramWebhook(client, { ...options, enabled: false }))
      .resolves.toBe('disabled');
    expect(client.getWebhookInfo).not.toHaveBeenCalled();
    expect(client.setWebhook).not.toHaveBeenCalled();
  });

  it('registers a new webhook with authentication and preserves pending updates', async () => {
    const client = api();
    await expect(configureTelegramWebhook(client, options)).resolves.toBe('configured');
    expect(client.setWebhook).toHaveBeenCalledWith(options.url, {
      secret_token: options.secret, drop_pending_updates: false, allowed_updates: ['message'],
    });
  });

  it('permits explicitly refreshing the same target', async () => {
    const client = api();
    client.getWebhookInfo.mockResolvedValue({ url: options.url });
    await expect(configureTelegramWebhook(client, options)).resolves.toBe('configured');
  });

  it('refuses to replace another deployment', async () => {
    const client = api();
    client.getWebhookInfo.mockResolvedValue({ url: 'https://other.example/webhook' });
    await expect(configureTelegramWebhook(client, options)).rejects.toThrow('webhook setup failed');
    expect(client.setWebhook).not.toHaveBeenCalled();
  });

  it('refuses an ambiguous webhook-info response', async () => {
    const client = api();
    client.getWebhookInfo.mockResolvedValue({});
    await expect(configureTelegramWebhook(client, options)).rejects.toThrow('webhook setup failed');
    expect(client.setWebhook).not.toHaveBeenCalled();
  });

  it.each([
    'not a URL', 'http://synthetic-bot.example/webhook',
    'https://user:private@synthetic-bot.example/webhook',
    'https://synthetic-bot.example/wrong',
    'https://synthetic-bot.example/webhook?token=private',
    'https://synthetic-bot.example/webhook#private',
    'https://synthetic-bot.example:8443/webhook',
  ])('rejects unsafe target configuration before contacting Telegram', async url => {
    const client = api();
    await expect(configureTelegramWebhook(client, { ...options, url })).rejects.toThrow();
    expect(client.getWebhookInfo).not.toHaveBeenCalled();
  });

  it('rejects an invalid webhook secret before contacting Telegram', async () => {
    const client = api();
    await expect(configureTelegramWebhook(client, { ...options, secret: 'short' })).rejects.toThrow();
    expect(client.getWebhookInfo).not.toHaveBeenCalled();
  });

  it.each(['read', 'write'])('never propagates credential-bearing SDK errors during %s', async phase => {
    const client = api();
    const failure = new Error('synthetic-private-request-must-not-escape');
    if (phase === 'read') client.getWebhookInfo.mockRejectedValue(failure);
    else client.setWebhook.mockRejectedValue(failure);
    await expect(configureTelegramWebhook(client, options)).rejects.not.toThrow(failure.message);
  });

  it('does not report success when Telegram returns false', async () => {
    const client = api();
    client.setWebhook.mockResolvedValue(false);
    await expect(configureTelegramWebhook(client, options)).rejects.toThrow('webhook setup failed');
  });
});
