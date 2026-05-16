import { useState, useEffect } from 'react';
import { vipApi } from '../api/services.js';
import toast from 'react-hot-toast';
import { HiOutlinePlus, HiOutlineTrash, HiOutlinePencilSquare } from 'react-icons/hi2';

const VIP_TYPES = [
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'elite_monthly', label: 'Elite monthly' },
];

function splitVipCoins(totalCoins, durationDays) {
  const T = Number(totalCoins);
  const D = Number(durationDays);
  if (!Number.isFinite(T) || T < 0) return { upfrontCoins: 0, dailyCheckinCoins: 0, totalCoins: 0 };
  if (!Number.isFinite(D) || D < 2) {
    return { upfrontCoins: T, dailyCheckinCoins: 0, totalCoins: T };
  }
  const dailyCheckinCoins = Math.floor(T / (D * 2));
  const upfrontCoins = T - dailyCheckinCoins * (D - 1);
  return { upfrontCoins, dailyCheckinCoins, totalCoins: T };
}

const emptyForm = {
  name: '',
  type: 'monthly',
  durationDays: 30,
  price: '',
  totalCoins: 1000,
  frameType: 'gold',
  badgeType: 'star',
  bonusPerksStr: 'Priority feed',
  isActive: true,
};

export default function VipPage() {
  const [tab, setTab] = useState('plans');
  const [plans, setPlans] = useState([]);
  const [subs, setSubs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);

  const loadPlans = async () => {
    try {
      const res = await vipApi.listPlans();
      setPlans(res.data.data?.plans || []);
    } catch {
      toast.error('Failed to load plans');
    }
  };

  const loadSubs = async () => {
    try {
      const res = await vipApi.listSubscriptions({ limit: 100 });
      setSubs(res.data.data || []);
    } catch {
      toast.error('Failed to load subscriptions');
    }
  };

  useEffect(() => {
    (async () => {
      setLoading(true);
      if (tab === 'plans') await loadPlans();
      else await loadSubs();
      setLoading(false);
    })();
  }, [tab]);

  const buildPayload = () => {
    const { upfrontCoins, dailyCheckinCoins, totalCoins } = splitVipCoins(form.totalCoins, form.durationDays);
    const bonusPerks = form.bonusPerksStr.split(',').map((s) => s.trim()).filter(Boolean);
    return {
      name: form.name,
      type: form.type,
      price: Number(form.price),
      durationDays: Number(form.durationDays),
      upfrontCoins,
      dailyCheckinCoins,
      totalCoins,
      frameType: form.frameType || 'none',
      badgeType: form.badgeType || 'none',
      bonusPerks,
      isActive: form.isActive,
    };
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      await vipApi.createPlan(buildPayload());
      toast.success('Plan created');
      setShowForm(false);
      setForm(emptyForm);
      loadPlans();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed');
    }
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    if (!editingId) return;
    try {
      await vipApi.updatePlan(editingId, buildPayload());
      toast.success('Plan updated');
      setShowForm(false);
      setEditingId(null);
      setForm(emptyForm);
      loadPlans();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed');
    }
  };

  const startEdit = (p) => {
    const T = (p.upfrontCoins || 0) + (p.dailyCheckinCoins || 0) * Math.max(0, (p.durationDays || 0) - 1);
    setForm({
      name: p.name,
      type: p.type,
      durationDays: p.durationDays,
      price: p.price,
      totalCoins: T || p.totalCoins || 1000,
      frameType: p.frameType || 'none',
      badgeType: p.badgeType || 'none',
      bonusPerksStr: (p.bonusPerks || []).join(', '),
      isActive: p.isActive !== false,
    });
    setEditingId(p._id);
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this plan?')) return;
    try {
      await vipApi.deletePlan(id);
      toast.success('Deleted');
      loadPlans();
    } catch {
      toast.error('Failed');
    }
  };

  const splitPreview = splitVipCoins(form.totalCoins, form.durationDays);

  return (
    <div className="fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <h1 style={{ fontSize: 24, fontWeight: 800 }}>VIP</h1>
        <div style={{ display: 'flex', gap: 8 }}>
          <button type="button" className={`btn btn-sm ${tab === 'plans' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setTab('plans')}>Plans</button>
          <button type="button" className={`btn btn-sm ${tab === 'subs' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setTab('subs')}>Subscriptions</button>
        </div>
      </div>

      {tab === 'plans' && (
        <>
          <div style={{ marginBottom: 16 }}>
            <button type="button" className="btn btn-primary" onClick={() => { setShowForm(!showForm); setEditingId(null); setForm(emptyForm); }}>
              <HiOutlinePlus size={16} /> {showForm ? 'Close form' : 'Add plan'}
            </button>
          </div>

          {showForm && (
            <div className="card" style={{ marginBottom: 20 }}>
              <form onSubmit={editingId ? handleUpdate : handleCreate} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 14 }}>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>Name</label>
                  <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
                </div>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>Type</label>
                  <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
                    {VIP_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>Duration days</label>
                  <input type="number" min={2} value={form.durationDays} onChange={(e) => setForm({ ...form, durationDays: e.target.value })} required />
                </div>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>Price ₹</label>
                  <input type="number" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} required />
                </div>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>Total coins (split)</label>
                  <input type="number" value={form.totalCoins} onChange={(e) => setForm({ ...form, totalCoins: e.target.value })} required />
                </div>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>Frame</label>
                  <input value={form.frameType} onChange={(e) => setForm({ ...form, frameType: e.target.value })} placeholder="gold" />
                </div>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>Badge</label>
                  <input value={form.badgeType} onChange={(e) => setForm({ ...form, badgeType: e.target.value })} placeholder="star" />
                </div>
                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>Perks (comma)</label>
                  <input value={form.bonusPerksStr} onChange={(e) => setForm({ ...form, bonusPerksStr: e.target.value })} />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <input type="checkbox" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} id="vip-active" />
                  <label htmlFor="vip-active">Active</label>
                </div>
                <div style={{ gridColumn: '1 / -1', fontSize: 13, color: 'var(--text-muted)' }}>
                  Preview: upfront {splitPreview.upfrontCoins} + daily {splitPreview.dailyCheckinCoins} × (days − 1) = {splitPreview.totalCoins} total
                </div>
                <div style={{ display: 'flex', alignItems: 'end', gap: 10 }}>
                  <button type="submit" className="btn btn-primary">{editingId ? 'Update' : 'Create'}</button>
                  <button type="button" className="btn btn-ghost" onClick={() => { setShowForm(false); setEditingId(null); }}>Cancel</button>
                </div>
              </form>
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
            {loading ? (
              <div className="card" style={{ gridColumn: '1 / -1', textAlign: 'center', padding: 40 }}>Loading...</div>
            ) : plans.map((p) => (
              <div key={p._id} className="card" style={{ position: 'relative' }}>
                <span className={`badge ${p.isActive ? 'badge-success' : 'badge-error'}`} style={{ position: 'absolute', top: 16, right: 16 }}>
                  {p.isActive ? 'Active' : 'Inactive'}
                </span>
                <div style={{ fontSize: 12, color: 'var(--text-dim)', textTransform: 'uppercase', fontWeight: 600, marginBottom: 6 }}>{p.type}</div>
                <div style={{ fontSize: 20, fontWeight: 800, marginBottom: 4 }}>{p.name}</div>
                <div style={{ fontSize: 32, fontWeight: 800, color: 'var(--primary-light)', marginBottom: 12 }}>₹{p.price}</div>
                <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 4 }}>📅 {p.durationDays} days</div>
                <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 4 }}>🪙 Upfront {p.upfrontCoins} + daily {p.dailyCheckinCoins}</div>
                <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                  <button type="button" className="btn btn-ghost btn-sm" onClick={() => startEdit(p)}><HiOutlinePencilSquare size={14} /> Edit</button>
                  <button type="button" className="btn btn-danger btn-sm" onClick={() => handleDelete(p._id)}><HiOutlineTrash size={14} /> Delete</button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {tab === 'subs' && (
        <div className="card" style={{ padding: 0 }}>
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>User</th>
                  <th>Status</th>
                  <th>Days claimed</th>
                  <th>Forfeited</th>
                  <th>Expires</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={5} style={{ textAlign: 'center', padding: 40 }}>Loading...</td></tr>
                ) : subs.length === 0 ? (
                  <tr><td colSpan={5} style={{ textAlign: 'center', padding: 40 }}>No subscriptions</td></tr>
                ) : subs.map((s) => (
                  <tr key={s._id}>
                    <td>{s.userId?.phone || s.userId?.name || '—'}</td>
                    <td>{s.status}</td>
                    <td>{s.dailyCheckinsClaimed ?? 0} / {s.totalDays}</td>
                    <td>{s.unclaimedCoinsForfeited || 0}</td>
                    <td style={{ fontSize: 12 }}>{s.expiresAt ? new Date(s.expiresAt).toLocaleDateString() : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
