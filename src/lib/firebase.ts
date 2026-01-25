// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyA6w8a187nFN0yWs2nAvd_BLGmn-JrmQG8",
  authDomain: "univstudorg.firebaseapp.com",
  projectId: "univstudorg",
  storageBucket: "univstudorg.firebasestorage.app",
  messagingSenderId: "840022340812",
  appId: "1:840022340812:web:4aab39fbebe1d2a6307e69"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firestore
export const db = getFirestore(app);

export default app;
