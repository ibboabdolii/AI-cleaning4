import React, { useEffect, useRef } from 'react';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  quickActions?: Array<{ text: string; value?: string; action?: string }>;
}

interface Props {
  messages: Message[];
  loading: boolean;
}

export default function ChatWindow({ messages, loading }: Props) {
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '1rem', background: '#fff' }}>
      {messages.map((msg, i) => (
        <div key={i} style={{ marginBottom: '1rem' }}>
          <div
            style={{
              maxWidth: '70%',
              marginLeft: msg.role === 'user' ? 'auto' : 0,
              background: msg.role === 'user' ? '#007bff' : '#e9ecef',
              color: msg.role === 'user' ? 'white' : 'black',
              padding: '0.75rem',
              borderRadius: '8px',
            }}
          >
            {msg.content}
          </div>
          {msg.quickActions && (
            <div style={{ marginTop: '0.5rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              {msg.quickActions.map((action, j) => (
                <button
                  key={j}
                  style={{
                    padding: '0.5rem 1rem',
                    border: '1px solid #ccc',
                    borderRadius: '20px',
                    background: 'white',
                    cursor: 'pointer',
                  }}
                >
                  {action.text}
                </button>
              ))}
            </div>
          )}
        </div>
      ))}
      {loading && (
        <div style={{ color: '#999', fontStyle: 'italic' }}>Typing...</div>
      )}
      <div ref={endRef} />
    </div>
  );
}