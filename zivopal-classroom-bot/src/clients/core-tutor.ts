export type PrivateIdentity = { botId: string; telegramUserId: string; chatId: string; chatType: 'private'; messageDate: number };
export class CoreTutorError extends Error {}
export class CoreTutorClient {
  constructor(
    private base = process.env.ZIVOPAL_API_URL ?? '',
    private key = process.env.ZIVOPAL_AI_SERVICE_KEY ?? '',
  ) {}

  private async request(path: string, body: object): Promise<Record<string, unknown>> {
    if (!this.key.trim()) throw new CoreTutorError('Zivo AI connection is not configured.');
    let url: URL;
    try {
      url = new URL(this.base);
      if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password ||
          (process.env.NODE_ENV === 'production' && url.protocol !== 'https:')) throw new Error();
      url.search = ''; url.hash = '';
      url = new URL(url.toString().replace(/\/+$/, '') + path);
    } catch { throw new CoreTutorError('Zivo AI connection is not configured.'); }
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 90_000);
    try {
      const response = await fetch(url, {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Service-Key': this.key },
        body: JSON.stringify(body), signal: controller.signal, redirect: 'error',
      });
      if (!response.ok) {
        // Never propagate an HTTP client error containing credentials, codes or answers.
        if (response.status === 400) throw new CoreTutorError(path.endsWith('/link')
          ? 'This code is invalid or expired. Generate a new code in your own ZivoPal profile.'
          : 'Send a written question of 1–4000 characters.');
        if (response.status === 402) throw new CoreTutorError('Your school subscription is required. Check access in ZivoPal.');
        if (response.status === 403) throw new CoreTutorError('Link and confirm your Telegram account in ZivoPal, or check your account access.');
        if (response.status === 409 || response.status === 429) throw new CoreTutorError('Please wait for the previous request, then send a new message if needed.');
        throw new CoreTutorError('Zivo AI could not confirm this request. Check ZivoPal and try again later.');
      }
      const value: unknown = await response.json();
      if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Invalid Core response');
      return value as Record<string, unknown>;
    } catch (error) {
      if (error instanceof CoreTutorError) throw error;
      throw new CoreTutorError('Zivo AI is unavailable. No answer was confirmed; try again later.');
    } finally { clearTimeout(timer); }
  }

  async link(identity: PrivateIdentity, code: string) {
    const result = await this.request('/api/ai/internal/telegram/link', { ...identity, code });
    if (result.confirmationRequired !== true) throw new CoreTutorError('Linking was not confirmed.');
  }
  async chat(identity: PrivateIdentity, updateId: string, message: string) {
    const result = await this.request('/api/ai/internal/telegram/chat', { ...identity, updateId, message });
    if (typeof result.reply !== 'string' || !result.reply.trim()) throw new CoreTutorError('No Zivo AI answer was confirmed.');
    const notice = result.curriculumCoverage === 'unverified'
      ? '\n\nCurriculum source documents have not been verified for this reply.' : '';
    const review = result.requiresTeacherReview === true
      ? '\nAssessment or marking suggestions require teacher review.' : '';
    return result.reply.slice(0, 4000 - notice.length - review.length) + notice + review;
  }
}
