// ==========================================================
// AI 엔진 추상화
// 관리자 화면에서 settings/aiEngine 값을 "api" 또는 "browser" 로 설정하면
// 학생 화면은 그 값에 따라 자동으로 해당 방식을 사용합니다.
//
//  - "api"     : Vercel 서버 함수 → Google Cloud Vision API (정확, 기기 성능 무관, 결제계정 필요)
//  - "browser" : 태블릿 브라우저에서 직접 실행 (무료, 기기 성능 영향 있음)
// ==========================================================

let _engineMode = "api"; // 기본값
let _engineLoaded = false;
let _engineWaiters = [];

function initEngineWatcher(onChange) {
  db.ref("settings/aiEngine").on("value", (snap) => {
    _engineMode = snap.val() || "api";
    if (!_engineLoaded) {
      _engineLoaded = true;
      _engineWaiters.forEach(fn => fn(_engineMode));
      _engineWaiters = [];
    }
    if (onChange) onChange(_engineMode);
  });
}

// Firebase에서 설정값을 읽어올 때까지 기다립니다 (최대 5초).
function waitForEngine() {
  if (_engineLoaded) return Promise.resolve(_engineMode);
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve(_engineMode), 5000);
    _engineWaiters.push((mode) => { clearTimeout(timer); resolve(mode); });
  });
}

function getEngineMode() {
  return _engineMode;
}

// ---------- 공통 유틸 ----------
function loadScriptOnce(src) {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) { resolve(); return; }
    const s = document.createElement("script");
    s.src = src;
    s.crossOrigin = "anonymous";
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("라이브러리를 불러오지 못했습니다: " + src));
    document.head.appendChild(s);
  });
}

// ==========================================================
// 1. 얼굴 랜드마크 검출
// 반환 형식(두 방식 공통):
//   { points: { leftCheek:{x,y}, rightCheek:{x,y}, forehead:{x,y},
//               leftEye:{x,y}, rightEye:{x,y},
//               leftSclera:{x,y}|null, rightSclera:{x,y}|null },
//     eyeDist: number }
//   얼굴을 못 찾으면 null
// ==========================================================

async function detectFace(base64, canvas) {
  await waitForEngine();
  if (_engineMode === "browser") {
    return await detectFaceBrowser(canvas);
  }
  return await detectFaceApi(base64);
}

// ---- API 방식 ----
async function detectFaceApi(base64) {
  const resp = await fetch("/api/vision", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ base64: base64, feature: "FACE_DETECTION" })
  });

  const rawText = await resp.text();
  let data;
  try {
    data = JSON.parse(rawText);
  } catch (e) {
    throw new Error("서버가 JSON이 아닌 응답을 보냈습니다 (" + resp.status + "): " + rawText.slice(0, 200));
  }
  if (!resp.ok || !data.responses) {
    throw new Error("응답 코드 " + resp.status + " / 내용: " + JSON.stringify(data).slice(0, 300));
  }
  if (data.responses[0] && data.responses[0].error) {
    throw new Error(data.responses[0].error.message);
  }

  const face = data.responses[0].faceAnnotations && data.responses[0].faceAnnotations[0];
  if (!face) return null;

  const find = (type) => {
    const lm = (face.landmarks || []).find(l => l.type === type);
    return lm ? { x: lm.position.x, y: lm.position.y } : null;
  };

  const leftEye = find("LEFT_EYE");
  const rightEye = find("RIGHT_EYE");
  let eyeDist = 60;
  if (leftEye && rightEye) {
    eyeDist = Math.hypot(leftEye.x - rightEye.x, leftEye.y - rightEye.y);
  }

  const leftPupil = find("LEFT_EYE_PUPIL");
  const leftCorner = find("LEFT_EYE_LEFT_CORNER");
  const rightPupil = find("RIGHT_EYE_PUPIL");
  const rightCorner = find("RIGHT_EYE_RIGHT_CORNER");

  const mid = (a, b) => (a && b) ? { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 } : null;

  return {
    points: {
      leftCheek: find("LEFT_CHEEK_CENTER"),
      rightCheek: find("RIGHT_CHEEK_CENTER"),
      forehead: find("FOREHEAD_GLABELLA"),
      leftEye: leftEye,
      rightEye: rightEye,
      leftSclera: mid(leftPupil, leftCorner),
      rightSclera: mid(rightPupil, rightCorner)
    },
    eyeDist: eyeDist
  };
}

// ---- 브라우저 방식 (MediaPipe Face Mesh, 468 랜드마크) ----
let _faceMesh = null;

