export interface NLURequest {
  request_id: string;
  utterance: string;
  locale: string;
  tenant_id: string;
}

export interface Intent {
  name: string;
  confidence: number;
  alternatives: Array<{ name: string; confidence: number }>;
}

export interface Entity {
  name: string;
  value: string | number;
  raw_value: string;
  confidence: number;
  start?: number;
  end?: number;
  normalized?: string;
  estimated?: boolean;
}

export interface NLUResponse {
  request_id: string;
  timestamp: string;
  nlu_output: {
    intent: Intent;
    entities: Entity[];
    locale: string;
    processing_time_ms: number;
  };
}