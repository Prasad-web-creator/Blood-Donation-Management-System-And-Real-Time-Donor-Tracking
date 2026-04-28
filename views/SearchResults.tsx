import React, { useState, useEffect } from 'react';
import { db } from '../services/firebase';
import { collection, getDocs } from 'firebase/firestore';
import { Users, Phone, Droplets, AlertCircle, MapPin, Search } from 'lucide-react';

interface Donor {
  id: string;
  name: string;
  bloodGroup: string;
  contact: string;
  status: string;
  location: string;
  email: string;
  age?: number;
}

interface BloodRequest {
  id: string;
  requesterName: string;
  bloodGroup: string;
  units: number;
  status: string;
  contact: string;
}

interface SearchResultsProps {
  searchTerm: string;
}

const SearchResults: React.FC<SearchResultsProps> = ({ searchTerm }) => {
  const [donors, setDonors] = useState<Donor[]>([]);
  const [requests, setRequests] = useState<BloodRequest[]>([]);
  const [showDonors, setShowDonors] = useState(false);
  const [showRequests, setShowRequests] = useState(false);
  const [loading, setLoading] = useState(false);
  const [fetchedDonors, setFetchedDonors] = useState(false);
  const [fetchedRequests, setFetchedRequests] = useState(false);

  useEffect(() => {
    const searchLower = searchTerm.toLowerCase().trim();
    setFetchedDonors(false);
    setFetchedRequests(false);

    // Check if searching for donors
    if (searchLower === 'donor' || searchLower === 'donors') {
      setShowDonors(true);
      setShowRequests(false);
      fetchAllDonors();
    } 
    // Check if searching for requests
    else if (searchLower === 'request' || searchLower === 'requests') {
      setShowDonors(false);
      setShowRequests(true);
      fetchAllRequests();
    }
    // Check if searching for blood units
    else if (searchLower === 'blood' || searchLower === 'blood units' || searchLower === 'inventory') {
      setShowDonors(true);
      setShowRequests(true);
      fetchAllDonors();
      fetchAllRequests();
    }
  }, [searchTerm]);

  const fetchAllDonors = async () => {
    setLoading(true);
    try {
      const snapshot = await getDocs(collection(db, 'donors'));
      const donorsList = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      } as Donor));
      setDonors(donorsList);
      setFetchedDonors(true);
    } catch (err) {
      console.error('Error fetching donors:', err);
      setFetchedDonors(true);
    } finally {
      setLoading(false);
    }
  };

  const fetchAllRequests = async () => {
    setLoading(true);
    try {
      const snapshot = await getDocs(collection(db, 'requests'));
      const requestsList = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      } as BloodRequest));
      setRequests(requestsList);
      setFetchedRequests(true);
    } catch (err) {
      console.error('Error fetching requests:', err);
      setFetchedRequests(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Search Summary */}
      <div className="bg-gradient-to-r from-red-50 to-orange-50 rounded-2xl p-6 border border-red-100">
        <h2 className="text-2xl font-bold text-gray-800 mb-2">Search Results</h2>
        <p className="text-gray-600">
          Searching for: <span className="font-semibold text-red-600">"{searchTerm}"</span>
        </p>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="inline-block animate-spin text-4xl mb-3">⏳</div>
            <p className="text-gray-500 font-semibold">Loading results...</p>
          </div>
        </div>
      )}

      {!loading && !showDonors && !showRequests && (
        <div className="bg-blue-50 rounded-2xl p-12 text-center border-2 border-dashed border-blue-200">
          <Search className="w-12 h-12 text-blue-300 mx-auto mb-4" />
          <p className="text-blue-600 text-lg font-semibold">Try searching for:</p>
          <ul className="text-blue-500 text-sm mt-3 space-y-1">
            <li>"donor" or "donors" - to see all registered donors</li>
            <li>"request" or "requests" - to see all blood requests</li>
            <li>"blood" or "inventory" - to see donors and requests</li>
          </ul>
        </div>
      )}

      {/* No Results Found Message */}
      {!loading && (fetchedDonors || fetchedRequests) && donors.length === 0 && requests.length === 0 && (
        <div className="bg-red-50 rounded-2xl p-12 text-center border-2 border-red-200">
          <AlertCircle className="w-12 h-12 text-red-300 mx-auto mb-4" />
          <p className="text-red-600 text-lg font-bold">Search Results Not Found</p>
          <p className="text-red-500 text-sm mt-2">
            No donors or requests match your search criteria for "<span className="font-semibold">{searchTerm}</span>"
          </p>
          <p className="text-red-400 text-xs mt-4">Try searching with keywords like "donor", "request", or "blood"</p>
        </div>
      )}

      {/* Donors Section */}
      {!loading && showDonors && donors.length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <div className="px-6 py-4 bg-gradient-to-r from-blue-50 to-blue-100 border-b border-blue-200 flex items-center gap-3">
            <Users className="w-5 h-5 text-blue-600" />
            <h3 className="font-bold text-lg text-gray-800">All Donors ({donors.length})</h3>
          </div>
          <div className="divide-y divide-gray-100">
            {donors.map((donor) => (
              <div key={donor.id} className="p-6 hover:bg-blue-50 transition">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <h4 className="font-bold text-gray-900 text-lg">{donor.name}</h4>
                    {donor.age && <p className="text-sm text-gray-600">Age: {donor.age}</p>}
                    <div className="mt-2 space-y-1 text-sm text-gray-600">
                      <p className="flex items-center gap-2">
                        <Phone className="w-4 h-4" />
                        {donor.contact}
                      </p>
                      <p className="flex items-center gap-2">
                        <MapPin className="w-4 h-4" />
                        {donor.location}
                      </p>
                      {donor.email && <p>📧 {donor.email}</p>}
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="inline-block bg-red-100 text-red-700 px-4 py-2 rounded-xl font-bold text-lg">
                      {donor.bloodGroup}
                    </span>
                    <p className={`text-sm font-semibold mt-2 ${
                      donor.status === 'active' ? 'text-green-600' : 'text-gray-400'
                    }`}>
                      {donor.status === 'active' ? '✓ Active' : 'Inactive'}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Requests Section */}
      {!loading && showRequests && requests.length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <div className="px-6 py-4 bg-gradient-to-r from-orange-50 to-orange-100 border-b border-orange-200 flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-orange-600" />
            <h3 className="font-bold text-lg text-gray-800">All Blood Requests ({requests.length})</h3>
          </div>
          <div className="divide-y divide-gray-100">
            {requests.map((req) => (
              <div key={req.id} className="p-6 hover:bg-orange-50 transition">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <h4 className="font-bold text-gray-900 text-lg">{req.requesterName}</h4>
                    <div className="mt-2 space-y-1 text-sm text-gray-600">
                      <p className="flex items-center gap-2">
                        <Droplets className="w-4 h-4 text-red-500" />
                        <span className="font-semibold">{req.units} units</span> required
                      </p>
                      <p className="flex items-center gap-2">
                        <Phone className="w-4 h-4" />
                        {req.contact}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="inline-block bg-blue-100 text-blue-700 px-4 py-2 rounded-xl font-bold text-lg">
                      {req.bloodGroup}
                    </span>
                    <p className={`text-xs font-bold mt-2 px-3 py-1 rounded-lg ${
                      req.status === 'critical' ? 'bg-red-100 text-red-700' :
                      req.status === 'urgent' ? 'bg-orange-100 text-orange-700' :
                      'bg-green-100 text-green-700'
                    }`}>
                      {req.status.toUpperCase()}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {!loading && showDonors && donors.length === 0 && (
        <div className="bg-yellow-50 rounded-2xl p-12 text-center border-2 border-yellow-200">
          <Users className="w-12 h-12 text-yellow-300 mx-auto mb-4" />
          <p className="text-yellow-600 text-lg font-bold">No Donors Found</p>
          <p className="text-yellow-600 text-sm mt-2">
            Currently, there are no registered donors in the system.
          </p>
          <p className="text-yellow-500 text-xs mt-3">Donors can register in the "Donate Now" tab.</p>
        </div>
      )}

      {!loading && showRequests && requests.length === 0 && (
        <div className="bg-purple-50 rounded-2xl p-12 text-center border-2 border-purple-200">
          <AlertCircle className="w-12 h-12 text-purple-300 mx-auto mb-4" />
          <p className="text-purple-600 text-lg font-bold">No Requests Found</p>
          <p className="text-purple-600 text-sm mt-2">
            Currently, there are no blood requests in the system.
          </p>
          <p className="text-purple-500 text-xs mt-3">Hospitals can submit requests in the "Make Request" tab.</p>
        </div>
      )}
    </div>
  );
};

export default SearchResults;
