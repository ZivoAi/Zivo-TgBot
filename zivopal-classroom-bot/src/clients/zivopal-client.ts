import { ZivoPalAuthClient } from './zivopal-auth';
import { logger, AuditLog } from '../logger';

export interface NotificationPayload {
  classId: string;
  userId: string;
  type: 'warning' | 'mute' | 'assignment_reminder' | 'submission_ack' | 'alert';
  title: string;
  message: string;
  actionUrl?: string;
  metadata?: Record<string, unknown>;
}

export interface AnalyticsSnapshot {
  classId: string;
  userId: string;
  timestamp: string;
  metrics: {
    messageFrequency: number;
    qualityScore: number;
    helpfulness: number;
    collaborationIndex: number;
    learningMomentum: number;
  };
}

export interface SubmissionPayload {
  classId: string;
  assignmentId: string;
  studentId: string;
  submittedAt: string;
  fileUrl: string;
  fileName: string;
  mimeType: string;
}

export interface FlagPayload {
  classId: string;
  messageId: string;
  userId: string;
  reason: string;
  severity: 'low' | 'medium' | 'high';
  messageContent: string;
  timestamp: string;
}

export class ZivoPalClient {
  private authClient: ZivoPalAuthClient;

  constructor() {
    this.authClient = new ZivoPalAuthClient();
  }

  /**
   * Send audit log to zivopal-core
   */
  public async sendAuditLog(log: AuditLog): Promise<void> {
    try {
      await this.authClient.request('POST', '/api/v1/audit', log);
      logger.debug({ auditLog: log }, 'Audit log sent successfully');
    } catch (error) {
      logger.error(
        { error, auditLog: log },
        'Failed to send audit log to zivopal-core'
      );
      throw error;
    }
  }

  /**
   * Send analytics snapshot to zivopal-core
   */
  public async sendAnalytics(snapshot: AnalyticsSnapshot): Promise<void> {
    try {
      await this.authClient.request('POST', '/api/v1/analytics', snapshot);
      logger.debug({ snapshot }, 'Analytics snapshot sent successfully');
    } catch (error) {
      logger.error(
        { error, snapshot },
        'Failed to send analytics to zivopal-core'
      );
      throw error;
    }
  }

  /**
   * Send notification to teacher(s) in a class
   */
  public async sendNotification(payload: NotificationPayload): Promise<void> {
    try {
      await this.authClient.request('POST', '/api/v1/notifications', payload);
      logger.debug({ notification: payload }, 'Notification sent successfully');
    } catch (error) {
      logger.error(
        { error, notification: payload },
        'Failed to send notification to zivopal-core'
      );
      throw error;
    }
  }

  /**
   * Forward assignment submission to zivopal-core
   */
  public async submitAssignment(payload: SubmissionPayload): Promise<void> {
    try {
      await this.authClient.request('POST', '/api/v1/submissions', payload);
      logger.debug({ submission: payload }, 'Submission forwarded successfully');
    } catch (error) {
      logger.error(
        { error, submission: payload },
        'Failed to forward submission to zivopal-core'
      );
      throw error;
    }
  }

  /**
   * Flag a message as potentially violating policy
   */
  public async flagMessage(payload: FlagPayload): Promise<void> {
    try {
      await this.authClient.request('POST', '/api/v1/flags', payload);
      logger.debug({ flag: payload }, 'Message flagged successfully');
    } catch (error) {
      logger.error({ error, flag: payload }, 'Failed to flag message in zivopal-core');
      throw error;
    }
  }

  /**
   * Get mute status for a student in a class
   */
  public async getMuteStatus(classId: string, userId: string): Promise<{
    isMuted: boolean;
    mutedUntil?: string;
    reason?: string;
  }> {
    try {
      const result = await this.authClient.request<{
        isMuted: boolean;
        mutedUntil?: string;
        reason?: string;
      }>('GET', `/api/v1/classes/${classId}/students/${userId}/mute-status`);
      return result;
    } catch (error) {
      logger.error(
        { error, classId, userId },
        'Failed to retrieve mute status from zivopal-core'
      );
      throw error;
    }
  }

  /**
   * Set mute status for a student in a class
   */
  public async setMuteStatus(
    classId: string,
    userId: string,
    mutedUntil: string,
    reason: string
  ): Promise<void> {
    try {
      await this.authClient.request(
        'PUT',
        `/api/v1/classes/${classId}/students/${userId}/mute-status`,
        { mutedUntil, reason }
      );
      logger.debug({ classId, userId, mutedUntil }, 'Mute status updated');
    } catch (error) {
      logger.error(
        { error, classId, userId },
        'Failed to set mute status in zivopal-core'
      );
      throw error;
    }
  }
}
