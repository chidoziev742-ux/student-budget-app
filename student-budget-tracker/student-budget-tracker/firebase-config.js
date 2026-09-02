/**
 * Firebase Configuration
 * Initialize Firebase for authentication and Firestore
 */

// Import Firebase SDK modules
import { initializeApp } from 'https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js';
import { 
    getAuth, 
    createUserWithEmailAndPassword, 
    signInWithEmailAndPassword,
    updateProfile,
    signOut,
    onAuthStateChanged 
} from 'https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js';
import { 
    getFirestore, 
    doc, 
    setDoc, 
    getDoc, 
    updateDoc,
    collection,
    query,
    where,
    getDocs,
    addDoc,
    deleteDoc,
    orderBy
} from 'https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js';

// Firebase Configuration - REPLACE WITH YOUR ACTUAL CONFIG
const firebaseConfig = {
    apiKey: "AIzaSyBl4zz5y3lugOH6Y6kC0qBaALNsTCodfD8",
    authDomain: "student-budget-app-20fe9.firebaseapp.com",
    databaseURL: "https://student-budget-app-20fe9-default-rtdb.firebaseio.com",
    projectId: "student-budget-app-20fe9",
    storageBucket: "student-budget-app-20fe9.firebasestorage.app",
    messagingSenderId: "143120278616",
    appId: "1:143120278616:web:529a717879d9049a92962d",
    measurementId: "G-XPJL96PVEJ"
  };


// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Export Firebase services
export { app, auth, db };
export { 
    createUserWithEmailAndPassword, 
    signInWithEmailAndPassword,
    updateProfile,
    signOut,
    onAuthStateChanged,
    doc,
    setDoc,
    getDoc,
    updateDoc,
    collection,
    query,
    where,
    getDocs,
    addDoc,
    deleteDoc,
    orderBy
};
