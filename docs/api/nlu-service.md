# TODO
# NLU Service API

## POST /nlu

Classify intent and extract entities from user utterance.

**Request:**
```json
{
  "request_id": "req_ABC123",
  "utterance": "I need cleaning for my 2 bedroom apartment",
  "locale": "en",
  "tenant_id": "tenant_xyz"
}
```

**Response:**
```json
{
  "request_id": "req_ABC123",
  "timestamp": "2025-01-20T10:00:00Z",
  "nlu_output": {
    "intent": {
      "name": "quote_home",
      "confidence": 0.85,
      "alternatives": []
    },
    "entities": [
      {
        "name": "bedroom_count",
        "value": 2,
        "raw_value": "2 bedroom",
        "confidence": 0.85
      }
    ],
    "locale": "en",
    "processing_time_ms": 12
  }
}
```