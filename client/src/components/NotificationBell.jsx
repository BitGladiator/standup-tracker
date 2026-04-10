import { useRef, useEffect } from 'react';
import useNotifications from '../hooks/useNotifications.jsx';

const NotificationBell = ({ userId }) => {
  const {
    notifications,
    unreadCount,
    open,
    setOpen,
    handleMarkAsRead,
    handleMarkAllAsRead,
  } = useNotifications(userId);

  const ref = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const formatTime = (isoString) => {
    const d = new Date(isoString);
    const now = new Date();
    const diffHours = Math.floor((now - d) / 1000 / 60 / 60);
    if (diffHours < 1) return 'Just now';
    if (diffHours < 24) return `${diffHours}h ago`;
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <div ref={ref} style={{ position: 'relative' }}>

      {/* Bell button */}
      <button
        onClick={() => setOpen((o) => !o)}
        style={{
          position: 'relative',
          background: 'none',
          border: '1px solid #e2e8f0',
          borderRadius: '8px',
          padding: '6px 10px',
          cursor: 'pointer',
          fontSize: '16px',
          lineHeight: 1,
          color: '#4a5568',
        }}
      >
        🔔
        {unreadCount > 0 && (
          <span style={{
            position: 'absolute',
            top: '-6px',
            right: '-6px',
            background: '#E53E3E',
            color: '#fff',
            fontSize: '10px',
            fontWeight: '700',
            width: '18px',
            height: '18px',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown panel */}
      {open && (
        <div style={{
          position: 'absolute',
          top: '42px',
          right: 0,
          width: '360px',
          background: '#fff',
          border: '1px solid #e2e8f0',
          borderRadius: '12px',
          boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
          zIndex: 100,
          overflow: 'hidden',
        }}>

        
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 16px', borderBottom: '1px solid #e2e8f0' }}>
            <span style={{ fontSize: '14px', fontWeight: '600', color: '#1a202c' }}>
              Notifications
            </span>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllAsRead}
                style={{ fontSize: '12px', color: '#3182CE', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
              >
                Mark all as read
              </button>
            )}
          </div>

      
          <div style={{ maxHeight: '360px', overflowY: 'auto' }}>
            {notifications.length === 0 ? (
              <div style={{ padding: '32px 16px', textAlign: 'center', color: '#a0aec0', fontSize: '13px' }}>
                No notifications yet
              </div>
            ) : (
              notifications.map((n) => (
                <div
                  key={n.id}
                  onClick={() => {
                    if (!n.read) handleMarkAsRead(n.id);
                    if (n.pr_url) window.open(n.pr_url, '_blank');
                  }}
                  style={{
                    display: 'flex',
                    gap: '12px',
                    padding: '12px 16px',
                    borderBottom: '1px solid #f7fafc',
                    cursor: 'pointer',
                    background: n.read ? '#fff' : '#EBF8FF',
                    transition: 'background 0.15s',
                  }}
                >
                 
                  <div style={{ paddingTop: '4px', flexShrink: 0 }}>
                    <div style={{
                      width: '8px', height: '8px', borderRadius: '50%',
                      background: n.read ? '#e2e8f0' : '#3182CE',
                    }} />
                  </div>

                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '13px', fontWeight: '500', color: '#1a202c', marginBottom: '2px' }}>
                      {n.pr_title}
                    </div>
                    <div style={{ fontSize: '12px', color: '#718096', marginBottom: '4px' }}>
                      {n.repo} · No activity for 48h
                    </div>
                    <div style={{ fontSize: '11px', color: '#a0aec0' }}>
                      {formatTime(n.created_at)}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

        </div>
      )}
    </div>
  );
};

export default NotificationBell;