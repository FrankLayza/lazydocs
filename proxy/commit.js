export async function commit(diff) {
  const HF_API_KEY = process.env.HF_API_KEY;
  const MODEL_TYPE = "chat"; // "summarization" | "chat"
  const SUMMARIZATION_MODEL = "mrm8488/t5-base-finetuned-git-commit-message";
  const CHAT_MODEL = "deepseek-ai/DeepSeek-R1:novita";

  const maxDiffLength = 1000;
  const truncatedDiff =
    diff.length > maxDiffLength ? diff.slice(0, maxDiffLength) + "..." : diff;

  // System prompt (chat models)
  const systemPrompt =
    "You are an assistant that writes concise git commit messages (max 72 chars).";

  try {
    let response, data;

    if (MODEL_TYPE === "summarization") {
      // --- Summarization models (Hugging Face Inference API) ---
      response = await fetch(
        `https://api-inference.huggingface.co/models/${SUMMARIZATION_MODEL}`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${HF_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            inputs: `Generate a concise commit message (max 72 chars) from this diff:\n${truncatedDiff}`,
            parameters: { max_length: 72, min_length: 20 },
          }),
          signal: AbortSignal.timeout(30000), // cancel if >30s
        }
      );

      if (!response.ok) {
        return "Changes detected, please provide a commit message.";
      }

      data = await response.json();
      return (
        data?.[0]?.summary_text ||
        data?.summary_text ||
        "Auto-generated commit message"
      );
    } else {
      // --- Chat models (Novita Chat API) ---
      response = await fetch(
        "https://router.huggingface.co/v1/chat/completions",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${HF_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: CHAT_MODEL,
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: `File changes:\n${truncatedDiff}` },
            ],
            max_tokens: 72,
          }),
          signal: AbortSignal.timeout(30000),
        }
      );

      if (!response.ok) {
        return "Changes detected, please provide a commit message.";
      }

      data = await response.json();
      if (data?.choices?.[0]?.message?.content) {
        const raw = data.choices[0].message.content;
        return raw;
      }
      return "Auto-generated commit message";
    }
  } catch (error) {
    console.error("Commit generation error:", error.message);
    return "Changes detected, please provide a commit message.";
  }
}
