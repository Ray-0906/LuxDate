import { useState, useEffect } from 'react';
import { vipApi } from '../api/services.js';
import toast from 'react-hot-toast';
import { HiOutlinePlus, HiOutlineTrash } from 'react-icons/hi2';

export default function VipPage() {
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', duration: 'monthly', durationDays: 30, price: '', coinsIncluded: 0 });

  useEffect(() => { loadPlans(); }, []);

  const loadPlans = async () => {
    setLoading(true);
    try { const res = await vipApi.listPlans(); setPlans(res.data.data?.plans || []); }
    catch { toast.error('Failed to load plans'); }
    setLoading(false);
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      await vipApi.createPlan({ ...form, price: Number(form.price), coinsIncluded: Number(form.coinsIncluded), durationDays: Number(form.durationDays) });
      toast.success('Plan created'); setShowForm(false); loadPlans();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this plan?')) return;
    try { await vipApi.deletePlan(id); toast.success('Deleted'); loadPlans(); }
    catch { toast.error('Failed'); }
  };

  return (
    <div className="fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 800 }}>VIP Plans</h1>
        <button className="btn btn-primary" onClick={() => setShowForm(!showForm)}><HiOutlinePlus size={16} /> Add Plan</button>
      </div>

      {showForm && (
        <div className="card" style={{ marginBottom: 20 }}>
          <form onSubmit={handleCreate} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14 }}>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>Plan Name</label>
              <input value={form.name} onChange={(e) => setForm({...form, name: e.target.value})} required />
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>Duration</label>
              <select value={form.duration} onChange={(e) => setForm({...form, duration: e.target.value})}>
                <option value="weekly">Weekly</option><option value="monthly">Monthly</option><option value="quarterly">Quarterly</option>
              </select>
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>Days</label>
              <input type="number" value={form.durationDays} onChange={(e) => setForm({...form, durationDays: e.target.value})} required />
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>Price (₹)</label>
              <input type="number" value={form.price} onChange={(e) => setForm({...form, price: e.target.value})} required />
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>Bonus Coins</label>
              <input type="number" value={form.coinsIncluded} onChange={(e) => setForm({...form, coinsIncluded: e.target.value})} />
            </div>
            <div style={{ display: 'flex', alignItems: 'end', gap: 10 }}>
              <button type="submit" className="btn btn-primary">Create</button>
              <button type="button" className="btn btn-ghost" onClick={() => setShowForm(false)}>Cancel</button>
            </div>
          </form>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
        {loading ? (
          <div className="card" style={{ gridColumn: '1 / -1', textAlign: 'center', padding: 40, color: 'var(--text-dim)' }}>Loading...</div>
        ) : plans.map((p) => (
          <div key={p._id} className="card" style={{ position: 'relative' }}>
            <span className={`badge ${p.isActive ? 'badge-success' : 'badge-error'}`} style={{ position: 'absolute', top: 16, right: 16 }}>
              {p.isActive ? 'Active' : 'Inactive'}
            </span>
            <div style={{ fontSize: 12, color: 'var(--text-dim)', textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.05em', marginBottom: 6 }}>{p.duration}</div>
            <div style={{ fontSize: 20, fontWeight: 800, marginBottom: 4 }}>{p.name}</div>
            <div style={{ fontSize: 32, fontWeight: 800, color: 'var(--primary-light)', marginBottom: 12 }}>₹{p.price}</div>
            <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 4 }}>📅 {p.durationDays} days</div>
            <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 16 }}>🪙 {p.coinsIncluded || 0} bonus coins</div>
            <button className="btn btn-danger btn-sm" onClick={() => handleDelete(p._id)}><HiOutlineTrash size={14} /> Delete</button>
          </div>
        ))}
      </div>
    </div>
  );
}
