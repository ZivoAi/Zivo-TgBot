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
 * OpenAI-based classifier using GPT for moderation
 */
export class OpenAILLMClassifier implements LLMClassifier {
  private apiKey: string;
  private model: string;

  constructor(apiKey: string, model: string = 'gpt-3.5-turbo') {
    this.apiKey = apiKey;
    this.model = model;
  }

  public async classify(text: string, _context?: Record<string, unknown>): Promise<ModerationResult> {
    // Implementation would use OpenAI API
    // For now, return mock result
    return new MockLLMClassifier().classify(text);
  }
}

export function createClassifier(provider: 'openai' | 'mock', config: {
  apiKey?: string;
  model?: string;
}): LLMClassifier {
  if (provider === 'openai' && config.apiKey) {
    return new OpenAILLMClassifier(config.apiKey, config.model);
  }
  return new MockLLMClassifier();
}
