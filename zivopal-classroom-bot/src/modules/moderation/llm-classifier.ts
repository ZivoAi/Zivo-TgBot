export type ModerationCategory =
  | 'spam'
  | 'insult_harassment'
  | 'bullying'
  | 'sexual_content'
  | 'hate'
  | 'off_topic'
  | 'harmless';

export type Severity = 'low' | 'medium' | 'high';

export interface ModerationResult {
  category: ModerationCategory;
  severity: Severity;
  confidence: number; // 0-1
  rationale: string;
  shouldAction: boolean;
}

export interface LLMClassifier {
  classify(text: string, context?: Record<string, unknown>): Promise<ModerationResult>;
}

/**
 * Mock classifier for testing and development
 */
export class MockLLMClassifier implements LLMClassifier {
  private keywords: Map<ModerationCategory, string[]> = new Map([
    ['spam', ['buy now', 'click here', 'limited offer', 'free money']],
    ['insult_harassment', ['stupid', 'dumb', 'idiot', 'you suck']],
    ['bullying', ['loser', 'pathetic', 'worthless', 'go away']],
    ['sexual_content', ['xxx', 'porn', 'sex']],
    ['hate', ['hate', 'inferior', 'banned', 'kill']],
    ['off_topic', ['the weather', 'movie', 'pizza', 'weekend']],
  ]);

  public async classify(text: string, _context?: Record<string, unknown>): Promise<ModerationResult> {
    const lowerText = text.toLowerCase();

    for (const [category, keywords] of this.keywords.entries()) {
      for (const keyword of keywords) {
        if (lowerText.includes(keyword)) {
          return {
            category,
            severity: this.getSeverity(category),
            confidence: 0.85,
            rationale: `Message contains keyword associated with ${category.replace(/_/g, ' ')}`,
            shouldAction: true,
          };
        }
      }
    }

    return {
      category: 'harmless',
      severity: 'low',
      confidence: 0.95,
      rationale: 'Message appears to be harmless classroom discussion',
      shouldAction: false,
    };
  }

  private getSeverity(category: ModerationCategory): Severity {
    if (['hate', 'sexual_content', 'bullying'].includes(category)) {
      return 'high';
    }
    if (['insult_harassment', 'spam'].includes(category)) {
      return 'medium';
    }
    return 'low';
  }
}

/**
 * Moderation through Core. The bot never receives a model-provider credential.
 */
export class CoreLLMClassifier implements LLMClassifier {
  private url: URL;
  private key: string;
  constructor() {
    const base = process.env.ZIVOPAL_API_URL;
    const key = process.env.ZIVOPAL_AI_SERVICE_KEY;
    if (!base || !key) throw new Error('Core moderation requires ZIVOPAL_API_URL and ZIVOPAL_AI_SERVICE_KEY');
    const url = new URL(base);
    if (url.username || url.password || (url.protocol !== 'https:' && !(url.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(url.hostname)))) {
      throw new Error('Core moderation requires a secure Core URL');
    }
    this.url = new URL('/api/ai/internal/moderate', url);
    this.key = key;
  }

  public async classify(text: string, _context?: Record<string, unknown>): Promise<ModerationResult> {
    try {
      const response = await fetch(this.url, {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Service-Key': this.key },
        body: JSON.stringify({ text }), signal: AbortSignal.timeout(25_000),
      });
      if (!response.ok) throw new Error('Core moderation unavailable');
      const value = await response.json() as ModerationResult;
      if (!['spam', 'insult_harassment', 'bullying', 'sexual_content', 'hate', 'off_topic', 'harmless'].includes(value.category) ||
          !['low', 'medium', 'high'].includes(value.severity) || typeof value.confidence !== 'number' ||
          !Number.isFinite(value.confidence) || value.confidence < 0 || value.confidence > 1 ||
          typeof value.shouldAction !== 'boolean') throw new Error('Invalid moderation');
      return { ...value, rationale: 'Core classification; manual review remains available.' };
    } catch {
      // Never turn an outage into a mocked "harmless" result or expose transport headers.
      throw new Error('Core moderation unavailable; no AI classification was confirmed');
    }
  }
}

/** @deprecated Compatibility name; uses Core, never the supplied provider key. */
export class OpenAILLMClassifier extends CoreLLMClassifier {
  constructor(_legacyApiKey?: string, _legacyModel?: string) { super(); }
}

export function createClassifier(provider: 'core' | 'openai' | 'mock', _config: {
  apiKey?: string;
  model?: string;
}): LLMClassifier {
  if (provider === 'mock') {
    if (process.env.NODE_ENV === 'production') throw new Error('Mock moderation is not permitted in production');
    return new MockLLMClassifier();
  }
  // The legacy "openai" setting is an alias for the central gateway, not a direct provider.
  return new CoreLLMClassifier();
}
