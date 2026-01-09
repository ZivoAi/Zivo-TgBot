import { MockLLMClassifier } from '../../modules/moderation/llm-classifier';
import { ModerationPolicyEngine } from '../../modules/moderation/policy-engine';

describe('Moderation LLM Classifier', () => {
  let classifier: MockLLMClassifier;

  beforeEach(() => {
    classifier = new MockLLMClassifier();
  });

  it('should classify spam messages', async () => {
    const result = await classifier.classify('Buy now! Click here for limited offer!');
    expect(result.category).toBe('spam');
    expect(result.severity).toBe('medium');
    expect(result.shouldAction).toBe(true);
  });

  it('should classify insult messages', async () => {
    const result = await classifier.classify('You are stupid and dumb');
    expect(result.category).toBe('insult_harassment');
    expect(result.severity).toBe('medium');
    expect(result.shouldAction).toBe(true);
  });

  it('should classify bullying messages', async () => {
    const result = await classifier.classify('You are a pathetic loser');
    expect(result.category).toBe('bullying');
    expect(result.severity).toBe('high');
    expect(result.shouldAction).toBe(true);
  });

  it('should classify hate speech', async () => {
    const result = await classifier.classify('I hate certain groups');
    expect(result.category).toBe('hate');
    expect(result.severity).toBe('high');
    expect(result.shouldAction).toBe(true);
  });

  it('should classify harmless messages', async () => {
    const result = await classifier.classify('What is the capital of France?');
    expect(result.category).toBe('harmless');
    expect(result.severity).toBe('low');
    expect(result.confidence).toBeGreaterThan(0.9);
    expect(result.shouldAction).toBe(false);
  });
});

describe('Moderation Policy Engine', () => {
  let engine: ModerationPolicyEngine;

  beforeEach(() => {
    engine = new ModerationPolicyEngine();
    engine.setPolicy({
      classId: 'class-1',
      warningThreshold: 1,
      muteThresholdAfterWarnings: 2,
      initialMuteDurationMs: 3600000,
      severeMuteDurationMs: 86400000,
      autoDeleteHighSeverity: true,
    });
  });

  it('should not action harmless messages', () => {
    const result = engine.decideAction('class-1', 'student-1', {
      category: 'harmless',
      severity: 'low',
      confidence: 0.95,
      rationale: 'Safe message',
      shouldAction: false,
    });

    expect(result.type).toBe('none');
  });

  it('should warn on first violation', () => {
    const result = engine.decideAction('class-1', 'student-1', {
      category: 'insult_harassment',
      severity: 'medium',
      confidence: 0.85,
      rationale: 'Insult detected',
      shouldAction: true,
    });

    expect(result.type).toBe('warn');
  });

  it('should escalate to mute after multiple violations', () => {
    // First violation
    engine.decideAction('class-1', 'student-2', {
      category: 'spam',
      severity: 'medium',
      confidence: 0.8,
      rationale: 'Spam detected',
      shouldAction: true,
    });

    // Second violation
    engine.decideAction('class-1', 'student-2', {
      category: 'spam',
      severity: 'medium',
      confidence: 0.8,
      rationale: 'Spam detected',
      shouldAction: true,
    });

    // Third violation should trigger mute
    const result = engine.decideAction('class-1', 'student-2', {
      category: 'spam',
      severity: 'medium',
      confidence: 0.8,
      rationale: 'Spam detected',
      shouldAction: true,
    });

    expect(result.type).toBe('mute');
    expect(result.duration).toBe(3600000);
  });

  it('should auto-delete high severity messages', () => {
    const result = engine.decideAction('class-1', 'student-3', {
      category: 'hate',
      severity: 'high',
      confidence: 0.9,
      rationale: 'Hate speech detected',
      shouldAction: true,
    });

    expect(result.type).toBe('delete');
  });

  it('should track violation state', () => {
    engine.decideAction('class-1', 'student-4', {
      category: 'spam',
      severity: 'medium',
      confidence: 0.8,
      rationale: 'Spam',
      shouldAction: true,
    });

    const state = engine.getState('class-1', 'student-4');
    expect(state?.violationCount).toBe(1);
    expect(state?.severityHistory.length).toBe(1);
  });

  it('should reset violation state', () => {
    engine.decideAction('class-1', 'student-5', {
      category: 'spam',
      severity: 'medium',
      confidence: 0.8,
      rationale: 'Spam',
      shouldAction: true,
    });

    engine.resetState('class-1', 'student-5');
    const state = engine.getState('class-1', 'student-5');
    expect(state).toBeUndefined();
  });
});
