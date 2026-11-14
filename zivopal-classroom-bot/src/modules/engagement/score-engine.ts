
export interface StudentMetrics {
  classId: string;
  userId: string;
  messageFrequency: number; // messages per day
  qualityScore: number; // 0-100
  helpfulness: number; // count of helpful interactions
  collaborationIndex: number; // 0-100
  learningMomentum: number; // trend of quality over last N days
  timestamp: string;
}

export interface EngagementData {
  messageCount: number;
  qualityScores: number[];
  helpfulnessCount: number;
  mentions: number; // how many times mentioned others
  replies: number; // how many direct replies to others
  daysActive: number;
}

/**
 * Engagement tracking and scoring
 */
export class EngagementScoreEngine {
  private studentData: Map<string, EngagementData> = new Map();

  /**
   * Record a message from a student
   */
  public recordMessage(
    classId: string,
    userId: string,
    message: string,
    isReply: boolean = false,
    mentionsOthers: number = 0
  ): void {
    const key = `${classId}:${userId}`;
    const data = this.studentData.get(key) || {
      messageCount: 0,
      qualityScores: [],
      helpfulnessCount: 0,
      mentions: 0,
      replies: 0,
      daysActive: 1,
    };

    data.messageCount += 1;
    if (isReply) {
      data.replies += 1;
    }
    data.mentions += mentionsOthers;

    // Simple quality heuristic: longer, more detailed messages score higher
    const qualityScore = Math.min(100, Math.max(0, (message.length / 10) * 5));
    data.qualityScores.push(qualityScore);

    this.studentData.set(key, data);
  }

  /**
   * Mark a message as helpful (e.g., answered someone's question)
   */
  public markAsHelpful(classId: string, userId: string): void {
    const key = `${classId}:${userId}`;
    const data = this.studentData.get(key) || {
      messageCount: 0,
      qualityScores: [],
      helpfulnessCount: 0,
      mentions: 0,
      replies: 0,
      daysActive: 1,
    };

    data.helpfulnessCount += 1;
    this.studentData.set(key, data);
  }

  /**
   * Calculate metrics for a student
   */
  public calculateMetrics(classId: string, userId: string): StudentMetrics {
    const key = `${classId}:${userId}`;
    const data = this.studentData.get(key) || {
      messageCount: 0,
      qualityScores: [],
      helpfulnessCount: 0,
      mentions: 0,
      replies: 0,
      daysActive: 1,
    };

    const messageFrequency = data.messageCount / Math.max(1, data.daysActive);

    const avgQualityScore =
      data.qualityScores.length > 0
        ? data.qualityScores.reduce((a, b) => a + b, 0) / data.qualityScores.length
        : 0;

    const learningMomentum =
      data.qualityScores.length > 1
        ? ((data.qualityScores[data.qualityScores.length - 1] -
            data.qualityScores[0]) /
            data.qualityScores[0]) *
          100
        : 0;

    const collaborationIndex = Math.min(
      100,
      ((data.replies + data.mentions + data.helpfulnessCount) / Math.max(1, data.messageCount)) *
        50
    );

    return {
      classId,
      userId,
      messageFrequency: Math.round(messageFrequency * 100) / 100,
      qualityScore: Math.round(avgQualityScore * 100) / 100,
      helpfulness: data.helpfulnessCount,
      collaborationIndex: Math.round(collaborationIndex * 100) / 100,
      learningMomentum: Math.round(learningMomentum * 100) / 100,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Get leaderboard for a class
   */
  public getLeaderboard(classId: string, metric: keyof StudentMetrics = 'qualityScore'): Array<{
    userId: string;
    value: number;
  }> {
    const students: Array<{ userId: string; value: number }> = [];

    for (const key of this.studentData.keys()) {
      if (key.startsWith(`${classId}:`)) {
        const userId = key.split(':')[1];
        const metrics = this.calculateMetrics(classId, userId);
        const value = metrics[metric];

        if (typeof value === 'number') {
          students.push({ userId, value });
        }
      }
    }

    return students.sort((a, b) => b.value - a.value);
  }

  /**
   * Detect struggling students (low quality score with high message frequency)
   */
  public detectStrugglingStudents(classId: string): string[] {
    const struggling: string[] = [];

    for (const key of this.studentData.keys()) {
      if (key.startsWith(`${classId}:`)) {
        const userId = key.split(':')[1];
        const metrics = this.calculateMetrics(classId, userId);

        // Student struggling if: high volume but low quality
        if (metrics.messageFrequency > 5 && metrics.qualityScore < 40) {
          struggling.push(userId);
        }
      }
    }

    return struggling;
  }
}
