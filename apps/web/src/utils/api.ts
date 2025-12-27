const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export async function sendMessage(content: string, sessionId: string | null) {
  const response = await fetch(`${API_URL}/api/ai/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      tenantId: 'demo-tenant',
      locale: 'en',
      messages: [{ role: 'user', content }],
      sessionId,
    }),
  });

  if (!response.ok) {
    throw new Error('API request failed');
  }

  return response.json();
}