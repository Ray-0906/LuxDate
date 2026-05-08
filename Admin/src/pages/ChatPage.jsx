import { useState, useEffect, useRef } from 'react';
import { chatApi } from '../api/services.js';
import toast from 'react-hot-toast';
import { HiOutlinePaperAirplane } from 'react-icons/hi2';

export default function ChatPage() {
  const [conversations, setConversations] = useState([]);
  const [active, setActive] = useState(null);
  const [messages, setMessages] = useState([]);
  const [reply, setReply] = useState('');
  const [loading, setLoading] = useState(true);
  const msgEndRef = useRef(null);

  useEffect(() => { loadInbox(); }, []);
  useEffect(() => { if (active) loadMessages(active._id); }, [active]);
  useEffect(() => { msgEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const loadInbox = async () => {
    try {
      const res = await chatApi.getInbox({ limit: 50 });
      setConversations(res.data.data || []);
    } catch { toast.error('Failed to load inbox'); }
    setLoading(false);
  };

  const loadMessages = async (convId) => {
    try {
      const res = await chatApi.getMessages(convId, { limit: 100 });
      setMessages(res.data.data || []);
    } catch { toast.error('Failed to load messages'); }
  };

  const handleReply = async (e) => {
    e.preventDefault();
    if (!reply.trim() || !active) return;
    try {
      await chatApi.reply(active._id, reply);
      setReply('');
      loadMessages(active._id);
    } catch { toast.error('Failed to send'); }
  };

  return (
    <div className="fade-in" style={{ display: 'flex', gap: 16, height: 'calc(100vh - 120px)' }}>
      {/* Conversation list */}
      <div className="card" style={{ width: 320, minWidth: 320, padding: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ padding: '16px 16px 12px', borderBottom: '1px solid var(--border)' }}>
          <h2 style={{ fontSize: 16, fontWeight: 700 }}>Conversations</h2>
        </div>
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {loading ? (
            <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-dim)' }}>Loading...</div>
          ) : conversations.length === 0 ? (
            <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-dim)', fontSize: 13 }}>No conversations yet</div>
          ) : conversations.map((c) => (
            <div
              key={c._id}
              onClick={() => setActive(c)}
              style={{
                padding: '12px 16px', cursor: 'pointer', borderBottom: '1px solid var(--border)',
                background: active?._id === c._id ? 'var(--bg-hover)' : 'transparent',
                transition: 'background 0.15s',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{
                  width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
                  background: c.girl?.profilePhoto ? `url(${c.girl.profilePhoto}) center/cover` : 'var(--bg-elevated)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontWeight: 700, fontSize: 13, color: 'var(--primary-light)',
                }}>{!c.girl?.profilePhoto && (c.girl?.name?.[0] || '?')}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: 13 }}>{c.user?.name || 'User'}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-dim)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    → {c.girl?.name || 'Girl'} · {c.lastMessage || 'No messages'}
                  </div>
                </div>
                {c.unreadCount > 0 && (
                  <span style={{
                    width: 20, height: 20, borderRadius: '50%', background: 'var(--primary)',
                    color: 'white', fontSize: 10, fontWeight: 700,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>{c.unreadCount}</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Messages */}
      <div className="card" style={{ flex: 1, padding: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {!active ? (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-dim)' }}>
            Select a conversation
          </div>
        ) : (
          <>
            <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ fontWeight: 700, fontSize: 15 }}>{active.user?.name || 'User'}</div>
              <span style={{ color: 'var(--text-dim)', fontSize: 13 }}>→ {active.girl?.name || 'Girl'}</span>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 8 }}>
              {messages.map((m) => (
                <div key={m._id} style={{
                  alignSelf: m.senderType === 'user' ? 'flex-start' : 'flex-end',
                  maxWidth: '70%',
                }}>
                  <div style={{
                    padding: '8px 14px', borderRadius: 12, fontSize: 14,
                    background: m.senderType === 'user' ? 'var(--bg-elevated)' : 'var(--primary)',
                    color: m.senderType === 'user' ? 'var(--text)' : 'white',
                  }}>{m.content}</div>
                  <div style={{ fontSize: 10, color: 'var(--text-dim)', marginTop: 3, textAlign: m.senderType === 'user' ? 'left' : 'right' }}>
                    {m.senderType === 'auto' ? '🤖 Auto' : m.senderType === 'admin' ? '👤 Admin' : ''} {new Date(m.createdAt).toLocaleTimeString()}
                  </div>
                </div>
              ))}
              <div ref={msgEndRef} />
            </div>
            <form onSubmit={handleReply} style={{ padding: '12px 16px', borderTop: '1px solid var(--border)', display: 'flex', gap: 8 }}>
              <input value={reply} onChange={(e) => setReply(e.target.value)} placeholder="Type a reply..." style={{ flex: 1 }} />
              <button type="submit" className="btn btn-primary" disabled={!reply.trim()}>
                <HiOutlinePaperAirplane size={16} />
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
