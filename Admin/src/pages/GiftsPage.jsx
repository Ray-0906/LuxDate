import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import {
  HiOutlinePencilSquare,
  HiOutlinePlus,
  HiOutlineTrash,
} from 'react-icons/hi2';
import { giftsApi } from '../api/services.js';

const EMPTY_FORM = {
  name: '',
  coinCost: '10',
  sortOrder: '0',
  iconUrl: '',
  animationUrl: '',
  emojiFallback: '',
  isActive: true,
};

const isValidUrl = (value) => {
  if (!value) return true;
  try {
    const url = new URL(value);
    return ['http:', 'https:'].includes(url.protocol);
  } catch {
    return false;
  }
};

export default function GiftsPage() {
  const [gifts, setGifts] = useState([]);
  const [stats, setStats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);

  const sortedGifts = useMemo(() => (
    [...gifts].sort((a, b) => (
      (a.coinCost ?? 0) - (b.coinCost ?? 0)
      || (a.sortOrder ?? 0) - (b.sortOrder ?? 0)
      || String(a.name || '').localeCompare(String(b.name || ''))
    ))
  ), [gifts]);

  async function loadGifts() {
    setLoading(true);
    try {
      const res = await giftsApi.list();
      setGifts(res.data.data?.gifts || []);
    } catch {
      toast.error('Failed to load gifts');
    } finally {
      setLoading(false);
    }
  }

  async function loadStats() {
    setStatsLoading(true);
    try {
      const res = await giftsApi.getStats({ page: 1, limit: 8 });
      setStats(res.data.data || []);
    } catch {
      toast.error('Failed to load gift stats');
    } finally {
      setStatsLoading(false);
    }
  }

  useEffect(() => {
    Promise.resolve().then(() => {
      loadGifts();
      loadStats();
    });
  }, []);

  const resetForm = () => {
    setForm(EMPTY_FORM);
    setEditingId(null);
    setShowForm(false);
  };

  const validateForm = () => {
    if (!form.name.trim()) {
      toast.error('Gift name required');
      return false;
    }
    if (!Number(form.coinCost) || Number(form.coinCost) < 1) {
      toast.error('Coin cost must be at least 1');
      return false;
    }
    if (!isValidUrl(form.iconUrl)) {
      toast.error('Icon URL must be valid');
      return false;
    }
    if (!isValidUrl(form.animationUrl)) {
      toast.error('Animation URL must be valid');
      return false;
    }
    return true;
  };

  const buildPayload = () => ({
    name: form.name.trim(),
    coinCost: Number(form.coinCost),
    level: 1,
    sortOrder: Number(form.sortOrder),
    iconUrl: form.iconUrl.trim(),
    animationUrl: form.animationUrl.trim(),
    emojiFallback: form.emojiFallback.trim(),
    isActive: !!form.isActive,
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    try {
      if (editingId) {
        await giftsApi.update(editingId, buildPayload());
        toast.success('Gift updated');
      } else {
        await giftsApi.create(buildPayload());
        toast.success('Gift created');
      }
      resetForm();
      loadGifts();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to save gift');
    }
  };

  const handleEdit = (gift) => {
    setEditingId(gift._id);
    setForm({
      name: gift.name || '',
      coinCost: String(gift.coinCost ?? 10),
      sortOrder: String(gift.sortOrder ?? 0),
      iconUrl: gift.iconUrl || '',
      animationUrl: gift.animationUrl || '',
      emojiFallback: gift.emojiFallback || '',
      isActive: gift.isActive !== false,
    });
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this gift?')) return;
    try {
      await giftsApi.delete(id);
      toast.success('Gift deleted');
      loadGifts();
    } catch {
      toast.error('Failed to delete gift');
    }
  };

  const handleToggle = async (gift) => {
    try {
      await giftsApi.update(gift._id, { isActive: !gift.isActive });
      toast.success(gift.isActive ? 'Gift disabled' : 'Gift enabled');
      loadGifts();
    } catch {
      toast.error('Failed to update gift state');
    }
  };

  return (
    <div className="fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800 }}>Gift Catalog</h1>
          <p style={{ color: 'var(--text-muted)', marginTop: 6 }}>Gifts now show by coin price first. Sort order only breaks ties.</p>
        </div>
        <button className="btn btn-primary" onClick={() => {
          if (showForm && !editingId) {
            resetForm();
          } else {
            setEditingId(null);
            setForm(EMPTY_FORM);
            setShowForm(true);
          }
        }}>
          <HiOutlinePlus size={16} />
          {showForm && !editingId ? 'Close' : 'Add Gift'}
        </button>
      </div>

      {showForm && (
        <div className="card" style={{ marginBottom: 20 }}>
          <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 14 }}>
            <div>
              <label style={labelStyle}>Name</label>
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            </div>
            <div>
              <label style={labelStyle}>Coin Cost</label>
              <input type="number" min={1} value={form.coinCost} onChange={(e) => setForm({ ...form, coinCost: e.target.value })} required />
            </div>
            <div>
              <label style={labelStyle}>Sort Order</label>
              <input type="number" min={0} value={form.sortOrder} onChange={(e) => setForm({ ...form, sortOrder: e.target.value })} />
            </div>
            <div style={{ gridColumn: '1 / 3' }}>
              <label style={labelStyle}>Icon URL</label>
              <input value={form.iconUrl} onChange={(e) => setForm({ ...form, iconUrl: e.target.value })} placeholder="https://..." />
            </div>
            <div style={{ gridColumn: '3 / 5' }}>
              <label style={labelStyle}>Animation URL</label>
              <input value={form.animationUrl} onChange={(e) => setForm({ ...form, animationUrl: e.target.value })} placeholder="https://... optional" />
            </div>
            <div>
              <label style={labelStyle}>Emoji Fallback</label>
              <input value={form.emojiFallback} onChange={(e) => setForm({ ...form, emojiFallback: e.target.value })} placeholder="🎁" />
            </div>
            <div style={{ display: 'flex', alignItems: 'end' }}>
              <label style={{ display: 'flex', gap: 8, alignItems: 'center', color: 'var(--text-muted)', fontSize: 13, fontWeight: 600 }}>
                <input type="checkbox" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} />
                Active
              </label>
            </div>
            <div style={{ gridColumn: '1 / -1', display: 'flex', gap: 10 }}>
              <button type="submit" className="btn btn-primary">{editingId ? 'Save Gift' : 'Create Gift'}</button>
              <button type="button" className="btn btn-ghost" onClick={resetForm}>Cancel</button>
            </div>
          </form>
        </div>
      )}

      <div className="card" style={{ marginBottom: 20 }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ textAlign: 'left', color: 'var(--text-muted)', fontSize: 12 }}>
                <th style={thStyle}>Gift</th>
                <th style={thStyle}>Coins</th>
                <th style={thStyle}>Sort</th>
                <th style={thStyle}>Animation</th>
                <th style={thStyle}>State</th>
                <th style={thStyle}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="6" style={emptyCellStyle}>Loading gifts...</td></tr>
              ) : sortedGifts.length === 0 ? (
                <tr><td colSpan="6" style={emptyCellStyle}>No gifts yet</td></tr>
              ) : sortedGifts.map((gift) => (
                <tr key={gift._id} style={{ borderTop: '1px solid var(--border)' }}>
                  <td style={tdStyle}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      {gift.iconUrl ? (
                        <img src={gift.iconUrl} alt={gift.name} style={{ width: 42, height: 42, objectFit: 'cover', borderRadius: 12, background: 'rgba(255,255,255,0.05)' }} />
                      ) : (
                        <div style={{ width: 42, height: 42, borderRadius: 12, background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>
                          {gift.emojiFallback || '🎁'}
                        </div>
                      )}
                      <div>
                        <div style={{ fontWeight: 700 }}>{gift.name}</div>
                        <div style={{ color: 'var(--text-muted)', fontSize: 12 }}>{gift.emojiFallback || 'no fallback'}</div>
                      </div>
                    </div>
                  </td>
                  <td style={tdStyle}>{gift.coinCost}</td>
                  <td style={tdStyle}>{gift.sortOrder ?? 0}</td>
                  <td style={tdStyle}>{gift.animationUrl ? 'Yes' : 'No'}</td>
                  <td style={tdStyle}>
                    <span className={`badge badge-${gift.isActive ? 'success' : 'error'}`}>
                      {gift.isActive ? 'Active' : 'Hidden'}
                    </span>
                  </td>
                  <td style={tdStyle}>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button className="btn btn-ghost btn-sm" onClick={() => handleEdit(gift)}>
                        <HiOutlinePencilSquare size={14} />
                      </button>
                      <button className="btn btn-ghost btn-sm" onClick={() => handleToggle(gift)}>
                        {gift.isActive ? 'Disable' : 'Enable'}
                      </button>
                      <button className="btn btn-danger btn-sm" onClick={() => handleDelete(gift._id)}>
                        <HiOutlineTrash size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <h2 style={{ fontSize: 18, fontWeight: 800 }}>Recent Gift Sends</h2>
          <button className="btn btn-ghost btn-sm" onClick={loadStats}>Refresh</button>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ textAlign: 'left', color: 'var(--text-muted)', fontSize: 12 }}>
                <th style={thStyle}>Sender</th>
                <th style={thStyle}>Girl</th>
                <th style={thStyle}>Gift</th>
                <th style={thStyle}>Qty</th>
                <th style={thStyle}>Total Coins</th>
                <th style={thStyle}>When</th>
              </tr>
            </thead>
            <tbody>
              {statsLoading ? (
                <tr><td colSpan="6" style={emptyCellStyle}>Loading gift stats...</td></tr>
              ) : stats.length === 0 ? (
                <tr><td colSpan="6" style={emptyCellStyle}>No gift transactions yet</td></tr>
              ) : stats.map((row) => (
                <tr key={row._id} style={{ borderTop: '1px solid var(--border)' }}>
                  <td style={tdStyle}>{row.fromUserId?.name || 'Unknown user'}</td>
                  <td style={tdStyle}>{row.toGirlProfileId?.name || 'Unknown girl'}</td>
                  <td style={tdStyle}>{row.giftName || row.giftId?.name || 'Gift'}</td>
                  <td style={tdStyle}>{row.quantity || 1}</td>
                  <td style={tdStyle}>{row.totalCoinsSpent || 0}</td>
                  <td style={tdStyle}>{row.sentAt ? new Date(row.sentAt).toLocaleString() : '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

const labelStyle = {
  fontSize: 12,
  fontWeight: 600,
  color: 'var(--text-muted)',
  display: 'block',
  marginBottom: 6,
};

const thStyle = {
  paddingBottom: 12,
};

const tdStyle = {
  paddingTop: 14,
  paddingBottom: 14,
  verticalAlign: 'middle',
};

const emptyCellStyle = {
  padding: 28,
  textAlign: 'center',
  color: 'var(--text-dim)',
};
