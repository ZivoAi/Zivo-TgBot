interface WebhookApi {
  getWebhookInfo(): Promise<{ url?: string }>;
  setWebhook(url: string, options: {
    secret_token: string;
    drop_pending_updates: false;
    allowed_updates: ['message'];
  }): Promise<boolean>;
}

interface WebhookSetupOptions {
  enabled: boolean;
  url: string;
  secret: string;
}

/** Operator opt-in only. Never log SDK errors: they can contain bot credentials. */
export async function configureTelegramWebhook(
  api: WebhookApi,
  options: WebhookSetupOptions
): Promise<'disabled' | 'configured'> {
  if (!options.enabled) return 'disabled';

  try {
    const target = new URL(options.url);
    if (target.protocol !== 'https:' || target.username || target.password ||
        target.search || target.hash || target.pathname !== '/webhook' ||
        (target.port && target.port !== '443') ||
        !/^[A-Za-z0-9_-]{32,256}$/.test(options.secret)) {
      throw new Error();
    }
    const url = target.toString();
    const existing = await api.getWebhookInfo();
    // Never silently divert an already configured bot from another deployment.
    if (typeof existing.url !== 'string' || (existing.url && existing.url !== url)) {
      throw new Error();
    }
    const registered = await api.setWebhook(url, {
      secret_token: options.secret,
      drop_pending_updates: false,
      allowed_updates: ['message'],
    });
    if (registered !== true) throw new Error();
    return 'configured';
  } catch {
    // Intentionally omit the remote response, URL, request and error cause.
    throw new Error('Telegram webhook setup failed. Check private configuration and any existing webhook.');
  }
}
