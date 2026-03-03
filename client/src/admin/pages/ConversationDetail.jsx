import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAdmin } from '../AdminContext.jsx';

const API = 'http://localhost:3001';

function formatDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: 'numeric', minute: '2-digit', hour12: true,
  });
}

const SENTIMENT_EMOJI = {
  negative: { icon: '😠', color: '#e63946' },
  neutral: { icon: '😐', color: '#888' },
  positive: { icon: '😊', color: '#2dc653' },
};

function ToolCallBlock({ toolCalls }) {
  const [open, setOpen] = useState(false);
  if (!toolCalls || toolCalls.length === 0) return null;
  return (
    <div style={t.toolWrap}>
      <button onClick={() => setOpen(o => !o)} style={t.toolToggle}>
        🔧 Rev used {toolCalls.length} tool{toolCalls.length > 1 ? 's' : ''} {open ? '▲' : '▼'}
      </button>
      {open && toolCalls.map((tc, i) => (
        <div key={i} style={t.toolEntry}>
          <div style={t.toolName}>{tc.tool}</div>
          <div style={t.toolSection}>
            <span style={t.toolLabel}>Input</span>
            <pre style={t.pre}>{JSON.stringify(tc.input, null, 2)}</pre>
          </div>
          <div style={t.toolSection}>
            <span style={t.toolLabel}>Result</span>
            <pre style={t.pre}>{JSON.stringify(tc.result, null, 2)}</pre>
          </div>
        </div>
      ))}
    </div>
  );
}

