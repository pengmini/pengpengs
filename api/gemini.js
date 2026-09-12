// ===================================================
// Gemini에게 물어보는 서버 코드가 들어올 자리 (아직 비어 있습니다)
//
// 왜 서버가 필요한가요?
//   API 키를 브라우저 코드(app.js)에 적으면 누구나 볼 수 있습니다.
//   그래서 키는 서버에만 두고, 브라우저는 이 주소로 부탁만 합니다.
//
// 왜 Firebase Functions가 아니라 여기인가요?
//   Firebase Functions는 유료 요금제(Blaze)라야 씁니다.
//   이 프로젝트는 무료 요금제(Spark)로 진행하므로,
//   서버가 필요한 일은 Vercel의 무료 함수로 처리합니다.
//
// 이 파일의 규칙
//   api 폴더 안의 파일은 Vercel에서 자동으로 서버 주소가 됩니다.
//   이 파일은 /api/gemini 주소가 됩니다.
//   API 키는 코드에 적지 말고 Vercel 환경변수에 넣습니다. (process.env 로 꺼내 씁니다)
// ===================================================

// ===================================================
// Gemini API 연동 Vercel 서버리스 함수
//
// 엔드포인트: /api/gemini
// API 키는 Vercel 환경변수(GEMINI_API_KEY)에서 불러옵니다.
// 개인정보 보호를 위해 uid, 이메일 등 식별 정보는 전달받지 않습니다.
// ===================================================

export default async function handler(req, res) {
  // CORS 헤더 설정
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "POST 요청만 지원합니다." });
  }

  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
    const memos = body?.memos;

    if (!memos || !Array.isArray(memos) || memos.length === 0) {
      return res.status(400).json({ error: "분석할 게시물 메모가 없습니다." });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({
        error: "GEMINI_API_KEY 환경변수가 설정되지 않았습니다. Vercel 대시보드의 Environment Variables에 API 키를 등록해 주세요."
      });
    }

    // 메모 내용만 텍스트로 가공 (개인정보 식별자 제외)
    const memoTexts = memos
      .map((m, idx) => `${idx + 1}. ${m.text || m}`)
      .join("\n");

    const prompt = `당신은 초·중등 학급 담임교사를 돕는 따뜻하고 다정한 AI 교육 멘토입니다.
다음은 우리 반 학생들이 담벼락에 남긴 메모들입니다:

${memoTexts}

위 메모들을 읽고 학생들의 생각과 활동을 칭찬하고 격려하는 종합 피드백 코멘트(3~4문장)를 작성해 주세요.
친절하고 따뜻한 어조(~했군요, ~참 대견해요)로 학생들에게 힘이 되는 말을 전해 주세요.`;

    // Gemini 1.5 Flash (무료 티어 지원 모델) 호출
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [{ text: prompt }]
            }
          ],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 500
          }
        })
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error("Gemini API 호출 실패:", errorData);
      return res.status(response.status).json({
        error: errorData.error?.message || "Gemini API 호출에 실패했습니다."
      });
    }

    const data = await response.json();
    const comment =
      data.candidates?.[0]?.content?.parts?.[0]?.text ||
      "코멘트를 생성하지 못했습니다.";

    return res.status(200).json({ comment });
  } catch (error) {
    console.error("서버 내부 오류:", error);
    return res.status(500).json({
      error: "AI 코멘트 생성 중 오류가 발생했습니다: " + error.message
    });
  }
}
