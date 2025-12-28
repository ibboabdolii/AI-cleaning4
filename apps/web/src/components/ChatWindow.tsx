import { useEffect, useRef } from 'react';

interface Message {
  role: 'user' | 'assistant' | 'error';
  content: string;
}

interface Props {
  messages: Message[];
  loading: boolean;
}

export function ChatWindow({ messages, loading }: Props) {
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-3">
      {messages.map((msg, i) => (
        <div
          key={i}
          className={`p-3 rounded ${
            msg.role === 'user'
              ? 'bg-blue-600 ml-auto max-w-[80%]'
              : msg.role === 'error'
              ? 'bg-red-600/20 border border-red-600'
              : 'bg-gray-800 max-w-[80%]'
          }`}
        >
          {msg.content}
        </div>
      ))}
      {loading && (
        <div className="flex gap-1 p-3 bg-gray-800 rounded max-w-[80%]">
          <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse" />
          <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse delay-75" />
          <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse delay-150" />
        </div>
      )}
      <div ref={endRef} />
    </div>
  );
}
