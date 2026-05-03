
import React, { useEffect, useState } from 'react';
import { 
  Plus, 
  Download, 
  ArrowUpRight, 
  ArrowDownRight, 
  AlertTriangle, 
  Droplet,
  Calendar,
  Flag,
  X,
  AlertCircle,
  Search
} from 'lucide-react';
import { BloodType } from '../types';
import { db } from '../services/firebase';
import { collection, onSnapshot, query, orderBy, addDoc, serverTimestamp } from 'firebase/firestore';
import { generateInventoryReport } from '../services/pdfExport';
import { toast } from 'react-toastify';
import { useAuth } from '../services/auth';

interface InventoryItem {
  type: BloodType;
  units: number;
  status: 'optimal' | 'low' | 'critical';
  trend: number;
  lastUpdated: string;
}

const bloodTypes: BloodType[] = ['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'];

type DonorRecord = {
  id: string;
  name?: string;
  bloodGroup?: string;
  contact?: string;
  status?: string;
  lastDonation?: string | null;
  createdAt?: any;
  [key: string]: any;
};

const Inventory: React.FC = () => {
  const [donors, setDonors] = useState<DonorRecord[]>([]);
  const [loadingDonors, setLoadingDonors] = useState(true);
  const [exportingPdf, setExportingPdf] = useState(false);
  const { user, userProfile } = useAuth();

  useEffect(() => {
    const q = query(collection(db, 'donors'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, (snapshot) => {
      const list: DonorRecord[] = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
      setDonors(list);
      setLoadingDonors(false);
    }, (err) => {
      console.error('Failed to subscribe to donors', err);
      setLoadingDonors(false);
    });
    return () => unsub();
  }, []);

  // compute totals by blood group and latest update timestamps
  const totals: Record<string, number> = {};
  const latestByType: Record<string, number> = {};
  donors.forEach((d) => {
    const bg = (d.bloodGroup || d.bloodGroup?.toString() || '').toString();
    if (!bg) return;
    totals[bg] = (totals[bg] || 0) + 1;
    // derive timestamp in ms
    let t = 0;
    if (d.createdAt) {
      if (typeof d.createdAt.toDate === 'function') t = d.createdAt.toDate().getTime();
      else if (d.createdAt.seconds) t = d.createdAt.seconds * 1000;
      else if (typeof d.createdAt === 'number') t = d.createdAt;
    }
    latestByType[bg] = Math.max(latestByType[bg] || 0, t || 0);
  });

  const inventoryData = bloodTypes.map((type) => {
    const units = totals[type] || 0;
    const status = units === 0 ? 'critical' : units <= 5 ? 'low' : 'optimal';
    const trend = 0;
    const lastUpdated = latestByType[type] ? new Date(latestByType[type]).toLocaleString() : '—';
    return { type, units, status, trend, lastUpdated } as InventoryItem;
  });

  const handleExportReport = async () => {
    setExportingPdf(true);
    try {
      await generateInventoryReport(inventoryData, donors);
    } catch (error) {
      console.error('Failed to export report:', error);
      alert('Failed to generate PDF report. Please try again.');
    } finally {
      setExportingPdf(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-xl font-bold">Stock Management</h3>
          <p className="text-sm text-gray-500">Real-time blood bank inventory status</p>
        </div>
        <div className="flex flex-wrap gap-2 md:gap-4">
          <button
            onClick={handleExportReport}
            disabled={exportingPdf}
            className="flex-1 sm:flex-none px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all flex items-center justify-center gap-2 text-xs md:text-sm font-bold shadow-lg shadow-blue-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Download className="w-4 h-4" /> {exportingPdf ? 'Exporting...' : 'Export Report'}
          </button>
          <button
            onClick={() => window.dispatchEvent(new CustomEvent('navigateToTab', { detail: { tab: 'donate' } }))}
            className="flex-1 sm:flex-none px-4 md:px-6 py-2 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-all shadow-lg shadow-red-200 flex items-center justify-center gap-2 text-xs md:text-sm font-bold"
          >
            <Plus className="w-4 h-4" /> Add Donation
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {inventoryData.map((item) => (
          <div key={item.type} className="bg-white p-4 md:p-6 rounded-2xl border border-gray-100 shadow-sm relative overflow-hidden group hover:border-red-200 transition-colors">
            <div className="flex items-center justify-between mb-4">
              <div className="bg-red-50 p-2 rounded-lg text-red-600 font-black text-lg">
                {item.type}
              </div>
            </div>
            <div className="space-y-1">
              <div className="flex items-end justify-between">
                <h4 className="text-2xl md:text-3xl font-bold">{item.units} <span className="text-xs md:text-sm font-medium text-gray-400">units</span></h4>
                <div className={`flex items-center gap-1 text-xs md:text-sm font-bold ${item.trend > 0 ? 'text-green-500' : 'text-red-500'}`}>
                  {item.trend > 0 ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
                  {Math.abs(item.trend)}%
                </div>
              </div>
              <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden mt-4">
                <div 
                  className={`h-full transition-all duration-1000 ${
                    item.status === 'optimal' ? 'bg-green-500' : item.status === 'low' ? 'bg-orange-400' : 'bg-red-600'
                  }`}
                  style={{ width: `${Math.min((item.units / 20) * 100, 100)}%` }}
                ></div>
              </div>
              <div className="flex flex-col md:flex-row md:items-center justify-between mt-4 gap-2">
                <span className={`w-fit text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${
                  item.status === 'optimal' ? 'bg-green-50 text-green-600' : 
                  item.status === 'low' ? 'bg-orange-50 text-orange-600' : 
                  'bg-red-50 text-red-600'
                }`}>
                  {item.status}
                </span>
                <span className="text-[10px] text-gray-400 font-medium italic truncate">
                  Updated {item.lastUpdated}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Inventory;
