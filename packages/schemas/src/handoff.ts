export interface ConversationTurn {
  timestamp: string;
  role: 'user' | 'assistant';
  intent?: string;
  confidence?: number;
  state?: string;
  turn_number: number;
}

export interface HandoffPayload {
  handoff_id: string;
  tenant_id: string;
  user_id: string;
  session_id: string;
  created_at: string;
  escalation: {
    reason: string;
    priority: string;
    category: string;
  };
  context: {
    language: string;
    channel: string;
    current_state: string;
    turn_count: number;
    low_conf_streak: number;
  };
  conversation_summary: ConversationTurn[];
  slots: Record<string, any>;
  pii_redacted: {
    email: boolean;
    phone: boolean;
    name: boolean;
  };
  suggested_actions: string[];
}