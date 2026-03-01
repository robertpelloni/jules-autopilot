'use client';

import { useState, useEffect, useCallback } from 'react';

interface NotificationInfo {
    id: string; type: string; title: string; body: string;
    severity: string; resourceType: string | null; resourceId: string | null;
    isRead: boolean; dismissedAt: string | null; createdAt: string;
}

export default function NotificationsPage() {
    const [notifications, setNotifications] = useState<NotificationInfo[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [loading, setLoading] = useState(true);

    const fetchNotifications = useCallback(async () => {
        try {
            const res = await fetch('/api/notifications');
            if (res.ok) { const data = await res.json(); setNotifications(data.notifications); setUnreadCount(data.unreadCount); }
        } catch { /* */ } finally { setLoading(false); }
    }, []);

    useEffect(() => { fetchNotifications(); const interval = setInterval(fetchNotifications, 10000); return () => clearInterval(interval); }, [fetchNotifications]);

    const markAllRead = async () => {
        await fetch('/api/notifications', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'read_all' }) });
        await fetchNotifications();
    };

    const markRead = async (id: string) => {
        await fetch('/api/notifications', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ids: [id], action: 'read' }) });
        await fetchNotifications();
    };

    const severityConfig: Record<string, { icon: string; color: string; bg: string }> = {
        info: { icon: 'ℹ️', color: '#3b82f6', bg: '#1e3a5f' },
        success: { icon: '✅', color: '#10b981', bg: '#064e3b' },
        warning: { icon: '⚠️', color: '#f59e0b', bg: '#78350f' },
        error: { icon: '🚨', color: '#ef4444', bg: '#7f1d1d' }
    };

    return (
        <div style={{ padding: '2rem', maxWidth: '900px', margin: '0 auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <div>
                    <h1 style={{ fontSize: '1.75rem', fontWeight: 700, marginBottom: '0.25rem' }}>🔔 Notifications</h1>
                    <p style={{ color: '#9ca3af' }}>{unreadCount} unread</p>
                </div>
                {unreadCount > 0 && (
                    <button onClick={markAllRead} style={{ padding: '0.5rem 1rem', borderRadius: '8px', border: 'none', background: '#374151', color: '#d1d5db', fontSize: '0.85rem', cursor: 'pointer' }}>
                        Mark all read
                    </button>
                )}
            </div>

            {loading ? <p style={{ color: '#9ca3af', textAlign: 'center' }}>Loading...</p> :
                notifications.length === 0 ? <p style={{ color: '#9ca3af', textAlign: 'center' }}>No notifications.</p> :
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        {notifications.map(n => {
                            const sev = severityConfig[n.severity] || severityConfig.info;
                            return (
                                <div key={n.id} onClick={() => !n.isRead && markRead(n.id)} style={{
                                    background: n.isRead ? '#1f2937' : sev.bg,
                                    borderRadius: '10px', padding: '0.75rem 1rem',
                                    border: `1px solid ${n.isRead ? '#374151' : sev.color}40`,
                                    cursor: n.isRead ? 'default' : 'pointer',
                                    opacity: n.dismissedAt ? 0.5 : 1,
                                    display: 'flex', alignItems: 'flex-start', gap: '0.75rem'
                                }}>
                                    <span style={{ fontSize: '1.1rem', marginTop: '0.1rem' }}>{sev.icon}</span>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <span style={{ fontWeight: n.isRead ? 400 : 600, fontSize: '0.9rem' }}>{n.title}</span>
                                            <span style={{ color: '#6b7280', fontSize: '0.7rem' }}>{new Date(n.createdAt).toLocaleString()}</span>
                                        </div>
                                        <p style={{ color: '#9ca3af', fontSize: '0.8rem', margin: '0.25rem 0 0' }}>{n.body}</p>
                                        {n.resourceType && (
                                            <span style={{ color: '#6b7280', fontSize: '0.7rem' }}>
                                                {n.resourceType}{n.resourceId ? ` #${n.resourceId.substring(0, 8)}` : ''}
                                            </span>
                                        )}
                                    </div>
                                    {!n.isRead && <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: sev.color, flexShrink: 0, marginTop: '0.4rem' }} />}
                                </div>
                            );
                        })}
                    </div>}
        </div>
    );
}
