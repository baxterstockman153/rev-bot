import { useState, useRef, useEffect } from 'react';
import ChatWindow from './components/ChatWindow.jsx';
import InputBar from './components/InputBar.jsx';

const INITIAL_MESSAGE = {
  role: 'assistant',
  content: "Hey! I'm Rev, NRG's support agent. Ask me about orders, products, compatibility — anything. Let's go. 🏁",
};

const SUGGESTIONS = [
  "Where's my order?",
  'Show me steering wheels',
  "What's your return policy?",
  'Do I need a quick release?',
  'Tell me about racing seats',
];

function getSessionId() {
  let id = localStorage.getItem('rev_session_id');
  if (!id) {
    id = `sess_${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;
    localStorage.setItem('rev_session_id', id);
  }
  return id;
}

export default function App() {
  const [messages, setMessages] = useState([INITIAL_MESSAGE]);
  const [loading, setLoading] = useState(false);
  const [escalated, setEscalated] = useState(false);
  const conversationIdRef = useRef(localStorage.getItem('rev_conv_id') || null);
  const sessionId = useRef(getSessionId()).current;

  const handleSend = async (text) => {
    if (!text.trim() || loading) return;

    const userMessage = { role: 'user', content: text.trim() };
    const nextMessages = [...messages, userMessage];
    setMessages(nextMessages);
    setLoading(true);

    try {
      const res = await fetch('http://localhost:3001/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: nextMessages,
          conversationId: conversationIdRef.current,
          sessionId,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Server error' }));
        throw new Error(err.error || 'Server error');
      }

      const data = await res.json();
      const { reply, conversationId } = data;

      if (conversationId && conversationId !== conversationIdRef.current) {
        conversationIdRef.current = conversationId;
        localStorage.setItem('rev_conv_id', conversationId);
      }

      setMessages(prev => [...prev, { role: 'assistant', content: reply }]);

      // Check if escalation happened (heuristic based on reply content)
      if (reply.toLowerCase().includes('human agent') || reply.toLowerCase().includes('follow up shortly')) {
        setEscalated(true);
      }
    } catch (err) {
      setMessages(prev => [
        ...prev,
        { role: 'assistant', content: `Sorry, something went wrong: ${err.message}. Please try again.` },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const showSuggestions = messages.length === 1 && !loading;

  return (
    <div style={styles.shell}>
      <header style={styles.header}>
        <span style={styles.logo}>
          <span style={styles.logoAccent}>NRG</span> Rev
        </span>
        <span style={styles.tagline}>
          {escalated ? '🔴 Escalated to human agent' : 'Customer Support'}
        </span>
      </header>

      {escalated && (
        <div style={styles.escalationBanner}>
          A human agent has been notified and will follow up shortly. You can continue chatting here.
        </div>
      )}

      <div style={styles.body}>
        <ChatWindow messages={messages} loading={loading} />

        {showSuggestions && (
          <div style={styles.chips}>
            {SUGGESTIONS.map(s => (
              <button key={s} style={styles.chip} onClick={() => handleSend(s)}>
                {s}
              </button>
            ))}
          </div>
        )}

        <InputBar onSend={handleSend} disabled={loading} />
      </div>
    </div>
  );
}

const styles = {
  shell: {
    display: 'flex',
    flexDirection: 'column',
    height: '100vh',
    maxWidth: 760,
    margin: '0 auto',
    background: '#0a0a0a',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '14px 20px',
    borderBottom: '1px solid #222',
    background: '#111',
  },
  logo: {
    fontSize: 18,
    fontWeight: 500,
    letterSpacing: 1,
  },
  logoAccent: {
    color: '#e63946',
    marginRight: 6,
  },
  tagline: {
    fontSize: 11,
    color: '#555',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  escalationBanner: {
    background: '#1a0a0a',
    borderBottom: '1px solid #e63946',
    color: '#e63946',
    fontSize: 12,
    padding: '8px 20px',
    textAlign: 'center',
  },
  body: {
    display: 'flex',
    flexDirection: 'column',
    flex: 1,
    minHeight: 0,
  },
  chips: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 8,
    padding: '10px 16px',
    borderTop: '1px solid #1a1a1a',
  },
  chip: {
    background: 'transparent',
    border: '1px solid #333',
    borderRadius: 20,
    color: '#aaa',
    cursor: 'pointer',
    fontFamily: 'inherit',
    fontSize: 12,
    padding: '6px 14px',
    transition: 'border-color 0.15s, color 0.15s',
  },
};
