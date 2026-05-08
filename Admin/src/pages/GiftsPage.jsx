import { useState, useEffect } from 'react';
import { giftsApi } from '../api/services.js';
import toast from 'react-hot-toast';
import { HiOutlinePlus, HiOutlineTrash } from 'react-icons/hi2';

export default function GiftsPage() {
  const [gifts, setGifts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', coinCost: '', category: 'regular', image: '' });

  useEffect(() => { loadGifts(); }, []);

  const loadGifts = async () => {
    setLoading(true);
    try {
      const res = await giftsApi.list();
      setGifts(res.data.data?.gifts || []);
    } catch { toast.error('Failed to load gifts'); }
    setLoading(false);
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      await giftsApi.create(form);
      toast.success('Gift created');
      setShowForm(false);
      setForm({ name: '', coinCost: '', category: 'regular', image: '' });
      loadGifts();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this gift?')) return;
    try { await giftsApi.delete(id); toast.success('Deleted'); loadGifts(); }
    catch { toast.error('Failed'); }
  };

  return (
    <div className="fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 800 }}>Gift Catalog</h1>
        <button className="btn btn-primary" onClick={() => setShowForm(!showForm)}><HiOutlinePlus size={16} /> Add Gift</button>
      </div>

      {showForm && (
        <div className="card" style={{ marginBottom: 20 }}>
          <form onSubmit={handleCreate} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14 }}>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>Name</label>
              <input value={form.name} onChange={(e) => setForm({...form, name: e.target.value})} required />
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>Coin Cost</label>
              <input type="number" value={form.coinCost} onChange={(e) => setForm({...form, coinCost: e.target.value})} required min={1} />
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>Category</label>
              <select value={form.category} onChange={(e) => setForm({...form, category: e.target.value})}>
                <option value="regular">Regular</option><option value="premium">Premium</option><option value="special">Special</option>
              </select>
            </div>
            <div style={{ gridColumn: '1 / -1', display: 'flex', gap: 10 }}>
              <button type="submit" className="btn btn-primary">Create</button>
              <button type="button" className="btn btn-ghost" onClick={() => setShowForm(false)}>Cancel</button>
            </div>
          </form>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 14 }}>
        {loading ? (
          <div className="card" style={{ gridColumn: '1 / -1', textAlign: 'center', padding: 40, color: 'var(--text-dim)' }}>Loading...</div>
        ) : gifts.length === 0 ? (
          <div className="card" style={{ gridColumn: '1 / -1', textAlign: 'center', padding: 40, color: 'var(--text-dim)' }}>No gifts yet</div>
        ) : gifts.map((g) => (
          <div key={g._id} className="card" style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 36, marginBottom: 8 }}>{g.image ? '🎁' : '🎁'}</div>
            <div style={{ fontWeight: 700, marginBottom: 4 }}>{g.name}</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--accent)', marginBottom: 4 }}>{g.coinCost} 🪙</div>
            <span className={`badge badge-${g.isActive ? 'success' : 'error'}`} style={{ marginBottom: 10 }}>
              {g.isActive ? 'Active' : 'Inactive'}
            </span>
            <div style={{ display: 'flex', gap: 6, justifyContent: 'center', marginTop: 10 }}>
              <button className="btn btn-danger btn-sm" onClick={() => handleDelete(g._id)}><HiOutlineTrash size={14} /></button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
