import { useState, useEffect } from 'react';
import { girlsApi } from '../api/services.js';
import toast from 'react-hot-toast';
import { HiOutlinePlus, HiOutlineTrash, HiOutlinePencil } from 'react-icons/hi2';

export default function GirlsPage() {
  const [girls, setGirls] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({ name: '', age: '', bio: '', location: '', followers: 0, likes: 0 });
  const [file, setFile] = useState(null);
  const [galleryFiles, setGalleryFiles] = useState([]);

  useEffect(() => { loadGirls(); }, [page]);

  const loadGirls = async () => {
    setLoading(true);
    try {
      const res = await girlsApi.list({ page, limit: 20 });
      setGirls(res.data.data || []);
      setTotal(res.data.pagination?.total || 0);
    } catch { toast.error('Failed to load girls'); }
    setLoading(false);
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      const fd = new FormData();
      fd.append('name', form.name);
      fd.append('age', form.age);
      fd.append('bio', form.bio);
      fd.append('location', form.location);
      if (file && !editingId) fd.append('profilePhoto', file); // Optional on update
      
      if (editingId) {
        await girlsApi.update(editingId, { 
          name: form.name, 
          age: form.age, 
          bio: form.bio, 
          location: form.location,
          followers: Number(form.followers),
          likes: Number(form.likes)
        });
        
        if (file) {
          const photoFd = new FormData();
          photoFd.append('profilePhoto', file);
          await girlsApi.updatePhoto(editingId, photoFd);
        }

        if (galleryFiles && galleryFiles.length > 0) {
          const galleryFd = new FormData();
          Array.from(galleryFiles).forEach(f => galleryFd.append('images', f));
          await girlsApi.addPhotos(editingId, galleryFd);
        }
        
        toast.success('Girl profile updated');
      } else {
        await girlsApi.create(fd);
        toast.success('Girl profile created');
      }
      
      setShowForm(false);
      setShowEditModal(false);
      setEditingId(null);
      setForm({ name: '', age: '', bio: '', location: '', followers: 0, likes: 0 });
      setFile(null);
      setGalleryFiles([]);
      loadGirls();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save');
      console.error("Save Error:", err);
    }
  };

  const handleEditClick = (girl) => {
    setForm({
      name: girl.name || '',
      age: girl.age || '',
      bio: girl.bio || '',
      location: girl.location || '',
      followers: girl.followers || 0,
      likes: girl.likes || 0,
    });
    setEditingId(girl._id);
    setShowEditModal(true);
    setShowForm(false);
    setFile(null);
    setGalleryFiles([]);
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this profile?')) return;
    try {
      await girlsApi.delete(id);
      toast.success('Profile deleted');
      loadGirls();
    } catch { toast.error('Failed to delete'); }
  };

  return (
    <div className="fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800 }}>Girl Profiles</h1>
          <p style={{ color: 'var(--text-dim)', fontSize: 13, marginTop: 4 }}>{total} profiles</p>
        </div>
        <button className="btn btn-primary" onClick={() => {
          setEditingId(null);
          setForm({ name: '', age: '', bio: '', location: '', followers: 0, likes: 0 });
          setFile(null);
          setShowForm(!showForm);
        }}>
          <HiOutlinePlus size={16} /> Add Girl
        </button>
      </div>

      {/* Create Form */}
      {showForm && (
        <div className="card" style={{ marginBottom: 20 }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>New Girl Profile</h3>
          <form onSubmit={handleCreate} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>Name</label>
              <input value={form.name} onChange={(e) => setForm({...form, name: e.target.value})} required />
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>Age</label>
              <input type="number" value={form.age} onChange={(e) => setForm({...form, age: e.target.value})} required min={18} />
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>Location</label>
              <input value={form.location} onChange={(e) => setForm({...form, location: e.target.value})} />
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>Photo</label>
              <input type="file" accept="image/*" onChange={(e) => setFile(e.target.files[0])} required />
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>Bio</label>
              <textarea value={form.bio} onChange={(e) => setForm({...form, bio: e.target.value})} rows={3} />
            </div>
            <div style={{ gridColumn: '1 / -1', display: 'flex', gap: 10 }}>
              <button type="submit" className="btn btn-primary">Create Profile</button>
              <button type="button" className="btn btn-ghost" onClick={() => {
                setShowForm(false);
              }}>Cancel</button>
            </div>
          </form>
        </div>
      )}

      {/* Edit Modal Popup */}
      {showEditModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999
        }}>
          <div className="card fade-in" style={{ width: '100%', maxWidth: 500, maxHeight: '90vh', overflowY: 'auto' }}>
            <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 16 }}>Edit Girl Details</h3>
            <form onSubmit={handleCreate} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>Name</label>
                <input value={form.name} onChange={(e) => setForm({...form, name: e.target.value})} required />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>Age</label>
                <input type="number" value={form.age} onChange={(e) => setForm({...form, age: e.target.value})} required min={18} />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>Location</label>
                <input value={form.location} onChange={(e) => setForm({...form, location: e.target.value})} />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>Change Profile Photo</label>
                <input type="file" accept="image/*" onChange={(e) => setFile(e.target.files[0])} />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>Add to Gallery (Posts)</label>
                <input type="file" accept="image/*" multiple onChange={(e) => setGalleryFiles(e.target.files)} />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>Fake Followers (❤️)</label>
                <input type="number" value={form.followers} onChange={(e) => setForm({...form, followers: e.target.value})} min={0} />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>Fake Likes (👍)</label>
                <input type="number" value={form.likes} onChange={(e) => setForm({...form, likes: e.target.value})} min={0} />
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>Bio</label>
                <textarea value={form.bio} onChange={(e) => setForm({...form, bio: e.target.value})} rows={3} />
              </div>
              <div style={{ gridColumn: '1 / -1', display: 'flex', gap: 10, marginTop: 10 }}>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>Save Changes</button>
                <button type="button" className="btn btn-ghost" style={{ flex: 1 }} onClick={() => {
                  setShowEditModal(false);
                  setEditingId(null);
                }}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 16 }}>
        {loading ? (
          <div className="card" style={{ gridColumn: '1 / -1', textAlign: 'center', padding: 40, color: 'var(--text-dim)' }}>Loading...</div>
        ) : girls.length === 0 ? (
          <div className="card" style={{ gridColumn: '1 / -1', textAlign: 'center', padding: 40, color: 'var(--text-dim)' }}>No profiles yet. Add one above.</div>
        ) : girls.map((g) => (
          <div key={g._id} className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{
              height: 180, background: g.profilePhoto ? `url(${g.profilePhoto}) center/cover` : 'linear-gradient(135deg, var(--primary-dark), var(--primary))',
              position: 'relative',
            }}>
              <div style={{
                position: 'absolute', bottom: 0, left: 0, right: 0,
                background: 'linear-gradient(transparent, rgba(0,0,0,0.8))',
                padding: '20px 16px 12px',
              }}>
                <span className={`badge ${g.isOnline ? 'badge-success' : 'badge-error'}`} style={{ marginBottom: 6 }}>
                  {g.isOnline ? 'Online' : 'Offline'}
                </span>
              </div>
            </div>
            <div style={{ padding: '14px 16px' }}>
              <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 2 }}>{g.name}</div>
              <div style={{ color: 'var(--text-dim)', fontSize: 13, marginBottom: 10 }}>
                {g.age ? `${g.age} years` : ''}{g.location ? ` · ${g.location}` : ''}
              </div>
              <div style={{ display: 'flex', gap: 12, fontSize: 12, color: 'var(--text-muted)', marginBottom: 12 }}>
                <span>❤️ {g.followers || 0}</span>
                <span>👍 {g.likes || 0}</span>
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                <button className="btn btn-ghost btn-sm" style={{ flex: 1 }} onClick={() => handleEditClick(g)}>
                  <HiOutlinePencil size={14} /> Edit
                </button>
                <button className="btn btn-danger btn-sm" onClick={() => handleDelete(g._id)}><HiOutlineTrash size={14} /></button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {total > 20 && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 24 }}>
          <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="btn btn-ghost btn-sm">Prev</button>
          <span style={{ padding: '6px 12px', fontSize: 13, color: 'var(--text-dim)' }}>Page {page}</span>
          <button disabled={page * 20 >= total} onClick={() => setPage(p => p + 1)} className="btn btn-ghost btn-sm">Next</button>
        </div>
      )}
    </div>
  );
}
