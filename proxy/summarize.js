// import fetch from "node-fetch";

export async function summarize(content) {
  const HF_URL = "https://router.huggingface.co/v1/chat/completions";
  const HF_API_KEY = process.env.HF_API_KEY;

  const headers = {
    Authorization: `Bearer ${HF_API_KEY}`,
    "Content-Type": "application/json",
  };

  //This is the prompt for the LLM
  const prompt = `
Based on the following directory structure:
${content}

Generate a single paragraph (100-150 words) summarizing the project's purpose, 
key technologies, and main features. 
Return only the summary paragraph, without any analysis, 
thought process, or tags like <think>. Do not include extra text or headings.
`;
  try {
    if (!HF_API_KEY) {
      throw new Error("Morty! We can’t do AI stuff without the API key, Morty!");
    }
    const response = await fetch(HF_URL, {
      headers,
      method: "POST",
      body: JSON.stringify({
        model: "deepseek-ai/DeepSeek-R1:novita",
        messages: [
          {
            role: "user",
            content: prompt,
          },
        ],
        max_tokens: 500,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("HF API error details:", data);
      throw new Error(`HF API error: ${data.error || response.statusText}`);
    }

    // Most HF chat models return text inside choices[0].message.content
    const rawText = data?.choices?.[0]?.message?.content.trim() || "";
    //remove markdown
    return rawText
  } catch (error) {
    console.error("Error analyzing text:", error);
    throw error;
  }
}

// function extractSingleParagraph(text) {
//   const noThink = text.replace(/<think>[\s\S]*?<\/think>/gi, "").trim();
//   const paragraphs = noThink.split(/\n\s*\n/).filter((p) => p.trim());
//   return paragraphs.length > 0
//     ? paragraphs[0].trim()
//     : "No valid overview generated. The project may lack sufficient details.";
// }
