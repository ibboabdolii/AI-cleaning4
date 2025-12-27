import React, { useState } from 'react';

interface Props {
  onSend: (text: string) => void;
  disabled: boolean;
}

export default function ChatInput({ onSend, disabled }: Props) {
  const [input, setInput] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim() && !disabled) {
      onSend(input);
      setInput('');
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      style={{
        padding: '1rem',
        background: '#fff',
        borderTop: '1px solid #e0e0e0',
        display: 'flex',
        gap: '0.5rem',
      }}
    >
      <input
        type="text"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder="Type a message..."
        disabled={disabled}
        style={{
          flex: 1,
          padding: '0.75rem',
          border: '1px solid #ccc',
          borderRadius: '4px',
          fontSize: '1rem',
        }}
      />
      <button
        type="submit"
        disabled={disabled || !input.trim()}
        style={{
          padding: '0.75rem 1.5rem',
          background: '#007bff',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: disabled ? 'not-allowed' : 'pointer',
          fontSize: '1rem',
        }}
      >
        Send
      </button>
    </form>
  );
}