import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import useAuthStore from '../store/authStore.js';
import {
  HiOutlineHome, HiOutlineUsers, HiOutlineHeart,
  HiOutlineChatBubbleLeftRight, HiOutlineGift, HiOutlineStar,
  HiOutlineCog6Tooth, HiOutlineArrowRightOnRectangle,
  HiOutlineVideoCamera, HiOutlineCurrencyDollar, HiOutlineBars3,
  HiOutlineXMark
} from 'react-icons/hi2';

const navItems = [
  { to: '/', icon: HiOutlineHome, label: 'Dashboard' },
  { to: '/users', icon: HiOutlineUsers, label: 'Users' },
  { to: '/girls', icon: HiOutlineHeart, label: 'Girls' },
  { to: '/chat', icon: HiOutlineChatBubbleLeftRight, label: 'Chat' },
  { to: '/gifts', icon: HiOutlineGift, label: 'Gifts' },
  { to: '/vip', icon: HiOutlineStar, label: 'VIP Plans' },
  { to: '/calls', icon: HiOutlineVideoCamera, label: 'Call Logs' },
  { to: '/payments', icon: HiOutlineCurrencyDollar, label: 'Payments' },
  { to: '/settings', icon: HiOutlineCog6Tooth, label: 'Settings' },
];

export default function DashboardLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const admin = useAuthStore((s) => s.admin);
  const logout = useAuthStore((s) => s.logout);
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
            zIndex: 40, display: 'none',
          }}
          className="mobile-overlay"
        />
      )}

      {/* Sidebar */}
      <aside style={{
        width: 260, minWidth: 260, background: 'var(--bg-card)',
        borderRight: '1px solid var(--border)', display: 'flex',
        flexDirection: 'column', height: '100%', zIndex: 50,
      }}>
        {/* Logo */}
        <div style={{
          padding: '24px 20px', borderBottom: '1px solid var(--border)',
          display: 'flex', alignItems: 'center', gap: 12,
        }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10,
            background: 'linear-gradient(135deg, var(--primary), var(--accent))',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontWeight: 800, fontSize: 16, color: 'white',
          }}>L</div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 16 }}>LuxDate</div>
            <div style={{ fontSize: 11, color: 'var(--text-dim)' }}>Admin Panel</div>
          </div>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: '12px 10px', overflowY: 'auto' }}>
          {navItems.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              onClick={() => setSidebarOpen(false)}
              style={({ isActive }) => ({
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '10px 14px', borderRadius: 10, marginBottom: 2,
                fontSize: 14, fontWeight: isActive ? 600 : 400,
                color: isActive ? 'var(--primary-light)' : 'var(--text-muted)',
                background: isActive ? 'rgba(124,58,237,0.1)' : 'transparent',
                textDecoration: 'none', transition: 'all 0.15s',
              })}
            >
              <Icon size={18} />
              {label}
            </NavLink>
          ))}
        </nav>

        {/* Admin profile + logout */}
        <div style={{
          padding: '16px 14px', borderTop: '1px solid var(--border)',
          display: 'flex', alignItems: 'center', gap: 10,
        }}>
          <div style={{
            width: 34, height: 34, borderRadius: '50%',
            background: 'var(--bg-elevated)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontWeight: 700, fontSize: 13, color: 'var(--primary-light)',
          }}>
            {admin?.name?.[0]?.toUpperCase() || 'A'}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {admin?.name || 'Admin'}
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-dim)' }}>{admin?.role || 'admin'}</div>
          </div>
          <button
            onClick={handleLogout}
            style={{
              background: 'none', border: 'none', color: 'var(--text-dim)',
              cursor: 'pointer', padding: 6, borderRadius: 6,
            }}
            title="Logout"
          >
            <HiOutlineArrowRightOnRectangle size={18} />
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main style={{
        flex: 1, overflow: 'auto', padding: '28px 32px',
        background: 'var(--bg)',
      }}>
        {/* Mobile header */}
        <div style={{
          display: 'none', marginBottom: 20, alignItems: 'center', gap: 12,
        }} className="mobile-header">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            style={{ background: 'none', border: 'none', color: 'var(--text)', cursor: 'pointer' }}
          >
            {sidebarOpen ? <HiOutlineXMark size={24} /> : <HiOutlineBars3 size={24} />}
          </button>
          <span style={{ fontWeight: 700, fontSize: 18 }}>LuxDate Admin</span>
        </div>

        <Outlet />
      </main>
    </div>
  );
}
