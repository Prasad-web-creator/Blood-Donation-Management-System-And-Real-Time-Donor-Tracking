
import React, { useState, useEffect, useMemo } from 'react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  AreaChart,
  Area
} from 'recharts';
import { Activity, Droplets, Heart, Users, Info, ChevronRight } from 'lucide-react';
import { db } from '../services/firebase';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';

const bloodTypes = ['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'];

// trends are computed from donors data (last 7 days)

const Dashboard: React.FC = () => {
  const [donors, setDonors] = useState<any[]>([]);
  const [loadingDonors, setLoadingDonors] = useState(true);
  const [chartTimeframe, setChartTimeframe] = useState<'week' | 'month' | 'year' | 'all'>('all');
  const [liveRequests, setLiveRequests] = useState<number>(0);
  const [urgentRequestsList, setUrgentRequestsList] = useState<any[]>([]);

  const chartData = useMemo(() => {
    const totals: Record<string, number> = {};
    bloodTypes.forEach((b) => (totals[b] = 0));
    
    const now = new Date();
    const cutoffDate = new Date();
    if (chartTimeframe === 'week') {
      cutoffDate.setDate(now.getDate() - 7);
    } else if (chartTimeframe === 'month') {
      cutoffDate.setMonth(now.getMonth() - 1);
    } else if (chartTimeframe === 'year') {
      cutoffDate.setFullYear(now.getFullYear() - 1);
    }

    donors.forEach((d) => {
      const bg = String((d as any).bloodGroup || (d as any).bloodType || '').trim();
      if (!bg || !bloodTypes.includes(bg)) return;
      
      if (chartTimeframe === 'all') {
        totals[bg] += 1;
        return;
      }

      let dt: Date | null = null;
      if (d.createdAt) {
        if (typeof d.createdAt.toDate === 'function') dt = d.createdAt.toDate();
        else if (d.createdAt.seconds) dt = new Date(d.createdAt.seconds * 1000);
        else if (typeof d.createdAt === 'number') dt = new Date(d.createdAt);
        else dt = new Date(d.createdAt);
      }
      
      if (!dt || dt >= cutoffDate) {
        totals[bg] += 1;
      }
    });

    return bloodTypes.map((b) => ({ name: b, units: totals[b] || 0 }));
  }, [donors, chartTimeframe]);

  // Removed AI Insights fetch

  useEffect(() => {
    const q = query(collection(db, 'donors'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, (snapshot) => {
      const list = snapshot.docs.map((d) => ({ id: d.id, ...d.data() as any }));
      setDonors(list);
      setLoadingDonors(false);
    }, (err) => {
      console.error('Failed to subscribe to donors', err);
      setLoadingDonors(false);
    });
    return () => unsub();
  }, []);

  const trends = useMemo(() => {
    // build map of yyyy-mm-dd => count
    const map: Record<string, number> = {};
    const today = new Date();
    for (let i = 0; i < 7; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() - (6 - i));
      const key = d.toISOString().slice(0, 10);
      map[key] = 0;
    }

    donors.forEach((d) => {
      let dt: Date | null = null;
      if (!d) return;
      if (d.createdAt) {
        if (typeof d.createdAt.toDate === 'function') dt = d.createdAt.toDate();
        else if (d.createdAt.seconds) dt = new Date(d.createdAt.seconds * 1000);
        else if (typeof d.createdAt === 'number') dt = new Date(d.createdAt);
        else dt = new Date(d.createdAt);
      }
      if (!dt) return;
      const key = dt.toISOString().slice(0, 10);
      if (key in map) map[key] = (map[key] || 0) + 1;
    });

    const out = Object.keys(map).sort().map((k) => {
      const date = new Date(k + 'T00:00:00');
      return { day: date.toLocaleDateString(undefined, { weekday: 'short' }), count: map[k] };
    });
    return out;
  }, [donors]);

  useEffect(() => {
    const q = collection(db, 'requests');
    const unsub = onSnapshot(q, (snapshot) => {
      setLiveRequests(snapshot.size);
      try {
        const items = snapshot.docs
          .map((d) => {
            const data: any = d.data();
            const statusRaw = (data.status || data.requestStatus || data.urgency || '').toString();
            const status = statusRaw.toLowerCase();
            if (!(status === 'critical' || status === 'urgent')) return null;
            let ts = '—';
            try {
              // Firestore Timestamp handling
              // @ts-ignore
              ts = data.createdAt?.toDate ? data.createdAt.toDate().toLocaleString() : new Date(data.createdAt).toLocaleString();
            } catch (e) { ts = '—'; }
            return {
              id: d.id,
              hospital: data.hospital || data.requesterName || 'Unknown',
              bloodType: data.bloodGroup || data.bloodType || 'O+',
              units: data.units || 0,
              status: status.toUpperCase(),
              timestamp: ts,
              createdAt: data.createdAt,
            };
          })
          .filter(Boolean)
          .sort((a: any, b: any) => {
            const ta = a?.createdAt?.toDate ? a.createdAt.toDate().getTime() : (a?.createdAt?.seconds ? a.createdAt.seconds * 1000 : 0);
            const tb = b?.createdAt?.toDate ? b.createdAt.toDate().getTime() : (b?.createdAt?.seconds ? b.createdAt.seconds * 1000 : 0);
            return tb - ta;
          })
          .slice(0, 5);
        setUrgentRequestsList(items as any[]);
      } catch (err) {
        console.error('Failed to map urgent requests', err);
        setUrgentRequestsList([]);
      }
    }, (err) => {
      console.error('Failed to subscribe to requests', err);
      setLiveRequests(0);
      setUrgentRequestsList([]);
    });
    return () => unsub();
  }, []);

  const totalStock = donors.length; // 1 unit per donor transaction 
  const activeDonorsCount = donors.filter(d => (d.status || '').toString().toLowerCase() === 'active').length;
  const successRate = donors.length ? `${((activeDonorsCount / donors.length) * 100).toFixed(1)}%` : '—';

  const stats = [
    { label: 'Total Stock', value: `${totalStock} Units`, icon: Droplets, color: 'text-red-600', bg: 'bg-red-100' },
    { label: 'Active Donors', value: `${activeDonorsCount}`, icon: Users, color: 'text-blue-600', bg: 'bg-blue-100' },
    { label: 'Success Rate', value: `${successRate}`, icon: Heart, color: 'text-pink-600', bg: 'bg-pink-100' },
    { label: 'Live Requests', value: `${liveRequests}`, icon: Activity, color: 'text-orange-600', bg: 'bg-orange-100' },
  ];

  return (
    <div className="space-y-4 md:space-y-8 animate-in fade-in duration-500">
      {/* Top Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        {stats.map((stat, i) => (
          <div key={i} className="bg-white p-4 md:p-6 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
            <div className="flex items-center gap-3 md:gap-4">
              <div className={`${stat.bg} ${stat.color} p-2 md:p-3 rounded-xl`}>
                <stat.icon className="w-5 h-5 md:w-6 md:h-6" />
              </div>
              <div>
                <p className="text-sm text-gray-500 font-medium">{stat.label}</p>
                <h3 className="text-xl md:text-2xl font-bold">{stat.value}</h3>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-8">
        {/* Main Chart */}
        <div className="bg-white p-4 md:p-8 rounded-2xl shadow-sm border border-gray-100">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
            <h3 className="text-lg md:text-xl font-bold flex items-center gap-2">
              <Droplets className="text-red-600 w-5 h-5 flex-shrink-0" />
              <span className="truncate">Stock Inventory</span>
            </h3>
            <select 
              value={chartTimeframe}
              onChange={(e) => setChartTimeframe(e.target.value as any)}
              className="text-xs md:text-sm bg-white border border-gray-200 rounded-xl px-4 py-2 outline-none focus:ring-2 focus:ring-red-500 transition-all font-semibold text-gray-700 cursor-pointer w-full sm:w-auto shadow-sm shadow-gray-100"
            >
              <option value="all">All Time</option>
              <option value="week">This Week</option>
              <option value="month">This Month</option>
              <option value="year">This Year</option>
            </select>
          </div>
          <div className="h-80 overflow-x-auto scrollbar-hide" style={{ minWidth: 0 }}>
            <div className="min-w-[500px] md:min-w-full h-full" style={{ minWidth: 0 }}>
              <ResponsiveContainer width="100%" height="100%" className="focus:outline-none">
                <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 20 }} style={{ outline: 'none' }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                  <XAxis 
                    dataKey="name" 
                    axisLine={false} 
                    tickLine={false} 
                    dy={10} 
                    tick={{ fontSize: 12, fontWeight: 500 }}
                  />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    width={40}
                    tick={{ fontSize: 12 }}
                  />
                  <Tooltip 
                    cursor={{ fill: '#fef2f2' }}
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  />
                  <Bar dataKey="units" fill="#ef4444" radius={[4, 4, 0, 0]} barSize={40} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Trends */}
        <div className="bg-white p-4 md:p-8 rounded-2xl shadow-sm border border-gray-100">
          <h3 className="text-lg md:text-xl font-bold mb-4 md:mb-6">Donation Trends</h3>
          <div className="h-72 overflow-x-auto scrollbar-hide" style={{ minWidth: 0 }}>
            <div className="min-w-[500px] md:min-w-full h-full" style={{ minWidth: 0 }}>
              <ResponsiveContainer width="100%" height="100%" className="focus:outline-none">
                <AreaChart data={trends} margin={{ top: 10, right: 10, left: 0, bottom: 20 }} style={{ outline: 'none' }}>
                  <defs>
                    <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ef4444" stopOpacity={0.1}/>
                      <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                  <XAxis 
                    dataKey="day" 
                    axisLine={false} 
                    tickLine={false} 
                    dy={15}
                    padding={{ left: 20, right: 20 }}
                    tick={{ fontSize: 12, fontWeight: 500 }}
                  />
                  <YAxis 
                    allowDecimals={false}
                    axisLine={false} 
                    tickLine={false} 
                    width={40}
                    dx={-10}
                    tick={{ fontSize: 12 }}
                  />
                  <Tooltip />
                  <Area type="monotone" dataKey="count" stroke="#ef4444" strokeWidth={3} fillOpacity={1} fill="url(#colorCount)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Recent Urgent Requests */}
        <div className="bg-white p-4 md:p-8 rounded-2xl shadow-sm border border-gray-100">
          <h3 className="text-lg md:text-xl font-bold mb-4 md:mb-6">Urgent Requests</h3>
          <div className="space-y-4">
            {urgentRequestsList.length === 0 ? (
              <div className="p-6 bg-gray-50 rounded-xl border border-gray-100 text-sm text-gray-500">No critical or urgent requests at the moment.</div>
            ) : (
              urgentRequestsList.map((req, i) => (
                <div 
                  key={req.id} 
                  role="button"
                  onClick={() => window.dispatchEvent(new CustomEvent('navigateToTab', { detail: { tab: 'requests', requestId: req.id } }))}
                  className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-100 cursor-pointer hover:shadow-md"
                >
                  <div className="flex items-center gap-3 md:gap-4 min-w-0">
                    <div className="bg-red-100 text-red-600 font-bold w-10 h-10 md:w-12 md:h-12 flex-shrink-0 flex items-center justify-center rounded-full text-xs md:text-sm">
                      {req.bloodType}
                    </div>
                    <div className="min-w-0">
                      <h4 className="font-bold text-gray-800 truncate text-sm md:text-base">{req.hospital}</h4>
                      <p className="text-xs text-gray-500 truncate">{req.units} units • {req.timestamp}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 md:px-3 md:py-1 rounded-full text-[10px] md:text-xs font-bold ${req.status === 'CRITICAL' ? 'bg-red-600 text-white animate-pulse' : 'bg-orange-100 text-orange-600'}`}>
                      {req.status}
                    </span>
                    <ChevronRight className="w-4 h-4 md:w-5 md:h-5 text-gray-400" />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

    </div>
  );
};

export default Dashboard;
