import React, { useState, useEffect } from 'react';
import { MapPin, Navigation, User, Phone, MessageSquare, Heart, X, Eye, Calendar, Image as ImageIcon, ZoomIn, ZoomOut, Download, ChevronLeft, ChevronRight, ShieldCheck } from 'lucide-react';
import { Donor, BloodType } from '../types';
import { listenToDonors } from '../services/firebase';
import { toast } from 'react-toastify';

const DonorTracking: React.FC = () => {
  const [donors, setDonors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState<BloodType | 'ALL'>('ALL');
  const [selectedDonor, setSelectedDonor] = useState<any>(null);
  const [activeProofIndex, setActiveProofIndex] = useState<number | null>(null);
  const [zoomScale, setZoomScale] = useState(1);

  useEffect(() => {
    const unsubscribe = listenToDonors((fetchedDonors) => {
      // Map Firebase data to Donor format
      const mappedDonors = fetchedDonors.map((donor: any) => ({
        id: donor.id,
        name: donor.name || 'Unknown',
        bloodType: donor.bloodType || donor.bloodGroup || 'O+',
        lastDonation: donor.lastDonation || 'Never',
        status: donor.status || 'available',
        phone: donor.phone || donor.contact || donor.phoneNumber,
        location: {
          lat: parseFloat(String(donor.coordinates?.lat || donor.location?.lat || donor.lat || 0)),
          lng: parseFloat(String(donor.coordinates?.lng || donor.location?.lng || donor.lng || 0)),
          address: donor.address || donor.location?.address || 'Unknown Location',
        },
        healthProofs: donor.healthProofs || [],
        distance: donor.distance || 0,
      }));
      setDonors(mappedDonors);
      setLoading(false);
    });

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

  const filteredDonors = filterType === 'ALL' ? donors : donors.filter(d => d.bloodType === filterType);

  return (
    <div className="min-h-0 flex flex-col gap-4 md:gap-6">
      <div className="bg-white p-4 md:p-6 rounded-2xl shadow-sm border border-gray-100">
        <h3 className="font-bold text-lg mb-4">Registered Donors</h3>
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
          {['ALL', 'A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'].map(type => (
            <button 
              key={type}
              onClick={() => setFilterType(type as any)}
              className={`px-3 py-1 rounded-lg text-sm font-bold transition-colors whitespace-nowrap ${
                filterType === type ? 'bg-red-600 text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
              }`}
            >
              {type}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto pr-2">
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="bg-gray-50 p-5 rounded-2xl animate-pulse h-32"></div>
            ))}
          </div>
        ) : filteredDonors.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center h-full">
            <div className="p-4 bg-gray-100 rounded-full mb-4">
              <User className="w-8 h-8 text-gray-400" />
            </div>
            <p className="text-gray-500 font-medium">No donors found</p>
            <p className="text-sm text-gray-400 mt-1">Try a different blood type filter</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredDonors.map((donor) => (
            <div key={donor.id} className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 hover:border-red-200 transition-all cursor-pointer group">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <div className="w-12 h-12 rounded-full border-2 border-white shadow-sm bg-red-600 text-white flex items-center justify-center font-bold text-lg">
                      {donor.name.charAt(0).toUpperCase()}
                    </div>
                    {donor.status === 'active' && (
                      <div className="absolute -bottom-1 -right-1 bg-green-500 w-4 h-4 rounded-full border-2 border-white"></div>
                    )}
                  </div>
                  <div className="flex-1">
                    <h4 className="font-bold group-hover:text-red-600 transition-colors">{donor.name}</h4>
                    <p className="text-xs text-gray-500 flex items-center gap-1">
                      <MapPin className="w-3 h-3" /> {donor.location.address}
                    </p>
                  </div>
                </div>
                <div className="bg-red-50 text-red-600 px-2 py-1 rounded-lg font-bold text-sm">
                  {donor.bloodType}
                </div>
              </div>

              {donor.phone && (
                <div className="text-xs font-semibold text-gray-700 mb-3 flex items-center gap-2">
                  <Phone className="w-3 h-3 text-red-600" />
                  <span>{donor.phone}</span>
                </div>
              )}

              <div className="flex gap-2">
                <button 
                  onClick={() => setSelectedDonor(donor)}
                  className="flex-1 p-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                  <Eye className="w-4 h-4" />
                  <span className="text-xs font-semibold">View</span>
                </button>
                <button 
                  onClick={() => {
                    const lat = donor.location?.lat;
                    const lng = donor.location?.lng;
                    
                    if (lat && lng && lat !== 0) {
                      // Using a more robust Google Maps link that forces a marker at exact coordinates
                      window.open(`https://www.google.com/maps/search/?api=1&query=${lat},${lng}`, '_blank');
                    } else {
                      toast.error('Exact GPS coordinates are not available to track this donor.');
                    }
                  }}
                  className="flex-1 p-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center justify-center gap-2 font-semibold"
                >
                  <Navigation className="w-4 h-4" />
                  <span className="text-xs font-semibold">Track on Map</span>
                </button>
              </div>
            </div>
          ))}
          </div>
        )}
      </div>

      {/* Donor Details Panel */}
      {selectedDonor && (
        <div className="fixed inset-0 bg-black/40 z-[999] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto z-[1000] scrollbar-hide">
            {/* Header */}
            <div className="bg-gradient-to-r from-red-600 to-red-700 text-white p-4 md:p-6 flex items-center justify-between sticky top-0 z-10">
              <div className="flex items-center gap-3 md:gap-4">
                <div className="w-10 h-10 md:w-14 md:h-14 rounded-full border-2 md:border-3 border-white bg-white/20 flex items-center justify-center font-bold text-base md:text-xl">
                  {selectedDonor.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h2 className="text-base md:text-2xl font-bold">{selectedDonor.name}</h2>
                  <p className="text-red-100 text-xs md:text-sm">Donor Profile</p>
                </div>
              </div>
              <button 
                onClick={() => setSelectedDonor(null)}
                className="p-1 md:p-2 hover:bg-black/10 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 md:w-6 md:h-6" />
              </button>
            </div>

            {/* Content */}
            <div className="p-4 md:p-8 space-y-4 md:space-y-6">
              {/* Blood Type Card */}
              <div className="bg-gradient-to-r from-red-50 to-red-100 border-l-4 border-red-600 p-4 rounded-lg">
                <p className="text-gray-600 text-[10px] md:text-sm font-semibold mb-1 uppercase">Blood Type</p>
                <p className="text-4xl md:text-5xl font-black text-red-600">{selectedDonor.bloodType}</p>
              </div>

              {/* Contact Information */}
              <div className="space-y-3">
                <h3 className="font-bold text-base md:text-lg text-gray-900">Contact Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="flex items-center gap-3 p-3 md:p-4 bg-gray-50 rounded-lg">
                    <Phone className="w-5 h-5 text-red-600 flex-shrink-0" />
                    <div className="min-w-0">
                      <p className="text-[10px] text-gray-500 uppercase font-bold">Phone</p>
                      <p className="font-semibold text-gray-900 text-sm md:text-base truncate">{selectedDonor.phone || 'N/A'}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-3 md:p-4 bg-gray-50 rounded-lg">
                    <MapPin className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                    <div className="min-w-0">
                      <p className="text-[10px] text-gray-500 uppercase font-bold">Location</p>
                      <p className="font-semibold text-gray-900 text-sm md:text-base break-words">{selectedDonor.location.address}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Donation Information */}
              <div className="space-y-3">
                <h3 className="font-bold text-base md:text-lg text-gray-900">Donation Details</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="flex items-center gap-3 p-3 md:p-4 bg-blue-50 rounded-lg">
                    <Calendar className="w-5 h-5 text-blue-600 flex-shrink-0" />
                    <div className="min-w-0">
                      <p className="text-[10px] text-gray-500 uppercase font-bold">Last Donation</p>
                      <p className="font-semibold text-gray-900 text-sm md:text-base">{selectedDonor.lastDonation}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 md:p-4 bg-green-50 rounded-lg">
                    <Heart className="w-5 h-5 text-green-600 fill-green-600 flex-shrink-0" />
                    <div className="min-w-0">
                      <p className="text-[10px] text-gray-500 uppercase font-bold">Status</p>
                      <p className="font-semibold text-gray-900 text-sm md:text-base capitalize">{selectedDonor.status}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Health Verification Proofs Section */}
              {selectedDonor.healthProofs && selectedDonor.healthProofs.length > 0 && (
                <div className="pt-6 border-t border-gray-100">
                  <div className="bg-red-50 rounded-2xl p-6 border border-red-100 flex flex-col items-center text-center">
                    <div className="p-3 bg-white rounded-full shadow-sm mb-4">
                      <ShieldCheck className="w-8 h-8 text-red-600" />
                    </div>
                    <h3 className="font-bold text-lg text-gray-900 mb-1">Health Records Verified</h3>
                    <p className="text-sm text-gray-500 mb-4">This donor has provided {selectedDonor.healthProofs.length} health verification documents.</p>
                    <button 
                      onClick={() => {
                        setActiveProofIndex(0);
                        setZoomScale(1);
                      }}
                      className="w-full sm:w-auto px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold transition-all flex items-center justify-center gap-2 shadow-lg shadow-red-100"
                    >
                      <ImageIcon className="w-5 h-5" />
                      View Verification Documents
                    </button>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-gray-200">
                <button 
                  onClick={() => {
                    if (selectedDonor.phone && selectedDonor.phone !== 'N/A') {
                      window.location.href = `tel:${selectedDonor.phone}`;
                    } else {
                      toast.error('Phone number not available for this donor');
                    }
                  }}
                  className="w-full sm:flex-1 p-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold transition-colors flex items-center justify-center gap-2"
                >
                  <Phone className="w-5 h-5" />
                  Call Donor
                </button>
                <button 
                  onClick={() => {
                    if (selectedDonor.phone && selectedDonor.phone !== 'N/A') {
                      window.location.href = `sms:${selectedDonor.phone}`;
                    } else {
                      toast.error('Phone number not available for this donor');
                    }
                  }}
                  className="w-full sm:flex-1 p-3 bg-gray-100 hover:bg-gray-200 text-gray-900 rounded-lg font-bold transition-colors flex items-center justify-center gap-2"
                >
                  <MessageSquare className="w-5 h-5 text-red-600" />
                  Message
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeProofIndex !== null && selectedDonor && (
        <ProofViewer 
          images={selectedDonor.healthProofs}
          index={activeProofIndex}
          onClose={() => setActiveProofIndex(null)}
          onNext={() => setActiveProofIndex((activeProofIndex + 1) % selectedDonor.healthProofs.length)}
          onPrev={() => setActiveProofIndex((activeProofIndex - 1 + selectedDonor.healthProofs.length) % selectedDonor.healthProofs.length)}
          scale={zoomScale}
          onZoomIn={() => setZoomScale(s => Math.min(s + 0.25, 3))}
          onZoomOut={() => setZoomScale(s => Math.max(s - 0.25, 0.5))}
        />
      )}
    </div>
  );
};

const ProofViewer: React.FC<{ 
  images: string[]; 
  index: number; 
  onClose: () => void; 
  onNext: () => void; 
  onPrev: () => void;
  scale: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
}> = ({ images, index, onClose, onNext, onPrev, scale, onZoomIn, onZoomOut }) => {
  const downloadImage = () => {
    const link = document.createElement('a');
    link.href = images[index];
    link.download = `health-proof-${index + 1}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="fixed inset-0 bg-black/95 z-[2000] flex flex-col items-center justify-center p-4 animate-in fade-in duration-300">
      <div className="absolute top-4 inset-x-4 flex items-center justify-between z-20">
        <div className="bg-white/10 backdrop-blur-md px-4 py-2 rounded-full text-white font-bold text-sm">
          Verification Document {index + 1} / {images.length}
        </div>
        <div className="flex items-center gap-2">
          <button onClick={onZoomOut} className="p-2 bg-white/10 hover:bg-white/20 rounded-full text-white transition-all">
            <ZoomOut className="w-6 h-6" />
          </button>
          <button onClick={onZoomIn} className="p-2 bg-white/10 hover:bg-white/20 rounded-full text-white transition-all">
            <ZoomIn className="w-6 h-6" />
          </button>
          <button onClick={downloadImage} className="p-2 bg-blue-600 hover:bg-blue-700 rounded-full text-white transition-all">
            <Download className="w-6 h-6" />
          </button>
          <button onClick={onClose} className="p-2 bg-red-600 hover:bg-red-700 rounded-full text-white transition-all ml-2">
            <X className="w-6 h-6" />
          </button>
        </div>
      </div>

      <div className="relative w-full h-full flex items-center justify-center overflow-hidden">
        {images.length > 1 && (
          <>
            <button 
              onClick={onPrev}
              className="absolute left-4 p-4 bg-white/5 hover:bg-white/10 rounded-full text-white transition-all z-20"
            >
              <ChevronLeft className="w-10 h-10" />
            </button>
            <button 
              onClick={onNext}
              className="absolute right-4 p-4 bg-white/5 hover:bg-white/10 rounded-full text-white transition-all z-20"
            >
              <ChevronRight className="w-10 h-10" />
            </button>
          </>
        )}
        
        <div 
          className="transition-transform duration-200 ease-out flex items-center justify-center"
          style={{ transform: `scale(${scale})` }}
        >
          <img 
            src={images[index]} 
            alt="Health Proof" 
            className="max-w-[90vw] max-h-[80vh] object-contain shadow-2xl rounded-lg"
          />
        </div>
      </div>
      
      <div className="absolute bottom-10 text-white/50 text-xs font-medium">
        Use scroll or buttons to navigate • Support for Zoom & Download
      </div>
    </div>
  );
};

export default DonorTracking;