async function ensureFaceMesh() {
  if (_faceMesh) return _faceMesh;
  await loadScriptOnce("https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh@0.4.1633559619/face_mesh.js");

  const fm = new FaceMesh({
    locateFile: (file) =>
      `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh@0.4.1633559619/${file}`
  });
  fm.setOptions({
    maxNumFaces: 1,
    refineLandmarks: true,
    minDetectionConfidence: 0.5,
    minTrackingConfidence: 0.5
  });
  await fm.initialize();
  _faceMesh = fm;
  return fm;
}

async function detectFaceBrowser(canvas) {
  const fm = await ensureFaceMesh();

  const result = await new Promise((resolve) => {
    fm.onResults((res) => resolve(res));
    fm.send({ image: canvas });
  });

  const lms = result.multiFaceLandmarks && result.multiFaceLandmarks[0];
  if (!lms) return null;

  const W = canvas.width, H = canvas.height;
  const pt = (i) => ({ x: lms[i].x * W, y: lms[i].y * H });

  // MediaPipe Face Mesh 표준 인덱스
  const leftCheek = pt(50);                       // 왼쪽 볼 중앙 부근
  const rightCheek = pt(280);                     // 오른쪽 볼 중앙 부근
  const forehead = pt(9);                         // 미간
  const leftEye = pt(33);                         // 왼쪽 눈 바깥 모서리
  const rightEye = pt(263);                       // 오른쪽 눈 바깥 모서리

  const eyeDist = Math.hypot(leftEye.x - rightEye.x, leftEye.y - rightEye.y);

  // 흰자: 눈 모서리와 홍채 사이 지점 (refineLandmarks 사용 시 홍채는 468~477)
  const leftIris = lms[468] ? pt(468) : null;
  const rightIris = lms[473] ? pt(473) : null;
  const mid = (a, b) => (a && b) ? { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 } : null;

  return {
    points: {
      leftCheek: leftCheek,
      rightCheek: rightCheek,
      forehead: forehead,
      leftEye: leftEye,
      rightEye: rightEye,
      leftSclera: mid(leftIris, pt(33)),
      rightSclera: mid(rightIris, pt(263))
    },
    eyeDist: eyeDist
  };
}

// ==========================================================
// 2. 손글씨(텍스트) 인식
// 반환: 인식된 문자열 (없으면 빈 문자열)
// ==========================================================

async function recognizeText(base64, canvas) {
  await waitForEngine();
  if (_engineMode === "browser") {
    return await recognizeTextBrowser(canvas);
  }
  return await recognizeTextApi(base64);
}

// ---- API 방식 ----
async function recognizeTextApi(base64) {
  const resp = await fetch("/api/vision", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ base64: base64, feature: "DOCUMENT_TEXT_DETECTION" })
  });

  const rawText = await resp.text();
  let data;
  try {
    data = JSON.parse(rawText);
  } catch (e) {
    throw new Error("서버가 JSON이 아닌 응답을 보냈습니다 (" + resp.status + "): " + rawText.slice(0, 200));
  }
  if (!resp.ok || !data.responses) {
    throw new Error("응답 코드 " + resp.status + " / 내용: " + JSON.stringify(data).slice(0, 300));
  }
  if (data.responses[0] && data.responses[0].error) {
    throw new Error(data.responses[0].error.message);
  }

  const annotation = data.responses[0].fullTextAnnotation;
  return annotation ? annotation.text.trim() : "";
}

// ---- 브라우저 방식 (Tesseract.js) ----
let _tesseractWorker = null;

async function ensureTesseract(onProgress) {
  if (_tesseractWorker) return _tesseractWorker;
  await loadScriptOnce("https://cdn.jsdelivr.net/npm/tesseract.js@5.1.0/dist/tesseract.min.js");

  const worker = await Tesseract.createWorker("kor", 1, {
    logger: (m) => {
      if (onProgress && m.status && typeof m.progress === "number") {
        onProgress(m.status, m.progress);
      }
    }
  });
  _tesseractWorker = worker;
  return worker;
}

async function recognizeTextBrowser(canvas, onProgress) {
  const worker = await ensureTesseract(onProgress);
  const { data } = await worker.recognize(canvas);
  return (data.text || "").trim();
}

// 브라우저 방식일 때 모델을 미리 받아두기 위한 예열 함수 (선택 사용)
async function warmUpBrowserEngines(onProgress) {
  if (_engineMode !== "browser") return;
  try { await ensureFaceMesh(); } catch (e) { /* 무시 */ }
  try { await ensureTesseract(onProgress); } catch (e) { /* 무시 */ }
}
