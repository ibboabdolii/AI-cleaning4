import axios from 'axios';
import { generateId } from '@cleanai/shared';
import type { NLURequest, NLUResponse, DialogRequest, DialogResponse } from '@cleanai/schemas';

const NLU_SERVICE_URL = process.env.NLU_SERVICE_URL || 'http://localhost:8001';
const DIALOG_SERVICE_URL = process.env.DIALOG_SERVICE_URL || 'http://localhost:3001';

interface ChatRequest {
  tenantId: string;
  locale: string;
  utterance: string;
  sessionId?: string;
}

export async function handleChatMessage(request: ChatRequest) {
  const requestId = generateId('req');
  const sessionId = request.sessionId || generateId('sess');

  // Call NLU service
  const nluRequest: NLURequest = {
    request_id: requestId,
    utterance: request.utterance,
    locale: request.locale,
    tenant_id: request.tenantId,
  };

  const nluResponse = await axios.post<NLUResponse>(
    `${NLU_SERVICE_URL}/nlu`,
    nluRequest
  );

  const { intent, entities, confidence } = nluResponse.data.nlu_output;

  // Call Dialog service
  const dialogRequest: DialogRequest = {
    request_id: requestId,
    session_id: sessionId,
    tenant_id: request.tenantId,
    intent: intent.name,
    entities: entities.map(e => ({
      name: e.name,
      value: e.value,
      confidence: e.confidence,
    })),
    confidence,
    locale: request.locale,
  };

  const dialogResponse = await axios.post<DialogResponse>(
    `${DIALOG_SERVICE_URL}/dialog`,
    dialogRequest
  );

  return {
    sessionId,
    assistantMessage: dialogResponse.data.response.message,
    quickActions: dialogResponse.data.response.quick_replies,
    state: dialogResponse.data.response.state,
  };
}