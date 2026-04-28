export async function getGeminiInsights(data) {
  try {
    const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
    
    if (!API_KEY || API_KEY === 'your_google_ai_studio_key') {
      console.warn("VITE_GEMINI_API_KEY is missing or invalid. Falling back to local rules.");
      return null;
    }

    const prompt = `
You are an AI fairness auditor.

Analyze the following data and respond strictly in JSON format.
Return ONLY valid JSON. No markdown. No explanation.
Structure:

{
  "diagnosis": "A concise paragraph diagnosing the severity and primary driver of the bias.",
  "cause": "A concise paragraph explaining the root cause based on the features and selection rates.",
  "suggestions": [
     {
       "instruction": "Actionable instruction (e.g. Reduce Gender Influence)",
       "reason": "Why this helps",
       "mechanism": "How it works mathematically"
     }
  ]
}

Data:
${JSON.stringify(data)}
`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${API_KEY}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                { text: prompt }
              ]
            }
          ]
        })
      }
    );

    if (!response.ok) {
        console.error("Gemini API Error:", response.status, await response.text());
        return null;
    }

    const result = await response.json();

    let text =
      result?.candidates?.[0]?.content?.parts?.[0]?.text || "";

    // Clean markdown
    if (text.startsWith("```json")) text = text.slice(7, -3);
    else if (text.startsWith("```")) text = text.slice(3, -3);

    const parsedData = JSON.parse(text);
    console.log("Gemini response:", parsedData);
    return parsedData;

  } catch (error) {
    console.error("Gemini error:", error);
    return null;
  }
}
