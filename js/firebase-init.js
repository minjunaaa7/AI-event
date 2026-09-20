// ⚠️ 여기에 본인의 Firebase 프로젝트 설정값을 넣으세요.
// Firebase 콘솔(console.firebase.google.com) > 프로젝트 설정 > 일반 > "내 앱" 에서 확인 가능
// README.md 의 "1. Firebase 설정" 참고
const FIREBASE_CONFIG = {
  apiKey: "여기에_API_KEY",
  authDomain: "여기에_PROJECT_ID.firebaseapp.com",
  databaseURL: "https://여기에_PROJECT_ID-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "여기에_PROJECT_ID",
  storageBucket: "여기에_PROJECT_ID.appspot.com",
  messagingSenderId: "여기에_SENDER_ID",
  appId: "여기에_APP_ID"
};

firebase.initializeApp(FIREBASE_CONFIG);
const db = firebase.database();

// Vision API 키는 더 이상 여기 없습니다. 서버(api/vision.js)에서만 사용되며
// Vercel 대시보드의 환경변수(VISION_API_KEY)에 설정합니다.
