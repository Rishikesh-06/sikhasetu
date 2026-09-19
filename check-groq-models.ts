import dotenv from "dotenv";
dotenv.config();

async function testModel(modelId: string) {
  const apiKey = (process.env.GROQ_API_KEY || "").trim();
  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: modelId,
      messages: [{ role: "user", content: "Say 'DISHA ready' in 2 words." }]
    })
  });

  const data = await res.json() as any;
  console.log(`Model [${modelId}] status: ${res.status}, reply:`, data.choices?.[0]?.message?.content || data);
}

async function run() {
  await testModel("openai/gpt-oss-120b");
  await testModel("qwen/qwen3.8-27b");
  await testModel("groq/compound");
  await testModel("openai/gpt-oss-20b");
}

run();
