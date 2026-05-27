import { useEffect, useMemo, useState } from 'react';
import { settingsApi } from '../api/services.js';
import toast from 'react-hot-toast';

const findValue = (settings, key, fallback = '') => {
  const entry = settings.find((item) => item.key === key);
  return entry?.value ?? fallback;
};

const inputStyle = {
  width: '100%',
  padding: '12px 14px',
  borderRadius: 12,
  border: '1px solid var(--border-color, rgba(255,255,255,0.08))',
  background: 'rgba(255,255,255,0.02)',
  color: 'inherit',
  outline: 'none',
};

const labelStyle = {
  display: 'block',
  fontSize: 12,
  fontWeight: 700,
  letterSpacing: 0.8,
  textTransform: 'uppercase',
  marginBottom: 8,
  color: 'var(--text-dim)',
};

export default function SettingsPage() {
  const [settings, setSettings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savingApp, setSavingApp] = useState(false);
  const [savingBranding, setSavingBranding] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [appForm, setAppForm] = useState({
    appName: 'LuxDate',
    nonVipRate: '10',
    vipRate: '7',
    checkinRewards: ['5', '10', '15', '20', '25', '30', '50'],
  });
  const [brandingForm, setBrandingForm] = useState({
    logoUrl: '',
  });
  const [rawForm, setRawForm] = useState({ key: '', value: '', group: 'general', description: '' });

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setLoading(true);
    try {
      const res = await settingsApi.getAll();
      const list = res.data?.data?.settings || [];
      setSettings(list);
      setAppForm({
        appName: String(findValue(list, 'app_name', 'LuxDate')),
        nonVipRate: String(findValue(list, 'call_cost_per_minute_non_vip', findValue(list, 'call_cost_per_minute', 10))),
        vipRate: String(findValue(list, 'call_cost_per_minute_vip', 7)),
        checkinRewards: Array.from({ length: 7 }).map((_, index) => (
          String(findValue(list, `checkin_day_${index + 1}_coins`, [5, 10, 15, 20, 25, 30, 50][index]))
        )),
      });
      setBrandingForm({
        logoUrl: String(findValue(list, 'app_logo_url', '')),
      });
    } catch {
      toast.error('Failed to load settings');
    } finally {
      setLoading(false);
    }
  }

  const brandingRevision = useMemo(
    () => findValue(settings, 'app_branding_revision', '1'),
    [settings]
  );

  const handleSaveAppSettings = async (e) => {
    e.preventDefault();
    setSavingApp(true);
    try {
      await settingsApi.saveAppSettings({
        appName: appForm.appName.trim() || 'LuxDate',
        nonVipRate: Number(appForm.nonVipRate),
        vipRate: Number(appForm.vipRate),
        checkinRewards: appForm.checkinRewards.map((value) => Number(value)),
      });
      toast.success('App settings saved');
      await load();
    } catch {
      toast.error('Could not save app settings');
    } finally {
      setSavingApp(false);
    }
  };

  const handleSaveBranding = async (e) => {
    e.preventDefault();
    setSavingBranding(true);
    try {
      await settingsApi.saveBranding({ logoUrl: brandingForm.logoUrl.trim() });
      toast.success('Branding updated');
      await load();
    } catch {
      toast.error('Could not save branding');
    } finally {
      setSavingBranding(false);
    }
  };

  const handleLogoUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('image', file);

    setUploadingLogo(true);
    try {
      const res = await settingsApi.uploadBrandingLogo(formData);
      const url = res.data?.data?.url || '';
      setBrandingForm((prev) => ({ ...prev, logoUrl: url }));
      toast.success('Logo uploaded');
      await load();
    } catch {
      toast.error('Logo upload failed');
    } finally {
      setUploadingLogo(false);
      event.target.value = '';
    }
  };

  const handleSeed = async () => {
    try {
      await settingsApi.seedDefaults();
      toast.success('Defaults seeded');
      await load();
    } catch {
      toast.error('Failed to seed defaults');
    }
  };

  const handleSaveRaw = async (e) => {
    e.preventDefault();
    try {
      await settingsApi.set(rawForm.key, rawForm.value, rawForm.group, rawForm.description);
      toast.success('Raw setting saved');
      setRawForm({ key: '', value: '', group: 'general', description: '' });
      await load();
    } catch {
      toast.error('Failed to save raw setting');
    }
  };

  const handleDelete = async (key) => {
    try {
      await settingsApi.delete(key);
      toast.success('Setting deleted');
      await load();
    } catch {
      toast.error('Failed to delete setting');
    }
  };

  return (
    <div className="fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800, marginBottom: 4 }}>App Settings</h1>
          <div style={{ color: 'var(--text-dim)' }}>
            Live pricing, runtime branding, and a compatibility layer for raw settings.
          </div>
        </div>
        <button className="btn btn-ghost" onClick={handleSeed}>Seed Defaults</button>
      </div>

      <div style={{ display: 'grid', gap: 20 }}>
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
            <div>
              <h3 style={{ fontSize: 16, fontWeight: 800, marginBottom: 4 }}>Call Pricing</h3>
              <p style={{ margin: 0, color: 'var(--text-dim)' }}>
                Control the per-minute call cost for non-VIP and VIP users.
              </p>
            </div>
          </div>

          <form onSubmit={handleSaveAppSettings} style={{ display: 'grid', gap: 16 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
              <div>
                <label style={labelStyle}>App Name</label>
                <input
                  value={appForm.appName}
                  onChange={(e) => setAppForm((prev) => ({ ...prev, appName: e.target.value }))}
                  style={inputStyle}
                  placeholder="LuxDate"
                />
              </div>
              <div>
                <label style={labelStyle}>Non-VIP Rate</label>
                <input
                  type="number"
                  min="1"
                  value={appForm.nonVipRate}
                  onChange={(e) => setAppForm((prev) => ({ ...prev, nonVipRate: e.target.value }))}
                  style={inputStyle}
                  placeholder="10"
                />
              </div>
              <div>
                <label style={labelStyle}>VIP Rate</label>
                <input
                  type="number"
                  min="1"
                  value={appForm.vipRate}
                  onChange={(e) => setAppForm((prev) => ({ ...prev, vipRate: e.target.value }))}
                  style={inputStyle}
                  placeholder="7"
                />
              </div>
            </div>

            <div style={{ color: 'var(--text-dim)', fontSize: 13 }}>
              Live preview: non-VIP users spend <strong>{appForm.nonVipRate || '0'}</strong> points/min and VIP users spend <strong>{appForm.vipRate || '0'}</strong> points/min.
            </div>

            <div>
              <h4 style={{ fontSize: 14, fontWeight: 800, marginBottom: 12 }}>New-user 7-day check-in rewards</h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12 }}>
                {appForm.checkinRewards.map((value, index) => (
                  <div key={`checkin-${index + 1}`}>
                    <label style={labelStyle}>Day {index + 1}</label>
                    <input
                      type="number"
                      min="0"
                      value={value}
                      onChange={(e) => setAppForm((prev) => {
                        const nextRewards = [...prev.checkinRewards];
                        nextRewards[index] = e.target.value;
                        return { ...prev, checkinRewards: nextRewards };
                      })}
                      style={inputStyle}
                      placeholder="0"
                    />
                  </div>
                ))}
              </div>
            </div>

            <div>
              <button type="submit" className="btn btn-primary" disabled={savingApp}>
                {savingApp ? 'Saving...' : 'Save App Settings'}
              </button>
            </div>
          </form>
        </div>

        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18, gap: 16, flexWrap: 'wrap' }}>
            <div>
              <h3 style={{ fontSize: 16, fontWeight: 800, marginBottom: 4 }}>Branding</h3>
              <p style={{ margin: 0, color: 'var(--text-dim)' }}>
                Update the in-app name and logo. Mobile clients refresh this on cold open.
              </p>
            </div>
            <span className="badge badge-info">Revision {String(brandingRevision)}</span>
          </div>

          <form onSubmit={handleSaveBranding} style={{ display: 'grid', gap: 16 }}>
            <div>
              <label style={labelStyle}>Logo URL</label>
              <input
                value={brandingForm.logoUrl}
                onChange={(e) => setBrandingForm({ logoUrl: e.target.value })}
                style={inputStyle}
                placeholder="https://..."
              />
            </div>

            <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
              <label className="btn btn-ghost" style={{ cursor: 'pointer' }}>
                {uploadingLogo ? 'Uploading...' : 'Upload Logo'}
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleLogoUpload}
                  style={{ display: 'none' }}
                  disabled={uploadingLogo}
                />
              </label>
              <button type="submit" className="btn btn-primary" disabled={savingBranding}>
                {savingBranding ? 'Saving...' : 'Save Branding'}
              </button>
            </div>
          </form>

          <div style={{
            marginTop: 20,
            borderRadius: 18,
            border: '1px solid rgba(255,255,255,0.08)',
            background: 'linear-gradient(135deg, rgba(17,17,29,0.96), rgba(35,14,24,0.96))',
            padding: 20,
            display: 'flex',
            alignItems: 'center',
            gap: 16,
          }}>
            <div style={{
              width: 72,
              height: 72,
              borderRadius: 24,
              overflow: 'hidden',
              border: '1px solid rgba(255,255,255,0.08)',
              background: 'rgba(255,255,255,0.03)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}>
              {brandingForm.logoUrl ? (
                <img src={brandingForm.logoUrl} alt="App logo preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <span style={{ fontSize: 22, fontWeight: 800 }}>LX</span>
              )}
            </div>
            <div>
              <div style={{ fontSize: 22, fontWeight: 800 }}>{appForm.appName || 'LuxDate'}</div>
              <div style={{ color: 'var(--text-dim)', marginTop: 4 }}>Runtime preview shown inside the mobile app.</div>
            </div>
          </div>
        </div>

        <div className="card" style={{ marginBottom: 20 }}>
          <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 14 }}>Advanced Raw Settings</h3>
          <form onSubmit={handleSaveRaw} style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <input value={rawForm.key} onChange={e => setRawForm({ ...rawForm, key: e.target.value })} placeholder="Key" required style={{ ...inputStyle, width: 180 }} />
            <input value={rawForm.value} onChange={e => setRawForm({ ...rawForm, value: e.target.value })} placeholder="Value" required style={{ ...inputStyle, width: 220 }} />
            <select value={rawForm.group} onChange={e => setRawForm({ ...rawForm, group: e.target.value })} style={{ ...inputStyle, width: 140 }}>
              <option value="general">General</option>
              <option value="calls">Calls</option>
              <option value="coins">Coins</option>
              <option value="branding">Branding</option>
            </select>
            <input value={rawForm.description} onChange={e => setRawForm({ ...rawForm, description: e.target.value })} placeholder="Description" style={{ ...inputStyle, width: 240 }} />
            <button type="submit" className="btn btn-primary btn-sm">Save</button>
          </form>
        </div>

        <div className="card" style={{ padding: 0 }}>
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Key</th>
                  <th>Value</th>
                  <th>Group</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={4} style={{ textAlign: 'center', padding: 40, color: 'var(--text-dim)' }}>Loading...</td>
                  </tr>
                ) : settings.map((setting) => (
                  <tr key={setting.key}>
                    <td style={{ fontWeight: 600, fontFamily: 'monospace', fontSize: 13 }}>{setting.key}</td>
                    <td style={{ fontSize: 13, maxWidth: 340, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {typeof setting.value === 'object' ? JSON.stringify(setting.value) : String(setting.value)}
                    </td>
                    <td><span className="badge badge-info">{setting.group}</span></td>
                    <td><button className="btn btn-danger btn-sm" onClick={() => handleDelete(setting.key)}>Delete</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
