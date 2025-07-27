// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyCJzymCOnxVPDNAx0dH-j-PNnjbTb8Nq5k",
  authDomain: "linkboard-5af54.firebaseapp.com",
  projectId: "linkboard-5af54",
  storageBucket: "linkboard-5af54.firebasestorage.app",
  messagingSenderId: "105782062441",
  appId: "1:105782062441:web:0ca2bcc2d97fb2cbc1a1f8",
  measurementId: "G-LL19W9FTL9",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
