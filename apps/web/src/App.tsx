import React, { useState } from 'react';
import ChatWindow from './components/ChatWindow';
import ChatInput from './components/ChatInput';
import { sendMessage } from './utils/api';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  quickActions?: Array<{ text: string; value?: string; action?: string }>;
}

function App() {
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: 'Hi! How can I help you today?' },
  ]);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSend = async (text: string) => {
    const userMessage: Message = { role: 'user', content: text };
    setMessages((prev) => [...prev, userMessage]);
    setLoading(true);

    try {
      const response = await sendMessage(text, sessionId);
      setSessionId(response.sessionId);

      const assistantMessage: Message = {
        role: 'assistant',
        content: response.assistantMessage,
        quickActions: response.quickActions,
      };
      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Error:', error);
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: 'Sorry, I encountered an error. Please try again.' },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      <header style={{ background: '#2c2c2e', color: 'white', padding: '1rem' }}>
        <h1>CleanAI Chat</h1>
      </header>
      <ChatWindow messages={messages} loading={loading} />
      <ChatInput onSend={handleSend} disabled={loading} />
    </div>
  );
}

export default App;