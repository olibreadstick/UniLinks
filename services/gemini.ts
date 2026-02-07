
import { GoogleGenAI, Type, GenerateContentResponse } from "@google/genai";

const getAI = () => new GoogleGenAI({ apiKey: process.env.API_KEY });

const isQuotaError = (err: any) => {
  const msg = err?.message?.toLowerCase() || "";
  return msg.includes('429') || msg.includes('resource_exhausted') || msg.includes('quota');
};

export const generateRecommendations = async (interests: string[]) => {
  try {
    const ai = getAI();
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Based on these student interests: ${interests.join(', ')}, suggest 3 potential campus clubs or event types they would love. Provide the output in JSON format with title and reason.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              reason: { type: Type.STRING }
            },
            required: ["title", "reason"]
          }
        }
      }
    });
    return JSON.parse(response.text || '[]');
  } catch (error) {
    if (isQuotaError(error)) {
      console.warn("Gemini Quota Exceeded: Using fallback recommendations.");
      return [
        { title: "McGill Student Society (SSMU)", reason: "The hub for all campus life and clubs." },
        { title: "Faculty Networking Mixers", reason: "Great way to meet peers in your specific major." },
        { title: "Campus Study Marathons", reason: "Find study partners for high-impact courses." }
      ];
    }
    return [];
  }
};

export const getSocialIcebreakers = async (scenario: string) => {
  try {
    const ai = getAI();
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Generate 3 natural, friendly icebreaker questions for a student attending this scenario: "${scenario}". Make them low-pressure and engaging.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: { type: Type.STRING }
        }
      }
    });
    return JSON.parse(response.text || '[]');
  } catch (error) {
    if (isQuotaError(error)) {
      return [
        "How has your semester been going so far?",
        "What's one thing you're looking forward to this week?",
        "Have you been to many events like this before?"
      ];
    }
    return ["Hi, how's it going?"];
  }
};

export const getMatchReason = async (itemTitle: string, userInterests: string[]) => {
  try {
    const ai = getAI();
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: `Briefly explain in 10 words why a student interested in ${userInterests.join(', ')} would match with "${itemTitle}".`,
    });
    return response.text;
  } catch (error) {
    if (isQuotaError(error)) {
      return "Aligns with your selected campus interests and academic goals.";
    }
    return "Great match for your profile.";
  }
};
