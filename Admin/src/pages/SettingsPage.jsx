import { useState, useEffect } from 'react';
import { settingsApi } from '../api/services.js';
import toast from 'react-hot-toast';

export default function SettingsPage() {
  const [settings, setSettings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ key: '', value: '', group: 'general', description: '' });

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    try { const r = await settingsApi.getAll(); setSettings(r.data.data?.settings || []); }
    catch { /* empty */ }
    setLoading(false);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      await settingsApi.set(form.key, form.value, form.group, form.description);
      toast.success('Saved'); setForm({ key: '', value: '', group: 'general', description: '' }); load();
    } catch { toast.error('Failed'); }
  };

  const handleSeed = async () => {
    try { await settingsApi.seedDefaults(); toast.success('Defaults seeded'); load(); }
    catch { toast.error('Failed'); }
  };

  const handleDelete = async (key) => {
    try { await settingsApi.delete(key); toast.success('Deleted'); load(); }
    catch { toast.error('Failed'); }
  };

  return (
    <div className="fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 800 }}>App Settings</h1>
        <button className="btn btn-ghost" onClick={handleSeed}>Seed Defaults</button>
      </div>

      <div className="card" style={{ marginBottom: 20 }}>
        <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 14 }}>Add / Update Setting</h3>
        <form onSubmit={handleSave} style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <input value={form.key} onChange={e => setForm({...form, key: e.target.value})} placeholder="Key" required style={{ width: 160 }} />
          <input value={form.value} onChange={e => setForm({...form, value: e.target.value})} placeholder="Value" required style={{ width: 200 }} />
          <select value={form.group} onChange={e => setForm({...form, group: e.target.value})} style={{ width: 120 }}>
            <option value="general">General</option><option value="calls">Calls</option>
            <option value="coins">Coins</option><option value="branding">Branding</option>
          </select>
          <button type="submit" className="btn btn-primary btn-sm">Save</button>
        </form>
      </div>

      <div className="card" style={{ padding: 0 }}>
        <div className="table-wrapper">
          <table>
            <thead><tr><th>Key</th><th>Value</th><th>Group</th><th>Actions</th></tr></thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={4} style={{ textAlign: 'center', padding: 40, color: 'var(--text-dim)' }}>Loading...</td></tr>
              ) : settings.map(s => (
                <tr key={s.key}>
                  <td style={{ fontWeight: 600, fontFamily: 'monospace', fontSize: 13 }}>{s.key}</td>
                  <td style={{ fontSize: 13, maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {typeof s.value === 'object' ? JSON.stringify(s.value) : String(s.value)}
                  </td>
                  <td><span className="badge badge-info">{s.group}</span></td>
                  <td><button className="btn btn-danger btn-sm" onClick={() => handleDelete(s.key)}>Delete</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
