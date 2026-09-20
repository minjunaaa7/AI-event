// ==========================================================
// 공용 DB 구조
// teams/{teamId} = { name, score, joinedAt, personalColorStatus, omok:{...} }
// sessions/handwriting = { phase, word, writeSeconds, startedAt }
// sessions/handwritingBias = 숫자(%). AI 확신도에 더해지는 보정값. 화면에 노출 금지.
// ==========================================================

function getTeamId() {
  let id = sessionStorage.getItem("teamId");
  if (!id) {
    id = "team_" + Math.random().toString(36).slice(2, 9);
    sessionStorage.setItem("teamId", id);
  }
  return id;
}

async function registerTeam(teamName) {
  const teamId = getTeamId();
  await db.ref("teams/" + teamId).update({
    name: teamName,
    joinedAt: Date.now()
  });
  // score 없으면 0으로 초기화 (관리자가 기존 점수 입력 가능)
  const snap = await db.ref("teams/" + teamId + "/score").get();
  if (!snap.exists()) {
    await db.ref("teams/" + teamId + "/score").set(0);
  }
  return teamId;
}

function watchTeams(callback) {
  db.ref("teams").on("value", (snap) => {
    callback(snap.val() || {});
  });
}

async function addScore(teamId, points) {
  const ref = db.ref("teams/" + teamId + "/score");
  const snap = await ref.get();
  const current = snap.val() || 0;
  await ref.set(current + points);
}

async function setScore(teamId, points) {
  await db.ref("teams/" + teamId + "/score").set(points);
}

function watchPath(path, callback) {
  db.ref(path).on("value", (snap) => callback(snap.val()));
}

async function setPath(path, value) {
  await db.ref(path).set(value);
}
