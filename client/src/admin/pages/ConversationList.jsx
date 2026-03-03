import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAdmin } from '../AdminContext.jsx';

const API = 'http://localhost:3001';

function relativeTime(iso) {
  if (!iso) return '—';
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

const STATUS_COLORS = {
  escalated: '#e63946',
  active: '#2dc653',
  pending: '#f4a261',
  resolved: '#555',
};

const SENTIMENT_EMOJI = {
  negative: { icon: '😠', color: '#e63946' },
  neutral: { icon: '😐', color: '#888' },
  positive: { icon: '😊', color: '#2dc653' },
};

function StatusBadge({ status }) {
  return (
    <span style={{
      background: STATUS_COLORS[status] || '#444',
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

function ConvRow({ conv, onClick }) {
  const sent = SENTIMENT_EMOJI[conv.customer_sentiment];
  const isEscalated = conv.status === 'escalated';

  return (
    <div
      onClick={onClick}
      style={{
        ...s.row,
        borderLeft: isEscalated ? '3px solid #e63946' : '3px solid transparent',
      }}
    >
      <div style={s.rowTop}>
        <StatusBadge status={conv.status} />
        <span style={s.customerName}>{conv.customer?.name || 'Anonymous'}</span>
        <span style={s.timeAgo}>{relativeTime(conv.last_message_at || conv.created_at)}</span>
        <span style={s.arrow}>›</span>
      </div>
      <div style={s.rowEmail}>{conv.customer?.email || '—'}</div>
      {conv.last_message_preview && (
        <div style={s.preview}>"{conv.last_message_preview}"</div>
      )}
      <div style={s.rowMeta}>
        <span>{conv.message_count} message{conv.message_count !== 1 ? 's' : ''}</span>
        {conv.priority && <span>· {conv.priority.charAt(0).toUpperCase() + conv.priority.slice(1)} priority</span>}
        {sent && <span style={{ color: sent.color }}>· {sent.icon} {conv.customer_sentiment.charAt(0).toUpperCase() + conv.customer_sentiment.slice(1)}</span>}
        {isEscalated && !conv.assigned_agent && (
          <span style={s.unassignedPill}>Unassigned</span>
        )}
        {conv.assigned_agent && (
          <span style={s.assignedPill}>→ {conv.assigned_agent}</span>
        )}
      </div>
      {isEscalated && conv.escalation_reason && (
        <div style={s.reason}>Reason: {conv.escalation_reason}</div>
      )}
    </div>
  );
}

const STATUS_TABS = ['all', 'escalated', 'active', 'pending', 'resolved'];
const SORT_OPTIONS = [
  { value: 'created_at', label: 'Newest' },
  { value: 'escalated_at', label: 'Escalated First' },
  { value: 'message_count', label: 'Most Messages' },
  { value: 'sentiment', label: 'Sentiment' },
];

export default function ConversationList() {
  const { authFetch, logout, admin } = useAdmin();
  const navigate = useNavigate();

  const [conversations, setConversations] = useState([]);
  const [stats, setStats] = useState(null);
  const [statusFilter, setStatusFilter] = useState('all');
  const [sort, setSort] = useState('created_at');
  const [search, setSearch] = useState('');
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  const LIMIT = 25;

  const fetchStats = useCallback(async () => {
    const res = await authFetch(`${API}/api/admin/stats`);
    if (res.ok) setStats(await res.json());
  }, [authFetch]);

  const fetchConversations = useCallback(async (reset = false) => {
    setLoading(true);
    const currentPage = reset ? 1 : page;
    const params = new URLSearchParams({
      status: statusFilter,
      sort,
      order: 'desc',
      search,
      page: currentPage,
      limit: LIMIT,
    });
    const res = await authFetch(`${API}/api/admin/conversations?${params}`);
    if (res.ok) {
      const data = await res.json();
      if (reset || currentPage === 1) {
        setConversations(data.conversations);
        setPage(1);
      } else {
        setConversations(prev => [...prev, ...data.conversations]);
      }
      setTotal(data.total);
    }
    setLoading(false);
  }, [authFetch, statusFilter, sort, search, page]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  useEffect(() => {
    fetchConversations(true);
    setPage(1);
  }, [statusFilter, sort, search, authFetch]);

  const loadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    fetchConversations(false);
  };

  const hasMore = conversations.length < total;

  return (
    <div style={s.shell}>
      {/* Header */}
      <header style={s.header}>
        <div style={s.headerLeft}>
          <span style={s.logo}><span style={s.logoAccent}>NRG</span> Rev Admin</span>
        </div>
        {stats && (
          <div style={s.statsRow}>
            {['all', 'escalated', 'active', 'resolved', 'pending'].map(key => {
              const count = key === 'all' ? stats.total : stats[key] ?? 0;
              return (
                <button
                  key={key}
                  onClick={() => setStatusFilter(key)}
                  style={{
                    ...s.statBtn,
                    color: statusFilter === key ? '#f0f0f0' : '#666',
                    borderBottom: statusFilter === key ? '2px solid #e63946' : '2px solid transparent',
                  }}
                >
                  {key.charAt(0).toUpperCase() + key.slice(1)} ({count})
                </button>
              );
            })}
          </div>
        )}
        <div style={s.headerRight}>
          <input
            style={s.searchInput}
            placeholder="Search customer…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          <button onClick={logout} style={s.logoutBtn}>Sign out</button>
        </div>
      </header>

      {/* Filter bar */}
      <div style={s.filterBar}>
        <div style={s.tabs}>
          {STATUS_TABS.map(tab => (
            <button
              key={tab}
              onClick={() => setStatusFilter(tab)}
              style={{
                ...s.tab,
                color: statusFilter === tab ? '#f0f0f0' : '#555',
                borderBottom: statusFilter === tab ? '2px solid #e63946' : '2px solid transparent',
              }}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>
        <div style={s.filterRight}>
          <select
            value={sort}
            onChange={e => setSort(e.target.value)}
            style={s.select}
          >
            {SORT_OPTIONS.map(o => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
          <span style={s.resultCount}>
            Showing {conversations.length} of {total}
          </span>
        </div>
      </div>

      {/* List */}
      <div style={s.list}>
        {loading && conversations.length === 0 && (
          <div style={s.empty}>Loading…</div>
        )}
        {!loading && conversations.length === 0 && (
          <div style={s.empty}>No conversations found.</div>
        )}
        {conversations.map(conv => (
          <ConvRow
            key={conv.id}
            conv={conv}
            onClick={() => navigate(`/admin/conversations/${conv.id}`)}
          />
        ))}
        {hasMore && (
          <button onClick={loadMore} style={s.loadMore} disabled={loading}>
            {loading ? 'Loading…' : 'Load more'}
          </button>
        )}
      </div>
    </div>
  );
}

const s = {
  shell: {
    minHeight: '100vh',
    background: '#0a0a0a',
    color: '#f0f0f0',
    fontFamily: 'inherit',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '12px 24px',
    background: '#111',
    borderBottom: '1px solid #222',
    gap: 16,
    flexWrap: 'wrap',
  },
  headerLeft: { display: 'flex', alignItems: 'center' },
  logo: { fontSize: 17, fontWeight: 600, letterSpacing: 1 },
  logoAccent: { color: '#e63946', marginRight: 6 },
  statsRow: { display: 'flex', gap: 4 },
  statBtn: {
    background: 'none',
    border: 'none',
    borderBottom: '2px solid transparent',
    cursor: 'pointer',
    fontFamily: 'inherit',
    fontSize: 12,
    padding: '4px 10px',
    letterSpacing: 0.3,
  },
  headerRight: { display: 'flex', alignItems: 'center', gap: 10 },
  searchInput: {
    background: '#0a0a0a',
    border: '1px solid #333',
    borderRadius: 4,
    color: '#f0f0f0',
    fontFamily: 'inherit',
    fontSize: 13,
    padding: '7px 12px',
    width: 200,
    outline: 'none',
  },
  logoutBtn: {
    background: 'none',
    border: '1px solid #333',
    borderRadius: 4,
    color: '#666',
    cursor: 'pointer',
    fontFamily: 'inherit',
    fontSize: 12,
    padding: '6px 12px',
  },
  filterBar: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0 24px',
    background: '#0f0f0f',
    borderBottom: '1px solid #1a1a1a',
  },
  tabs: { display: 'flex' },
  tab: {
    background: 'none',
    border: 'none',
    borderBottom: '2px solid transparent',
    cursor: 'pointer',
    fontFamily: 'inherit',
    fontSize: 12,
    letterSpacing: 0.5,
    padding: '10px 14px',
    textTransform: 'uppercase',
  },
  filterRight: { display: 'flex', alignItems: 'center', gap: 14 },
  select: {
    background: '#111',
    border: '1px solid #333',
    borderRadius: 4,
    color: '#aaa',
    fontFamily: 'inherit',
    fontSize: 12,
    padding: '5px 10px',
    cursor: 'pointer',
  },
  resultCount: { color: '#555', fontSize: 12 },
  list: { padding: '16px 24px', maxWidth: 900, margin: '0 auto' },
  empty: { color: '#555', fontSize: 14, padding: '40px 0', textAlign: 'center' },
  row: {
    background: '#111',
    border: '1px solid #1e1e1e',
    borderRadius: 6,
    cursor: 'pointer',
    marginBottom: 10,
    padding: '14px 16px',
    transition: 'border-color 0.15s, background 0.15s',
  },
  rowTop: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    marginBottom: 4,
  },
  customerName: { fontWeight: 600, fontSize: 14, flex: 1 },
  timeAgo: { color: '#555', fontSize: 12 },
  arrow: { color: '#555', fontSize: 16 },
  rowEmail: { color: '#666', fontSize: 12, marginBottom: 6 },
  preview: {
    color: '#888',
    fontSize: 13,
    fontStyle: 'italic',
    marginBottom: 8,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  rowMeta: {
    display: 'flex',
    gap: 10,
    fontSize: 12,
    color: '#666',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  unassignedPill: {
    background: '#3a2a0a',
    border: '1px solid #f4a261',
    borderRadius: 10,
    color: '#f4a261',
    fontSize: 10,
    padding: '1px 8px',
  },
  assignedPill: {
    background: '#0a1a0a',
    border: '1px solid #2dc653',
    borderRadius: 10,
    color: '#2dc653',
    fontSize: 10,
    padding: '1px 8px',
  },
  reason: {
    color: '#888',
    fontSize: 12,
    fontStyle: 'italic',
    marginTop: 6,
    paddingTop: 6,
    borderTop: '1px solid #1a1a1a',
  },
  loadMore: {
    background: 'none',
    border: '1px solid #333',
    borderRadius: 4,
    color: '#888',
    cursor: 'pointer',
    display: 'block',
    fontFamily: 'inherit',
    fontSize: 13,
    margin: '16px auto 0',
    padding: '10px 24px',
    width: '100%',
  },
};
