# TODO
# Dialog Service API

## POST /dialog

Process dialog turn and return next action.

**Request:**
```json
{
  "request_id": "req_ABC123",
  "session_id": "sess_XYZ789",
  "tenant_id": "tenant_xyz",
  "intent": "quote_home",
  "entities": [
    {"name": "bedroom_count", "value": 2, "confidence": 0.85}
  ],
  "confidence": 0.85,
  "locale": "en"
}
```

**Response:**
```json
{
  "request_id": "req_ABC123",
  "session_id": "sess_XYZ789",
  "timestamp": "2025-01-20T10:00:00Z",
  "response": {
    "type": "ask_slot",
    "message": "Which city are you in?",
    "state": "ASK_LOCATION",
    "required_slot": "location",
    "slots_filled": {"bedroom_count": 2},
    "slots_required": ["location", "service_type"],
    "confidence": 0.85,
    "next_actions": ["wait_for_user_input"]
  },
  "telemetry": {
    "turn_count": 1,
    "low_conf_streak": 0,
    "processing_time_ms": 8
  }
}
```