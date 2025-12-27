import type { DialogRequest, DialogResponse } from '@cleanai/schemas';
import type { Session, DialogState } from '@cleanai/shared';
import { getSession, updateSession } from '../session/session-store';
import { fillSlots } from '../slot-filler/slot-filler';
import { generatePolicy } from '../policy/policy-engine';

export async function processDialog(request: DialogRequest): Promise<DialogResponse> {
  const startTime = Date.now();
  
  let session = await getSession(request.session_id);
  
  if (!session) {
    session = {
      session_id: request.session_id,
      tenant_id: request.tenant_id,
      state: 'INIT' as DialogState,
      intent: request.intent as any,
      slots: {},
      turn_count: 0,
      low_conf_streak: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
  }
  
  session.turn_count += 1;
  session.updated_at = new Date().toISOString();
  
  if (request.confidence < 0.70) {
    session.low_conf_streak += 1;
  } else {
    session.low_conf_streak = 0;
  }
  
  // Update slots
  for (const entity of request.entities) {
    session.slots[entity.name] = entity.value;
  }
  
  // Fill slots and determine next state
  const slotResult = fillSlots(session, request.intent as any);
  session.state = slotResult.nextState;
  
  // Generate response
  const policy = generatePolicy(session, request.confidence);
  
  await updateSession(session);
  
  const processingTime = Date.now() - startTime;
  
  return {
    request_id: request.request_id,
    session_id: request.session_id,
    timestamp: new Date().toISOString(),
    response: {
      type: policy.type,
      message: policy.message,
      state: session.state,
      required_slot: policy.requiredSlot,
      quick_replies: policy.quickReplies,
      slots_filled: session.slots,
      slots_required: slotResult.requiredSlots,
      confidence: request.confidence,
      next_actions: policy.nextActions,
    },
    telemetry: {
      turn_count: session.turn_count,
      low_conf_streak: session.low_conf_streak,
      processing_time_ms: processingTime,
    },
  };
}