function MessageBubble({ msg }) {
  const isUser = msg.role === 'user';
  return (
    <div style={{ marginBottom: 20, display: 'flex', flexDirection: 'column', alignItems: isUser ? 'flex-end' : 'flex-start' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
        {!isUser && <span style={t.roleLabel}>Rev</span>}
        <span style={t.timestamp}>{formatDate(msg.created_at)}</span>
        {isUser && <span style={{ ...t.roleLabel, color: '#e63946' }}>Customer</span>}
      </div>
      <div style={{
        ...t.bubble,
        background: isUser ? '#1a0808' : '#151515',
        border: isUser ? '1px solid #3a1a1a' : '1px solid #222',
        maxWidth: '80%',
        alignSelf: isUser ? 'flex-end' : 'flex-start',
      }}>
        {msg.content || <em style={{ color: '#555' }}>No text content</em>}
      </div>
      <ToolCallBlock toolCalls={msg.tool_calls} />
    </div>
  );
}

export default function ConversationDetail() {
  const { id } = useParams();
  const { authFetch, admin } = useAdmin();
  const navigate = useNavigate();

  const [data, setData] = useState(null);
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const [convRes, agentsRes] = await Promise.all([
      authFetch(`${API}/api/admin/conversations/${id}`),
      authFetch(`${API}/api/admin/agents`),
    ]);
    if (convRes.ok) setData(await convRes.json());
    if (agentsRes.ok) {
      const d = await agentsRes.json();
      setAgents(d.agents || []);
    }
    setLoading(false);
  }, [authFetch, id]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const patch = async (body) => {
    setUpdating(true);
    const res = await authFetch(`${API}/api/admin/conversations/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    });
    if (res.ok) {
      const updated = await res.json();
      setData(prev => ({ ...prev, conversation: updated.conversation }));
    }
    setUpdating(false);
  };

  if (loading) return <div style={t.loadScreen}>Loading…</div>;
  if (!data) return <div style={t.loadScreen}>Conversation not found.</div>;

  const { conversation: conv, messages } = data;
  const sent = SENTIMENT_EMOJI[conv.customer_sentiment];

  return (
    <div style={t.shell}>
      {/* Back button */}
      <div style={t.topBar}>
        <button onClick={() => navigate('/admin/conversations')} style={t.backBtn}>
          ← Back to conversations
        </button>
        <span style={t.convId}>{conv.id}</span>
      </div>

      <div style={t.body}>
        {/* Left pane */}
        <div style={t.leftPane}>
          <Section title="Customer">
            <InfoRow label="Name" value={conv.customer?.name || 'Anonymous'} />
            <InfoRow label="Email" value={conv.customer?.email || '—'} />
          </Section>

          <Section title="Conversation">
            <InfoRow label="Status" value={<StatusBadge status={conv.status} />} />
            <InfoRow label="Priority" value={conv.priority || '—'} />
            <InfoRow label="Sentiment" value={sent ? <span style={{ color: sent.color }}>{sent.icon} {conv.customer_sentiment}</span> : '—'} />
            <InfoRow label="Started" value={formatDate(conv.created_at)} />
            {conv.escalated_at && <InfoRow label="Escalated" value={formatDate(conv.escalated_at)} />}
            {conv.resolved_at && <InfoRow label="Resolved" value={formatDate(conv.resolved_at)} />}
            <InfoRow label="Messages" value={messages.length} />
          </Section>

          {conv.escalation_reason && (
            <Section title="Escalation Reason">
              <p style={t.reasonText}>"{conv.escalation_reason}"</p>
            </Section>
          )}

          <Section title="Assigned Agent">
            <select
              style={t.select}
              value={conv.assigned_agent || ''}
              onChange={e => patch({ assigned_agent: e.target.value || null })}
              disabled={updating}
            >
              <option value="">Unassigned</option>
              {agents.map(a => (
                <option key={a.id} value={a.name}>{a.name}</option>
              ))}
              {admin?.name && !agents.find(a => a.name === admin.name) && (
                <option value={admin.name}>{admin.name} (you)</option>
              )}
            </select>
          </Section>

          <Section title="Actions">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {conv.status !== 'resolved' && (
                <button
                  style={t.actionBtn}
                  onClick={() => patch({ status: 'resolved' })}
                  disabled={updating}
                >
                  Mark Resolved
                </button>
              )}
              {conv.status === 'resolved' && (
                <button
                  style={{ ...t.actionBtn, background: '#222', color: '#aaa' }}
                  onClick={() => patch({ status: 'active' })}
                  disabled={updating}
                >
                  Reopen
                </button>
              )}
              <button
                style={{ ...t.actionBtn, background: 'none', border: '1px solid #333', color: '#aaa' }}
                onClick={() => patch({ assigned_agent: admin?.name || null })}
                disabled={updating}
              >
                Assign to Me
              </button>
            </div>
          </Section>
        </div>

        {/* Right pane — message thread */}
        <div style={t.rightPane}>
          <div style={t.threadHeader}>Message Thread</div>
          <div style={t.thread}>
            {messages.length === 0 && (
              <div style={{ color: '#555', fontSize: 14 }}>No messages yet.</div>
            )}
            {messages.map(msg => <MessageBubble key={msg.id} msg={msg} />)}
          </div>
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div style={t.section}>
      <div style={t.sectionTitle}>{title}</div>
      {children}
    </div>
  );
}

function InfoRow({ label, value }) {
  return (
    <div style={t.infoRow}>
      <span style={t.infoLabel}>{label}</span>
      <span style={t.infoValue}>{value}</span>
    </div>
  );
}

function StatusBadge({ status }) {
  const colors = {
    escalated: '#e63946',
    active: '#2dc653',
    pending: '#f4a261',
    resolved: '#555',
  };
  return (
    <span style={{
      background: colors[status] || '#444',
      borderRadius: 3,
      color: status === 'resolved' ? '#aaa' : '#fff',
      fontSize: 10,
      fontWeight: 700,
      letterSpacing: 0.5,
      padding: '2px 7px',
      textTransform: 'uppercase',
    }}>
      {status}
    </span>
  );
}

const t = {
  shell: { minHeight: '100vh', background: '#0a0a0a', color: '#f0f0f0', fontFamily: 'inherit' },
  loadScreen: { color: '#555', padding: 40, textAlign: 'center' },
  topBar: {
    display: 'flex',
    alignItems: 'center',
    gap: 16,
    padding: '10px 24px',
    background: '#111',
    borderBottom: '1px solid #222',
  },
  backBtn: {
    background: 'none',
    border: 'none',
    color: '#888',
    cursor: 'pointer',
    fontFamily: 'inherit',
    fontSize: 13,
    padding: 0,
  },
  convId: { color: '#444', fontSize: 11, fontFamily: 'monospace' },
  body: { display: 'flex', height: 'calc(100vh - 45px)' },
  leftPane: {
    width: 280,
    minWidth: 240,
    background: '#0f0f0f',
    borderRight: '1px solid #1a1a1a',
    overflowY: 'auto',
    padding: '16px 0',
  },
  rightPane: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    overflowY: 'auto',
  },
  threadHeader: {
    background: '#111',
    borderBottom: '1px solid #1a1a1a',
    color: '#555',
    fontSize: 11,
    letterSpacing: 1,
    padding: '10px 24px',
    textTransform: 'uppercase',
  },
  thread: { flex: 1, padding: '24px', overflowY: 'auto' },
  section: {
    borderBottom: '1px solid #1a1a1a',
    padding: '14px 20px',
  },
  sectionTitle: {
    color: '#555',
    fontSize: 10,
    fontWeight: 700,
    letterSpacing: 1,
    marginBottom: 10,
    textTransform: 'uppercase',
  },
  infoRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 6,
    gap: 8,
  },
  infoLabel: { color: '#666', fontSize: 12 },
  infoValue: { color: '#ccc', fontSize: 12, textAlign: 'right', wordBreak: 'break-word' },
  reasonText: { color: '#aaa', fontSize: 13, fontStyle: 'italic', lineHeight: 1.5, margin: 0 },
  select: {
    background: '#111',
    border: '1px solid #333',
    borderRadius: 4,
    color: '#ccc',
    fontFamily: 'inherit',
    fontSize: 12,
    padding: '6px 8px',
    width: '100%',
    cursor: 'pointer',
  },
  actionBtn: {
    background: '#e63946',
    border: 'none',
    borderRadius: 4,
    color: '#fff',
    cursor: 'pointer',
    fontFamily: 'inherit',
    fontSize: 13,
    fontWeight: 600,
    padding: '9px 14px',
    width: '100%',
  },
  roleLabel: { color: '#888', fontSize: 11, fontWeight: 700, letterSpacing: 0.5, textTransform: 'uppercase' },
  timestamp: { color: '#444', fontSize: 11 },
  bubble: {
    borderRadius: 6,
    color: '#d0d0d0',
    fontSize: 14,
    lineHeight: 1.6,
    padding: '10px 14px',
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word',
  },
  toolWrap: { marginTop: 6, maxWidth: '80%' },
  toolToggle: {
    background: '#1a1a1a',
    border: '1px solid #2a2a2a',
    borderRadius: 4,
    color: '#888',
    cursor: 'pointer',
    fontFamily: 'inherit',
    fontSize: 11,
    padding: '4px 10px',
  },
  toolEntry: {
    background: '#111',
    border: '1px solid #222',
    borderRadius: 4,
    marginTop: 4,
    padding: '10px',
  },
  toolName: {
    color: '#aaa',
    fontFamily: 'monospace',
    fontSize: 12,
    fontWeight: 700,
    marginBottom: 8,
  },
  toolSection: { marginBottom: 8 },
  toolLabel: {
    color: '#555',
    fontSize: 10,
    fontWeight: 700,
    letterSpacing: 1,
    textTransform: 'uppercase',
    display: 'block',
    marginBottom: 4,
  },
  pre: {
    background: '#0a0a0a',
    border: '1px solid #1a1a1a',
    borderRadius: 3,
    color: '#888',
    fontFamily: 'monospace',
    fontSize: 11,
    margin: 0,
    overflow: 'auto',
    padding: '6px 8px',
    whiteSpace: 'pre-wrap',
  },
};
