from fastapi import FastAPI
from pydantic import BaseModel
from datetime import datetime
from typing import List, Optional
import time

from .intent_classifier.classifier import IntentClassifier
from .entity_extractor.extractor import EntityExtractor

app = FastAPI()

classifier = IntentClassifier()
extractor = EntityExtractor()

class NLURequest(BaseModel):
    request_id: str
    utterance: str
    locale: str
    tenant_id: str

class Intent(BaseModel):
    name: str
    confidence: float
    alternatives: List[dict]

class Entity(BaseModel):
    name: str
    value: str | int | float
    raw_value: str
    confidence: float
    start: Optional[int] = None
    end: Optional[int] = None
    normalized: Optional[str] = None
    estimated: Optional[bool] = None

class NLUOutput(BaseModel):
    intent: Intent
    entities: List[Entity]
    locale: str
    processing_time_ms: int

class NLUResponse(BaseModel):
    request_id: str
    timestamp: str
    nlu_output: NLUOutput

@app.get("/health")
def health():
    return {"status": "ok"}

@app.post("/nlu")
def classify(request: NLURequest) -> NLUResponse:
    start_time = time.time()
    
    # Classify intent
    intent_result = classifier.classify(request.utterance)
    
    # Extract entities
    entities = extractor.extract(request.utterance, intent_result["name"])
    
    processing_time = int((time.time() - start_time) * 1000)
    
    return NLUResponse(
        request_id=request.request_id,
        timestamp=datetime.utcnow().isoformat() + "Z",
        nlu_output=NLUOutput(
            intent=Intent(**intent_result),
            entities=[Entity(**e) for e in entities],
            locale=request.locale,
            processing_time_ms=processing_time
        )
    )