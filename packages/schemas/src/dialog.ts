export interface DialogRequest {
  request_id: string;
  session_id: string;
  tenant_id: string;
  intent: string;
  entities: Array<{ name: string; value: any; confidence: number }>;
  confidence: number;
  locale: string;
}

export interface QuickReply {
  text: string;
  value?: string;
  action?: string;
}

export interface DialogResponse {
  request_id: string;
  session_id: string;
  timestamp: string;
  response: {
    type: string;
    message: string;
    state: string;
    required_slot?: string;
    quick_replies?: QuickReply[];
    slots_filled: Record<string, any>;
    slots_required: string[];
    confidence: number;
    next_actions: string[];
  };
  telemetry: {
    turn_count: number;
    low_conf_streak: number;
    processing_time_ms: number;
  };
}