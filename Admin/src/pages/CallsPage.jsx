import { useState, useEffect } from 'react';
import { settingsApi } from '../api/services.js';
import toast from 'react-hot-toast';

export default function CallsPage() {
  const [calls, setCalls] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadCalls(); }, [page]);

  const loadCalls = async () => {
    setLoading(true);
    try {
      const res = await settingsApi.getCallLogs({ page, limit: 20 });
      setCalls(res.data.data || []);
      setTotal(res.data.pagination?.total || 0);
    } catch { /* empty */ }
    setLoading(false);
  };

  return (
    <div className="fade-in">
      <h1 style={{ fontSize: 24, fontWeight: 800, marginBottom: 24 }}>Call Logs</h1>
      <div className="card" style={{ padding: 0 }}>
        <div className="table-wrapper">
          <table>
            <thead><tr><th>User</th><th>Girl</th><th>Duration</th><th>Coins</th><th>Status</th><th>Date</th></tr></thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} style={{ textAlign: 'center', padding: 40, color: 'var(--text-dim)' }}>Loading...</td></tr>
              ) : calls.length === 0 ? (
                <tr><td colSpan={6} style={{ textAlign: 'center', padding: 40, color: 'var(--text-dim)' }}>No calls yet</td></tr>
              ) : calls.map((c) => (
                <tr key={c._id}>
                  <td>{c.user?.name || '—'}</td>
                  <td>{c.girl?.name || '—'}</td>
                  <td>{c.durationSecs ? `${Math.floor(c.durationSecs/60)}m ${c.durationSecs%60}s` : '—'}</td>
                  <td style={{ color: 'var(--accent)', fontWeight: 600 }}>{c.coinsSpent || 0}</td>
                  <td><span className={`badge badge-${c.status==='ended'?'success':'warning'}`}>{c.status}</span></td>
                  <td style={{ color: 'var(--text-dim)', fontSize: 13 }}>{new Date(c.createdAt).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
