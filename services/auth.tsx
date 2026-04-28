import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChangedListener, signupWithEmail, loginWithEmail, loginWithGoogle, logout, resetPassword, handleConfirmPasswordReset, User, getUserProfile, saveUserProfile, listenToUserProfile } from './firebase';

interface UserProfile {
  name?: string;
  email?: string;
  phone?: string;
  role?: 'admin' | 'user';
}

type AuthContextValue = {
  user: User;
  userProfile: UserProfile | null;
  loading: boolean;
  signup: (email: string, password: string) => Promise<any>;
  login: (email: string, password: string) => Promise<any>;
  loginWithGoogle: () => Promise<any>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  confirmPasswordReset: (code: string, newPassword: string) => Promise<void>;
  updateProfile: (profileData: UserProfile) => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const extractNameFromEmail = (email: string): string => {
  const emailPart = email.split('@')[0];
  const nameWithoutNumbers = emailPart.replace(/\d+/g, '');
  const capitalized = nameWithoutNumbers.charAt(0).toUpperCase() + nameWithoutNumbers.slice(1);
  return capitalized || 'User';
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unsubProfile: (() => void) | undefined;

    const unsubAuth = onAuthStateChangedListener(async (u) => {
      try {
        setUser(u);
        if (u) {
          // Check for initial profile creation
          const currentProfile = await getUserProfile(u.uid);
          const isAdminUser = u.email?.toLowerCase() === 'magendraprasad84@gmail.com';

          if (!currentProfile) {
            const generatedName = u.displayName || extractNameFromEmail(u.email || '');
            const initialProfile: UserProfile = { 
              name: generatedName, 
              email: u.email || '', 
              role: isAdminUser ? 'admin' : 'user' 
            };
            await saveUserProfile(u.uid, initialProfile as any);
          } else if (isAdminUser && currentProfile.role !== 'admin') {
            await saveUserProfile(u.uid, { ...currentProfile, role: 'admin' } as any);
          }

          // Set up real-time listener for the profile
          if (unsubProfile) unsubProfile();
          unsubProfile = listenToUserProfile(u.uid, (profile) => {
            setUserProfile(profile as UserProfile);
            setLoading(false);
          });
        } else {
          if (unsubProfile) unsubProfile();
          setUserProfile(null);
          setLoading(false);
        }
      } catch (err) {
        console.error('Auth/Profile state error:', err);
        setLoading(false);
      }
    });

    return () => {
      unsubAuth();
      if (unsubProfile) unsubProfile();
    };
  }, []);

  const signup = (email: string, password: string) => signupWithEmail(email, password);
  const login = (email: string, password: string) => loginWithEmail(email, password);
  const doLoginWithGoogle = () => loginWithGoogle();
  const doLogout = () => logout();
  const doResetPassword = (email: string) => resetPassword(email);
  const doConfirmPasswordReset = (code: string, newPassword: string) => handleConfirmPasswordReset(code, newPassword);

  const updateProfile = async (profileData: UserProfile) => {
    if (!user) return;
    await saveUserProfile(user.uid, profileData as any);
    setUserProfile({ ...userProfile, ...profileData });
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      userProfile, 
      loading, 
      signup, 
      login, 
      loginWithGoogle: doLoginWithGoogle, 
      logout: doLogout,
      resetPassword: doResetPassword,
      confirmPasswordReset: doConfirmPasswordReset,
      updateProfile
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
