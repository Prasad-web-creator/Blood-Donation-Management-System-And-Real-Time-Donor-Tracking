/// <reference types="vite/client" />
import { initializeApp, getApps } from 'firebase/app';
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup,
  sendPasswordResetEmail,
  confirmPasswordReset,
  type User as FirebaseUser,
} from 'firebase/auth';
import { getFirestore, collection, addDoc, serverTimestamp, doc, setDoc, getDoc, onSnapshot, query, orderBy, limit, updateDoc, deleteDoc, where, arrayUnion } from 'firebase/firestore';
import { getMessaging, getToken, onMessage } from 'firebase/messaging';

const clientSideApps = getApps();

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

if (!clientSideApps.length) {
  initializeApp(firebaseConfig as any);
}

const auth = getAuth();
const googleProvider = new GoogleAuthProvider();
const db = getFirestore();
const messaging = typeof window !== 'undefined' ? getMessaging() : null;

export const requestForToken = async (userId: string) => {
  if (!messaging) return;
  try {
    const currentToken = await getToken(messaging, { 
      vapidKey: import.meta.env.VITE_FIREBASE_VAPID_KEY 
    });
    if (currentToken) {
      await updateDoc(doc(db, 'users', userId), { fcmToken: currentToken });
      return currentToken;
    }
  } catch (err) {
    console.error('An error occurred while retrieving token. ', err);
  }
};

export const onMessageListener = () =>
  new Promise((resolve) => {
    if (!messaging) return;
    onMessage(messaging, (payload) => {
      resolve(payload);
    });
  });

export const signupWithEmail = (email: string, password: string) =>
  createUserWithEmailAndPassword(auth, email, password);

export const loginWithEmail = (email: string, password: string) =>
  signInWithEmailAndPassword(auth, email, password);

export const loginWithGoogle = () =>
  signInWithPopup(auth, googleProvider);

export const logout = () => signOut(auth);

export const resetPassword = (email: string) => sendPasswordResetEmail(auth, email);

export const handleConfirmPasswordReset = (code: string, newPassword: string) => confirmPasswordReset(auth, code, newPassword);

export const onAuthStateChangedListener = (cb: (user: FirebaseUser | null) => void) =>
  onAuthStateChanged(auth, cb);

export const addDonorToFirestore = (donor: Record<string, any>) =>
  addDoc(collection(db, 'donors'), {
    ...donor,
    createdAt: serverTimestamp(),
  });

export const saveUserProfile = async (userId: string, profileData: { name: string; email: string; role?: 'admin' | 'user' }) => {
  try {
    await setDoc(doc(db, 'users', userId), profileData, { merge: true });
  } catch (err) {
    console.error('Error saving user profile:', err);
    throw err;
  }
};

export const getUserProfile = async (userId: string) => {
  try {
    const docSnap = await getDoc(doc(db, 'users', userId));
    if (docSnap.exists()) {
      return docSnap.data();
    }
    return null;
  } catch (err) {
    console.error('Error retrieving user profile:', err);
    return null;
  }
};

export const listenToUserProfile = (userId: string, callback: (profile: any) => void) => {
  try {
    return onSnapshot(doc(db, 'users', userId), (docSnap) => {
      if (docSnap.exists()) {
        callback(docSnap.data());
      } else {
        callback(null);
      }
    });
  } catch (err) {
    console.error('Error listening to user profile:', err);
  }
};

export const createNotification = async (notification: {
  requesterName: string;
  bloodGroup: string;
  units: number;
  status: string;
  hospital?: string;
  createdByUserId?: string;
}) => {
  try {
    await addDoc(collection(db, 'notifications'), {
      ...notification,
      createdAt: serverTimestamp(),
      readBy: [],
      deletedBy: [],
    });
  } catch (err) {
    console.error('Error creating notification:', err);
    throw err;
  }
};

export const listenToNotifications = (callback: (notifications: any[]) => void) => {
  try {
    const q = query(collection(db, 'notifications'), orderBy('createdAt', 'desc'), limit(20));
    return onSnapshot(q, (snapshot) => {
      const notifications = snapshot.docs.map((doc) => ({
        ...doc.data(),
        id: doc.id,
      }));
      callback(notifications);
    });
  } catch (err) {
    console.error('Error listening to notifications:', err);
  }
};

export const markNotificationAsRead = async (notificationId: string, userId: string) => {
  try {
    await updateDoc(doc(db, 'notifications', notificationId), {
      readBy: arrayUnion(userId),
    });
  } catch (err) {
    console.error('Error marking notification as read:', err);
    throw err;
  }
};

export const hideNotificationForUser = async (notificationId: string, userId: string) => {
  try {
    await updateDoc(doc(db, 'notifications', notificationId), {
      deletedBy: arrayUnion(userId),
    });
  } catch (err) {
    console.error('Error hiding notification for user:', err);
    throw err;
  }
};

export const listenToDonors = (callback: (donors: any[]) => void) => {
  try {
    const q = query(collection(db, 'donors'), orderBy('createdAt', 'desc'));
    return onSnapshot(q, (snapshot) => {
      const donors = snapshot.docs.map((doc) => ({
        ...doc.data(),
        id: doc.id,
      }));
      callback(donors);
    });
  } catch (err) {
    console.error('Error listening to donors:', err);
  }
};

export const deleteDonorById = async (donorId: string) => {
  try {
    await deleteDoc(doc(db, 'donors', donorId));
  } catch (err) {
    console.error('Error deleting donor from Firestore:', err);
    throw err;
  }
};

export const deleteRequestById = async (requestId: string) => {
  try {
    await deleteDoc(doc(db, 'requests', requestId));
  } catch (err) {
    console.error('Error deleting request from Firestore:', err);
    throw err;
  }
};

export const listenToUsers = (callback: (users: any[]) => void) => {
  try {
    const q = query(collection(db, 'users'));
    return onSnapshot(q, (snapshot) => {
      const users = snapshot.docs.map((doc) => ({
        ...doc.data(),
        id: doc.id,
      }));
      callback(users);
    });
  } catch (err) {
    console.error('Error listening to users:', err);
  }
};

export const updateUserRole = async (userId: string, role: 'admin' | 'user') => {
  try {
    await updateDoc(doc(db, 'users', userId), { role });
  } catch (err) {
    console.error('Error updating user role:', err);
    throw err;
  }
};

export { db };

export type User = FirebaseUser | null;

export default auth;
