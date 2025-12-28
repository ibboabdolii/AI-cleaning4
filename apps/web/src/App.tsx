import { useState, useEffect, Suspense } from 'react';
import { HashRouter, Routes, Route, useLocation } from 'react-router-dom';
import { ChatWindow } from './components/ChatWindow';
import { ChatInput } from './components/ChatInput';
import { LanguageGate } from './components/LanguageGate';
import { routes } from './routes';
import { shouldShowLanguageGate, getLanguage, getSessionId, setSessionId } from './utils/storage';
import { sendMessage } from './utils/api';

function ChatWidget() {
  const [messages, setMessages] = useState<Array<{role: string, content: string}>>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionIdState] = useState<string | null>(null);

  useEffect(() => {
    const stored = getSessionId();
    if (stored) setSessionIdState(stored);
  }, []);

  const handleSend = async (content: string) => {
    const userMsg = { role: 'user', content };
    setMessages(prev => [...prev, userMsg]);
    setLoading(true);

    try {
      const locale = getLanguage() || 'en';
      const result = await sendMessage(content, sessionId, 'default', locale);
      
      if (result) {
        const newSessionId = result.sessionId || `sess_${Date.now()}`;
        if (!sessionId) {
          setSessionIdState(newSessionId);
          const remember = localStorage.getItem('cleanai_remember_lang') === 'true';
          setSessionId(newSessionId, remember);
        }
        
        setMessages(prev => [...prev, { 
          role: 'assistant', 
          content: result.assistantMessage 
        }]);
      }
    } catch (error) {
      setMessages(prev => [...prev, { 
        role: 'error', 
        content: error instanceof Error ? error.message : 'Failed to send message'
      }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Floating chat button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 bg-white text-black p-4 rounded-full shadow-lg
                     hover:scale-110 transition-transform z-40"
          aria-label="Open chat"
        >
          💬
        </button>
      )}

      {/* Chat panel */}
      {isOpen && (
        <div className="fixed bottom-6 right-6 w-96 h-[600px] bg-gray-900 rounded-lg 
                        shadow-2xl border border-white/10 flex flex-col z-40">
          <div className="p-4 border-b border-white/10 flex justify-between items-center">
            <h3 className="font-bold">CleanAI Assistant</h3>
            <button onClick={() => setIsOpen(false)} aria-label="Close chat">✕</button>
          </div>
          <ChatWindow messages={messages} loading={loading} />
          <ChatInput onSend={handleSend} disabled={loading} />
        </div>
      )}
    </>
  );
}

function AppContent() {
  const location = useLocation();
  
  useEffect(() => {
    // Update page title on route change
    const route = routes.find(r => r.path === location.pathname);
    document.title = route?.title ? `${route.title} - CleanAI` : 'CleanAI';
  }, [location]);

  return (
    <>
      <Suspense fallback={<div className="p-8 text-center">Loading...</div>}>
        <Routes>
          {routes.map(route => (
            <Route key={route.path} path={route.path} element={route.element} />
          ))}
        </Routes>
      </Suspense>
      <ChatWidget />
    </>
  );
}

export default function App() {
  const [showGate, setShowGate] = useState(shouldShowLanguageGate());

  if (showGate) {
    return <LanguageGate onComplete={() => setShowGate(false)} />;
  }

  return (
    <HashRouter>
      <AppContent />
    </HashRouter>
  );
}