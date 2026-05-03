import React, { useState } from 'react';
import { BloodType } from '../types';
import { db, createNotification } from '../services/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { MapPin, Navigation } from 'lucide-react';
import { toast } from 'react-toastify';
import { useAuth } from '../services/auth';

const bloodTypes: BloodType[] = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

const MakeRequest: React.FC = () => {
  const { user } = useAuth();
  const [name, setName] = useState('');
  const [hospital, setHospital] = useState('');
  const [bloodGroup, setBloodGroup] = useState<BloodType>('O+');
  const [units, setUnits] = useState<number | ''>('');
  const [status, setStatus] = useState<'critical'|'urgent'|'normal'>('critical');
  const [contact, setContact] = useState('');
  const [location, setLocation] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [coordinates, setCoordinates] = useState<{ lat: number; lng: number } | null>(null);
  const [locating, setLocating] = useState(false);

  const reset = () => {
    setName(''); setHospital(''); setBloodGroup('O+'); setUnits(''); setStatus('critical'); setContact(''); setLocation(''); setNotes(''); setCoordinates(null);
  };

  const handleGetLocation = () => {
    setLocating(true);
    
    if (!navigator.geolocation) {
      toast.error("Geolocation is not supported by your browser.");
      setLocating(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setCoordinates({
          lat: position.coords.latitude,
          lng: position.coords.longitude
        });
        setLocating(false);
        toast.success("Exact coordinates captured!");
      },
      async (error) => {
        console.warn("Browser Geolocation failed, trying IP fallback:", error);
        
        // Fallback to IP geolocation if browser API fails
        try {
          const response = await fetch('https://get.geojs.io/v1/ip/geo.json');
          if (response.ok) {
            const data = await response.json();
            if (data.latitude && data.longitude) {
              setCoordinates({ 
                lat: parseFloat(data.latitude), 
                lng: parseFloat(data.longitude) 
              });
              toast.info("Location captured via IP (Approximate). For better accuracy, please enable GPS.");
            } else {
              throw new Error('IP data incomplete');
            }
          } else {
            throw new Error('IP service unreachable');
          }
        } catch (fallbackErr) {
          console.error("All geolocation methods failed:", fallbackErr);
          toast.error("Failed to capture location. Please ensure location services are enabled.");
        } finally {
          setLocating(false);
        }
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !bloodGroup || !units) {
      toast.error('Please complete all required fields');
      return;
    }

    if (!coordinates) {
      toast.error('Exact location is strictly required to make a request.');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        requesterName: name,
        hospital: hospital || null,
        bloodGroup,
        units: Number(units),
        status,
        contact: contact || null,
        location: {
          address: location || null,
          lat: coordinates.lat,
          lng: coordinates.lng
        },
        notes: notes || null,
        createdAt: serverTimestamp(),
      } as any;

      await addDoc(collection(db, 'requests'), payload);
      
      // Create notification for all users
      await createNotification({
        requesterName: name,
        bloodGroup,
        units: Number(units),
        status,
        hospital: hospital || undefined,
        createdByUserId: user?.uid,
      });
      
      toast.success('Blood request submitted successfully!', {
        position: "top-right",
        autoClose: 4000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
      });
      reset();
      // navigate to requests tab
      window.dispatchEvent(new CustomEvent('navigateToTab', { detail: { tab: 'requests' } }));
    } catch (err) {
      console.error('Failed to submit request', err);
      toast.error('Failed to submit request. Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl p-4 md:p-8 shadow-sm">
      <h3 className="text-xl font-bold mb-4">Make Request</h3>
      <p className="text-sm text-gray-500 mb-6">Submit a blood request on behalf of a hospital or patient.</p>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <input value={name} onChange={e => setName(e.target.value)} required minLength={3} placeholder="Requester name" className="p-3 border rounded-lg" />
        <input value={hospital} onChange={e => setHospital(e.target.value)} required minLength={3} placeholder="Hospital / Facility name" className="p-3 border rounded-lg" />

        <select value={bloodGroup} onChange={e => setBloodGroup(e.target.value as BloodType)} className="p-3 border rounded-lg" required>
          {bloodTypes.map(bt => <option key={bt} value={bt}>{bt}</option>)}
        </select>

        <input value={units} onChange={e => setUnits(Number(e.target.value) || '')} type="number" min={1} placeholder="Units required" className="p-3 border rounded-lg" required/>

        <select value={status} onChange={e => setStatus(e.target.value as any)} className="p-3 border rounded-lg" required>
          <option value="critical">Critical</option>
          <option value="urgent">Urgent</option>
          <option value="normal">Normal</option>
        </select>

        <input 
          value={contact} 
          onChange={e => setContact(e.target.value)} 
          placeholder="Contact phone number (10 digits)" 
          className="p-3 border rounded-lg" 
          required 
          pattern="^[6-9]\d{9}$"
          maxLength={10}
          title="Please enter a valid 10-digit Indian mobile number starting with 6-9."
        />

        <input value={location} onChange={e => setLocation(e.target.value)} placeholder="Full street address / Ward details" className="p-3 border rounded-lg md:col-span-2" minLength={5} required/>

        {/* Exact Geolocation */}
        <div className="md:col-span-2 flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 border rounded-lg bg-gray-50 border-gray-200 gap-4">
          <div className="flex items-center gap-3">
            <MapPin className="w-5 h-5 text-red-600" />
            <div className="flex flex-col">
              <span className="text-sm font-semibold text-gray-700">Exact Coordinates</span>
              <span className="text-xs text-gray-500">
                {coordinates ? 'Coordinates acquired successfully' : 'Capture your current location (Required)'}
              </span>
            </div>
          </div>
          
          <button
            type="button"
            onClick={handleGetLocation}
            disabled={locating}
            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all shadow-sm ${
              coordinates 
                ? 'bg-green-100 text-green-700 border border-green-200'
                : 'bg-red-600 hover:bg-red-700 text-white shadow-md shadow-red-100'
            }`}
          >
            {locating ? 'Locating...' : coordinates ? 'Captured ✓' : 'Capture Location'}
          </button>
        </div>

        <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Additional notes (Optional)" className="p-3 border rounded-lg col-span-1 md:col-span-2" />

        <div className="col-span-1 md:col-span-2 flex flex-col sm:flex-row items-center justify-between gap-4 mt-2">
          <button disabled={loading} type="submit" className="w-full sm:flex-1 py-3 px-4 bg-red-600 hover:bg-red-700 transition-colors text-white rounded-lg font-bold disabled:opacity-60">{loading ? 'Submitting...' : 'Submit Request'}</button>
          <button type="button" onClick={reset} className="w-full sm:w-auto py-3 px-6 border hover:bg-gray-50 transition-colors rounded-lg font-semibold text-gray-700">Reset</button>
        </div>
      </form>
    </div>
  );
};

export default MakeRequest;
