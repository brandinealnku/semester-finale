// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyAcsYdGabCT8LaMJZsIkhs3nKCVedDkd0s",
  authDomain: "fir-cbbc7.firebaseapp.com",
  projectId: "fir-cbbc7",
  storageBucket: "fir-cbbc7.firebasestorage.app",
  messagingSenderId: "132553995380",
  appId: "1:132553995380:web:6807030184134de74e4d21",
  measurementId: "G-BF0BPDFWHW"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
