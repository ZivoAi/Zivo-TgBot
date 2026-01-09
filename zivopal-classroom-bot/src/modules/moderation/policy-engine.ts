import { ModerationResult } from './llm-classifier';
import { logger, createAuditLog } from '../../logger';

export interface ModerationAction {
  type: 'none' | 'warn' | 'mute' | 'delete';
  duration?: number; // ms for mute
  message: string;
}

export interface StudentViolationState {
  classId: string;
  userId: string;
  violationCount: number;
  lastViolationAt: string;
  severityHistory: Array<{
    timestamp: string;
    severity: string;
    category: string;
  }>;
}

export interface ModerationPolicy {
  classId: string;
  warningThreshold: number; // num violations before first action
  muteThresholdAfterWarnings: number; // num warnings before mute
  initialMuteDurationMs: number;
  severeMuteDurationMs: number; // for repeated violations
  autoDeleteHighSeverity: boolean;
}

/**
 * Moderation policy engine
 */
export class ModerationPolicyEngine {
  private violationStates: Map<string, StudentViolationState> = new Map();
  private policies: Map<string, ModerationPolicy> = new Map();

  /**
   * Register or update a class moderation policy
   */
  public setPolicy(policy: ModerationPolicy): void {
    this.policies.set(policy.classId, policy);
    logger.debug({ policy }, `Moderation policy set for class ${policy.classId}`);
  }

  /**
   * Get policy for a class, with sensible defaults
   */
  private getPolicy(classId: string): ModerationPolicy {
    return (
      this.policies.get(classId) || {
        classId,
        warningThreshold: 1,
        muteThresholdAfterWarnings: 3,
        initialMuteDurationMs: 3600000, // 1 hour
        severeMuteDurationMs: 86400000, // 24 hours
        autoDeleteHighSeverity: true,
      }
    );
  }

  /**
   * Record a violation and determine action
   */
  public decideAction(
    classId: string,
    userId: string,
    moderationResult: ModerationResult
  ): ModerationAction {
    const policy = this.getPolicy(classId);
    const stateKey = `${classId}:${userId}`;
    const state = this.violationStates.get(stateKey) || {
      classId,
      userId,
      violationCount: 0,
      lastViolationAt: new Date().toISOString(),
      severityHistory: [],
    };

    if (!moderationResult.shouldAction) {
      return {
        type: 'none',
        message: 'Message approved by moderation',
      };
    }

    // Increment violation count
    state.violationCount += 1;
    state.lastViolationAt = new Date().toISOString();
    state.severityHistory.push({
      timestamp: state.lastViolationAt,
      severity: moderationResult.severity,
      category: moderationResult.category,
    });

    this.violationStates.set(stateKey, state);

    // Decide action based on policy
    if (moderationResult.severity === 'high' && policy.autoDeleteHighSeverity) {
      return {
        type: 'delete',
        message: 'Message deleted due to severe policy violation',
      };
    }

    if (state.violationCount >= policy.warningThreshold) {
      if (
        state.violationCount >= policy.warningThreshold + policy.muteThresholdAfterWarnings
      ) {
        // Repeated violations: severe mute
        return {
          type: 'mute',
          duration: policy.severeMuteDurationMs,
          message: `Student muted for ${policy.severeMuteDurationMs / 3600000} hours due to repeated violations`,
        };
      }

      // First severe violation: warn
      return {
        type: 'warn',
        message: 'Student warned for policy violation',
      };
    }

    return {
      type: 'none',
      message: 'Below threshold for action',
    };
  }

  /**
   * Get violation state for a student
   */
  public getState(classId: string, userId: string): StudentViolationState | undefined {
    return this.violationStates.get(`${classId}:${userId}`);
  }

  /**
   * Reset violation state for a student (e.g., after a cleanup period)
   */
  public resetState(classId: string, userId: string): void {
    this.violationStates.delete(`${classId}:${userId}`);
    logger.debug({ classId, userId }, 'Violation state reset');
  }
}
