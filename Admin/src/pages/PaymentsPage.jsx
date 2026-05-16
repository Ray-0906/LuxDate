import { useState, useEffect } from 'react';
import { paymentsAdminApi } from '../api/services.js';
import toast from 'react-hot-toast';

export default function PaymentsPage() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState('');
  const [purpose, setPurpose] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const res = await paymentsAdminApi.transactions({
        limit: 50,
        ...(status ? { status } : {}),
        ...(purpose ? { purpose } : {}),
      });
      setRows(res.data.data || []);
    } catch {
      toast.error('Failed to load payments');
      setRows([]);
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  return (
    <div className="fade-in">
      <h1 style={{ fontSize: 24, fontWeight: 800, marginBottom: 16 }}>Payments</h1>
      <div className="card" style={{ marginBottom: 16, display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'end' }}>
        <div>
          <label style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>Status</label>
          <select value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">All</option>
            <option value="created">Created</option>
            <option value="success">Success</option>
            <option value="failed">Failed</option>
          </select>
        </div>
        <div>
          <label style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>Purpose</label>
          <select value={purpose} onChange={(e) => setPurpose(e.target.value)}>
            <option value="">All</option>
            <option value="coins">Coins</option>
            <option value="vip">VIP</option>
          </select>
        </div>
        <button type="button" className="btn btn-primary btn-sm" onClick={load}>Apply</button>
      </div>

      <div className="card" style={{ padding: 0 }}>
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>User</th>
                <th>Purpose</th>
                <th>Amount ₹</th>
                <th>Status</th>
                <th>Gateway order</th>
                <th>Created</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} style={{ textAlign: 'center', padding: 40 }}>Loading...</td></tr>
              ) : rows.length === 0 ? (
                <tr><td colSpan={6} style={{ textAlign: 'center', padding: 40 }}>No transactions</td></tr>
              ) : rows.map((r) => (
                <tr key={r._id}>
                  <td style={{ fontSize: 13 }}>
                    {r.userId?.phone || r.userId?.name || r.userId?._id || '—'}
                  </td>
                  <td>{r.purpose}</td>
                  <td>{r.amount}</td>
                  <td>
                    <span className={`badge ${
                      r.status === 'success' ? 'badge-success'
                        : r.status === 'failed' ? 'badge-error' : 'badge-warning'
                    }`}>
                      {r.status}
                    </span>
                  </td>
                  <td style={{ fontSize: 11, wordBreak: 'break-all' }}>{r.gatewayOrderId || '—'}</td>
                  <td style={{ fontSize: 12, color: 'var(--text-dim)' }}>
                    {r.createdAt ? new Date(r.createdAt).toLocaleString() : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
