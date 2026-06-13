import { initializeApp } from "firebase/app";

import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  signOut,
  updateProfile,
} from "firebase/auth";

import {
  getFirestore,
  collection,
  addDoc,
  getDocs,
  query,
  where,
  orderBy,
  doc,
  updateDoc,
  serverTimestamp,
} from "firebase/firestore";


const firebaseConfig = {
  apiKey: "AIzaSyAi_q6Cyk__o2jRUNkHp0RR5HGUxJwuohs",
  authDomain: "crispyharvest88-73636.firebaseapp.com",
  projectId: "crispyharvest88-73636",
  storageBucket: "crispyharvest88-73636.firebasestorage.app",
  messagingSenderId: "813202887333",
  appId: "1:813202887333:web:603bf1d83a598e506ab34c",
  measurementId: "G-CXVPGWB2K4",
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

export {
  auth,
  db,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  signOut,
  updateProfile,
  collection,
  addDoc,
  getDocs,
  query,
  where,
  orderBy,
  doc,
  updateDoc,
  serverTimestamp,
};