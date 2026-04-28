import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.VITE_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function checkCollections() {
  const donorsSnap = await getDocs(collection(db, 'donors'));
  const requestsSnap = await getDocs(collection(db, 'requests'));
  
  console.log(`Donors count: ${donorsSnap.size}`);
  console.log(`Requests count: ${requestsSnap.size}`);
  
  const donorIds = new Set(donorsSnap.docs.map(d => d.id));
  const requestIds = new Set(requestsSnap.docs.map(d => d.id));
  
  const intersection = [...donorIds].filter(id => requestIds.has(id));
  console.log(`Common IDs: ${intersection.length}`);
  if (intersection.length > 0) {
    console.log('Intersection IDs:', intersection);
  }
}

checkCollections().catch(console.error);
