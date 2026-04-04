import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Bell, Search } from 'lucide-react';
import api from '../../api/axios';
import { formatRelativeTime } from '../../utils/formatters';

const breadcrumbMap = {
  '/': 'Dashboard',
  '/complaints': 'Complaints',
  '/cfa-management': 'CFA Management',
  '/dealer-management': 'Dealer Management',
  '/reports': 'Reports',
};

const Header = () => {
  const location = useLocation();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);

  const currentPage = Object.entries(breadcrumbMap).find(
    ([path]) => path === '/' ? location.pathname === '/' : location.pathname.startsWith(path)
  )?.[1] || 'Page';

  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        const { data } = await api.get('/notifications?limit=5');
        setNotifications(data.data || []);
        setUnreadCount(data.meta?.unreadCount || 0);
      } catch (e) {
        // Silently fail
      }
    };
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

  const markAllRead = async () => {
    try {
      await api.put('/notifications/read-all');
      setUnreadCount(0);
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    } catch (e) {}
  };

  return (
    <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6 sticky top-0 z-30">
      <div className="flex items-center gap-2">
        <span className="text-gray-400 text-sm">Admin</span>
        <span className="text-gray-300">/</span>
        <span className="text-gray-800 font-semibold text-sm">{currentPage}</span>
      </div>

      <div className="flex items-center gap-3">
        {/* Notification Bell */}
        <div className="relative">
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="relative p-2 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <Bell size={20} className="text-gray-500" />
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center animate-pulse">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {showNotifications && (
            <div className="absolute right-0 top-12 w-80 bg-white rounded-xl shadow-2xl border border-gray-200 overflow-hidden animate-fade-in z-50">
              <div className="p-3 border-b border-gray-100 flex items-center justify-between">
                <h3 className="font-semibold text-sm">Notifications</h3>
                {unreadCount > 0 && (
                  <button onClick={markAllRead} className="text-xs text-blue-600 hover:underline">
                    Mark all read
                  </button>
                )}
              </div>
              <div className="max-h-64 overflow-y-auto">
                {notifications.length === 0 ? (
                  <p className="p-4 text-sm text-gray-400 text-center">No notifications</p>
                ) : (
                  notifications.map(n => (
                    <div
                      key={n._id}
                      className={`p-3 border-b border-gray-50 hover:bg-gray-50 transition-colors ${
                        !n.isRead ? 'border-l-3 border-l-blue-500 bg-blue-50/30' : ''
                      }`}
                    >
                      <p className="text-sm font-medium text-gray-800">{n.title}</p>
                      <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{n.body}</p>
                      <p className="text-xs text-gray-400 mt-1">{formatRelativeTime(n.createdAt)}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;
