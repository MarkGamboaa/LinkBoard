// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyAfyiNTNEigJyPfETOXmLDvJv_9Wp_vOm8",
  authDomain: "linkboard-f948b.firebaseapp.com",
  projectId: "linkboard-f948b",
  storageBucket: "linkboard-f948b.firebasestorage.app",
  messagingSenderId: "170434068447",
  appId: "1:170434068447:web:5b07db9e80876ecb924e6a",
  measurementId: "G-5XTMT5349X",
};

// Initialize Firebase

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
const analytics = getAnalytics(app);
