import { useState, useEffect } from 'react';
import { coinPacksApi } from '../api/services.js';
import toast from 'react-hot-toast';
import { HiOutlinePlus, HiOutlineTrash } from 'react-icons/hi2';

export default function CoinPacksPage() {
  const [packs, setPacks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    label: '', priceInr: '', coins: '', bonusCoins: 0, sortOrder: 0, isActive: true,
  });

  const load = async () => {
    setLoading(true);
    try {
      const res = await coinPacksApi.list();
      setPacks(res.data.data?.packs || []);
    } catch {
      toast.error('Failed to load packs');
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      await coinPacksApi.create({
        label: form.label,
        priceInr: Number(form.priceInr),
        coins: Number(form.coins),
        bonusCoins: Number(form.bonusCoins) || 0,
        sortOrder: Number(form.sortOrder) || 0,
        isActive: form.isActive,
      });
      toast.success('Pack created');
      setShowForm(false);
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed');
    }
  };

  const toggleActive = async (p) => {
    try {
      await coinPacksApi.update(p._id, { isActive: !p.isActive });
      load();
    } catch {
      toast.error('Update failed');
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this pack?')) return;
    try {
      await coinPacksApi.delete(id);
      toast.success('Deleted');
      load();
    } catch {
      toast.error('Failed');
    }
  };

  return (
    <div className="fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 800 }}>Coin packs</h1>
        <button type="button" className="btn btn-primary" onClick={() => setShowForm(!showForm)}>
          <HiOutlinePlus size={16} /> Add pack
        </button>
      </div>

      {showForm && (
        <div className="card" style={{ marginBottom: 20 }}>
          <form onSubmit={handleCreate} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 14 }}>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>Label</label>
              <input value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} required />
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>Price ₹</label>
              <input type="number" value={form.priceInr} onChange={(e) => setForm({ ...form, priceInr: e.target.value })} required />
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>Coins</label>
              <input type="number" value={form.coins} onChange={(e) => setForm({ ...form, coins: e.target.value })} required />
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>Bonus</label>
              <input type="number" value={form.bonusCoins} onChange={(e) => setForm({ ...form, bonusCoins: e.target.value })} />
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>Sort</label>
              <input type="number" value={form.sortOrder} onChange={(e) => setForm({ ...form, sortOrder: e.target.value })} />
            </div>
            <div style={{ display: 'flex', alignItems: 'end', gap: 10 }}>
              <button type="submit" className="btn btn-primary">Create</button>
              <button type="button" className="btn btn-ghost" onClick={() => setShowForm(false)}>Cancel</button>
            </div>
          </form>
        </div>
      )}

      <div className="card" style={{ padding: 0 }}>
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Label</th>
                <th>₹</th>
                <th>Coins</th>
                <th>Bonus</th>
                <th>Sort</th>
                <th>Active</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} style={{ textAlign: 'center', padding: 40 }}>Loading...</td></tr>
              ) : packs.length === 0 ? (
                <tr><td colSpan={7} style={{ textAlign: 'center', padding: 40 }}>No packs</td></tr>
              ) : packs.map((p) => (
                <tr key={p._id}>
                  <td style={{ fontWeight: 600 }}>{p.label}</td>
                  <td>{p.priceInr}</td>
                  <td>{p.coins}</td>
                  <td>{p.bonusCoins || 0}</td>
                  <td>{p.sortOrder}</td>
                  <td>
                    <button type="button" className="btn btn-ghost btn-sm" onClick={() => toggleActive(p)}>
                      {p.isActive ? 'Active' : 'Off'}
                    </button>
                  </td>
                  <td>
                    <button type="button" className="btn btn-danger btn-sm" onClick={() => handleDelete(p._id)}>
                      <HiOutlineTrash size={14} />
                    </button>
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
