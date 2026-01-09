# API Requirements for zivopal-core

This document specifies the required API endpoints that zivopal-core must expose for the classroom bot to function properly.

## Authentication

All endpoints must validate the service JWT bearer token in the `Authorization` header:

```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

The JWT payload includes:
```json
{
  "sub": "zivopal-classroom-bot",
  "iss": "zivopal-classroom-bot",
  "aud": "zivopal-core",
  "iat": 1672531200,
  "exp": 1672534800
}
```

## Required Endpoints

### 1. Audit Log Submission

**Endpoint**: `POST /api/v1/audit`

**Purpose**: Record enforcement actions, violations, and system events for compliance and teacher review.

**Request Body**:
```json
{
  "timestamp": "2026-01-09T10:00:00Z",
  "eventType": "message_moderation",
  "classId": "class-123",
  "userId": "student-456",
  "action": "message_deleted",
  "severity": "high",
  "metadata": {
    "messageId": "msg-789",
    "category": "hate",
    "confidence": 0.92,
    "rationale": "Message contains hate speech targeting specific groups"
  },
  "rationale": "Auto-deleted high-severity message per policy"
}
```

**Response**:
```json
{
  "id": "audit-log-id",
  "acknowledged": true,
  "timestamp": "2026-01-09T10:00:00Z"
}
```

**HTTP Status**: 200/201 on success, 400 on validation error, 401 on auth error

---

### 2. Analytics Snapshot Submission

**Endpoint**: `POST /api/v1/analytics`

**Purpose**: Submit periodic engagement metrics and learning progress snapshots.

**Request Body**:
```json
{
  "classId": "class-123",
  "userId": "student-456",
  "timestamp": "2026-01-09T10:00:00Z",
  "metrics": {
    "messageFrequency": 5.2,
    "qualityScore": 78.5,
    "helpfulness": 3,
    "collaborationIndex": 65.0,
    "learningMomentum": 12.5
  }
}
```

**Field Definitions**:
- `messageFrequency`: Float, messages per day
- `qualityScore`: 0-100, heuristic quality of messages
- `helpfulness`: Integer, count of helpful/answered interactions
- `collaborationIndex`: 0-100, indicator of peer interaction
- `learningMomentum`: Float, trend of quality_score improvement (%)

**Response**:
```json
{
  "id": "snapshot-id",
  "acknowledged": true,
  "storedAt": "2026-01-09T10:00:00Z"
}
```

**HTTP Status**: 200/201 on success, 400 on validation error

---

### 3. Teacher Notifications

**Endpoint**: `POST /api/v1/notifications`

**Purpose**: Alert teacher(s) of student violations, submissions, or system alerts.

**Request Body**:
```json
{
  "classId": "class-123",
  "userId": "student-456",
  "type": "warning",
  "title": "Student Warning Issued",
  "message": "Student 'John Doe' received a warning for spam violations",
  "actionUrl": "https://zivopal.com/classes/class-123/students/student-456",
  "metadata": {
    "violationCount": 3,
    "category": "spam",
    "muted": false
  }
}
```

**Type Values**:
- `warning`: Policy warning issued
- `mute`: Student muted
- `assignment_reminder`: Assignment due soon
- `submission_ack`: Student submitted work
- `alert`: System alert for teacher review

**Response**:
```json
{
  "id": "notification-id",
  "acknowledged": true,
  "sentTo": ["teacher-id-1", "teacher-id-2"]
}
```

**HTTP Status**: 200/201 on success, 404 if class/user not found

---

### 4. Assignment Submission Forwarding

**Endpoint**: `POST /api/v1/submissions`

**Purpose**: Forward student assignment submissions via Telegram.

**Request Body**:
```json
{
  "classId": "class-123",
  "assignmentId": "assign-789",
  "studentId": "student-456",
  "submittedAt": "2026-01-09T10:00:00Z",
  "fileUrl": "https://telegram.org/file/botXXX/YYYY",
  "fileName": "essay_draft.pdf",
  "mimeType": "application/pdf"
}
```

**Requirements**:
- `fileUrl`: Must be temporary; bot will upload to zivopal-core separately
- `fileName`: Sanitized, max 255 chars
- `mimeType`: Must match file type

**Response**:
```json
{
  "submissionId": "submission-id",
  "status": "received",
  "studentNotified": true,
  "teacherNotified": true
}
```

**HTTP Status**: 200/201 on success, 413 if file too large

---

### 5. Message Flag Submission

**Endpoint**: `POST /api/v1/flags`

**Purpose**: Flag messages for teacher manual review (human-in-the-loop).

**Request Body**:
```json
{
  "classId": "class-123",
  "messageId": "msg-789",
  "userId": "student-456",
  "reason": "insult_harassment",
  "severity": "high",
  "messageContent": "You are an idiot",
  "timestamp": "2026-01-09T10:00:00Z"
}
```

**Reason Values**:
- `spam`
- `insult_harassment`
- `bullying`
- `sexual_content`
- `hate`
- `off_topic`
- `other`

**Response**:
```json
{
  "flagId": "flag-id",
  "status": "pending_review",
  "teacherNotified": true
}
```

**HTTP Status**: 200/201 on success

---

### 6. Get Mute Status

**Endpoint**: `GET /api/v1/classes/{classId}/students/{userId}/mute-status`

**Purpose**: Check if a student is currently muted and when the mute expires.

**Response**:
```json
{
  "isMuted": true,
  "mutedUntil": "2026-01-09T11:00:00Z",
  "reason": "Repeated spam violations"
}
```

OR

```json
{
  "isMuted": false
}
```

**HTTP Status**: 200 on success, 404 if class/user not found

---

### 7. Set Mute Status

**Endpoint**: `PUT /api/v1/classes/{classId}/students/{userId}/mute-status`

**Purpose**: Mute a student (soft-mute: messages deleted/hidden, no direct deletion).

**Request Body**:
```json
{
  "mutedUntil": "2026-01-09T12:00:00Z",
  "reason": "3rd warning threshold reached"
}
```

**Response**:
```json
{
  "success": true,
  "mutedUntil": "2026-01-09T12:00:00Z",
  "auditLogId": "audit-log-id"
}
```

**HTTP Status**: 200 on success, 400 on validation error, 404 if not found

---

## Error Responses

All endpoints should return standard error responses:

```json
{
  "code": "INVALID_REQUEST",
  "message": "Missing required field: classId",
  "details": {
    "field": "classId",
    "value": null
  }
}
```

**Common Error Codes**:
- `INVALID_REQUEST`: Malformed request
- `UNAUTHORIZED`: Invalid/missing JWT token
- `FORBIDDEN`: Service not authorized for this action
- `NOT_FOUND`: Class, user, or resource not found
- `RATE_LIMITED`: Too many requests
- `INTERNAL_ERROR`: Server error

---

## Retry & Idempotency

The bot implements exponential backoff with max 3 retries for 5xx errors and 429 (rate limit).

For idempotency, the bot includes an `idempotency-key` header (UUID v4) for:
- Audit log submission
- Analytics submission
- Notifications

zivopal-core should deduplicate requests with the same key within a 24-hour window.

---

## Rate Limits

Recommended rate limits per service account:
- 100 requests/minute for normal operations
- 1000 requests/minute for bulk analytics submissions

---

## TLS/HTTPS

All communication **must** be over HTTPS with valid certificates. Unencrypted HTTP is rejected.

---

## Sample cURL Requests

### Submit Audit Log

```bash
curl -X POST https://api.zivopal.com/api/v1/audit \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: 550e8400-e29b-41d4-a716-446655440000" \
  -d '{
    "timestamp": "2026-01-09T10:00:00Z",
    "eventType": "message_moderation",
    "classId": "class-123",
    "userId": "student-456",
    "action": "message_deleted",
    "severity": "high",
    "metadata": {
      "category": "hate",
      "confidence": 0.92
    }
  }'
```

### Check Mute Status

```bash
curl -X GET https://api.zivopal.com/api/v1/classes/class-123/students/student-456/mute-status \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Set Mute Status

```bash
curl -X PUT https://api.zivopal.com/api/v1/classes/class-123/students/student-456/mute-status \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "mutedUntil": "2026-01-09T12:00:00Z",
    "reason": "Repeated violations"
  }'
```

---

## Mock Credentials for Testing

For local testing with mocked zivopal-core, use:
- Client ID: `test-client-id`
- Client Secret: `test-client-secret`
- API URL: `http://localhost:3001` (mocked server)

The bot repository includes integration tests with `nock` for mocking these endpoints.
