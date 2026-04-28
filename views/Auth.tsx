import React, { useState, useEffect } from 'react';
import { useAuth, extractNameFromEmail } from '../services/auth';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { getUserFriendlyMessage } from '../services/errorMessages';
import { saveUserProfile, getUserProfile } from '../services/firebase';

const Auth: React.FC = () => {
  const { signup, login, loginWithGoogle, resetPassword, confirmPasswordReset } = useAuth();
  const [isSignup, setIsSignup] = useState(false);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [oobCode, setOobCode] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const mode = params.get('mode');
    const actionCode = params.get('oobCode');
    
    if (mode === 'resetPassword' && actionCode) {
      setOobCode(actionCode);
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (isSignup) {
        const result = await signup(email, password);
        const profileName = name.trim() || extractNameFromEmail(email);
        const isAdminSignup = email.toLowerCase() === 'magendraprasad84@gmail.com';
        await saveUserProfile(result.user.uid, { 
          name: profileName, 
          email, 
          role: isAdminSignup ? 'admin' : 'user' 
        });
        toast.success(`Account created successfully!`);
      } else {
        await login(email, password);
        toast.success('Logged in successfully!');
      }
    } catch (err: any) {
      const friendlyMessage = getUserFriendlyMessage(err);
      toast.error(friendlyMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    try {
      const result = await loginWithGoogle();
      if (result && result.user) {
        const existingProfile = await getUserProfile(result.user.uid);
        if (!existingProfile) {
          const emailForProfile = result.user.email || '';
          const profileName = result.user.displayName || extractNameFromEmail(emailForProfile);
          const isAdminGoogleSignIn = emailForProfile.toLowerCase() === 'magendraprasad84@gmail.com';
          await saveUserProfile(result.user.uid, {
            name: profileName,
            email: emailForProfile,
            role: isAdminGoogleSignIn ? 'admin' : 'user'
          });
        }
      }
      toast.success('Signed in with Google successfully!');
    } catch (err: any) {
      if (err.code !== 'auth/popup-closed-by-user') {
        const friendlyMessage = getUserFriendlyMessage(err);
        toast.error(friendlyMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPasswordSubmit = async () => {
    if (!email) {
      toast.error('Please enter your email address first to reset password.');
      return;
    }
    setLoading(true);
    try {
      await resetPassword(email);
      toast.success('Password reset email sent! Check your inbox.');
      setIsForgotPassword(false);
    } catch (err: any) {
      const friendlyMessage = getUserFriendlyMessage(err);
      toast.error(friendlyMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleInitializeMasterAdmin = async () => {
    const adminEmail = 'magendraprasad84@gmail.com';
    const adminPass = 'kd_prasad69';
    
    setLoading(true);
    try {
      // 1. Try to login first
      try {
        const result = await login(adminEmail, adminPass);
        await saveUserProfile(result.user.uid, { 
          name: "Master Admin", 
          email: adminEmail, 
          role: 'admin' 
        });
        toast.success("Master Admin profile verified and synced!");
      } catch (loginErr) {
        // 2. If login fails, try to signup
        const result = await signup(adminEmail, adminPass);
        await saveUserProfile(result.user.uid, { 
          name: "Master Admin", 
          email: adminEmail, 
          role: 'admin' 
        });
        toast.success("Master Admin account created and initialized!");
      }
    } catch (err: any) {
      toast.error("Initialization failed: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  if (oobCode) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4 md:p-6">
        <ToastContainer position="top-right" autoClose={4000} hideProgressBar={false} aria-label="Notifications" />
        <div className="w-full max-w-md bg-white p-6 md:p-8 rounded-2xl shadow">
          <h3 className="text-2xl font-bold mb-4">Set New Password</h3>
          <p className="text-gray-500 mb-6 text-sm">Please type your new password below.</p>
          <form className="space-y-4" onSubmit={async (e) => {
            e.preventDefault();
            setLoading(true);
            try {
              await confirmPasswordReset(oobCode, newPassword);
              toast.success('Password updated successfully! You can now log in.');
              setOobCode(null);
              window.history.replaceState(null, '', window.location.pathname);
            } catch (err: any) {
              const friendlyMessage = getUserFriendlyMessage(err);
              toast.error(friendlyMessage);
            } finally {
              setLoading(false);
            }
          }}>
            <input
              type="password"
              placeholder="Enter new password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              className="w-full p-3 border rounded-lg"
            />
            <button disabled={loading} className="w-full p-3 bg-red-600 text-white rounded-lg font-bold">
              {loading ? 'Please wait...' : 'Update Password'}
            </button>
          </form>
          <div className="mt-6 text-center">
            <button onClick={() => {
              setOobCode(null);
              window.history.replaceState(null, '', window.location.pathname);
            }} className="text-sm text-gray-600 font-semibold hover:underline">
              Cancel
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (isForgotPassword) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4 md:p-6">
        <ToastContainer position="top-right" autoClose={4000} hideProgressBar={false} aria-label="Notifications" />
        <div className="w-full max-w-md bg-white p-6 md:p-8 rounded-2xl shadow">
          <h3 className="text-2xl font-bold mb-4">Reset Password</h3>
          <p className="text-gray-500 mb-6 text-sm">Enter the email associated with your account and we'll send you a link to reset your password.</p>
          <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); handleForgotPasswordSubmit(); }}>
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full p-3 border rounded-lg"
            />
            <button disabled={loading} className="w-full p-3 bg-red-600 text-white rounded-lg font-bold">
              {loading ? 'Please wait...' : 'Send Reset Link'}
            </button>
          </form>
          <div className="mt-6 text-center">
            <button onClick={() => setIsForgotPassword(false)} className="text-sm text-gray-600 font-semibold hover:underline">
              Back to Login
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4 md:p-6">
      <ToastContainer 
        position="top-right" 
        autoClose={4000} 
        hideProgressBar={false} 
        aria-label="Notifications"
      />
      <div className="w-full max-w-md bg-white p-6 md:p-8 rounded-2xl shadow">
        <h3 className="text-2xl font-bold mb-4">{isSignup ? 'Sign Up' : 'Log In'}</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          {isSignup && (
            <input
              type="text"
              placeholder="Full Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full p-3 border rounded-lg"
            />
          )}
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full p-3 border rounded-lg"
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="w-full p-3 border rounded-lg"
          />
          
          {!isSignup && (
            <div className="flex justify-end mt-1">
              <button 
                type="button" 
                onClick={() => setIsForgotPassword(true)}
                className="text-sm font-semibold text-red-600 hover:text-red-700 hover:underline"
              >
                Forgot Password?
              </button>
            </div>
          )}
          
          <button disabled={loading} className="w-full p-3 bg-red-600 text-white rounded-lg font-bold">
            {loading ? 'Please wait...' : isSignup ? 'Create account' : 'Log in'}
          </button>
        </form>

        <div className="mt-4 flex items-center gap-4 text-gray-400">
          <div className="flex-1 border-t border-gray-100"></div>
          <span className="text-xs font-semibold uppercase tracking-wider">or</span>
          <div className="flex-1 border-t border-gray-100"></div>
        </div>

        <button
          onClick={handleGoogleSignIn}
          disabled={loading}
          className="mt-4 w-full p-3 border border-gray-200 rounded-lg font-semibold flex items-center justify-center gap-3 hover:bg-gray-50 transition-colors"
        >
          <svg width="20" height="20" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.66l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            />
            <path fill="none" d="M1 1 23 23" />
          </svg>
          Continue with Google
        </button>

        <div className="mt-6 text-center">
          <p className="text-gray-600 text-sm">
            {isSignup ? 'Already have an account?' : "Don't have an account?"}{' '}
            <button
              onClick={() => setIsSignup(!isSignup)}
              className="text-red-600 font-bold hover:underline underline-offset-4"
            >
              {isSignup ? 'Log In' : 'Sign Up'}
            </button>
          </p>
        </div>

        <div className="mt-6 pt-6 border-t border-gray-100">
          <p className="text-xs text-gray-400 text-center uppercase font-bold tracking-widest">
            Hemosync Smart Management
          </p>
        </div>
      </div>
    </div>
  );
};

export default Auth;
