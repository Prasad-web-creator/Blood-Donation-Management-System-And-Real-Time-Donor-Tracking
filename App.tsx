
import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, 
  Users, 
  Droplets, 
  Bell, 
  MapPin, 
  Activity, 
  Settings, 
  Menu, 
  X,
  Search,
  PlusCircle,
  TrendingUp,
  BrainCircuit,
  LogOut,
  ClipboardList,
  BookOpen,
  ShieldCheck
} from 'lucide-react';
import Dashboard from './views/Dashboard';
import EducationGuide from './views/EducationGuide';
import DonateNow from './views/DonateNow';
import MakeRequest from './views/MakeRequest';
import DonorTracking from './views/DonorTracking';
import Inventory from './views/Inventory';
import BloodRequests from './views/BloodRequests';
import Notifications from './views/Notifications';
import DonorsReports from './views/DonorsReports';
import SettingsView from './views/Settings';
import SearchResults from './views/SearchResults';
import AdminPanel from './views/AdminPanel';
import { useAuth } from './services/auth';
import { listenToNotifications, markNotificationAsRead, requestForToken, onMessageListener } from './services/firebase';
import Auth from './views/Auth';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'education' | 'donate' | 'request' | 'donors' | 'inventory' | 'requests' | 'notifications' | 'search' | 'admin' | 'donors-reports' | 'settings'>('dashboard');
  const [isSidebarOpen, setSidebarOpen] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [showNotificationsPanel, setShowNotificationsPanel] = useState(false);
  const [selectedNotification, setSelectedNotification] = useState<any>(null);
  const searchBoxRef = React.useRef<HTMLDivElement>(null);
  const notificationsRef = React.useRef<HTMLDivElement>(null);

  const { user, userProfile, loading, logout } = useAuth();

  const searchKeywords = [
    { label: 'All Donors', keyword: 'donor', icon: '👥' },
    { label: 'Blood Requests', keyword: 'request', icon: '🩸' },
    { label: 'Blood Inventory', keyword: 'blood', icon: '📊' },
  ];

  const filteredSuggestions = searchKeywords.filter(item =>
    item.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.keyword.toLowerCase().includes(searchTerm.toLowerCase())
  );

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 1024);
      if (window.innerWidth < 1024) setSidebarOpen(false);
      else setSidebarOpen(true);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchBoxRef.current && !searchBoxRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const onNavigate = (e: Event) => {
      try {
        // @ts-ignore
        const detail = (e as CustomEvent).detail;
        if (detail?.tab) setActiveTab(detail.tab);
      } catch (err) {
        console.error('navigateToTab handler error', err);
      }
    };
    window.addEventListener('navigateToTab', onNavigate as EventListener);
    return () => window.removeEventListener('navigateToTab', onNavigate as EventListener);
  }, []);

  useEffect(() => {
    const unsubscribe = listenToNotifications((notifs) => {
      // Filter out notifications created by the current user AND those deleted by the current user
      const filteredNotifs = notifs.filter(n => 
        n.createdByUserId !== user?.uid && 
        !(n.deletedBy || []).includes(user?.uid)
      );
      setNotifications(filteredNotifs);
    });
    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [user]);

  useEffect(() => {
    if (user) {
      requestForToken(user.uid);
    }
  }, [user]);

  useEffect(() => {
    onMessageListener().then((payload) => {
      console.log('Foreground message received: ', payload);
    });
  }, []);

  // Request browser notification permission
  useEffect(() => {
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }
  }, []);

  // Handle Browser Push Notifications for new requests
  const lastNotifiedId = React.useRef<string | null>(null);
  
  useEffect(() => {
    if (notifications.length > 0) {
      const latest = notifications[0]; // Assuming descending order from Firebase
      
      // Check if this is a NEW notification and we haven't alerted for it yet
      const isUnread = !(latest.readBy || []).includes(user?.uid);
      if (latest.id !== lastNotifiedId.current && isUnread) {
        // Only trigger for very recent notifications (within last 60 seconds) to avoid spam on reload
        const now = Date.now();
        const created = latest.createdAt?.toMillis ? latest.createdAt.toMillis() : 0;
        const diffSeconds = (now - created) / 1000;

        if (diffSeconds < 60 && Notification.permission === "granted") {
          const title = `🚨 NEW Blood Request: ${latest.bloodGroup}`;
          const body = `${latest.requesterName} needs ${latest.units} units (${latest.status.toUpperCase()}). Click to view details.`;
          
          try {
            const n = new Notification(title, {
              body,
              icon: 'https://cdn-icons-png.flaticon.com/512/822/822153.png', // Blood drop icon
              tag: latest.id, // Prevent duplicate grouping
            });
            
            n.onclick = () => {
              window.focus();
              setActiveTab('notifications');
            };
          } catch (e) {
            console.error("Browser notification failed", e);
          }
        }
        lastNotifiedId.current = latest.id;
      }
    }
  }, [notifications]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notificationsRef.current && !notificationsRef.current.contains(event.target as Node)) {
        setShowNotificationsPanel(false);
      }
    };
    
    if (showNotificationsPanel) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showNotificationsPanel]);

  const handleLogout = async () => {
    try {
      await logout();
    } catch (err) {
      console.error('Logout failed', err);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center text-gray-500">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return <Auth />;
  }

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'education', label: 'Learn & Explore', icon: BookOpen },
    { id: 'donate', label: 'Donate Now', icon: PlusCircle },
    { id: 'request', label: 'Make Request', icon: Activity },
    { id: 'donors', label: 'Donor Tracking', icon: MapPin },
    { id: 'donors-reports', label: 'Donors & Reports', icon: ClipboardList },
    { id: 'inventory', label: 'Inventory', icon: Droplets },
    { id: 'requests', label: 'Requests', icon: Activity },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    ...(userProfile?.role === 'admin' ? [{ id: 'admin', label: 'Admin Panel', icon: ShieldCheck }] : []),
  ];

  return (
    <div className="flex h-screen bg-gray-50 text-gray-900 overflow-hidden">
      {/* Sidebar Mobile Backdrop */}
      {isMobile && isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden backdrop-blur-sm"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside 
        className={`${
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0 lg:w-20'
        } ${
          isSidebarOpen && 'w-64'
        } fixed inset-y-0 left-0 lg:static bg-white border-r border-gray-200 transition-all duration-300 ease-in-out flex flex-col z-50`}
      >
        <div className="p-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-red-600 p-2 rounded-lg shadow-lg blood-drop">
              <Droplets className="text-white w-6 h-6" />
            </div>
            {(isSidebarOpen || isMobile) && <span className="font-bold text-xl tracking-tight text-red-600">HemoSync</span>}
          </div>
          {isMobile && isSidebarOpen && (
            <button onClick={() => setSidebarOpen(false)} className="p-1 hover:bg-gray-100 rounded-lg">
              <X className="w-6 h-6 text-gray-500" />
            </button>
          )}
        </div>

        <nav className="flex-1 px-4 space-y-2 mt-4 overflow-y-auto">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => {
                setActiveTab(item.id as any);
                if (isMobile) setSidebarOpen(false);
              }}
              className={`w-full flex items-center gap-4 p-3 rounded-xl transition-all ${
                activeTab === item.id 
                  ? 'bg-red-50 text-red-600 font-semibold' 
                  : 'text-gray-500 hover:bg-gray-100'
              }`}
            >
              <item.icon className="w-5 h-5 flex-shrink-0" />
              {(isSidebarOpen || isMobile) && <span className="truncate">{item.label}</span>}
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-gray-100">
          <button 
            onClick={() => {
              setActiveTab('settings');
              if (isMobile) setSidebarOpen(false);
            }}
            className={`w-full flex items-center gap-4 p-3 rounded-xl transition-all ${
              activeTab === 'settings' 
                ? 'bg-red-50 text-red-600 font-semibold' 
                : 'text-gray-500 hover:bg-gray-100'
            }`}
          >
            <Settings className="w-5 h-5 flex-shrink-0" />
            {(isSidebarOpen || isMobile) && <span>Settings</span>}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto overflow-x-hidden flex flex-col">
        {/* Header */}
        <header className="bg-white border-b border-gray-200 flex items-center justify-between px-4 md:px-8 py-4 sticky top-0 z-40">
          <div className="flex items-center gap-2 md:gap-4">
            <button 
              onClick={() => setSidebarOpen(!isSidebarOpen)}
              className="p-2 hover:bg-gray-100 rounded-lg lg:block"
            >
              <Menu className="w-6 h-6" />
            </button>
            <h2 className="text-sm md:text-2xl font-bold text-gray-800 capitalize truncate max-w-[80px] sm:max-w-[150px] md:max-w-none">
              {activeTab.replace('-', ' ')}
            </h2>
          </div>

          <div className="flex items-center gap-1.5 md:gap-7">
            <div className="relative hidden md:block" ref={searchBoxRef}>
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input 
                type="text" 
                placeholder="Search donors, hospitals..." 
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setShowSuggestions(true);
                }}
                onFocus={() => {
                  setShowSuggestions(true);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && searchTerm.trim()) {
                    setActiveTab('search');
                    setShowSuggestions(false);
                  }
                }}
                className="pl-10 pr-4 py-2 bg-gray-100 rounded-full text-sm focus:ring-2 focus:ring-red-500 outline-none w-64"
              />
              
              {/* Auto Suggestions Dropdown */}
              {showSuggestions && searchTerm && filteredSuggestions.length > 0 && (
                <div className="absolute top-12 left-0 right-0 bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden z-50">
                  <div className="py-2">
                    {filteredSuggestions.map((suggestion, index) => (
                      <button
                        key={index}
                        onClick={() => {
                          setSearchTerm(suggestion.keyword);
                          setActiveTab('search');
                          setShowSuggestions(false);
                        }}
                        className="w-full px-4 py-3 text-left hover:bg-red-50 transition flex items-center gap-3 border-b border-gray-100 last:border-b-0"
                      >
                        <span className="text-lg">{suggestion.icon}</span>
                        <div className="flex-1">
                          <p className="font-semibold text-gray-900 text-sm">{suggestion.label}</p>
                          <p className="text-xs text-gray-500">Search for "{suggestion.keyword}"</p>
                        </div>
                        <span className="text-gray-400 text-xs">Enter</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* No Suggestions */}
              {showSuggestions && searchTerm && filteredSuggestions.length === 0 && (
                <div className="absolute top-12 left-0 right-0 bg-white rounded-lg shadow-lg border border-gray-200 p-4 z-50">
                  <p className="text-sm text-gray-500 text-center">No suggestions found</p>
                  <p className="text-xs text-gray-400 text-center mt-1">Try "donor", "request", or "blood"</p>
                </div>
              )}
            </div>
            <button 
              onClick={() => setActiveTab('notifications')}
              className="relative p-2.5 hover:bg-gray-100 rounded-full"
            >
              <Bell className="w-6 h-6 text-gray-500" />
              {(() => {
                const unreadCount = notifications.filter((n: any) => !(n.readBy || []).includes(user?.uid)).length;
                return unreadCount > 0 && (
                  <span className="absolute top-1 right-1 w-5 h-5 bg-red-600 rounded-full border-2 border-white flex items-center justify-center text-white text-xs font-bold">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                );
              })()}
            </button>
            <div className="flex items-center gap-1 md:gap-3 border-l pl-2 md:pl-6 border-gray-200">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-semibold">{userProfile?.name || 'User'}</p>
                <p className="text-[10px] md:text-xs text-blue-600 font-bold uppercase tracking-tighter">
                  {userProfile?.role === 'admin' ? 'Admin' : 'User'}
                </p>
              </div>
              <div className="w-8 h-8 md:w-10 md:h-10 rounded-full border-2 border-white shadow-md bg-red-600 text-white flex items-center justify-center font-bold text-xs md:text-base flex-shrink-0">
                {(userProfile?.name || 'U')[0].toUpperCase()}
              </div>
              <button
                onClick={handleLogout}
                className="p-2 text-red-600 hover:bg-red-50 rounded-lg flex items-center gap-2"
                title="Sign out"
              >
                <LogOut className="w-4 h-4 md:w-5 md:h-5" />
                <span className="hidden sm:inline lg:inline text-xs md:text-sm font-bold">Log out</span>
              </button>
            </div>
          </div>
        </header>

        {/* View Content */}
        <div className="p-4 md:p-8 max-w-7xl mx-auto w-full">
          {activeTab === 'dashboard' && <Dashboard />}
          {activeTab === 'education' && <EducationGuide />}
          {activeTab === 'donate' && <DonateNow />}
          {activeTab === 'request' && <MakeRequest />}
          {activeTab === 'donors' && <DonorTracking />}
          {activeTab === 'inventory' && <Inventory />}
          {activeTab === 'requests' && <BloodRequests selectedNotification={selectedNotification} setSelectedNotification={setSelectedNotification} />}
          {activeTab === 'notifications' && <Notifications onNotificationClick={(notif) => {
            setSelectedNotification(notif);
            setActiveTab('requests');
          }} />}
          {activeTab === 'donors-reports' && <DonorsReports />}
          {activeTab === 'search' && <SearchResults searchTerm={searchTerm} />}
          {activeTab === 'settings' && <SettingsView />}
          {activeTab === 'admin' && userProfile?.role === 'admin' && <AdminPanel />}
          {activeTab === 'admin' && userProfile?.role !== 'admin' && (
            <div className="flex flex-col items-center justify-center p-12 bg-white rounded-2xl shadow-sm border border-red-100">
              <Settings className="w-16 h-16 text-red-300 mb-4" />
              <h3 className="text-xl font-bold text-gray-800">Access Restricted</h3>
              <p className="text-gray-500 mt-2 text-center">You must be an administrator to view this panel.</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default App;
