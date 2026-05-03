import React, { useEffect, useState } from 'react';
import { 
  Plus, 
  Download, 
  AlertTriangle, 
  MoreVertical,
  Flag,
  X,
  AlertCircle,
  Search,
  ClipboardList,
  Image as ImageIcon
} from 'lucide-react';
import { db } from '../services/firebase';
import { collection, onSnapshot, query, orderBy, addDoc, serverTimestamp } from 'firebase/firestore';
import { generateInventoryReport } from '../services/pdfExport';
import { toast } from 'react-toastify';
import { useAuth } from '../services/auth';

interface DonorRecord {
  id: string;
  name?: string;
  bloodGroup?: string;
  contact?: string;
  status?: string;
  lastDonation?: string | null;
  createdAt?: any;
  [key: string]: any;
}

const DonorsReports: React.FC = () => {
  const [donors, setDonors] = useState<DonorRecord[]>([]);
  const [loadingDonors, setLoadingDonors] = useState(true);
  const [exportingPdf, setExportingPdf] = useState(false);
  const [showComplaintModal, setShowComplaintModal] = useState(false);
  const [selectedDonor, setSelectedDonor] = useState<DonorRecord | null>(null);
  const [complaintDescription, setComplaintDescription] = useState('');
  const [submittingComplaint, setSubmittingComplaint] = useState(false);
  const [expandedDonors, setExpandedDonors] = useState<Set<string>>(new Set());
  const [complaints, setComplaints] = useState<any[]>([]);
  const [loadingComplaints, setLoadingComplaints] = useState(false);
  const [donorSearchTerm, setDonorSearchTerm] = useState('');
  const { user, userProfile } = useAuth();

  useEffect(() => {
    const q = query(collection(db, 'donors'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, (snapshot) => {
      const list: DonorRecord[] = snapshot.docs.map((d) => ({ ...d.data(), id: d.id }));
      setDonors(list);
      setLoadingDonors(false);
    }, (err) => {
      console.error('Failed to subscribe to donors', err);
      setLoadingDonors(false);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    setLoadingComplaints(true);
    const q = query(collection(db, 'complaints'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, (snapshot) => {
      const complaintsList = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
      setComplaints(complaintsList);
      setLoadingComplaints(false);
    }, (err) => {
      console.error('Failed to subscribe to complaints', err);
      setLoadingComplaints(false);
    });
    return () => unsub();
  }, []);

  const toggleDonorExpand = (donorId: string) => {
    const newExpanded = new Set(expandedDonors);
    if (newExpanded.has(donorId)) {
      newExpanded.delete(donorId);
    } else {
      newExpanded.add(donorId);
    }
    setExpandedDonors(newExpanded);
  };

  const getDonorComplaints = (donorId: string) => {
    return complaints.filter((c) => c.donorId === donorId && c.status !== 'rejected');
  };

  const searchFilteredDonors = donors.filter((donor) => {
    const searchLower = donorSearchTerm.toLowerCase();
    return (
      donor.name?.toLowerCase().includes(searchLower) ||
      donor.bloodGroup?.toLowerCase().includes(searchLower) ||
      donor.status?.toLowerCase().includes(searchLower) ||
      donor.contact?.toLowerCase().includes(searchLower)
    );
  });

  const handleExportReport = async () => {
    setExportingPdf(true);
    try {
      // Create simplified inventory data for the report service if needed,
      // though the service might expect real inventory status.
      // For now, we'll pass the donors directly as it's a "donors and reports" tab.
      // We might need to mock the inventory status if generateInventoryReport requires it.
      const mockInventoryData: any[] = []; 
      await generateInventoryReport(mockInventoryData, donors);
    } catch (error) {
      console.error('Failed to export report:', error);
      alert('Failed to generate PDF report. Please try again.');
    } finally {
      setExportingPdf(false);
    }
  };

  const handleReportClick = (donor: DonorRecord) => {
    setSelectedDonor(donor);
    setComplaintDescription('');
    setShowComplaintModal(true);
  };

  const handleSubmitComplaint = async () => {
    if (!selectedDonor || !complaintDescription.trim()) {
      toast.error('Please enter a complaint description');
      return;
    }

    setSubmittingComplaint(true);
    try {
      await addDoc(collection(db, 'complaints'), {
        donorId: selectedDonor.id,
        donorName: selectedDonor.name,
        donorContact: selectedDonor.contact,
        donorBloodGroup: selectedDonor.bloodGroup,
        reporterId: user?.uid,
        reporterEmail: user?.email,
        reporterName: userProfile?.name,
        description: complaintDescription,
        status: 'pending',
        createdAt: serverTimestamp(),
      });
      toast.success('Complaint submitted successfully');
      setShowComplaintModal(false);
      setSelectedDonor(null);
      setComplaintDescription('');
    } catch (error) {
      console.error('Error submitting complaint:', error);
      toast.error('Failed to submit complaint');
    } finally {
      setSubmittingComplaint(false);
    }
  };

  return (
    <>
      <div className="space-y-8 animate-in fade-in duration-500">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-xl font-bold">Donors and Reports</h3>
            <p className="text-sm text-gray-500">Management of registered donors and detailed reporting</p>
          </div>
          <div className="flex flex-wrap gap-2 md:gap-4">
            <button
              onClick={handleExportReport}
              disabled={exportingPdf}
              className="flex-1 sm:flex-none px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all flex items-center justify-center gap-2 text-xs md:text-sm font-bold shadow-lg shadow-blue-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Download className="w-4 h-4" /> {exportingPdf ? 'Exporting...' : 'Export Donor Report'}
            </button>
            <button
              onClick={() => window.dispatchEvent(new CustomEvent('navigateToTab', { detail: { tab: 'donate' } }))}
              className="flex-1 sm:flex-none px-4 md:px-6 py-2 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-all shadow-lg shadow-red-200 flex items-center justify-center gap-2 text-xs md:text-sm font-bold"
            >
              <Plus className="w-4 h-4" /> Register New
            </button>
          </div>
        </div>

        {/* Donors List */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-4 md:p-6 border-b border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <h3 className="font-bold flex items-center gap-2">
              <ClipboardList className="w-5 h-5 text-red-600" />
              Donor Database
            </h3>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search donors..."
                  value={donorSearchTerm}
                  onChange={(e) => setDonorSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-red-500 outline-none w-full md:w-64"
                />
              </div>
              <span className="text-xs text-center text-gray-500">{searchFilteredDonors.length} results</span>
            </div>
          </div>
          <div className="p-6">
            {loadingDonors ? (
              <div className="text-sm text-gray-500">Loading donor records...</div>
            ) : searchFilteredDonors.length === 0 ? (
              <div className="text-sm text-gray-500">No donor records found matching your criteria.</div>
            ) : (
              <div className="space-y-3">
                {searchFilteredDonors.map((d) => {
                  const bloodGroupBgColor = 
                    (d.bloodGroup || '').includes('O') ? 'bg-red-100 text-red-700' :
                    (d.bloodGroup || '').includes('A') ? 'bg-blue-100 text-blue-700' :
                    (d.bloodGroup || '').includes('B') ? 'bg-yellow-100 text-yellow-700' :
                    (d.bloodGroup || '').includes('AB') ? 'bg-purple-100 text-purple-700' :
                    'bg-gray-100 text-gray-700';
                  
                  const statusBgColor = 
                    (d.status || '').toString().toLowerCase() === 'active' 
                      ? 'bg-green-100 text-green-700' 
                      : 'bg-gray-100 text-gray-700';

                  const donorComplaints = getDonorComplaints(d.id);
                  const acceptedComplaints = donorComplaints.filter(c => c.status === 'accepted');
                  const hasAcceptedComplaint = acceptedComplaints.length > 0;
                  const isExpanded = expandedDonors.has(d.id);

                  return (
                    <div key={d.id} className={`border rounded-lg overflow-hidden transition-all ${
                      hasAcceptedComplaint ? 'border-red-500 ring-1 ring-red-500 bg-red-50' : 'border-gray-100'
                    }`}>
                      {hasAcceptedComplaint && (
                        <div className="bg-red-600 text-white px-4 py-1.5 flex items-center gap-2 text-xs font-bold">
                          <AlertTriangle className="w-3.5 h-3.5" />
                          <span>ADMIN VERIFIED COMPLAINT</span>
                        </div>
                      )}
                      <div className={`p-4 hover:shadow-md transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                        hasAcceptedComplaint ? 'bg-red-50/50' : 'bg-white'
                      } hover:border-red-200`}>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <div className="font-bold text-gray-900">{d.name || '—'}</div>
                            {hasAcceptedComplaint && (
                              <span className="bg-red-100 text-red-700 text-[10px] px-1.5 py-0.5 rounded flex items-center gap-1 font-black flex-shrink-0">
                                <AlertCircle className="w-3 h-3" /> FLAGGED
                              </span>
                            )}
                          </div>
                          <div className="flex flex-wrap items-center gap-2 mt-2">
                            <span className={`text-[10px] md:text-xs font-bold px-2 md:px-2.5 py-0.5 md:py-1 rounded-full ${bloodGroupBgColor}`}>
                              {d.bloodGroup || '—'}
                            </span>
                            <span className="text-xs text-gray-500 hidden sm:inline">•</span>
                            <span className="text-xs text-gray-600 truncate">{d.contact || '—'}</span>
                          </div>
                          <div className="text-[10px] md:text-xs text-gray-400 mt-1">Last donation: {d.lastDonation || '—'}</div>
                        </div>
                        <div className="flex flex-row sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-3">
                          <div className="sm:text-right">
                            <span className={`inline-block text-[10px] md:text-xs font-bold px-2 md:px-2.5 py-0.5 md:py-1 rounded-full ${statusBgColor}`}>
                              {(d.status || '—').toString().toUpperCase()}
                            </span>
                            <div className="text-[9px] md:text-[10px] text-gray-400 mt-1 md:mt-2">{d.createdAt?.toDate ? new Date(d.createdAt.toDate()).toLocaleDateString() : '—'}</div>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => toggleDonorExpand(d.id)}
                              className={`px-2 py-1.5 md:px-3 md:py-2 text-[10px] md:text-sm font-semibold rounded-lg transition-colors ${isExpanded ? 'bg-blue-100 text-blue-600' : 'text-blue-600 bg-blue-50 hover:bg-blue-100'}`}
                            >
                              {isExpanded ? 'Hide' : 'View'} {donorComplaints.length > 0 && `(${donorComplaints.length})`}
                            </button>
                            <button
                              onClick={() => handleReportClick(d)}
                              className="px-2 py-1.5 md:px-3 md:py-2 text-[10px] md:text-sm font-semibold text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors"
                            >
                              Report
                            </button>
                          </div>
                        </div>
                      </div>

                      {isExpanded && (
                        <div className="border-t border-gray-100 bg-gray-50 p-4 md:p-6 space-y-6">
                          {/* Health Proof Documents */}
                          {d.healthProofs && d.healthProofs.length > 0 && (
                            <div className="space-y-3">
                              <h4 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                                <ImageIcon className="w-4 h-4 text-red-600" />
                                Health Verification Proofs
                              </h4>
                              <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide">
                                {d.healthProofs.map((src: string, idx: number) => (
                                  <div 
                                    key={idx} 
                                    className="relative min-w-[150px] h-24 md:h-32 rounded-lg overflow-hidden border border-gray-200 shadow-sm cursor-zoom-in hover:border-red-300 transition-all"
                                    onClick={() => window.open(src, '_blank')}
                                  >
                                    <img src={src} alt={`Proof ${idx + 1}`} className="w-full h-full object-cover" />
                                    <div className="absolute bottom-0 inset-x-0 bg-black/40 p-1.5 text-white text-[8px] md:text-[10px] font-bold">
                                      Proof Document {idx + 1}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Complaints Section */}
                          <div className="space-y-3">
                            <h4 className="text-sm font-bold text-gray-900">Recent Complaints</h4>
                            {donorComplaints.length === 0 ? (
                            <div className="text-center py-4">
                              <p className="text-sm text-gray-500">No complaints for this donor</p>
                            </div>
                          ) : (
                            <div className="space-y-3">
                              {donorComplaints.map((complaint) => (
                                <div key={complaint.id} className="bg-white p-4 rounded-lg border border-orange-200 bg-orange-50">
                                  <div className="flex items-start gap-3 mb-2">
                                    <AlertCircle className="w-5 h-5 text-orange-600 mt-0.5 flex-shrink-0" />
                                    <div className="flex-1">
                                      <p className="font-semibold text-gray-900 text-sm">Complaint from {complaint.reporterName || complaint.reporterEmail || 'Anonymous'}</p>
                                      <p className="text-xs text-gray-500 mt-1">
                                        {complaint.createdAt?.toDate ? new Date(complaint.createdAt.toDate()).toLocaleString() : 'N/A'}
                                      </p>
                                    </div>
                                    <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                                      complaint.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                                      complaint.status === 'resolved' ? 'bg-green-100 text-green-700' :
                                      'bg-gray-100 text-gray-700'
                                    }`}>
                                      {(complaint.status || 'N/A').toUpperCase()}
                                    </span>
                                  </div>
                                  <p className="text-sm text-gray-700 mt-2">{complaint.description}</p>
                                </div>
                              ))}
                            </div>
                          )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Complaint Modal */}
      {showComplaintModal && selectedDonor && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold">Report Donor Complaint</h2>
              <button
                onClick={() => {
                  setShowComplaintModal(false);
                  setSelectedDonor(null);
                  setComplaintDescription('');
                }}
                className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mb-4 p-4 bg-gray-50 rounded-xl">
              <p className="text-sm text-gray-600 mb-1">
                <span className="font-semibold text-gray-900">Donor:</span> {selectedDonor.name}
              </p>
              <p className="text-sm text-gray-600">
                <span className="font-semibold text-gray-900">Blood Group:</span> {selectedDonor.bloodGroup}
              </p>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-bold text-gray-700 mb-2 uppercase tracking-wide">
                Complaint Details
              </label>
              <textarea
                value={complaintDescription}
                onChange={(e) => setComplaintDescription(e.target.value)}
                placeholder="Please describe the issue or medical condition here..."
                className="w-full p-4 border border-gray-200 rounded-xl focus:ring-2 focus:ring-red-500 outline-none resize-none bg-gray-50/50"
                rows={5}
              />
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setShowComplaintModal(false);
                  setSelectedDonor(null);
                  setComplaintDescription('');
                }}
                className="flex-1 px-4 py-3 border border-gray-200 rounded-xl text-gray-700 font-bold hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmitComplaint}
                disabled={submittingComplaint || !complaintDescription.trim()}
                className="flex-1 px-4 py-3 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-red-100"
              >
                <Flag className="w-4 h-4" />
                {submittingComplaint ? 'Submitting...' : 'Submit Report'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default DonorsReports;
