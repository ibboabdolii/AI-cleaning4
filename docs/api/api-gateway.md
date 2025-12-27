# TODO
# API Gateway

## POST /api/ai/chat

Main chat endpoint for web/mobile clients.

**Request:**
```json
{
  "tenantId": "demo-tenant",
  "locale": "en",
  "messages": [
    {"role": "user", "content": "I need a cleaning quote"}
  ],
  "sessionId": "sess_ABC123"
}
```

**Response:**
```json
{
  "sessionId": "sess_ABC123",
  "assistantMessage": "I can help! Which city are you in?",
  "quickActions": null,
  "state": "ASK_LOCATION"
}
```