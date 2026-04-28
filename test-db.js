import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyDOJw4JS6fF6iccwaCbVgb-aTDo0JmfyjE",
  authDomain: "finalyear-project-67578.firebaseapp.com",
  projectId: "finalyear-project-67578",
  storageBucket: "finalyear-project-67578.firebasestorage.app",
  messagingSenderId: "1014474131758",
  appId: "1:1014474131758:web:ad1671324b20481d6792bf"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function checkData() {
  try {
    console.log("Checking donors...");
    const donorsSnap = await getDocs(collection(db, 'donors'));
    console.log(`Found ${donorsSnap.size} donors.`);
    
    console.log("Checking requests...");
    const requestsSnap = await getDocs(collection(db, 'requests'));
    console.log(`Found ${requestsSnap.size} requests.`);
    
    console.log("Checking notifications...");
    const notifsSnap = await getDocs(collection(db, 'notifications'));
    console.log(`Found ${notifsSnap.size} notifications.`);
    
  } catch (err) {
    console.error("Error fetching data:", err);
  }
}

checkData();
