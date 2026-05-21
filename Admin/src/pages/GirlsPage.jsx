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
  const [form, setForm] = useState({ 
    name: '', age: '', bio: '', location: '', 
    language: 'English', charmLevel: 'Rising', distanceKm: 0, 
    isActive: true, firstMessageContent: '',
    region: 'Global', relationshipFeatureEnabled: true
  });
  const [file, setFile] = useState(null);
  const [galleryFiles, setGalleryFiles] = useState([]);
  const [videoFile, setVideoFile] = useState(null);
  const [uploadingPhotos, setUploadingPhotos] = useState([]);
  const [isUploadingVideo, setIsUploadingVideo] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => { loadGirls(); }, [page]);

  const loadGirls = async () => {
    setLoading(true);
    try {
      const res = await girlsApi.list({ page, limit: 20 });
      console.log("Loaded girls:", res.data.data[0]);
      setGirls(res.data.data || []);
      setTotal(res.data.pagination?.total || 0);
    } catch (err) {
      toast.error('Failed to load girls');
      console.error("Load Error:", err);
    }
    setLoading(false);
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const fd = new FormData();
      fd.append('name', form.name);
      fd.append('age', form.age);
      fd.append('bio', form.bio);
      fd.append('location', form.location);
      fd.append('language', form.language);
      fd.append('charmLevel', form.charmLevel);
      fd.append('distanceKm', form.distanceKm);
      fd.append('isActive', form.isActive);
      fd.append('region', form.region);
      fd.append('relationshipFeatureEnabled', form.relationshipFeatureEnabled);
      if (form.firstMessageContent) {
        fd.append('firstMessages', JSON.stringify([{ type: 'text', content: form.firstMessageContent }]));
      }

      if (file && !editingId) fd.append('profilePhoto', file); // Optional on update
      
      if (editingId) {
        const updateData = { 
          name: form.name, 
          age: form.age, 
          bio: form.bio, 
          location: form.location,
          language: form.language,
          charmLevel: form.charmLevel,
          distanceKm: Number(form.distanceKm),
          isActive: form.isActive,
          region: form.region,
          relationshipFeatureEnabled: form.relationshipFeatureEnabled,
          photos: form.photos
        };
        if (form.firstMessageContent) {
          updateData.firstMessages = [{ type: 'text', content: form.firstMessageContent }];
        } else {
          updateData.firstMessages = [];
        }
        await girlsApi.update(editingId, updateData);
        
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

        if (videoFile) {
          const videoFd = new FormData();
          videoFd.append('video', videoFile);
          const res = await girlsApi.uploadVideo(editingId, videoFd);
          // update local form state with new video url
          const newVideo = res.data?.data?.video?.videoUrl || res.data?.data?.videoUrl || res.data?.data?.video?.url;
          if (newVideo) form.videoUrl = newVideo;
        }

        setShowEditModal(false);
        setEditingId(null);
        setForm({ 
          name: '', age: '', bio: '', location: '', 
          language: 'English', charmLevel: 'Rising', distanceKm: 0, 
          isActive: true, firstMessageContent: '',
          region: 'Global', relationshipFeatureEnabled: true
        });
        setFile(null);
        setGalleryFiles([]);
        setVideoFile(null);
        loadGirls();
      }}
       catch(err) {
      toast.error(err.response?.data?.message || err.message || 'Failed to save');
      console.error("Save Error:", err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleEditClick = (girl) => {
    setForm({
      name: girl.name || '',
      age: girl.age || '',
      bio: girl.bio || '',
      location: girl.location || '',
      language: girl.language || 'English',
      charmLevel: girl.charmLevel || 'Rising',
      distanceKm: girl.distanceKm || 0,
      isActive: girl.isActive !== false,
      firstMessageContent: girl.firstMessages?.[0]?.content || '',
      region: girl.region || 'Global',
      relationshipFeatureEnabled: girl.relationshipFeatureEnabled !== false,
      photos: girl.photos || [],
      videoUrl: girl.videoUrl || ''
    });
    setEditingId(girl._id);
    setShowEditModal(true);
    setShowForm(false);
    setFile(null);
    setGalleryFiles([]);
    setVideoFile(null);
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this profile?')) return;
    try {
      await girlsApi.delete(id);
      toast.success('Profile deleted');
      loadGirls();
    } catch { toast.error('Failed to delete'); }
  };

  const handleUploadVideoImmediate = async (e) => {
    if (!editingId) return toast.error('Create profile first to upload media');
    const file = e.target.files[0];
    if (!file) return;

    setIsUploadingVideo(true);
    try {
      const fd = new FormData();
      fd.append('video', file);
      const res = await girlsApi.uploadVideo(editingId, fd);
      const newVideoUrl = res.data?.data?.videoUrl || res.data?.data?.video?.videoUrl;
      setForm(prev => ({ ...prev, videoUrl: newVideoUrl }));
      toast.success('Video uploaded successfully');
    } catch (err) {
      toast.error('Failed to upload video');
      console.error(err);
    } finally {
      setIsUploadingVideo(false);
      e.target.value = ''; // Reset input
    }
  };

  const handleUploadPhotosImmediate = async (e) => {
    if (!editingId) return toast.error('Create profile first to upload media');
    const files = Array.from(e.target.files);
    if (!files.length) return;

    const newUploads = files.map(f => ({
      id: Math.random().toString(36).substr(2, 9),
      preview: URL.createObjectURL(f)
    }));
    setUploadingPhotos(prev => [...prev, ...newUploads]);

    try {
      const fd = new FormData();
      files.forEach(f => fd.append('images', f));
      const res = await girlsApi.addPhotos(editingId, fd);
      console.log("Upload response:", res.data);
      const updatedPhotos = res.data?.data?.girl?.photos || [];
      setForm(prev => ({ ...prev, photos: updatedPhotos }));
      toast.success('Photos uploaded successfully');
    } catch (err) {
      toast.error('Failed to upload photos');
      console.error(err);
    } finally {
      newUploads.forEach(u => URL.revokeObjectURL(u.preview));
      setUploadingPhotos([]);
    }
  };

  const handleDeletePhoto = async (photoUrl) => {
    try {
      const newPhotos = (form.photos || []).filter(p => p !== photoUrl);
      // Optimistically update UI
      setForm(prev => ({ ...prev, photos: newPhotos }));

      // Immediately save to backend so the database is in sync
      if (editingId) {
        await girlsApi.update(editingId, { photos: newPhotos });
      }
      toast.success('Photo removed successfully');
    } catch (err) {
      toast.error('Failed to remove photo from backend');
      console.error(err);
      // Optional rollback could go here
    }
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
          setForm({ 
            name: '', age: '', bio: '', location: '', 
            language: 'English', charmLevel: 'Rising', distanceKm: 0, 
            isActive: true, firstMessageContent: '',
            region: 'Global', relationshipFeatureEnabled: true
          });
          setFile(null);
          setVideoFile(null);
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
              <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>Region</label>
              <input value={form.region} onChange={(e) => setForm({...form, region: e.target.value})} placeholder="e.g. Global" />
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>Language</label>
              <input value={form.language} onChange={(e) => setForm({...form, language: e.target.value})} placeholder="e.g. English" />
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>Charm Level</label>
              <select value={form.charmLevel} onChange={(e) => setForm({...form, charmLevel: e.target.value})} style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid var(--border)' }}>
                <option value="Rising">Rising</option>
                <option value="Hot">Hot</option>
                <option value="Goddess">Goddess</option>
              </select>
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>Distance (km)</label>
              <input type="number" step="any" value={form.distanceKm} onChange={(e) => setForm({...form, distanceKm: e.target.value})} min={0} />
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>Photo (Profile)</label>
              <input type="file" accept="image/*" onChange={(e) => setFile(e.target.files[0])} required />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, gridColumn: '1 / -1' }}>
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <input type="checkbox" checked={form.isActive} onChange={(e) => setForm({...form, isActive: e.target.checked})} id="create-is-active-chk" style={{ marginRight: 8, width: 16, height: 16 }} />
                <label htmlFor="create-is-active-chk" style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)' }}>Active Profile</label>
              </div>
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <input type="checkbox" checked={form.relationshipFeatureEnabled} onChange={(e) => setForm({...form, relationshipFeatureEnabled: e.target.checked})} id="create-rel-chk" style={{ marginRight: 8, width: 16, height: 16 }} />
                <label htmlFor="create-rel-chk" style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)' }}>Relationship Feature</label>
              </div>
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>First Welcome Message (Auto-Reply)</label>
              <textarea value={form.firstMessageContent} onChange={(e) => setForm({...form, firstMessageContent: e.target.value})} rows={2} placeholder="Hi, nice to meet you!" />
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>Bio</label>
              <textarea value={form.bio} onChange={(e) => setForm({...form, bio: e.target.value})} rows={3} />
            </div>
            <div style={{ gridColumn: '1 / -1', display: 'flex', gap: 10 }}>
              <button type="submit" disabled={isSaving} className="btn btn-primary" style={{ position: 'relative', minWidth: 120 }}>
                {isSaving ? (
                  <span style={{ 
                    display: 'inline-block', width: 14, height: 14, 
                    border: '2px solid rgba(255,255,255,0.3)', borderTopColor: 'white', 
                    borderRadius: '50%', animation: 'spin 1s linear infinite' 
                  }}></span>
                ) : 'Create Profile'}
              </button>
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
          backgroundColor: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(10px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: 20
        }}>
          <div className="card fade-in" style={{ width: '100%', maxWidth: 900, maxHeight: '95vh', overflowY: 'auto', display: 'flex', flexDirection: 'column', padding: 0 }}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, background: 'var(--surface)', zIndex: 10 }}>
              <h3 style={{ fontSize: 20, fontWeight: 800, margin: 0 }}>Edit Girl Profile <span style={{ color: 'var(--text-dim)', fontSize: 14, fontWeight: 500, marginLeft: 8 }}>{form.name}</span></h3>
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => { setShowEditModal(false); setEditingId(null); }}>Close</button>
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 340px', gap: 0 }}>
              {/* Left Column: Form Details */}
              <div style={{ padding: 24, borderRight: '1px solid var(--border)' }}>
                <form id="edit-girl-form" onSubmit={handleCreate} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>Name</label>
                    <input value={form.name} onChange={(e) => setForm({...form, name: e.target.value})} required style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--background)' }} />
                  </div>
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>Age</label>
                    <input type="number" value={form.age} onChange={(e) => setForm({...form, age: e.target.value})} required min={18} style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--background)' }} />
                  </div>
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>Location</label>
                    <input value={form.location} onChange={(e) => setForm({...form, location: e.target.value})} style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--background)' }} />
                  </div>
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>Region</label>
                    <input value={form.region} onChange={(e) => setForm({...form, region: e.target.value})} placeholder="Global" style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--background)' }} />
                  </div>
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>Language</label>
                    <input value={form.language} onChange={(e) => setForm({...form, language: e.target.value})} style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--background)' }} />
                  </div>
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>Charm Level</label>
                    <select value={form.charmLevel} onChange={(e) => setForm({...form, charmLevel: e.target.value})} style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--background)' }}>
                      <option value="Rising">Rising</option>
                      <option value="Hot">Hot</option>
                      <option value="Goddess">Goddess</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>Distance (km)</label>
                    <input type="number" step="any" value={form.distanceKm} onChange={(e) => setForm({...form, distanceKm: e.target.value})} min={0} style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--background)' }} />
                  </div>
                  
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12, justifyContent: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                      <input type="checkbox" checked={form.isActive} onChange={(e) => setForm({...form, isActive: e.target.checked})} id="edit-is-active-chk" style={{ marginRight: 10, width: 18, height: 18, accentColor: 'var(--primary)' }} />
                      <label htmlFor="edit-is-active-chk" style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>Active Profile</label>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                      <input type="checkbox" checked={form.relationshipFeatureEnabled} onChange={(e) => setForm({...form, relationshipFeatureEnabled: e.target.checked})} id="edit-rel-chk" style={{ marginRight: 10, width: 18, height: 18, accentColor: 'var(--primary)' }} />
                      <label htmlFor="edit-rel-chk" style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>Relationship Feature</label>
                    </div>
                  </div>

                  <div style={{ gridColumn: '1 / -1' }}>
                    <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>First Welcome Message (Auto-Reply)</label>
                    <textarea value={form.firstMessageContent} onChange={(e) => setForm({...form, firstMessageContent: e.target.value})} rows={2} style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--background)' }} />
                  </div>
                  <div style={{ gridColumn: '1 / -1' }}>
                    <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>Bio</label>
                    <textarea value={form.bio} onChange={(e) => setForm({...form, bio: e.target.value})} rows={3} style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--background)' }} />
                  </div>
                </form>
              </div>

              {/* Right Column: Media Manager */}
              <div style={{ padding: 24, background: 'var(--background)', display: 'flex', flexDirection: 'column', gap: 24 }}>
                {/* Photos Section */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                    <h4 style={{ fontSize: 14, fontWeight: 700, margin: 0 }}>Gallery Photos</h4>
                    <label className="btn btn-ghost btn-sm" style={{ padding: '4px 10px', fontSize: 12, display: 'inline-flex', alignItems: 'center', gap: 4, cursor: 'pointer' }}>
                      <HiOutlinePlus size={14} /> Add Photos
                      <input type="file" accept="image/*" multiple onChange={handleUploadPhotosImmediate} style={{ display: 'none' }} />
                    </label>
                  </div>
                  
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
                    {/* Existing Photos */}
                    {(form.photos || []).map((photoUrl, idx) => (
                      <div key={idx} style={{ 
                        position: 'relative', aspectRatio: '1', borderRadius: 8, overflow: 'hidden', 
                        background: `url(${photoUrl}) center/cover no-repeat`, boxShadow: '0 2px 8px rgba(0,0,0,0.1)', group: 'photo-item' 
                      }}>
                        <button type="button" onClick={() => handleDeletePhoto(photoUrl)} style={{ 
                          position: 'absolute', top: 4, right: 4, width: 22, height: 22, borderRadius: '50%', 
                          background: 'rgba(0,0,0,0.6)', color: 'white', border: 'none', cursor: 'pointer', 
                          display: 'flex', alignItems: 'center', justifyContent: 'center' 
                        }}>✕</button>
                      </div>
                    ))}
                    
                    {/* Uploading Photos with Spinners */}
                    {uploadingPhotos.map(u => (
                      <div key={u.id} style={{ 
                        position: 'relative', aspectRatio: '1', borderRadius: 8, overflow: 'hidden', 
                        background: `url(${u.preview}) center/cover no-repeat` 
                      }}>
                        <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <span style={{ display: 'block', width: 20, height: 20, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: 'white', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></span>
                        </div>
                      </div>
                    ))}
                  </div>
                  <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
                </div>

                {/* Video Section */}
                <div style={{ borderTop: '1px solid var(--border)', paddingTop: 20 }}>
                  <h4 style={{ fontSize: 14, fontWeight: 700, margin: 0, marginBottom: 12 }}>Fake Call Video</h4>
                  {isUploadingVideo ? (
                    <div style={{ position: 'relative', borderRadius: 8, overflow: 'hidden', background: '#111', marginBottom: 12, height: 180, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                      <span style={{ display: 'block', width: 28, height: 28, border: '3px solid rgba(255,255,255,0.3)', borderTopColor: 'white', borderRadius: '50%', animation: 'spin 1s linear infinite', marginBottom: 12 }}></span>
                      <span style={{ fontSize: 12, color: 'var(--text-dim)' }}>Uploading video... this may take a few minutes</span>
                    </div>
                  ) : form.videoUrl ? (
                    <div style={{ position: 'relative', borderRadius: 8, overflow: 'hidden', background: '#000', marginBottom: 12 }}>
                      <video src={form.videoUrl} controls style={{ width: '100%', maxHeight: 180, objectFit: 'cover' }} />
                    </div>
                  ) : (
                    <div style={{ padding: '20px', textAlign: 'center', background: 'rgba(255,255,255,0.03)', borderRadius: 8, border: '1px dashed var(--border)', marginBottom: 12 }}>
                      <span style={{ fontSize: 13, color: 'var(--text-dim)' }}>No video uploaded</span>
                    </div>
                  )}
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>Upload New Video</label>
                    <input type="file" accept="video/*" disabled={isUploadingVideo} onChange={handleUploadVideoImmediate} style={{ width: '100%', fontSize: 13 }} />
                  </div>
                </div>
              </div>
            </div>

            {/* Footer Form Submission */}
            <div style={{ padding: '16px 24px', borderTop: '1px solid var(--border)', display: 'flex', gap: 12, justifyContent: 'flex-end', background: 'var(--surface)', position: 'sticky', bottom: 0, zIndex: 10 }}>
              <button type="button" className="btn btn-ghost" onClick={() => { setShowEditModal(false); setEditingId(null); }}>Cancel</button>
              <button form="edit-girl-form" type="submit" disabled={isSaving} className="btn btn-primary" style={{ minWidth: 120, position: 'relative' }}>
                {isSaving ? (
                  <span style={{ 
                    display: 'inline-block', width: 14, height: 14, 
                    border: '2px solid rgba(255,255,255,0.3)', borderTopColor: 'white', 
                    borderRadius: '50%', animation: 'spin 1s linear infinite' 
                  }}></span>
                ) : 'Save Details'}
              </button>
            </div>
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
              height: 180, background: g.photos[0] ? `url(${g.photos[0]}) center/cover` : 'linear-gradient(135deg, var(--primary-dark), var(--primary))',
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
                <span>🌐 {g.language || 'English'}</span>
                <span>✨ {g.charmLevel || 'Rising'}</span>
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
