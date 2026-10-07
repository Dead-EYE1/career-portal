import { initializeApp, getApps, getApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getFirestore, collection, getDocs, doc, getDoc, query, orderBy, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyAh1dbSY0lLbYAZSzfPPpTlru3OmeZ3p_E",
  authDomain: "newjobupdates-c234a.firebaseapp.com",
  projectId: "newjobupdates-c234a",
  storageBucket: "newjobupdates-c234a.firebasestorage.app",
  messagingSenderId: "275056131922",
  appId: "1:275056131922:web:2b44bb31cf42e3897c448b"
};

// Initialize or retrieve Firebase app
let app;
if (getApps().length === 0) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApp();
}

const db = getFirestore(app);

export async function fetchJobs() {
  try {
    const jobsCol = collection(db, 'job_notifications');
    const q = query(jobsCol, orderBy('createdAt', 'desc')); 
    const querySnapshot = await getDocs(q);
    
    const items = [];
    querySnapshot.forEach(document => {
      items.push({ id: document.id, ...document.data() });
    });
    
    // Sort jobs by most number of vacancies
    items.sort((a, b) => {
      // Helper function to extract the first numeric value from a string (e.g. "10,884 Vacancies" -> 10884)
      const getVacancies = (str) => {
        if (!str) return 0;
        const match = str.replace(/,/g, '').match(/\d+/);
        return match ? parseInt(match[0], 10) : 0;
      };
      
      const countA = getVacancies(a.posts);
      const countB = getVacancies(b.posts);
      
      return countB - countA; // Descending order (highest vacancies first)
    });

    return items;
  } catch (error) {
    console.error("❌ Error fetching jobs from Firestore:", error);
    throw error;
  }
}

export async function fetchJobById(id) {
  try {
    const docRef = doc(db, 'job_notifications', id);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() };
    }
    return null;
  } catch (error) {
    console.error("❌ Error fetching job by ID:", error);
    throw error;
  }
}

export async function addSubscriber(email) {
  try {
    await addDoc(collection(db, 'subscribers'), {
      email: email,
      subscribedAt: serverTimestamp()
    });
  } catch (error) {
    console.error('Error saving subscriber:', error);
    throw error;
  }
}

export async function addContactMessage(name, email, message) {
  try {
    await addDoc(collection(db, 'contact_messages'), {
      name,
      email,
      message,
      createdAt: serverTimestamp()
    });
  } catch (error) {
    console.error("Error submitting contact form:", error);
    throw error;
  }
}
