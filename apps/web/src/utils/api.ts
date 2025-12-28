let requestCounter = 0;
const generateRequestId = () => `req_${Date.now()}_${++requestCounter}`;
let activeRequestId: string | null = null;

export async function sendMessage(
  content: string, 
  sessionId: string | null,
  tenantId: string = 'default',
  locale: string = 'en'
) {
  const requestId = generateRequestId();
  activeRequestId = requestId;

  try {
    const response = await fetch('/api/ai/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tenantId,
        locale,
        sessionId,
        messages: [{ role: 'user', content }],
        context: { source: 'web' }
      })
    });

    if (activeRequestId !== requestId) return null;

    if (!response.ok) {
      if (response.status === 404) throw new Error('Service not found');
      throw new Error(`Server error: ${response.status}`);
    }

    const data = await response.json();
    return {
      assistantMessage: String(data.assistantMessage || ''),
      quickActions: Array.isArray(data.quickActions) ? data.quickActions : [],
      sessionId: data.sessionId
    };
  } catch (error) {
    if (activeRequestId !== requestId) return null;
    if (error instanceof TypeError) {
      throw new Error('Network error. Check your connection.');
    }
    throw error;
  }
}
