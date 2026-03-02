export default function Message({ role, content }) {
  const isUser = role === 'user';

  return (
    <div style={{ ...styles.row, justifyContent: isUser ? 'flex-end' : 'flex-start' }}>
      {!isUser && <div style={styles.avatar}>REV</div>}
      <div
        style={{
          ...styles.bubble,
          background: isUser ? '#e63946' : '#1a1a1a',
          color: isUser ? '#fff' : '#e8e8e8',
          borderRadius: isUser ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
        }}
      >
        {content}
      </div>
    </div>
  );
}

const styles = {
  row: {
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
  bubble: {
    fontSize: 14,
    lineHeight: 1.6,
    maxWidth: '72%',
    padding: '10px 14px',
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word',
  },
};
