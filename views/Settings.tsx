import React from 'react';
import { Settings, User as UserIcon } from 'lucide-react';
import { useAuth } from '../services/auth';
import { toast } from 'react-toastify';

const SettingsView: React.FC = () => {
  const { userProfile, updateProfile } = useAuth();
  const [isEditing, setIsEditing] = React.useState(false);
  const [editName, setEditName] = React.useState(userProfile?.name || '');
  const [editPhone, setEditPhone] = React.useState(userProfile?.phone || '');
  const [isSaving, setIsSaving] = React.useState(false);

  React.useEffect(() => {
    if (userProfile) {
      setEditName(userProfile.name || '');
      setEditPhone(userProfile.phone || '');
    }
  }, [userProfile]);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await updateProfile({
        ...userProfile,
        name: editName,
        phone: editPhone
      });
      toast.success('Profile updated successfully');
      setIsEditing(false);
    } catch (err) {
      console.error('Failed to update profile', err);
      toast.error('Failed to update profile');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-8 animate-in fade-in duration-500 pb-12">
      <div className="flex items-center gap-3 md:gap-4 mb-2">
        <div className="p-3 bg-red-100 rounded-2xl flex-shrink-0">
          <Settings className="w-6 h-6 md:w-8 md:h-8 text-red-600" />
        </div>
        <div>
          <h2 className="text-2xl md:text-3xl font-bold">Settings</h2>
          <p className="text-sm text-gray-500">Manage your profile</p>
        </div>
      </div>

      <div className="bg-white rounded-3xl p-5 md:p-8 border border-gray-100 shadow-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-red-50 rounded-full -translate-y-16 translate-x-16 opacity-50"></div>
        
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-8 relative">
          <h3 className="text-xl font-bold flex items-center gap-2">
            <UserIcon className="w-5 h-5 text-red-600" />
            Personal Information
          </h3>
          {!isEditing && (
            <button 
              onClick={() => setIsEditing(true)}
              className="w-full sm:w-auto px-4 py-2 text-sm font-bold text-red-600 bg-red-50 hover:bg-red-100 rounded-xl transition-colors text-center"
            >
              Edit Profile
            </button>
          )}
        </div>

        {isEditing ? (
          <form onSubmit={handleSaveProfile} className="space-y-6 relative">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-700 ml-1">Full Name</label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-red-500 outline-none bg-gray-50/50"
                  placeholder="Enter your name"
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-700 ml-1">Phone Number</label>
                <input
                  type="tel"
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-red-500 outline-none bg-gray-50/50"
                  placeholder="e.g. +91 98765 43210"
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-bold text-gray-700 ml-1">Email Address</label>
              <input
                type="email"
                value={userProfile?.email}
                disabled
                className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-100 text-gray-500 cursor-not-allowed outline-none"
              />
              <p className="text-[10px] text-gray-400 ml-1 italic">Email cannot be changed for security reasons.</p>
            </div>

            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={() => {
                  setIsEditing(false);
                  setEditName(userProfile?.name || '');
                  setEditPhone(userProfile?.phone || '');
                }}
                className="flex-1 px-4 py-3 border border-gray-200 rounded-xl font-bold hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="flex-1 px-4 py-3 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 transition-colors disabled:opacity-50 shadow-lg shadow-red-100"
              >
                {isSaving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </form>
        ) : (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-y-6 md:gap-8">
              <div>
                <p className="text-[10px] md:text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Full Name</p>
                <p className="text-base md:text-lg font-bold text-gray-900">{userProfile?.name || '—'}</p>
              </div>
              <div>
                <p className="text-[10px] md:text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Phone Number</p>
                <p className="text-base md:text-lg font-bold text-gray-900">{userProfile?.phone || 'Not provided'}</p>
              </div>
              <div>
                <p className="text-[10px] md:text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Email Address</p>
                <p className="text-base md:text-lg font-bold text-gray-900 truncate">{userProfile?.email || '—'}</p>
              </div>
              <div>
                <p className="text-[10px] md:text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Account Role</p>
                <span className="inline-block px-3 py-1 bg-blue-50 text-blue-600 rounded-lg text-xs md:text-sm font-black uppercase">
                  {userProfile?.role || 'User'}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SettingsView;
