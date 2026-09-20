// Vercel 서버리스 함수. 이 파일은 브라우저로 절대 전달되지 않습니다.
// VISION_API_KEY는 Vercel 대시보드 > Settings > Environment Variables 에서만 설정합니다.
module.exports = async (req, res) => {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "POST 요청만 허용됩니다." });
  }

  const apiKey = process.env.VISION_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "서버에 VISION_API_KEY가 설정되지 않았습니다." });
  }

  const { base64, feature } = req.body || {};
  if (!base64 || !feature) {
    return res.status(400).json({ error: "base64, feature 값이 필요합니다." });
  }

  try {
    const visionRes = await fetch(
      `https://vision.googleapis.com/v1/images:annotate?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requests: [
            {
              image: { content: base64 },
              features: [{ type: feature }],
            },
          ],
        }),
      }
    );
    const data = await visionRes.json();
    res.status(200).json(data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};
