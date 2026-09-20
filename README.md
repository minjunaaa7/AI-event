# 설치 및 배포 안내

## 1. Firebase 설정 (무료)
1. https://console.firebase.google.com 접속, 새 프로젝트 생성
2. 빌드 > Realtime Database > 데이터베이스 만들기 (테스트 모드로 시작)
3. 프로젝트 설정(톱니바퀴) > 일반 > 내 앱 > 웹 앱 추가
4. 표시되는 설정값을 `js/firebase-init.js`의 `FIREBASE_CONFIG`에 붙여넣기
5. Realtime Database > 규칙 탭에서 아래로 교체 (행사 하루용 최소 보안):
```json
{
  "rules": {
    ".read": true,
    ".write": true
  }
}
```

## 2. Google Cloud Vision API 설정
1. https://console.cloud.google.com 에서 프로젝트 생성
2. "API 및 서비스 > 라이브러리"에서 "Cloud Vision API" 사용 설정
3. "API 및 서비스 > 사용자 인증 정보"에서 API 키 생성
4. **이 키는 절대 코드에 직접 넣지 않습니다.** 3번의 배포 단계에서 Vercel 환경변수로만 등록합니다.
5. 무료 한도: 매월 1,000건 무료. 20명 x 2회 정도 사용이면 무료 한도 내.

## 3. Vercel 배포 (무료, API 키를 서버에 숨김)
GitHub Pages는 정적 파일만 올릴 수 있어 API 키를 브라우저에 넣을 수밖에 없었습니다. Vercel은 서버 함수(`api/vision.js`)를 같이 배포할 수 있어서, 학생 브라우저는 우리 서버만 호출하고 Google 키는 서버 밖으로 절대 나가지 않습니다.

1. https://vercel.com 접속 > "Continue with GitHub"로 가입 (카드 등록 불필요)
2. Add New > Project > 이 프로젝트를 올린 GitHub 저장소 선택 > Import
3. "Environment Variables" 항목에서 Name: `VISION_API_KEY`, Value: 2번에서 발급받은 Vision API 키 입력 후 추가
4. Deploy 클릭
5. 몇 분 후 `https://프로젝트이름.vercel.app` 주소가 발급됨
6. 학생은 `.../index.html`, 관리자는 `.../admin.html` 접속
7. 이후 코드를 수정하면 GitHub에 올릴 때마다 Vercel이 자동으로 재배포합니다

GitHub Pages는 더 이상 필요 없습니다 (꺼두거나 그냥 둬도 상관없음, 어차피 실제 사용 주소는 vercel.app 쪽입니다).

## 4. 손글씨 게임 확신도(%) 보정
`sessions/handwritingBias` 값을 Firebase 콘솔의 Realtime Database 데이터 화면에서 직접 숫자로 추가/수정하면, 학생 화면에 표시되는 확신도(%)에 그대로 더해집니다. 화면 UI에는 노출되지 않습니다.

## 알아두어야 할 점 (직접 확인/보완 필요)
- **퍼스널컬러 진단**: 얼굴 랜드마크(양볼, 이마, 눈)로 정확한 위치에서 피부색을 샘플링하고, 화면 좌우 상단 점선 박스에 흰 종이를 대면 그 색을 기준으로 화이트밸런스를 보정합니다(종이가 없으면 눈의 흰자로 자동 대체). 머리카락 밝기도 함께 반영합니다. 그래도 정식 진단 서비스만큼 정밀하지는 않고, 조명이 고르지 않으면 오차가 커집니다. 밝고 그림자 없는 곳에서 촬영하도록 안내하세요. 웜/쿨 판정 기준값(코드 내 `skinLab.b > 12`, `depthScore > 60`)은 실제 참가자로 몇 번 테스트해보고 필요하면 조정하세요.
- **오목 AI 승률(40%/70%)**: 정확히 그 승률로 고정되지는 않고, 난이도 파라미터(랜덤성/탐색 깊이)로 근사한 것입니다. 실제 사용 전 몇 번 테스트해서 필요하면 `omok.html`의 `Math.random() < 0.7` 값을 조정하세요.
- **말로 코딩하기 점수**: 스펙에 점수 기준이 없어 성공/완료율만 기록하고 점수는 자동 부여하지 않았습니다. 관리자 화면에서 수동으로 점수를 입력할 수 있습니다.
- **말로 코딩하기 2~9번 미션**: 1번 미션만 구현되어 있습니다. `coding-mission.html`의 `MISSIONS` 배열에 같은 형식으로 추가하면 됩니다.
- **미션 수행 화면 사진**: 스펙대로 첨부 안내 문구만 넣어뒀습니다. 실제 사진은 `mission-1.jpg` 같은 파일로 추가 후 `<img>` 태그로 넣어야 합니다.
- **보안**: Vision API 키는 이제 서버(`api/vision.js`)에만 있고 브라우저로 전달되지 않습니다. 그래도 남용을 막기 위해 Google Cloud Console에서 Cloud Vision API의 일일 요청 한도를 낮게 걸어두는 걸 권장합니다 (IAM 및 관리자 > 할당량 및 시스템 한도). `js/firebase-init.js`의 `FIREBASE_CONFIG` 값은 브라우저에 그대로 노출되어도 괜찮습니다 — Firebase는 이 값 자체가 아니라 Realtime Database 규칙으로 접근을 통제하는 구조입니다.
