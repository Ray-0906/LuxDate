import { useState, useEffect } from 'react';
import { usersApi } from '../api/services.js';
import toast from 'react-hot-toast';
import { HiOutlineMagnifyingGlass, HiOutlineNoSymbol, HiOutlineCheckCircle } from 'react-icons/hi2';

export default function UsersPage() {
  const [users, setUsers] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadUsers(); }, [page]);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const res = await usersApi.list({ page, limit: 20, search });
      setUsers(res.data.data || []);
      setTotal(res.data.pagination?.total || 0);
    } catch { toast.error('Failed to load users'); }
    setLoading(false);
  };

  const handleSearch = (e) => {
    e.preventDefault();
    setPage(1);
    loadUsers();
  };

  const toggleBlock = async (userId) => {
    try {
      await usersApi.toggleBlock(userId);
      toast.success('User status updated');
      loadUsers();
    } catch { toast.error('Failed to update user'); }
  };

  return (
    <div className="fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800 }}>Users</h1>
          <p style={{ color: 'var(--text-dim)', fontSize: 13, marginTop: 4 }}>{total} total users</p>
        </div>
        <form onSubmit={handleSearch} style={{ display: 'flex', gap: 8 }}>
          <div style={{ position: 'relative' }}>
            <HiOutlineMagnifyingGlass size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)' }} />
            <input
              value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="Search users..." style={{ paddingLeft: 36, width: 260 }}
            />
          </div>
          <button type="submit" className="btn btn-primary btn-sm">Search</button>
        </form>
      </div>

      <div className="card" style={{ padding: 0 }}>
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Name</th><th>Phone</th><th>Coins</th><th>Followers</th><th>Status</th><th>Joined</th><th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} style={{ textAlign: 'center', padding: 40, color: 'var(--text-dim)' }}>Loading...</td></tr>
              ) : users.length === 0 ? (
                <tr><td colSpan={7} style={{ textAlign: 'center', padding: 40, color: 'var(--text-dim)' }}>No users found</td></tr>
              ) : users.map((u) => (
                <tr key={u._id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{
                        width: 32, height: 32, borderRadius: '50%', background: 'var(--bg-elevated)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontWeight: 700, fontSize: 12, color: 'var(--primary-light)',
                      }}>{u.name?.[0]?.toUpperCase() || '?'}</div>
                      <span style={{ fontWeight: 500 }}>{u.name || 'No name'}</span>
                    </div>
                  </td>
                  <td style={{ color: 'var(--text-muted)' }}>{u.phone || '—'}</td>
                  <td><span style={{ fontWeight: 600, color: 'var(--accent)' }}>{u.coinBalance || 0}</span></td>
                  <td>{u.followingCount || 0}</td>
                  <td>
                    <span className={`badge ${u.isBlocked ? 'badge-error' : 'badge-success'}`}>
                      {u.isBlocked ? 'Blocked' : 'Active'}
                    </span>
                  </td>
                  <td style={{ fontSize: 13, color: 'var(--text-dim)' }}>
                    {u.createdAt ? new Date(u.createdAt).toLocaleDateString() : '—'}
                  </td>
                  <td>
                    <button
                      onClick={() => toggleBlock(u._id)}
                      className="btn btn-ghost btn-sm"
                      style={{ gap: 4 }}
                    >
                      {u.isBlocked ? <HiOutlineCheckCircle size={14} /> : <HiOutlineNoSymbol size={14} />}
                      {u.isBlocked ? 'Unblock' : 'Block'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {total > 20 && (
          <div style={{ padding: '14px 20px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 13, color: 'var(--text-dim)' }}>
              Page {page} of {Math.ceil(total / 20)}
            </span>
            <div style={{ display: 'flex', gap: 6 }}>
              <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="btn btn-ghost btn-sm">Prev</button>
              <button disabled={page * 20 >= total} onClick={() => setPage(p => p + 1)} className="btn btn-ghost btn-sm">Next</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
