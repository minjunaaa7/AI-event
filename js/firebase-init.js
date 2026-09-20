// ⚠️ 여기에 본인의 Firebase 프로젝트 설정값을 넣으세요.
// Firebase 콘솔(console.firebase.google.com) > 프로젝트 설정 > 일반 > "내 앱" 에서 확인 가능
// README.md 의 "1. Firebase 설정" 참고
const FIREBASE_CONFIG = {
  apiKey: "AIzaSyCC-e2UEAgU_SanATL6wa79HBHDEPdUQK0",
  authDomain: "kwangshin-e35f9.firebaseapp.com",
  databaseURL: "https://kwangshin-e35f9-default-rtdb.firebaseio.com/",
  projectId: "kwangshin-e35f9",
  storageBucket: "kwangshin-e35f9.firebasestorage.app",
  messagingSenderId: "1070125683680",
  appId: "1:1070125683680:web:a8176b5c7bfb98ff8e9185"
};

firebase.initializeApp(FIREBASE_CONFIG);
const db = firebase.database();
