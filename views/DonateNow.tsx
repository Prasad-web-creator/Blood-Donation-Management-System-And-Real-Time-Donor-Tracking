import React, { useState } from 'react';
import { MapPin, Navigation, Image as ImageIcon, X, Upload } from 'lucide-react';
import { BloodType } from '../types';
import { addDonorToFirestore } from '../services/firebase';
import { toast } from 'react-toastify';

const bloodTypes: BloodType[] = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

const DonateNow: React.FC = () => {
  const [name, setName] = useState('');
  const [age, setAge] = useState<number | ''>('');
  const [bloodGroup, setBloodGroup] = useState<BloodType>('O+');
  const [contact, setContact] = useState('');
  const [email, setEmail] = useState('');
  const [gender, setGender] = useState<'male'|'female'|'other'|''>('');
  const [address, setAddress] = useState('');
  const [coordinates, setCoordinates] = useState<{lat: number, lng: number} | null>(null);
  const [healthProofs, setHealthProofs] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [locating, setLocating] = useState(false);
  const [statusActive, setStatusActive] = useState(true);
  const [lastDonation, setLastDonation] = useState('');
  const [weight, setWeight] = useState<number | ''>('');
  const [medicalConditions, setMedicalConditions] = useState('');
  const [notes, setNotes] = useState('');

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  const resetForm = () => {
    setName(''); setAge(''); setBloodGroup('O+'); setContact(''); setEmail(''); setGender('');
    setAddress(''); setCoordinates(null); setHealthProofs([]); setStatusActive(true); setLastDonation(''); setWeight(''); setMedicalConditions(''); setNotes('');
    setErrors({});
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!name.trim()) newErrors.name = "Full name is required.";
    if (!age) newErrors.age = "Age is required.";
    else if (age < 18 || age > 65) newErrors.age = "Age must be between 18 and 65 years to donate.";
    
    if (!contact) newErrors.contact = "Phone number is required.";
    else if (!/^[6-9]\d{9}$/.test(contact)) newErrors.contact = "Please enter a valid 10-digit mobile number.";

    if (!email) newErrors.email = "Email is required.";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) newErrors.email = "Please enter a valid email.";

    if (!gender) newErrors.gender = "Please select a gender.";

    if (!address.trim()) newErrors.address = "Full address is required.";

    if (!coordinates) newErrors.coordinates = "Please provide your exact location to continue registration.";

    if (healthProofs.length === 0) newErrors.healthProofs = "At least one health proof image is required.";

    if (!weight) newErrors.weight = "Weight is required.";
    else if (weight < 50) newErrors.weight = "Weight must be at least 50 kg to donate.";

    if (!medicalConditions.trim()) newErrors.medicalConditions = "Known medical conditions (if any) are required. Please type 'None' if not applicable.";

    if (lastDonation) {
      if (gender !== 'male' && gender !== 'female') {
        newErrors.lastDonation = "Please select Male or Female gender to register a past donation, as interval requirements vary.";
      } else {
        const last = new Date(lastDonation);
        const now = new Date();
        let diffMonths = (now.getFullYear() - last.getFullYear()) * 12 + (now.getMonth() - last.getMonth());
        if (now.getDate() < last.getDate()) diffMonths--;

        const requiredMonths = gender === 'male' ? 3 : 4;
        if (diffMonths < requiredMonths) {
          newErrors.lastDonation = `As a ${gender}, you must wait at least ${requiredMonths} months before donating again.`;
        }
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validate()) {
      return;
    }

    setLoading(true);
    const donor = {
      id: `D-${Date.now()}`,
      name,
      age: age || null,
      bloodGroup,
      contact,
      email,
      gender,
      address,
      coordinates,
      healthProofs,
      status: statusActive ? 'active' : 'inactive',
      lastDonation: lastDonation || null,
      weight: weight || null,
      medicalConditions,
      notes,
    };

    try {
      await addDonorToFirestore(donor);
      toast.success('Donor registration saved successfully!', {
        position: "top-right",
        autoClose: 4000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
      });
      resetForm();
    } catch (err) {
      console.error('Failed to save donor to Firestore', err);
      toast.error('Failed to save donor information. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleGetLocation = () => {
    setLocating(true);
    setErrors(p => ({...p, coordinates: ''}));
    
    if (!navigator.geolocation) {
      setErrors(p => ({...p, coordinates: 'Geolocation is not supported by your browser.'}));
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
        toast.success("Exact GPS coordinates captured!");
      },
      async (error) => {
        console.warn("Browser Geolocation failed, trying IP fallback:", error);
        
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
          setErrors(p => ({...p, coordinates: "Location Access Denied! Please enable location services and try again."}));
        } finally {
          setLocating(false);
        }
      },
      { enableHighAccuracy: true, maximumAge: 0, timeout: 15000 }
    );
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    setUploading(true);
    const newProofs: string[] = [];
    const fileList = Array.from(files).slice(0, 5);

    const promises = fileList.map(file => {
      return new Promise<void>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          newProofs.push(reader.result as string);
          resolve();
        };
        reader.readAsDataURL(file);
      });
    });

    Promise.all(promises).then(() => {
      setHealthProofs(prev => [...prev, ...newProofs].slice(0, 5));
      setUploading(false);
      setErrors(p => ({...p, healthProofs: ''}));
    });
  };

  const removeProof = (index: number) => {
    setHealthProofs(prev => prev.filter((_, i) => i !== index));
  };

  return (
    <div className="bg-white rounded-2xl p-4 md:p-8 shadow-sm">
      <h3 className="text-xl font-bold mb-4">Donate Now</h3>
      <p className="text-sm text-gray-500 mb-6">Register as a donor — your details will help hospitals reach you when needed.</p>

      <form onSubmit={handleSubmit} noValidate className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <input value={name} onChange={e => {setName(e.target.value); setErrors(p=>({...p, name:''}))}} placeholder="Full name" className={`w-full p-3 border rounded-lg ${errors.name ? 'border-red-500 bg-red-50' : ''}`} />
          {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
        </div>

        <div>
          <input value={age} onChange={e => {setAge(Number(e.target.value) || ''); setErrors(p=>({...p, age:''}))}} type="number" min={18} max={65} placeholder="Age" className={`w-full p-3 border rounded-lg ${errors.age ? 'border-red-500 bg-red-50' : ''}`} />
          {errors.age && <p className="text-red-500 text-xs mt-1">{errors.age}</p>}
        </div>

        <div>
          <select value={bloodGroup} onChange={e => {setBloodGroup(e.target.value as BloodType); setErrors(p=>({...p, bloodGroup:''}))}} className={`w-full p-3 border rounded-lg ${errors.bloodGroup ? 'border-red-500 bg-red-50' : ''}`}>
            {bloodTypes.map(bt => <option key={bt} value={bt}>{bt}</option>)}
          </select>
          {errors.bloodGroup && <p className="text-red-500 text-xs mt-1">{errors.bloodGroup}</p>}
        </div>

        <div>
          <input 
            value={contact} 
            onChange={e => {setContact(e.target.value.replace(/\D/g, '').slice(0, 10)); setErrors(p=>({...p, contact:''}))}} 
            placeholder="Phone number (10 digits)" 
            className={`w-full p-3 border rounded-lg ${errors.contact ? 'border-red-500 bg-red-50' : ''}`} 
          />
          {errors.contact && <p className="text-red-500 text-xs mt-1">{errors.contact}</p>}
        </div>

        <div>
          <input value={email} onChange={e => {setEmail(e.target.value); setErrors(p=>({...p, email:''}))}} type="email" placeholder="Email" className={`w-full p-3 border rounded-lg ${errors.email ? 'border-red-500 bg-red-50' : ''}`} />
          {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email}</p>}
        </div>

        <div>
          <select value={gender} onChange={e => {setGender(e.target.value as any); setErrors(p=>({...p, gender:''}))}} className={`w-full p-3 border rounded-lg ${errors.gender ? 'border-red-500 bg-red-50' : ''}`}>
            <option value="" disabled>Select a gender</option>
            <option value="male">Male</option>
            <option value="female">Female</option>
            <option value="other">Other</option>
          </select>
          {errors.gender && <p className="text-red-500 text-xs mt-1">{errors.gender}</p>}
        </div>

        <div className="col-span-1 md:col-span-2">
          <input value={address} onChange={e => {setAddress(e.target.value); setErrors(p=>({...p, address:''}))}} placeholder="Full Address" className={`w-full p-3 border rounded-lg ${errors.address ? 'border-red-500 bg-red-50' : ''}`} />
          {errors.address && <p className="text-red-500 text-xs mt-1">{errors.address}</p>}
        </div>
        
        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium text-gray-700 flex items-center gap-1">
            Exact Location <span className="text-red-500">*</span>
          </label>
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 w-full">
            <button 
              type="button" 
              onClick={handleGetLocation} 
              disabled={locating}
              className={`w-full sm:flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-lg font-bold transition-colors text-sm ${coordinates ? 'bg-green-100 text-green-700 border border-green-200' : 'bg-red-50 text-red-600 border border-red-200 hover:bg-red-100'}`}
            >
              {locating ? (
                <span className="animate-pulse">Locating...</span>
              ) : coordinates ? (
                <>✓ Captured</>
              ) : (
                <>
                  <Navigation className="w-4 h-4" />
                  Capture Location
                </>
              )}
            </button>
            {coordinates && (
              <div className="text-[10px] text-green-700 flex flex-row sm:flex-col gap-2 sm:gap-0">
                <span>Lat: {coordinates.lat.toFixed(4)}</span>
                <span>Lng: {coordinates.lng.toFixed(4)}</span>
              </div>
            )}
          </div>
          {errors.coordinates && <p className="text-red-500 text-xs mt-1">{errors.coordinates}</p>}
        </div>

        <div className="col-span-1 md:col-span-2">
          <label className="text-sm font-medium text-gray-700 flex items-center gap-1 mb-2">
            Health Proof Documents (Reports/ID) <span className="text-red-500">*</span>
          </label>
          <div className="flex flex-col gap-4">
            <div className={`relative border-2 border-dashed rounded-xl p-6 transition-all ${errors.healthProofs ? 'border-red-300 bg-red-50' : 'border-gray-200 hover:border-red-300 bg-gray-50'}`}>
              <input 
                type="file" 
                multiple 
                accept="image/*" 
                onChange={handleImageUpload}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
              />
              <div className="flex flex-col items-center justify-center gap-2 text-gray-500">
                <div className="p-3 bg-white rounded-full shadow-sm">
                  <Upload className="w-6 h-6 text-red-500" />
                </div>
                <p className="text-sm font-bold">Click to upload health proofs</p>
                <p className="text-[10px]">Upload medical reports or identity proof (Max 5 images)</p>
              </div>
            </div>

            {healthProofs.length > 0 && (
              <div className="flex flex-wrap gap-3">
                {healthProofs.map((src, idx) => (
                  <div key={idx} className="relative w-20 h-20 rounded-lg overflow-hidden border border-gray-200 shadow-sm group">
                    <img src={src} alt="Proof" className="w-full h-full object-cover" />
                    <button 
                      type="button"
                      onClick={() => removeProof(idx)}
                      className="absolute top-1 right-1 p-1 bg-red-600 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
                {uploading && (
                  <div className="w-20 h-20 rounded-lg bg-gray-100 flex items-center justify-center animate-pulse">
                    <div className="w-4 h-4 border-2 border-red-500 border-t-transparent rounded-full animate-spin"></div>
                  </div>
                )}
              </div>
            )}
            {errors.healthProofs && <p className="text-red-500 text-xs">{errors.healthProofs}</p>}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <input id="statusActive" checked={statusActive} onChange={e => setStatusActive(e.target.checked)} type="checkbox" />
          <label htmlFor="statusActive" className="text-sm">Available/Active Donor</label>
        </div>

        <div>
          <label className="text-sm font-medium text-gray-700 mb-1 block">Last Donated Date (if any)</label>
          <input 
            value={lastDonation} 
            onChange={e => {setLastDonation(e.target.value); setErrors(p=>({...p, lastDonation:''}))}} 
            type="date" 
            min="1900-01-01"
            max={new Date().toISOString().split('T')[0]}
            className={`w-full p-3 border rounded-lg ${errors.lastDonation ? 'border-red-500 bg-red-50' : ''}`} 
          />
          {errors.lastDonation && <p className="text-red-500 text-xs mt-1">{errors.lastDonation}</p>}
        </div>

        <div>
          <input value={weight} onChange={e => {setWeight(Number(e.target.value) || ''); setErrors(p=>({...p, weight:''}))}} type="number" min={50} placeholder="Weight (kg)" className={`w-full p-3 border rounded-lg ${errors.weight ? 'border-red-500 bg-red-50' : ''}`} />
          {errors.weight && <p className="text-red-500 text-xs mt-1">{errors.weight}</p>}
        </div>

        <div className="col-span-1 md:col-span-2">
          <textarea value={medicalConditions} onChange={e => {setMedicalConditions(e.target.value); setErrors(p=>({...p, medicalConditions:''}))}} placeholder="Known medical conditions (if any)" className={`w-full p-3 border rounded-lg ${errors.medicalConditions ? 'border-red-500 bg-red-50' : ''}`} />
          {errors.medicalConditions && <p className="text-red-500 text-xs mt-1">{errors.medicalConditions}</p>}
        </div>

        <div className="col-span-1 md:col-span-2">
          <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Additional notes" className="w-full p-3 border rounded-lg" />
        </div>

        <div className="col-span-1 md:col-span-2 flex flex-col sm:flex-row items-center justify-between gap-4 mt-2">
          <button disabled={loading} type="submit" className="w-full sm:flex-1 py-3 px-4 bg-red-600 text-white rounded-lg font-bold disabled:opacity-60">
            {loading ? 'Saving...' : 'Register as donor'}
          </button>
          <button type="button" onClick={resetForm} className="w-full sm:w-auto py-3 px-6 border rounded-lg font-semibold text-gray-700">Reset</button>
        </div>
      </form>


    </div>
  );
};

export default DonateNow;
