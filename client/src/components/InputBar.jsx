import { useState } from 'react';

export default function InputBar({ onSend, disabled }) {
  const [value, setValue] = useState('');

  const submit = () => {
    if (!value.trim() || disabled) return;
    onSend(value);
    setValue('');
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  };

  return (
    <div style={styles.bar}>
      <textarea
        style={styles.input}
        placeholder="Ask Rev anything…"
        value={value}
        disabled={disabled}
        onChange={e => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        rows={1}
      />
      <button
        style={{
          ...styles.button,
          opacity: disabled || !value.trim() ? 0.4 : 1,
          cursor: disabled || !value.trim() ? 'not-allowed' : 'pointer',
        }}
        onClick={submit}
        disabled={disabled || !value.trim()}
      >
        Send
      </button>
    </div>
  );
}

const styles = {
  bar: {
    alignItems: 'flex-end',
    background: '#111',
    borderTop: '1px solid #222',
    display: 'flex',
    gap: 10,
    padding: '12px 16px',
  },
  input: {
    background: '#1a1a1a',
    border: '1px solid #333',
    borderRadius: 10,
    color: '#f0f0f0',
    flex: 1,
    fontFamily: 'inherit',
    fontSize: 14,
    lineHeight: 1.5,
    maxHeight: 120,
    outline: 'none',
    padding: '10px 14px',
    resize: 'none',
  },
  button: {
    background: '#e63946',
    border: 'none',
    borderRadius: 10,
    color: '#fff',
    cursor: 'pointer',
    fontFamily: 'inherit',
    fontSize: 13,
    fontWeight: 500,
    padding: '10px 18px',
    transition: 'opacity 0.15s',
    whiteSpace: 'nowrap',
  },
};
