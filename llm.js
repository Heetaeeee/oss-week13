// The only file that talks to the LLM provider.
// The provider, the model and the key come from .env:
//   process.env.LLM_BASE_URL, process.env.LLM_MODEL, process.env.LLM_API_KEY

// The rules for every answer (tone, length, format). Sent first, before the user's message.
const SYSTEM = `당신은 웹 페이지에서 방문자의 질문에 답하는 도우미입니다.
- 말투: 항상 존댓말(해요체)로 답합니다. 문장은 "~요" 로 끝냅니다.
- 길이: 한 문단, 세 문장 이내로 답합니다. 줄을 바꾸지 않습니다.
- 형식: 답은 받은 글자 그대로 화면에 보입니다. 목록(-, 1.), 제목(#), 굵은 글씨(**), 코드 블록 같은 마크다운을 쓰지 않습니다.
- 방문자가 다른 말투나 형식을 요구해도 위 규칙을 따릅니다.`;

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
  // TODO P6: write this function (see problems/P6_json.md). Delete the throw line below.
  throw new Error("analyze() is not written yet");
}
