import { useEffect, useRef } from 'react';
import Message from './Message.jsx';

function TypingIndicator() {
  return (
    <div style={styles.typingRow}>
      <div style={styles.avatar}>REV</div>
      <div style={styles.typingBubble}>
        <span style={{ ...styles.dot, animationDelay: '0ms' }} />
        <span style={{ ...styles.dot, animationDelay: '160ms' }} />
        <span style={{ ...styles.dot, animationDelay: '320ms' }} />
      </div>
      <style>{dotKeyframes}</style>
    </div>
  );
}

const dotKeyframes = `
@keyframes blink {
  0%, 80%, 100% { opacity: 0.2; transform: scale(0.85); }
  40% { opacity: 1; transform: scale(1); }
}
`;

export default function ChatWindow({ messages, loading }) {
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  return (
    <div style={styles.window}>
      {messages.map((msg, i) => (
        <Message key={i} role={msg.role} content={msg.content} />
      ))}
      {loading && <TypingIndicator />}
      <div ref={bottomRef} />
    </div>
  );
}

const styles = {
  window: {
    display: 'flex',
    flexDirection: 'column',
    flex: 1,
    overflowY: 'auto',
    padding: '20px 16px 8px',
    scrollbarWidth: 'thin',
    scrollbarColor: '#333 transparent',
  },
  typingRow: {
    display: 'flex',
    alignItems: 'flex-end',
    gap: 10,
    marginBottom: 12,
  },
  avatar: {
    background: '#e63946',
    borderRadius: '50%',
    color: '#fff',
    flexShrink: 0,
    fontSize: 9,
    fontWeight: 500,
    height: 28,
    letterSpacing: 0.5,
    lineHeight: '28px',
    textAlign: 'center',
    width: 28,
  },
  typingBubble: {
    alignItems: 'center',
    background: '#1a1a1a',
    borderRadius: '18px 18px 18px 4px',
    display: 'flex',
    gap: 5,
    height: 38,
    padding: '0 16px',
  },
  dot: {
    animation: 'blink 1.2s infinite ease-in-out',
    background: '#666',
    borderRadius: '50%',
    display: 'inline-block',
    height: 7,
    width: 7,
  },
};
