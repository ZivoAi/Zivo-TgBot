import { EngagementScoreEngine } from '../modules/engagement/score-engine';

describe('Engagement Score Engine', () => {
  let engine: EngagementScoreEngine;

  beforeEach(() => {
    engine = new EngagementScoreEngine();
  });

  it('should record messages', () => {
    engine.recordMessage('class-1', 'student-1', 'What is photosynthesis?');

    const metrics = engine.calculateMetrics('class-1', 'student-1');
    expect(metrics.messageFrequency).toBeGreaterThan(0);
    expect(metrics.qualityScore).toBeGreaterThan(0);
  });

  it('should track helpfulness', () => {
    engine.recordMessage('class-1', 'student-2', 'Photosynthesis is...');
    engine.markAsHelpful('class-1', 'student-2');

    const metrics = engine.calculateMetrics('class-1', 'student-2');
    expect(metrics.helpfulness).toBe(1);
  });

  it('should calculate collaboration index', () => {
    engine.recordMessage('class-1', 'student-3', 'Great question!', true, 2);

    const metrics = engine.calculateMetrics('class-1', 'student-3');
    expect(metrics.collaborationIndex).toBeGreaterThan(0);
  });

  it('should track quality score based on message length', () => {
    engine.recordMessage('class-1', 'student-4', 'This is a long detailed response about the topic');

    const metrics = engine.calculateMetrics('class-1', 'student-4');
    expect(metrics.qualityScore).toBeGreaterThan(20);
  });

  it('should generate leaderboard', () => {
    engine.recordMessage('class-1', 'student-1', 'Good answer');
    engine.recordMessage('class-1', 'student-2', 'Better answer about the topic');
    engine.recordMessage('class-1', 'student-3', 'Short');

    const leaderboard = engine.getLeaderboard('class-1', 'qualityScore');
    expect(leaderboard.length).toBe(3);
    expect(leaderboard[0].userId).toBe('student-2'); // Longest message
  });

  it('should detect struggling students', () => {
    // Low quality messages with high frequency
    for (let i = 0; i < 10; i++) {
      engine.recordMessage('class-1', 'student-1', 'ok');
    }

    const struggling = engine.detectStrugglingStudents('class-1');
    expect(struggling).toContain('student-1');
  });

  it('should calculate learning momentum', () => {
    engine.recordMessage('class-1', 'student-5', 'First response');
    engine.recordMessage('class-1', 'student-5', 'Second response with more detail');

    const metrics = engine.calculateMetrics('class-1', 'student-5');
    expect(metrics.learningMomentum).toBeGreaterThanOrEqual(0);
  });
});
