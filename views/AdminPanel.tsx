import React, { useState, useEffect } from 'react';
import { Users, Activity, FileText, AlertTriangle, Check, X, Download, Trash2, ShieldCheck, UserPlus } from 'lucide-react';
import { listenToDonors, deleteDonorById, deleteRequestById, listenToUsers, updateUserRole, deleteUserById } from '../services/firebase';
import { collection, onSnapshot, query, orderBy, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../services/firebase';
import { toast } from 'react-toastify';
import { Donor, BloodRequest } from '../types';

const AdminPanel: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'donors' | 'requests' | 'reports' | 'complaints' | 'users'>('donors');
  
  // District/City Extraction Heuristic
  const getDistrict = (address?: string) => {
    if (!address) return 'N/A';
    const cleanStr = address.replace(/[0-9]{5,6}/g, ''); // remove pin codes
    const segments = cleanStr.split(',').map(s => s.trim()).filter(s => s.length > 2);
    if (segments.length === 0) return address.substring(0, 15) + '...';
    if (segments.length === 1) return segments[0];
    if (segments.length > 2) return segments[segments.length - 2]; 
    return segments[segments.length - 1];
  };
  
  // Data States
  const [donors, setDonors] = useState<any[]>([]);
  const [requests, setRequests] = useState<BloodRequest[]>([]);
  const [complaints, setComplaints] = useState<any[]>([]); 
  const [users, setUsers] = useState<any[]>([]);
  const [promoteEmail, setPromoteEmail] = useState('');
  const [isPromoting, setIsPromoting] = useState(false);
  
  const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; type: 'donor' | 'request' | 'complaint' | 'user' | null; targetId: string | string[] | null }>({
    isOpen: false,
    type: null,
    targetId: null
  });

  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [selectedDonors, setSelectedDonors] = useState<string[]>([]);
  const [selectedRequests, setSelectedRequests] = useState<string[]>([]);
  const [selectedComplaints, setSelectedComplaints] = useState<string[]>([]);
  
  const [loading, setLoading] = useState(true);

  // Load Data
  useEffect(() => {
    // Listen to Donors
    const unsubDonors = listenToDonors((fetchedDonors) => {
      setDonors(fetchedDonors);
    });

    // Listen to Requests
    const qRequests = query(collection(db, 'requests'), orderBy('createdAt', 'desc'));
    const unsubRequests = onSnapshot(qRequests, (snap) => {
      const parsedRequests = snap.docs.map(doc => ({
        ...doc.data(),
        id: doc.id
      })) as BloodRequest[];
      setRequests(parsedRequests);
    });

    // Listen to Complaints (Assuming a 'complaints' collection exists or building structure for it)
    const qComplaints = query(collection(db, 'complaints'), orderBy('createdAt', 'desc'));
    const unsubComplaints = onSnapshot(qComplaints, (snap) => {
      const parsedComplaints = snap.docs.map(doc => ({
        ...doc.data(),
        id: doc.id
      }));
      setComplaints(parsedComplaints);
      setLoading(false);
    }, (error) => {
      console.warn("Complaints collection might not exist yet:", error);
      setLoading(false);
    });

    // Listen to Users
    const unsubUsers = listenToUsers((fetchedUsers) => {
      setUsers(fetchedUsers);
    });

    return () => {
      if (unsubDonors) unsubDonors();
      unsubRequests();
      unsubComplaints();
      unsubUsers();
    };
  }, []);

  const handleUpdateComplaintStatus = async (complaintId: string, newStatus: 'accepted' | 'rejected') => {
    try {
      const complaintRef = doc(db, 'complaints', complaintId);
      await updateDoc(complaintRef, {
        status: newStatus,
        resolvedAt: new Date().toISOString()
      });
      toast.success(`Complaint ${newStatus} successfully.`);
    } catch (error) {
      console.error("Error updating complaint:", error);
      toast.error('Failed to update complaint status.');
    }
  };

  const handleDeleteDonor = (donorId: string) => {
    setDeleteModal({ isOpen: true, type: 'donor', targetId: donorId });
  };

  const handleDeleteRequest = (requestId: string) => {
    setDeleteModal({ isOpen: true, type: 'request', targetId: requestId });
  };

  const handleDeleteComplaintInitial = (complaintId: string) => {
    setDeleteModal({ isOpen: true, type: 'complaint', targetId: complaintId });
  };

  const handleDeleteUser = (userId: string) => {
    setDeleteModal({ isOpen: true, type: 'user', targetId: userId });
  };

  const handleBulkDeleteUsers = () => {
    if (selectedUsers.length === 0) return;
    setDeleteModal({ isOpen: true, type: 'user', targetId: selectedUsers });
  };

  const handleBulkDeleteDonors = () => {
    if (selectedDonors.length === 0) return;
    setDeleteModal({ isOpen: true, type: 'donor', targetId: selectedDonors });
  };

  const handleBulkDeleteRequests = () => {
    if (selectedRequests.length === 0) return;
    setDeleteModal({ isOpen: true, type: 'request', targetId: selectedRequests });
  };

  const handleBulkDeleteComplaints = () => {
    if (selectedComplaints.length === 0) return;
    setDeleteModal({ isOpen: true, type: 'complaint', targetId: selectedComplaints });
  };

  const executeDelete = async () => {
    if (!deleteModal.targetId || !deleteModal.type) return;

    const id = deleteModal.targetId;
    const type = deleteModal.type;

    setDeleteModal({ isOpen: false, type: null, targetId: null });

    try {
      if (type === 'donor') {
        if (Array.isArray(id)) {
          const promises = id.map(uid => deleteDonorById(uid));
          await Promise.all(promises);
          setSelectedDonors([]);
          toast.success(`SUCCESS: ${id.length} donor records removed.`);
        } else {
          await deleteDonorById(id);
          setSelectedDonors(prev => prev.filter(uid => uid !== id));
          toast.success('SUCCESS: Donor record removed from database.');
        }
      } else if (type === 'request') {
        if (Array.isArray(id)) {
          const promises = id.map(uid => deleteRequestById(uid));
          await Promise.all(promises);
          setSelectedRequests([]);
          toast.success(`SUCCESS: ${id.length} requests removed.`);
        } else {
          await deleteRequestById(id);
          setSelectedRequests(prev => prev.filter(uid => uid !== id));
          toast.success('SUCCESS: Blood request removed from database.');
        }
      } else if (type === 'user') {
        if (Array.isArray(id)) {
          // Bulk delete users - Filter out any admins just in case
          const nonAdminIds = id.filter(uid => {
            const u = users.find(user => user.id === uid);
            return u?.role !== 'admin';
          });
          
          if (nonAdminIds.length === 0) {
            toast.error('ACTION BLOCKED: Administrators strictly cannot be deleted.');
            return;
          }

          const promises = nonAdminIds.map(uid => deleteUserById(uid));
          await Promise.all(promises);
          setSelectedUsers([]);
          toast.success(`SUCCESS: ${nonAdminIds.length} users removed. Administrators were skipped.`);
        } else {
          // Single delete user
          const userToDelete = users.find(u => u.id === id);
          if (userToDelete?.role === 'admin') {
            toast.error('ACTION BLOCKED: Administrators strictly cannot be deleted.');
            return;
          }
          await deleteUserById(id);
          setSelectedUsers(prev => prev.filter(uid => uid !== id));
          toast.success('SUCCESS: User profile removed from database.');
        }
      } else if (type === 'complaint') {
        if (Array.isArray(id)) {
          // Bulk handle complaints
          const promises = id.map(async (cid) => {
            const comp = complaints.find(c => c.id === cid);
            if (!comp) return;
            if (comp.status === 'accepted') {
              return updateDoc(doc(db, 'complaints', cid), { hiddenFromAdmin: true });
            } else {
              return deleteDoc(doc(db, 'complaints', cid));
            }
          });
          await Promise.all(promises);
          setSelectedComplaints([]);
          toast.success(`SUCCESS: ${id.length} complaints processed.`);
        } else {
          const complaint = complaints.find(c => c.id === id);
          if (!complaint) return;
          if (complaint.status === 'accepted') {
            const complaintRef = doc(db, 'complaints', id as string);
            await updateDoc(complaintRef, { hiddenFromAdmin: true });
            toast.success('Complaint cleared from admin view.');
          } else {
            await deleteDoc(doc(db, 'complaints', id as string));
            toast.success('Complaint deleted permanently.');
          }
        }
      }
    } catch (error) {
      console.error(`Error processing ${type} deletion:`, error);
      toast.error(`ERROR: Failed to remove ${type}.`);
    }
  };

  const handleUpdateUserRole = async (userId: string, newRole: 'admin' | 'user') => {
    try {
      await updateUserRole(userId, newRole);
      toast.success(`User role updated to ${newRole} successfully.`);
    } catch (error) {
      console.error("Error updating user role:", error);
      toast.error('Failed to update user role.');
    }
  };

  const handlePromoteByEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!promoteEmail.trim()) return;
    
    setIsPromoting(true);
    try {
      const userToPromote = users.find(u => u.email?.toLowerCase() === promoteEmail.toLowerCase());
      
      if (!userToPromote) {
        toast.error('User not found. They must have a registered account first.');
        return;
      }
      
      if (userToPromote.role === 'admin') {
        toast.info('This user is already an administrator.');
        return;
      }
      
      await handleUpdateUserRole(userToPromote.id, 'admin');
      setPromoteEmail('');
    } catch (error) {
      console.error("Promotion failed:", error);
    } finally {
      setIsPromoting(false);
    }
  };

  const handleGenerateReport = () => {
    toast.info('Generating comprehensive CSV report...');
    
    try {
      // 1. Generate Donors CSV Section
      let csvContent = "--- DONORS REGISTRY ---\n";
      csvContent += "ID,Name,Blood_Type,Phone,Status,Latitude,Longitude,Address\n";
      donors.forEach(donor => {
        const id = donor.id || '';
        const name = `"${(donor.name || '').replace(/"/g, '""')}"`;
        const bloodType = donor.bloodType || donor.bloodGroup || '';
        const phone = donor.contact || donor.phone || donor.phoneNumber || '';
        const status = donor.status || '';
        const lat = donor.location?.lat || donor.coordinates?.lat || donor.lat || '';
        const lng = donor.location?.lng || donor.coordinates?.lng || donor.lng || '';
        const address = `"${(donor.address || donor.location?.address || '').replace(/"/g, '""')}"`;
        csvContent += `${id},${name},${bloodType},${phone},${status},${lat},${lng},${address}\n`;
      });
      
      // 2. Generate Requests CSV Section
      csvContent += "\n\n--- BLOOD REQUESTS ---\n";
      csvContent += "ID,Requester,Blood_Type,Units,Phone,Status,Date\n";
      requests.forEach(req => {
        const id = req.id || '';
        const requester = `"${(req.hospital || (req as any).requesterName || '').replace(/"/g, '""')}"`;
        const bloodType = req.bloodType || (req as any).bloodGroup || '';
        const units = req.units || '';
        const phone = req.contact || (req as any).phone || '';
        const status = req.status || '';
        const date = (req as any).createdAt?.toDate ? (req as any).createdAt.toDate().toLocaleDateString() : '';
        csvContent += `${id},${requester},${bloodType},${units},${phone},${status},${date}\n`;
      });

      // 3. Trigger standard browser download
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `Hemosync_SystemData_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast.success('Report successfully downloaded!');
    } catch (error) {
      console.error("Error generating CSV:", error);
      toast.error('Failed to generate report.');
    }
  };

  return (
    <div className="flex flex-col min-h-0 relative">
      {deleteModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm transition-all duration-300">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden transform scale-100 animate-in fade-in zoom-in-95 duration-200">
            <div className="p-8 flex flex-col items-center text-center">
              <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mb-6">
                <Trash2 className="w-10 h-10 text-red-500" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-3">Delete Record</h3>
              <p className="text-base text-gray-500 font-medium leading-relaxed">
                {Array.isArray(deleteModal.targetId) 
                  ? `Are you absolutely sure you want to permanently delete these ${deleteModal.targetId.length} ${deleteModal.type}s?`
                  : `Are you absolutely sure you want to permanently delete this ${deleteModal.type}?`
                } This action cannot be undone.
              </p>
            </div>
            <div className="flex bg-gray-50 p-4 gap-3 border-t border-gray-100">
              <button 
                onClick={() => setDeleteModal({ isOpen: false, type: null, targetId: null })}
                className="flex-1 px-4 py-3 bg-white border border-gray-200 text-gray-700 font-bold rounded-xl hover:bg-gray-100 transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={executeDelete}
                className="flex-1 px-4 py-3 bg-red-600 text-white font-bold rounded-xl hover:bg-red-700 shadow-md shadow-red-200 transition-all focus:ring-4 focus:ring-red-100"
              >
                Yes, Delete
              </button>
            </div>
          </div>
        </div>
      )}
      <div className="mb-4 flex gap-2 overflow-x-auto pb-2 scrollbar-hide border-b border-gray-100 flex-shrink-0">
        <button 
          onClick={() => setActiveTab('donors')}
          className={`flex items-center gap-2 px-4 py-2 font-bold rounded-lg transition-colors whitespace-nowrap text-sm ${activeTab === 'donors' ? 'bg-red-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
        >
          <Users className="w-4 h-4" /> Donors ({donors.length})
        </button>
        <button 
          onClick={() => setActiveTab('requests')}
          className={`flex items-center gap-2 px-4 py-2 font-bold rounded-lg transition-colors whitespace-nowrap text-sm ${activeTab === 'requests' ? 'bg-red-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
        >
          <Activity className="w-4 h-4" /> Requests ({requests.length})
        </button>
        <button 
          onClick={() => setActiveTab('complaints')}
          className={`flex items-center gap-2 px-4 py-2 font-bold rounded-lg transition-colors whitespace-nowrap text-sm ${activeTab === 'complaints' ? 'bg-red-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
        >
          <AlertTriangle className="w-4 h-4" /> Complaints ({complaints.filter(c => c.status === 'pending').length})
        </button>
        <button 
          onClick={() => setActiveTab('users')}
          className={`flex items-center gap-2 px-4 py-2 font-bold rounded-lg transition-colors whitespace-nowrap text-sm ${activeTab === 'users' ? 'bg-red-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
        >
          <ShieldCheck className="w-4 h-4" /> Admins ({users.filter(u => u.role === 'admin').length})
        </button>
        <button 
          onClick={() => setActiveTab('reports')}
          className={`flex items-center gap-2 px-4 py-2 font-bold rounded-lg transition-colors whitespace-nowrap text-sm ${activeTab === 'reports' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
        >
          <FileText className="w-4 h-4" /> Reports
        </button>
      </div>

      <div className="flex-1 bg-white rounded-2xl shadow-sm border border-gray-100 p-4 md:p-6 overflow-y-auto min-h-0">
        {loading ? (
          <div className="flex justify-center items-center h-full">
            <span className="text-gray-500 font-semibold animate-pulse">Loading Admin Statistics...</span>
          </div>
        ) : (
          <>
            {/* DONORS TAB */}
            {activeTab === 'donors' && (
              <div>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
                  <h3 className="text-xl font-bold">Registry of All Donors</h3>
                  {selectedDonors.length > 0 && (
                    <button 
                      onClick={handleBulkDeleteDonors}
                      className="px-4 py-2 bg-red-100 text-red-600 rounded-xl text-sm font-bold hover:bg-red-200 transition-colors flex items-center justify-center gap-2"
                    >
                      <Trash2 className="w-4 h-4" />
                      Delete ({selectedDonors.length})
                    </button>
                  )}
                </div>
                <div className="overflow-x-auto">
                  {donors.length === 0 ? (
                    <div className="text-center p-12 bg-gray-50 rounded-2xl border border-gray-100 border-dashed mt-4">
                      <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                      <p className="text-gray-500 font-semibold">No donors found in the registry.</p>
                      <p className="text-xs text-gray-400 mt-1">Registered donors will appear here.</p>
                    </div>
                  ) : (
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-gray-50 text-gray-600 text-sm uppercase tracking-wider">
                          <th className="p-4 rounded-tl-lg font-semibold w-10">
                            <input 
                              type="checkbox" 
                              className="w-4 h-4 rounded border-gray-300 text-red-600 focus:ring-red-500"
                              checked={donors.length > 0 && selectedDonors.length === donors.length}
                              onChange={(e) => {
                                if (e.target.checked) setSelectedDonors(donors.map(d => d.id));
                                else setSelectedDonors([]);
                              }}
                            />
                          </th>
                          <th className="p-4 font-semibold">Name</th>
                          <th className="p-4 font-semibold">Blood Group</th>
                          <th className="p-4 font-semibold">Contact</th>
                          <th className="p-4 font-semibold">Status</th>
                          <th className="p-4 font-semibold">Last Donation</th>
                          <th className="p-4 rounded-tr-lg font-semibold text-right pr-8">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {donors.map((donor) => {
                          // Check for verified complaints using both Firestore ID and internal D-ID for backward compatibility
                          const isFlagged = complaints.some(c => 
                            (c.donorId === donor.id || (donor as any).id === c.donorId) && 
                            c.status === 'accepted'
                          );
                          return (
                            <tr key={donor.id} className={`hover:bg-gray-50 transition-colors ${selectedDonors.includes(donor.id) ? 'bg-red-50/30' : ''} ${isFlagged ? 'bg-red-50 border-l-4 border-l-red-500' : ''}`}>
                              <td className="p-4">
                                <input 
                                  type="checkbox" 
                                  className="w-4 h-4 rounded border-gray-300 text-red-600 focus:ring-red-500"
                                  checked={selectedDonors.includes(donor.id)}
                                  onChange={(e) => {
                                    if (e.target.checked) setSelectedDonors(prev => [...prev, donor.id]);
                                    else setSelectedDonors(prev => prev.filter(id => id !== donor.id));
                                  }}
                                />
                              </td>
                              <td className="p-4 font-bold text-gray-900">
                                <div className="flex items-center gap-2">
                                  <span>{donor.name || 'Unknown'}</span>
                                  {isFlagged && (
                                    <span className="px-2 py-0.5 bg-red-600 text-white text-[9px] font-black rounded uppercase tracking-widest">
                                      Flagged
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td className="p-4 font-semibold text-red-600">{donor.bloodType || donor.bloodGroup}</td>
                              <td className="p-4 text-gray-600 text-sm">{donor.contact || donor.phone || donor.phoneNumber || 'N/A'}</td>
                              <td className="p-4">
                                <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider ${
                                  donor.status === 'active' || donor.status === 'available' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                                }`}>
                                  {donor.status || 'available'}
                                </span>
                              </td>
                              <td className="p-4 text-sm font-semibold text-gray-700">
                                {donor.lastDonation || 'Never'}
                              </td>
                              <td className="p-4 text-right pr-6">
                                <button 
                                  onClick={() => handleDeleteDonor(donor.id)}
                                  className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                                  title="Delete Donor"
                                >
                                  <Trash2 className="w-5 h-5" />
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            )}

            {/* REQUESTS TAB */}
            {activeTab === 'requests' && (
              <div>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
                  <h3 className="text-xl font-bold">All Blood Requests</h3>
                  {selectedRequests.length > 0 && (
                    <button 
                      onClick={handleBulkDeleteRequests}
                      className="px-4 py-2 bg-red-100 text-red-600 rounded-xl text-sm font-bold hover:bg-red-200 transition-colors flex items-center justify-center gap-2"
                    >
                      <Trash2 className="w-4 h-4" />
                      Delete ({selectedRequests.length})
                    </button>
                  )}
                </div>
                <div className="overflow-x-auto">
                  {requests.length === 0 ? (
                    <div className="text-center p-12 bg-gray-50 rounded-2xl border border-gray-100 border-dashed mt-4">
                      <Activity className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                      <p className="text-gray-500 font-semibold">No active blood requests.</p>
                      <p className="text-xs text-gray-400 mt-1">Hospital and patient requests will appear here organically.</p>
                    </div>
                  ) : (
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-gray-50 text-gray-600 text-sm uppercase tracking-wider">
                          <th className="p-4 rounded-tl-lg font-semibold w-10">
                            <input 
                              type="checkbox" 
                              className="w-4 h-4 rounded border-gray-300 text-red-600 focus:ring-red-500"
                              checked={requests.length > 0 && selectedRequests.length === requests.length}
                              onChange={(e) => {
                                if (e.target.checked) setSelectedRequests(requests.map(r => r.id));
                                else setSelectedRequests([]);
                              }}
                            />
                          </th>
                          <th className="p-4 font-semibold">Hospital / Requester</th>
                          <th className="p-4 font-semibold">Blood Group</th>
                          <th className="p-4 font-semibold">Units</th>
                          <th className="p-4 font-semibold">Contact</th>
                          <th className="p-4 font-semibold">Status</th>
                          <th className="p-4 rounded-tr-lg font-semibold text-right pr-8">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {requests.map((req) => (
                          <tr key={req.id} className={`hover:bg-gray-50 transition-colors ${selectedRequests.includes(req.id) ? 'bg-red-50/30' : ''}`}>
                            <td className="p-4">
                              <input 
                                type="checkbox" 
                                className="w-4 h-4 rounded border-gray-300 text-red-600 focus:ring-red-500"
                                checked={selectedRequests.includes(req.id)}
                                onChange={(e) => {
                                  if (e.target.checked) setSelectedRequests(prev => [...prev, req.id]);
                                  else setSelectedRequests(prev => prev.filter(id => id !== req.id));
                                }}
                              />
                            </td>
                            <td className="p-4 font-bold text-gray-900">
                              {req.hospital || (req as any).requesterName || 'Unknown'}
                            </td>
                            <td className="p-4 font-bold text-red-600 text-lg">{req.bloodType || (req as any).bloodGroup}</td>
                            <td className="p-4 font-semibold text-gray-700">{req.units}</td>
                            <td className="p-4 text-gray-600 text-sm">{req.contact || (req as any).phone || 'N/A'}</td>
                            <td className="p-4">
                              <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider ${
                                req.status === 'pending' ? 'bg-orange-100 text-orange-700' : 'bg-blue-100 text-blue-700'
                              }`}>
                                {req.status || 'pending'}
                              </span>
                            </td>
                            <td className="p-4 text-right pr-6">
                              <button 
                                onClick={() => handleDeleteRequest(req.id)}
                                className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                                title="Delete Request"
                              >
                                <Trash2 className="w-5 h-5" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            )}

            {/* COMPLAINTS TAB */}
            {activeTab === 'complaints' && (
              <div>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
                  <div className="flex items-center gap-3">
                    <h3 className="text-xl font-bold">Donor Complaints Management</h3>
                    {complaints.filter(c => !c.hiddenFromAdmin).length > 0 && (
                      <div className="flex items-center gap-2 px-3 py-1 bg-gray-100 rounded-lg">
                        <input 
                          type="checkbox" 
                          id="selectAllComplaints"
                          className="w-4 h-4 rounded border-gray-300 text-red-600 focus:ring-red-500"
                          checked={complaints.filter(c => !c.hiddenFromAdmin).length > 0 && selectedComplaints.length === complaints.filter(c => !c.hiddenFromAdmin).length}
                          onChange={(e) => {
                            if (e.target.checked) setSelectedComplaints(complaints.filter(c => !c.hiddenFromAdmin).map(c => c.id));
                            else setSelectedComplaints([]);
                          }}
                        />
                        <label htmlFor="selectAllComplaints" className="text-xs font-bold text-gray-600 cursor-pointer">Select All</label>
                      </div>
                    )}
                  </div>
                  {selectedComplaints.length > 0 && (
                    <button 
                      onClick={handleBulkDeleteComplaints}
                      className="px-4 py-2 bg-red-100 text-red-600 rounded-xl text-sm font-bold hover:bg-red-200 transition-colors flex items-center justify-center gap-2"
                    >
                      <Trash2 className="w-4 h-4" />
                      Delete ({selectedComplaints.length})
                    </button>
                  )}
                </div>
                <div className="grid gap-4">
                  {(() => {
                    const activeComplaints = complaints.filter(c => !c.hiddenFromAdmin);
                    return activeComplaints.length === 0 ? (
                      <div className="text-center p-12 bg-gray-50 rounded-2xl border border-gray-100 border-dashed">
                        <AlertTriangle className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                        <p className="text-gray-500 font-semibold">No active complaints found.</p>
                        <p className="text-xs text-gray-400 mt-1">All complaints have been resolved or deleted.</p>
                      </div>
                    ) : (
                      activeComplaints.map(complaint => (
                      <div key={complaint.id} className={`p-5 rounded-xl border relative transition-all ${selectedComplaints.includes(complaint.id) ? 'bg-red-50 border-red-200 shadow-sm' : complaint.status === 'pending' ? 'bg-orange-50 border-orange-200' : 'bg-white border-gray-100'}`}>
                        <div className="absolute top-5 left-5">
                          <input 
                            type="checkbox" 
                            className="w-4 h-4 rounded border-gray-300 text-red-600 focus:ring-red-500"
                            checked={selectedComplaints.includes(complaint.id)}
                            onChange={(e) => {
                              if (e.target.checked) setSelectedComplaints(prev => [...prev, complaint.id]);
                              else setSelectedComplaints(prev => prev.filter(id => id !== complaint.id));
                            }}
                          />
                        </div>
                        <div className="pl-8">
                          <div className="flex justify-between items-start mb-3">
                            <div>
                              <h4 className="font-bold text-gray-900">Complaint against Donor: <span className="font-semibold text-red-600">{complaint.donorName || 'Unknown'}</span></h4>
                              <p className="text-xs text-gray-500 mt-1">
                                Target ID: <span className="font-mono">{complaint.donorId}</span> • 
                                Reported by: {complaint.reporterName || complaint.reporterEmail || 'Anonymous'}
                              </p>
                            </div>
                            <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider ${
                              complaint.status === 'pending' ? 'bg-orange-200 text-orange-800' : 
                              complaint.status === 'accepted' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                            }`}>
                              {complaint.status || 'pending'}
                            </span>
                          </div>
                          <p className="text-sm text-gray-700 bg-white/50 p-3 rounded-lg border border-gray-200/50 italic mb-4">"{complaint.description}"</p>
                          
                          <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-4">
                            <div className="flex flex-col sm:flex-row gap-2">
                              {(!complaint.status || complaint.status === 'pending') && (
                                <>
                                  <button 
                                    onClick={() => handleUpdateComplaintStatus(complaint.id, 'accepted')}
                                    className="px-4 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-lg text-xs font-bold transition-colors flex items-center justify-center gap-1"
                                  >
                                    <Check className="w-4 h-4" /> Accept / Verify
                                  </button>
                                  <button 
                                    onClick={() => handleUpdateComplaintStatus(complaint.id, 'rejected')}
                                    className="px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-bold transition-colors flex items-center justify-center gap-1"
                                  >
                                    <Check className="w-4 h-4" /> Reject / Dismiss
                                  </button>
                                </>
                              )}
                            </div>
                            
                            <button 
                              onClick={() => handleDeleteComplaintInitial(complaint.id)}
                              className="p-2.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all flex items-center justify-center border border-gray-100 sm:border-none"
                              title="Delete Complaint"
                            >
                              <Trash2 className="w-5 h-5" />
                              <span className="sm:hidden ml-2 text-xs font-bold">Delete Complaint</span>
                            </button>
                          </div>
                          {complaint.resolvedAt && (
                            <p className="text-[10px] text-gray-400 mt-4">
                              Resolved on: {new Date(complaint.resolvedAt).toLocaleString()}
                            </p>
                          )}
                        </div>
                      </div>
                    ))
                    );
                  })()}
                </div>
              </div>
            )}

            {/* USERS TAB */}
            {activeTab === 'users' && (
              <div>
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                  <div>
                    <h3 className="text-xl font-bold">User Role Management</h3>
                    <p className="text-sm text-gray-500">Manage administrative privileges and user access levels.</p>
                  </div>
                  
                  <form onSubmit={handlePromoteByEmail} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full md:w-auto">
                    {selectedUsers.length > 0 && (
                      <button 
                        type="button"
                        onClick={handleBulkDeleteUsers}
                        className="whitespace-nowrap px-4 py-3 sm:py-2 bg-red-100 text-red-600 rounded-xl text-sm font-bold hover:bg-red-200 transition-colors flex items-center justify-center gap-2"
                      >
                        <Trash2 className="w-4 h-4" />
                        Delete ({selectedUsers.length})
                      </button>
                    )}
                    <div className="relative flex-1 sm:flex-none">
                      <input 
                        type="email" 
                        placeholder="Enter user email..." 
                        value={promoteEmail}
                        onChange={(e) => setPromoteEmail(e.target.value)}
                        className="pl-4 pr-4 py-3 sm:py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-red-500 outline-none w-full sm:w-64"
                        required
                      />
                    </div>
                    <button 
                      type="submit"
                      disabled={isPromoting}
                      className="whitespace-nowrap px-4 py-3 sm:py-2 bg-red-600 text-white rounded-xl text-sm font-bold hover:bg-red-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      <UserPlus className="w-4 h-4" />
                      {isPromoting ? 'Promoting...' : 'Add Admin User'}
                    </button>
                  </form>
                </div>

                <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 mb-6 flex items-center gap-3">
                  <UserPlus className="w-6 h-6 text-blue-600" />
                  <p className="text-sm text-blue-800">Assign admin privileges to existing platform users. Admins can manage donors, requests, and system data.</p>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-gray-50 text-gray-600 text-sm uppercase tracking-wider">
                        <th className="p-4 rounded-tl-lg font-semibold w-10">
                          <input 
                            type="checkbox" 
                            className="w-4 h-4 rounded border-gray-300 text-red-600 focus:ring-red-500"
                            checked={users.length > 0 && selectedUsers.length === users.filter(u => u.role !== 'admin').length && selectedUsers.length > 0}
                            onChange={(e) => {
                              if (e.target.checked) setSelectedUsers(users.filter(u => u.role !== 'admin').map(u => u.id));
                              else setSelectedUsers([]);
                            }}
                          />
                        </th>
                        <th className="p-4 font-semibold">User Name</th>
                        <th className="p-4 font-semibold">Email Address</th>
                        <th className="p-4 font-semibold">Current Role</th>
                        <th className="p-4 rounded-tr-lg font-semibold text-right pr-8">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {users.sort((a,b) => (a.role === 'admin' ? -1 : 1)).map((user) => (
                        <tr key={user.id} className={`hover:bg-gray-50 transition-colors ${selectedUsers.includes(user.id) ? 'bg-red-50/30' : ''}`}>
                          <td className="p-4">
                            <input 
                              type="checkbox" 
                              className="w-4 h-4 rounded border-gray-300 text-red-600 focus:ring-red-500 disabled:opacity-30 disabled:cursor-not-allowed"
                              checked={selectedUsers.includes(user.id)}
                              disabled={user.role === 'admin'}
                              onChange={(e) => {
                                if (e.target.checked) setSelectedUsers(prev => [...prev, user.id]);
                                else setSelectedUsers(prev => prev.filter(id => id !== user.id));
                              }}
                            />
                          </td>
                          <td className="p-4 font-bold text-gray-900">{user.name || 'Anonymous User'}</td>
                          <td className="p-4 text-gray-600 text-sm font-medium">{user.email}</td>
                          <td className="p-4">
                            <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider ${
                              user.role === 'admin' ? 'bg-red-600 text-white' : 'bg-blue-100 text-blue-700'
                            }`}>
                              {user.role || 'user'}
                            </span>
                          </td>
                          <td className="p-4 text-right pr-6 flex items-center justify-end gap-2">
                            {user.role === 'admin' ? (
                              <button 
                                onClick={() => handleUpdateUserRole(user.id, 'user')}
                                className="px-3 py-1.5 border border-red-200 text-red-600 hover:bg-red-50 rounded-lg text-xs font-bold transition-all"
                                title="Revoke Admin Access"
                                disabled={user.email === 'magendraprasad84@gmail.com'} // Prevent demoting the primary admin
                              >
                                Revoke Admin
                              </button>
                            ) : (
                              <button 
                                onClick={() => handleUpdateUserRole(user.id, 'admin')}
                                className="px-3 py-1.5 bg-red-600 text-white hover:bg-red-700 rounded-lg text-xs font-bold transition-all flex items-center gap-1"
                                title="Grant Admin Access"
                              >
                                <ShieldCheck className="w-3.5 h-3.5" /> Make Admin
                              </button>
                            )}
                            <button 
                              onClick={() => handleDeleteUser(user.id)}
                              className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all disabled:opacity-10 disabled:cursor-not-allowed"
                              title={user.role === 'admin' ? "Administrators cannot be deleted" : "Delete User"}
                              disabled={user.role === 'admin'} 
                            >
                              <Trash2 className="w-5 h-5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* REPORTS TAB */}
            {activeTab === 'reports' && (
              <div className="flex flex-col items-center justify-center p-12 text-center h-full">
                <div className="bg-blue-50 p-6 rounded-full mb-6">
                  <FileText className="w-16 h-16 text-blue-600" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-2">Generate Data Reports</h3>
                <p className="text-gray-500 max-w-md mx-auto mb-8">Export comprehensive CSV records containing all active donors, blood requests, hospital inventory statuses, and aggregate user analytics.</p>
                <button 
                  onClick={handleGenerateReport}
                  className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition-colors flex items-center gap-2 shadow-lg shadow-blue-200"
                >
                  <Download className="w-5 h-5" /> Export System Data (CSV)
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default AdminPanel;
