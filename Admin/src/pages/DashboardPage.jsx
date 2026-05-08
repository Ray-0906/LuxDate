import { useState, useEffect, useRef } from 'react';
import { usersApi, girlsApi, settingsApi } from '../api/services.js';
import { gsap } from 'gsap';
import {
  HiOutlineUsers, HiOutlineHeart, HiOutlineCurrencyDollar,
  HiOutlineVideoCamera, HiOutlineGift, HiOutlineStar,
} from 'react-icons/hi2';

const statConfig = [
  { key: 'users', label: 'Total Users', icon: HiOutlineUsers, color: '#3B82F6', bg: 'rgba(59,130,246,0.1)' },
  { key: 'girls', label: 'Girl Profiles', icon: HiOutlineHeart, color: '#EC4899', bg: 'rgba(236,72,153,0.1)' },
  { key: 'revenue', label: 'Revenue (₹)', icon: HiOutlineCurrencyDollar, color: '#10B981', bg: 'rgba(16,185,129,0.1)' },
  { key: 'calls', label: 'Total Calls', icon: HiOutlineVideoCamera, color: '#F59E0B', bg: 'rgba(245,158,11,0.1)' },
  { key: 'gifts', label: 'Gifts Sent', icon: HiOutlineGift, color: '#EF4444', bg: 'rgba(239,68,68,0.1)' },
  { key: 'vip', label: 'VIP Members', icon: HiOutlineStar, color: '#7C3AED', bg: 'rgba(124,58,237,0.1)' },
];

export default function DashboardPage() {
  const [stats, setStats] = useState({
    users: 0, girls: 0, revenue: 0, calls: 0, gifts: 0, vip: 0,
  });
  const [loading, setLoading] = useState(true);
  const gridRef = useRef(null);

  useEffect(() => {
    loadStats();
  }, []);

  useEffect(() => {
    if (!loading && gridRef.current) {
      gsap.fromTo(
        gridRef.current.children,
        { opacity: 0, y: 20 },
        { opacity: 1, y: 0, duration: 0.4, stagger: 0.06, ease: 'power2.out' }
      );
    }
  }, [loading]);

  const loadStats = async () => {
    try {
      const [usersRes, girlsRes] = await Promise.allSettled([
        usersApi.list({ limit: 1 }),
        girlsApi.list({ limit: 1 }),
      ]);

      setStats({
        users: usersRes.status === 'fulfilled' ? usersRes.value.data?.pagination?.total || 0 : 0,
        girls: girlsRes.status === 'fulfilled' ? girlsRes.value.data?.pagination?.total || 0 : 0,
        revenue: 0,
        calls: 0,
        gifts: 0,
        vip: 0,
      });
    } catch {
      // Stats will show 0 if API is unreachable
    }
    setLoading(false);
  };

  return (
    <div className="fade-in">
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: 26, fontWeight: 800, marginBottom: 6 }}>Dashboard</h1>
        <p style={{ color: 'var(--text-dim)', fontSize: 14 }}>Welcome back. Here's what's happening today.</p>
      </div>

      <div
        ref={gridRef}
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
          gap: 16,
          marginBottom: 32,
        }}
      >
        {statConfig.map(({ key, label, icon: Icon, color, bg }) => (
          <div key={key} className="stat-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div className="stat-label">{label}</div>
                <div className="stat-value" style={{ marginTop: 8 }}>
                  {loading ? '—' : stats[key]?.toLocaleString?.() ?? 0}
                </div>
              </div>
              <div className="stat-icon" style={{ background: bg, color }}>
                <Icon size={20} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="card" style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>Quick Actions</h2>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <a href="/girls" className="btn btn-primary btn-sm">+ Add Girl</a>
          <a href="/gifts" className="btn btn-ghost btn-sm">Manage Gifts</a>
          <a href="/vip" className="btn btn-ghost btn-sm">VIP Plans</a>
          <a href="/settings" className="btn btn-ghost btn-sm">Settings</a>
        </div>
      </div>

      {/* System Status */}
      <div className="card">
        <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>System Status</h2>
        <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--success)' }} />
            <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>API Server</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--success)' }} />
            <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>Database</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--success)' }} />
            <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>Socket.IO</span>
          </div>
        </div>
      </div>
    </div>
  );
}
