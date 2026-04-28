
import React, { useState, useEffect } from 'react';
import { 
  Activity, 
  Send, 
  Clock, 
  CheckCircle, 
  Truck, 
  Search, 
  Filter,
  UserCheck,
  X,
  MapPin,
  Heart,
  Phone
} from 'lucide-react';
import { BloodType, UrgencyLevel, BloodRequest } from '../types';
import { listenToDonors } from '../services/firebase';
import { db } from '../services/firebase';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';

// Helper: map request document status to urgency
const mapStatusToUrgency = (status?: string) => {
  const s = (status || '').toString().toLowerCase();
  if (s === 'critical') return UrgencyLevel.CRITICAL;
  if (s === 'urgent') return UrgencyLevel.HIGH;
  if (s === 'normal') return UrgencyLevel.MEDIUM;
  return UrgencyLevel.MEDIUM;
};

const BloodRequests: React.FC<{
  selectedNotification?: any;
  setSelectedNotification?: (notif: any) => void;
}> = ({ selectedNotification, setSelectedNotification }) => {
  const [selectedReq, setSelectedReq] = useState<BloodRequest | null>(null);
  const [matchingData, setMatchingData] = useState<any>(null);
  const [loadingMatch, setLoadingMatch] = useState(false);
  const [highlightedRequestId, setHighlightedRequestId] = useState<string | null>(null);

  const [requests, setRequests] = useState<(BloodRequest & { requesterName?: string })[]>([]);
  const [loadingRequests, setLoadingRequests] = useState(true);
  const [availableDonors, setAvailableDonors] = useState<any[]>([]);
  
  // Filter states
  const [showFilterPanel, setShowFilterPanel] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string[]>([]);
  const [bloodGroupFilter, setBloodGroupFilter] = useState<string[]>([]);
  const [unitsRange, setUnitsRange] = useState<[number, number]>([0, 100]);
  const [searchTerm, setSearchTerm] = useState('');
  const highlightedRequestRef = React.useRef<HTMLDivElement>(null);

  const bloodGroupOptions = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
  const statusOptions = ['critical', 'urgent', 'normal'];

  useEffect(() => {
    const q = query(collection(db, 'requests'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, (snap) => {
      const items: BloodRequest[] = snap.docs.map((d) => {
        const data: any = d.data();
        // map fields to BloodRequest shape
        const bloodType = data.bloodGroup || data.bloodType || 'O+';
        const units = data.units || 0;
        const urgency = mapStatusToUrgency(data.status || data.urgency);
        const statusLabel = (data.status || '').toString() || (data.requestStatus || 'pending');
        let ts = '—';
        if (data.createdAt) {
          try {
            // Firestore Timestamp
            // @ts-ignore
            ts = data.createdAt.toDate ? data.createdAt.toDate().toLocaleString() : new Date(data.createdAt).toLocaleString();
          } catch (e) { ts = '—'; }
        }
        return {
          id: d.id,
          hospital: data.hospital || data.requesterName || 'Unknown',
          bloodType: bloodType as BloodType,
          units,
          urgency,
          status: statusLabel,
          timestamp: ts,
          contact: data.contact || 'N/A',
          requesterName: data.requesterName,
        } as BloodRequest & { requesterName?: string };
      });
      setRequests(items);
      setLoadingRequests(false);
    }, (err) => {
      console.error('Failed to load requests', err);
      setLoadingRequests(false);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    const unsubscribeDonors = listenToDonors((fetchedDonors) => {
      const mappedDonors = fetchedDonors.map((donor: any) => ({
        id: donor.id,
        name: donor.name || 'Unknown Donor',
        bloodType: donor.bloodType || donor.bloodGroup || 'O+',
        phone: donor.phone || donor.contact || donor.phoneNumber,
        status: donor.status || 'available',
        distance: donor.distance || Math.floor(Math.random() * 15) + 1, // Mock distance if not available
        location: {
          address: donor.location?.address || donor.address || 'Unknown Location',
        }
      }));
      setAvailableDonors(mappedDonors);
    });

    return () => {
      if (unsubscribeDonors) unsubscribeDonors();
    };
  }, []);

  useEffect(() => {
    if (selectedNotification && requests.length > 0) {
      // Find the matching request based on notification data
      const matchingRequest = requests.find(req => {
        const bloodGroupMatches = req.bloodType === selectedNotification.bloodGroup;
        const unitsMatch = req.units === selectedNotification.units;
        
        // Match by requesterName first (primary key)
        const nameMatches = req.requesterName?.toLowerCase() === selectedNotification.requesterName?.toLowerCase();
        
        // If no exact requesterName match, try hospital match
        const hospitalMatches = !nameMatches && req.hospital?.toLowerCase().includes(selectedNotification.requesterName?.toLowerCase());
        
        return bloodGroupMatches && unitsMatch && (nameMatches || hospitalMatches);
      });

      if (matchingRequest) {
        setHighlightedRequestId(matchingRequest.id);
        
        // Scroll to the highlighted request after a short delay
        setTimeout(() => {
          if (highlightedRequestRef.current) {
            highlightedRequestRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        }, 100);

        // Clear highlight after 5 seconds
        const timer = setTimeout(() => {
          setHighlightedRequestId(null);
          if (setSelectedNotification) {
            setSelectedNotification(null);
          }
        }, 5000);

        return () => clearTimeout(timer);
      }
    }
  }, [selectedNotification, requests, setSelectedNotification]);

  const handleMatch = async (req: BloodRequest) => {
    setSelectedReq(req);
    setLoadingMatch(true);
    
    // Simulate slight network delay for visual feedback
    await new Promise(resolve => setTimeout(resolve, 600));

    // 1. Filter donors by exactly matching blood type and active/available status
    let eligibleDonors = availableDonors.filter(donor => 
      donor.bloodType === req.bloodType && 
      (donor.status === 'available' || donor.status === 'active')
    );

    // 2. Sort by distance (closest first)
    eligibleDonors.sort((a, b) => a.distance - b.distance);

    // 3. Take the top 3 optimal donors
    const topMatches = eligibleDonors.slice(0, 3);

    setMatchingData({
      recommendedDonors: topMatches,
      generalAdvice: topMatches.length > 0 
        ? `Successfully mapped ${topMatches.length} optimal local donors matching the requested ${req.bloodType} profile.`
        : `CRITICAL: No active local ${req.bloodType} donors found in the immediate vicinity. Consider expanding broadcast radius.`
    });
    setLoadingMatch(false);
  };

  const filteredRequests = requests.filter((req) => {
    // Search filter
    if (searchTerm.trim()) {
      const searchLower = searchTerm.toLowerCase();
      const matchesSearch = 
        req.hospital?.toLowerCase().includes(searchLower) ||
        req.bloodType?.toLowerCase().includes(searchLower) ||
        req.status?.toLowerCase().includes(searchLower) ||
        req.id?.toLowerCase().includes(searchLower);
      
      if (!matchesSearch) return false;
    }

    // Status filter
    if (statusFilter.length > 0) {
      const reqStatus = req.status?.toLowerCase() || '';
      if (!statusFilter.some(s => reqStatus.includes(s))) return false;
    }

    // Blood group filter
    if (bloodGroupFilter.length > 0) {
      if (!bloodGroupFilter.includes(req.bloodType)) return false;
    }

    // Units range filter
    if (req.units < unitsRange[0] || req.units > unitsRange[1]) {
      return false;
    }

    return true;
  });

  const toggleStatusFilter = (status: string) => {
    setStatusFilter(prev =>
      prev.includes(status)
        ? prev.filter(s => s !== status)
        : [...prev, status]
    );
  };

  const toggleBloodGroupFilter = (group: string) => {
    setBloodGroupFilter(prev =>
      prev.includes(group)
        ? prev.filter(g => g !== group)
        : [...prev, group]
    );
  };

  const clearAllFilters = () => {
    setStatusFilter([]);
    setBloodGroupFilter([]);
    setUnitsRange([0, 100]);
  };

  const hasActiveFilters = statusFilter.length > 0 || bloodGroupFilter.length > 0 || 
                          unitsRange[0] > 0 || unitsRange[1] < 100;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 h-full">
      {/* Requests List */}
      <div className="lg:col-span-2 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <h3 className="text-xl font-bold">Active Requests</h3>
          <div className="flex flex-wrap items-center gap-2 md:gap-3">
            <div className="relative flex-1 sm:flex-none">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-red-500 outline-none w-full sm:w-48 md:w-56"
              />
            </div>
            {searchTerm && (
              <div className="text-[10px] md:text-sm text-gray-600 py-1 px-2 bg-gray-50 rounded-lg whitespace-nowrap">
                {filteredRequests.length} results
              </div>
            )}
            <button 
              onClick={() => setShowFilterPanel(!showFilterPanel)}
              className={`p-2 border rounded-lg transition-all ${hasActiveFilters ? 'bg-blue-50 border-blue-200 text-blue-600' : 'hover:bg-gray-50'}`}
            >
              <Filter className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Filter Panel */}
        {showFilterPanel && (
          <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-6">
            <div className="flex items-center justify-between mb-4">
              <h4 className="font-bold text-lg">Filter Requests</h4>
              <button onClick={() => setShowFilterPanel(false)} className="p-1 hover:bg-gray-100 rounded">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Status Filter */}
            <div>
              <h5 className="font-semibold text-sm mb-3">Status</h5>
              <div className="flex flex-wrap gap-2">
                {statusOptions.map(status => (
                  <button
                    key={status}
                    onClick={() => toggleStatusFilter(status)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                      statusFilter.includes(status)
                        ? 'bg-red-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {status.charAt(0).toUpperCase() + status.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            {/* Blood Group Filter */}
            <div>
              <h5 className="font-semibold text-sm mb-3">Blood Group</h5>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {bloodGroupOptions.map(group => (
                  <button
                    key={group}
                    onClick={() => toggleBloodGroupFilter(group)}
                    className={`px-3 py-2 rounded-lg text-sm font-semibold transition-all ${
                      bloodGroupFilter.includes(group)
                        ? 'bg-red-100 text-red-700 border border-red-300'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {group}
                  </button>
                ))}
              </div>
            </div>

            {/* Units Range Filter */}
            <div>
              <h5 className="font-semibold text-sm mb-3">Units Required: {unitsRange[0]} - {unitsRange[1]}</h5>
              <div className="space-y-3">
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={unitsRange[0]}
                  onChange={(e) => setUnitsRange([parseInt(e.target.value), unitsRange[1]])}
                  className="w-full"
                />
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={unitsRange[1]}
                  onChange={(e) => setUnitsRange([unitsRange[0], parseInt(e.target.value)])}
                  className="w-full"
                />
              </div>
            </div>

            {/* Clear Filters */}
            {hasActiveFilters && (
              <button
                onClick={clearAllFilters}
                className="w-full px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg font-semibold transition-all"
              >
                Clear All Filters
              </button>
            )}
          </div>
        )}

        <div className="space-y-4">
          {loadingRequests ? (
            <div className="space-y-4">
              {[1,2,3].map(i => (
                <div key={i} className="p-6 rounded-2xl border bg-white animate-pulse h-28"></div>
              ))}
            </div>
          ) : (
            <>
              {hasActiveFilters && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-sm text-blue-700">
                    Showing {filteredRequests.length} of {requests.length} requests
                  </p>
                </div>
              )}
              {filteredRequests.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-gray-500">No requests match your filters</p>
                </div>
              ) : (
                filteredRequests.map((req) => (
                  <div 
                    key={req.id}
                    ref={highlightedRequestId === req.id ? highlightedRequestRef : null}
                    onClick={() => handleMatch(req)}
                    className={`p-6 rounded-2xl border transition-all cursor-pointer group relative overflow-hidden shadow-sm ${
                      highlightedRequestId === req.id 
                        ? 'bg-yellow-50 border-yellow-400 shadow-lg shadow-yellow-200 scale-105 origin-top' 
                        : selectedReq?.id === req.id 
                        ? 'bg-red-50 border-red-200' 
                        : 'bg-white border-gray-100 hover:border-red-100'
                    }`}
                  >
                  <div className="flex flex-col sm:flex-row items-start justify-between gap-4">
                    <div className="flex gap-3 md:gap-4 w-full sm:w-auto">
                      <div className={`p-3 md:p-4 rounded-xl font-black text-lg md:text-xl flex items-center justify-center min-w-[56px] md:min-w-[64px] h-[56px] md:h-[64px] ${
                        req.urgency === UrgencyLevel.CRITICAL ? 'bg-red-600 text-white shadow-md shadow-red-200' : 
                        req.urgency === UrgencyLevel.HIGH ? 'bg-orange-500 text-white shadow-md shadow-orange-200' : 
                        'bg-blue-500 text-white shadow-md shadow-blue-200'
                      }`}>
                        {req.bloodType}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-bold text-base md:text-lg truncate">{req.hospital}</h4>
                        <p className="text-xs md:text-sm text-gray-500 mb-1">{req.units} Units Required</p>
                        {req.contact && req.contact !== 'N/A' && (
                          <p className="text-xs md:text-sm text-gray-600 mb-1 font-semibold truncate">📞 {req.contact}</p>
                        )}
                        <div className="flex flex-wrap items-center gap-2 md:gap-4 text-[10px] md:text-xs font-medium text-gray-400">
                          <span className="flex items-center gap-1 whitespace-nowrap"><Clock className="w-3 h-3" /> {req.timestamp}</span>
                          <span className="hidden sm:inline-flex items-center gap-1 uppercase tracking-wider truncate">{req.id}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-row sm:flex-col items-center sm:items-end justify-between sm:justify-start w-full sm:w-auto gap-2">
                      <span className={`px-2 py-0.5 md:px-3 md:py-1 rounded-full text-[9px] md:text-[10px] font-bold tracking-widest uppercase ${
                        req.status === 'pending' ? 'bg-orange-100 text-orange-600' :
                        req.status === 'in-transit' ? 'bg-blue-100 text-blue-600' :
                        'bg-green-100 text-green-600'
                      }`}>
                        {req.status}
                      </span>
                      <button className="p-1.5 md:p-2 bg-white rounded-lg shadow-sm border border-gray-200 text-gray-600 hover:bg-red-600 hover:text-white transition-all">
                        <Search className="w-4 h-4 md:w-5 md:h-5" />
                      </button>
                    </div>
                  </div>
                  </div>
                ))
              )}
            </>
          )}
        </div>
      </div>

      {/* Compatibility Details */}
      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-4 md:p-8 h-fit lg:sticky lg:top-24">
        {!selectedReq ? (
          <div className="flex flex-col items-center justify-center h-64 text-center">
            <div className="bg-gray-50 p-6 rounded-full mb-4">
              <Search className="w-12 h-12 text-gray-300" />
            </div>
            <p className="text-gray-500 font-medium">Select a request to analyze <br/> donor compatibility</p>
          </div>
        ) : (
          <div className="space-y-8 animate-in slide-in-from-right duration-300">
            <div>
              <div className="flex items-center gap-2 text-red-600 mb-2">
                <Search className="w-5 h-5" />
                <h4 className="font-bold uppercase tracking-widest text-xs">Compatibility Matcher</h4>
              </div>
              <h3 className="text-xl font-bold">Recommended Donors</h3>
              <p className="text-sm text-gray-500 mt-1">Found 3 optimal matches for {selectedReq.bloodType}</p>
            </div>

            {loadingMatch ? (
              <div className="space-y-4">
                {[1, 2, 3].map(i => (
                  <div key={i} className="h-20 bg-gray-50 rounded-2xl animate-pulse"></div>
                ))}
              </div>
            ) : (
              <div className="space-y-4">
                {matchingData?.recommendedDonors.length === 0 ? (
                  <div className="p-6 bg-red-50 rounded-2xl border border-red-100 text-center">
                    <p className="text-red-600 font-bold mb-1">No Active Donors</p>
                    <p className="text-xs text-red-500">There are currently no available donors matching this blood type.</p>
                  </div>
                ) : (
                  matchingData?.recommendedDonors.map((donor: any, idx: number) => (
                    <div key={donor.id} className="p-4 bg-gray-50 rounded-2xl border border-gray-100 hover:border-red-200 transition-all">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center font-bold text-lg text-red-600 border border-red-100 shadow-sm">
                            {donor.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <h5 className="font-bold text-gray-900">{donor.name}</h5>
                            <div className="flex items-center gap-1 text-xs text-gray-500 mt-0.5">
                              <CheckCircle className="w-3 h-3 text-green-500" />
                              <span>Verified Donor</span>
                            </div>
                          </div>
                        </div>
                        <span className="text-green-600 bg-green-50 px-2 py-0.5 rounded text-[10px] font-bold uppercase">
                          {donor.status}
                        </span>
                      </div>
                      <div className="flex gap-2 mt-3">
                        <a 
                          href={`tel:${donor.phone}`}
                          className="flex-1 py-2 bg-white text-gray-800 border border-gray-200 rounded-xl text-xs font-bold hover:bg-red-50 hover:text-red-700 hover:border-red-200 transition-all flex items-center justify-center gap-2 cursor-pointer"
                        >
                          <Phone className="w-3 h-3" /> Call
                        </a>
                        <a 
                          href={`sms:${donor.phone}`}
                          className="flex-[2] py-2 bg-red-600 text-white rounded-xl text-xs font-bold hover:bg-red-700 transition-all flex items-center justify-center gap-2 shadow-sm cursor-pointer"
                        >
                          <Send className="w-3 h-3" /> Message
                        </a>
                      </div>
                    </div>
                  ))
                )}

                <div className="pt-4 border-t border-gray-100">
                  <div className="bg-red-50 p-4 rounded-2xl border border-red-100">
                    <div className="flex items-center gap-2 mb-2 text-red-600">
                      <Activity className="w-4 h-4" />
                      <span className="text-xs font-bold uppercase tracking-wider">System Insight</span>
                    </div>
                    <p className="text-xs text-red-700 leading-relaxed opacity-80">
                      {matchingData?.generalAdvice || "Compatibility matcher optimized to find available donors based on blood type and urgency."}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default BloodRequests;
