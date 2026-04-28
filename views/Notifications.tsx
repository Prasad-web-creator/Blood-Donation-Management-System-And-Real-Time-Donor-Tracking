import React, { useState, useEffect } from 'react';
import { Bell, Clock, Trash2, CheckCircle, MessageCircle } from 'lucide-react';
import { listenToNotifications, markNotificationAsRead, hideNotificationForUser } from '../services/firebase';
import { useAuth } from '../services/auth';
import { db } from '../services/firebase';
import { doc } from 'firebase/firestore';

const Notifications: React.FC<{
  onNotificationClick?: (notif: any) => void;
}> = ({ onNotificationClick }) => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = listenToNotifications((notifs) => {
      // Filter out notifications created by the current user AND those deleted by the user
      const filteredNotifs = notifs.filter(n => 
        n.createdByUserId !== user?.uid && 
        !(n.deletedBy || []).includes(user?.uid)
      );
      setNotifications(filteredNotifs);
      setLoading(false);
    });
    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

  const handleNotificationClick = async (notif: any) => {
    try {
      if (user) {
        await markNotificationAsRead(notif.id, user.uid);
      }
      if (onNotificationClick) {
        onNotificationClick(notif);
      }
    } catch (err) {
      console.error('Failed to mark notification as read', err);
    }
  };

  const handleDeleteNotification = async (e: React.MouseEvent, notifId: string) => {
    e.stopPropagation();
    try {
      if (user) {
        await hideNotificationForUser(notifId, user.uid);
      }
    } catch (err) {
      console.error('Failed to delete notification', err);
    }
  };

  const unreadNotifications = notifications.filter((n) => !(n.readBy || []).includes(user?.uid));
  const readNotifications = notifications.filter((n) => (n.readBy || []).includes(user?.uid));

  return (
    <div className="bg-white rounded-2xl p-4 md:p-8 shadow-sm">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-3 bg-red-50 rounded-lg">
          <Bell className="w-6 h-6 text-red-600" />
        </div>
        <div>
          <h3 className="text-xl font-bold">Notifications</h3>
          <p className="text-sm text-gray-500">
            {unreadNotifications.length} unread notification{unreadNotifications.length !== 1 ? 's' : ''}
          </p>
        </div>
      </div>

      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="p-4 rounded-lg border bg-gray-50 animate-pulse h-24"></div>
          ))}
        </div>
      ) : notifications.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="p-4 bg-gray-100 rounded-full mb-4">
            <Bell className="w-8 h-8 text-gray-400" />
          </div>
          <p className="text-gray-500 font-medium">No notifications yet</p>
          <p className="text-sm text-gray-400 mt-1">You're all caught up!</p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Unread Notifications */}
          {unreadNotifications.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold text-gray-700 mb-3 px-4 py-2 bg-red-50 rounded-lg">
                Unread ({unreadNotifications.length})
              </h4>
              <div className="space-y-3">
                {unreadNotifications.map((notif) => (
                  <div
                    key={notif.id}
                    onClick={() => handleNotificationClick(notif)}
                    className="p-4 border-l-4 border-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition cursor-pointer group"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        {notif.type === 'message' ? (
                          <>
                            <p className="font-semibold text-sm text-gray-900 mb-1 flex items-center gap-2">
                              <MessageCircle className="w-4 h-4 text-red-600" />
                              New message from {notif.senderName}
                            </p>
                            <p className="text-sm text-gray-700 mb-2 bg-white p-2 rounded border border-gray-200">
                              "{notif.messageText}"
                            </p>
                            {notif.senderPhone && (
                              <p className="text-xs text-gray-500">Phone: {notif.senderPhone}</p>
                            )}
                          </>
                        ) : (
                          <>
                            <p className="font-semibold text-sm text-gray-900 mb-1">
                              {notif.requesterName} requested {notif.units} units
                            </p>
                            <div className="flex flex-wrap gap-2 text-xs mb-2">
                              <span className="px-2 py-1 bg-white rounded text-gray-700 font-semibold">
                                {notif.bloodGroup}
                              </span>
                              <span
                                className={`px-2 py-1 rounded font-semibold text-white ${
                                  notif.status === 'critical'
                                    ? 'bg-red-600'
                                    : notif.status === 'urgent'
                                    ? 'bg-orange-600'
                                    : 'bg-yellow-600'
                                }`}
                              >
                                {notif.status.toUpperCase()}
                              </span>
                              {notif.hospital && (
                                <span className="px-2 py-1 bg-white rounded text-gray-600">
                                  {notif.hospital}
                                </span>
                              )}
                            </div>
                          </>
                        )}
                        <p className="text-xs text-gray-500 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {notif.createdAt?.toDate?.().toLocaleDateString()} at{' '}
                          {notif.createdAt?.toDate?.().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                      <button
                        onClick={(e) => handleDeleteNotification(e, notif.id)}
                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-200 rounded-lg md:opacity-0 group-hover:opacity-100 transition"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Read Notifications */}
          {readNotifications.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold text-gray-600 mb-3 px-4 py-2 bg-gray-50 rounded-lg">
                Earlier ({readNotifications.length})
              </h4>
              <div className="space-y-3">
                {readNotifications.map((notif) => (
                  <div
                    key={notif.id}
                    onClick={() => handleNotificationClick(notif)}
                    className="p-4 border border-gray-200 bg-white rounded-lg hover:bg-gray-50 transition cursor-pointer group"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <p className="font-semibold text-sm text-gray-700 mb-1 flex items-center gap-2">
                          <CheckCircle className="w-4 h-4 text-green-600" />
                          {notif.requesterName} requested {notif.units} units
                        </p>
                        <div className="flex flex-wrap gap-2 text-xs mb-2">
                          <span className="px-2 py-1 bg-gray-100 rounded text-gray-600 font-semibold">
                            {notif.bloodGroup}
                          </span>
                          <span
                            className={`px-2 py-1 rounded font-semibold text-white ${
                              notif.status === 'critical'
                                ? 'bg-red-600'
                                : notif.status === 'urgent'
                                ? 'bg-orange-600'
                                : 'bg-yellow-600'
                            }`}
                          >
                            {notif.status.toUpperCase()}
                          </span>
                          {notif.hospital && (
                            <span className="px-2 py-1 bg-gray-100 rounded text-gray-600">
                              {notif.hospital}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-400 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {notif.createdAt?.toDate?.().toLocaleDateString()} at{' '}
                          {notif.createdAt?.toDate?.().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                      <button
                        onClick={(e) => handleDeleteNotification(e, notif.id)}
                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-200 rounded-lg md:opacity-0 group-hover:opacity-100 transition"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Notifications;
