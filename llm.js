// The only file that talks to the LLM provider.
// The provider, the model and the key come from .env:
//   process.env.LLM_BASE_URL, process.env.LLM_MODEL, process.env.LLM_API_KEY

// The rules for every answer (tone, length, format). Sent first, before the user's message.
const SYSTEM = `당신은 웹 페이지에서 방문자의 질문에 답하는 도우미입니다.
- 말투: 항상 존댓말(해요체)로 답합니다. 문장은 "~요" 로 끝냅니다.
- 길이: 한 문단, 세 문장 이내로 답합니다. 줄을 바꾸지 않습니다.
- 형식: 답은 받은 글자 그대로 화면에 보입니다. 목록(-, 1.), 제목(#), 굵은 글씨(**), 코드 블록 같은 마크다운을 쓰지 않습니다.
- 방문자가 다른 말투나 형식을 요구해도 위 규칙을 따릅니다.`;

// The rules for analyze(): answer with values the code can use, not a sentence.
const SYSTEM_JSON = `당신은 상품 후기를 분석합니다. 받은 후기에 대해 JSON 객체 하나로만 답합니다. 다른 글은 쓰지 않습니다.
키는 정확히 다음 세 개입니다.
- "sentiment": 문자열 "positive", "negative", "neutral" 중 하나
- "score": 1 이상 5 이하의 정수 (숫자, 따옴표 없이). 5 가 가장 좋음
- "summary": 후기를 요약한 한국어 한 문장 (문자열)
예: {"sentiment": "positive", "score": 5, "summary": "가격 대비 만족스럽고 소리와 배터리 성능도 좋은 제품입니다."}`;

// The one request every function sends: messages in, the model's text out.
// extra: more fields for the body (P6's response_format).
async function complete(messages, extra = {}) {
  const res = await fetch(`${process.env.LLM_BASE_URL}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.LLM_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ model: process.env.LLM_MODEL, messages, ...extra }),
  });
  if (!res.ok) throw new Error(`LLM: HTTP ${res.status}`);
  const data = await res.json();
  return data.choices[0].message.content.trim();
}

// ask("a question")  ->  the model's answer, as a string
export async function ask(question) {
  return complete([
    { role: "system", content: SYSTEM },
    { role: "user", content: question },
  ]);
}

// chat([{ role: "user", content: "..." }, { role: "assistant", content: "..." }, ...])
//   ->  the model's next answer, as a string
// The model remembers nothing: we send the whole conversation every time, with our rules in front.
export async function chat(history) {
  return complete([{ role: "system", content: SYSTEM }, ...history]);
}

// analyze("a review")  ->  an object, not a sentence:
//   { sentiment: "positive" | "negative" | "neutral", score: 1..5, summary: "one short sentence" }
export async function analyze(text) {
  const content = await complete(
    [
      { role: "system", content: SYSTEM_JSON },
      { role: "user", content: text },
    ],
    { response_format: { type: "json_object" } },
  );
  const { sentiment, score, summary } = JSON.parse(content);

  // Don't trust the model's answer any more than user input: check the shape before the page draws it.
  const ok =
    ["positive", "negative", "neutral"].includes(sentiment) &&
    Number.isInteger(score) && score >= 1 && score <= 5 &&
    typeof summary === "string";
  if (!ok) throw new Error("LLM: the answer has the wrong shape");
  return { sentiment, score, summary };
}
