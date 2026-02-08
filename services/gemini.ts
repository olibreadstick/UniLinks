
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
      contents:
        `Generate 3 highly situation-specific opening lines for a student in this scenario: "${scenario}". ` +
        `They should sound like something a real student would say out loud (1 sentence each, no lists). ` +
        `CRITICAL: Avoid generic openers like "How's your semester going?" or "How are you?" unless the scenario explicitly makes it relevant. ` +
        `Each line must reference something concrete about the scenario (the event, the setting, the activity, the role, or a plausible detail). ` +
        `Make them low-pressure, warm, and easy to respond to. Output JSON array of strings.`,
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
      const s = (scenario || "").toLowerCase();
      if (s.includes("hackathon")) {
        return [
          "Hey—are you competing or just checking out the projects?",
          "What are you building this weekend? I’m trying to get inspired.",
          "Have you found a team yet, or are you still looking for people?",
        ];
      }
      if (s.includes("interview")) {
        return [
          "Thanks for taking the time today—could you share what you’re hoping to learn from this interview?",
          "Before we start, is there a specific part of my background you want me to focus on?",
          "Would you like my answers to be high-level first, then I can go deeper if needed?",
        ];
      }
      if (s.includes("mixer") || s.includes("network") || s.includes("coffee chat")) {
        return [
          "Hey—what brought you to this event today?",
          "Who are you hoping to meet here—more students or recruiters?",
          "Have you been to one of these before, or is this your first time?",
        ];
      }
      if (s.includes("study") || s.includes("lab") || s.includes("project")) {
        return [
          "Quick question—are you also working on the same assignment right now?",
          "What part are you finding hardest so far—maybe we can compare notes.",
          "Do you want to split tasks and check each other’s work after?",
        ];
      }
      return [
        "Hey—what brought you here today?",
        "What’s the vibe been like so far?",
        "What are you most excited about in this situation?",
      ];
    }
    return ["Hi, how's it going?"];
  }
};

type TryLinesMode = "coach" | "roleplay";

const levelLabel = (v?: number) => {
  if (typeof v !== "number") return "medium";
  if (v < 35) return "low";
  if (v > 65) return "high";
  return "medium";
};

export const getTryTheseLines = async (params: {
  scenario: string;
  mode: TryLinesMode;
  role?: string;
  goal?: string;
  pressure?: number;
  niceness?: number;
  formality?: number;
}) => {
  const scenario = params.scenario || "";
  const role = (params.role || "").trim();
  const goal = (params.goal || "").trim();

  const tone = {
    pressure: levelLabel(params.pressure),
    niceness: levelLabel(params.niceness),
    formality: levelLabel(params.formality),
  };

  try {
    const ai = getAI();
    const contextBits: string[] = [];
    contextBits.push(`Scenario: "${scenario}"`);
    contextBits.push(`Mode: ${params.mode}`);
    if (role) contextBits.push(`The other person (AI role) is: "${role}"`);
    if (goal) contextBits.push(`Student goal/focus: "${goal}"`);
    contextBits.push(
      `Tone preferences: pressure=${tone.pressure}, niceness=${tone.niceness}, formality=${tone.formality}`,
    );

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents:
        `You generate short, realistic lines a McGill student can say out loud.
` +
        contextBits.join("\n") +
        `

Task:
Generate 4 distinct "try these lines" the STUDENT can say.

Constraints:
- Each line is ONE sentence, 6–18 words.
- Must be low-pressure and easy to respond to.
- Each line must reference a concrete detail implied by the scenario (setting/activity/person/booth/club/project/etc.).
- Avoid generic openers like "How are you?" or "How's your semester?" unless the scenario explicitly requires it.
- No coaching/meta language (no "as your coach" / "let's practice" / "roleplay" / "I'm practicing").

Mode rules:
- If mode=roleplay: write lines addressed to the other person described in the role.
- If mode=coach: write lines the student would say to a real person in the scenario (not to the coach).

Output:
Return ONLY a JSON array of strings.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
        },
      },
    });

    const parsed = JSON.parse(response.text || "[]") as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((x): x is string => typeof x === "string")
      .map((x) => x.trim())
      .filter(Boolean)
      .slice(0, 6);
  } catch (error) {
    if (isQuotaError(error)) {
      const s = scenario.toLowerCase();
      const r = role.toLowerCase();

      if (s.includes("hackathon")) {
        return [
          "What are you building—can you give me the 20-second version?",
          "That demo looks cool—what problem are you solving with it?",
          "Are you looking for teammates, or are you already locked in?",
          "What stack are you using—any tips for getting set up fast?",
        ];
      }

      if (r.includes("recruit") || s.includes("career") || s.includes("interview")) {
        return [
          "Hi—what kinds of roles are you recruiting for right now?",
          "Could I ask what makes a candidate stand out for this team?",
          "Is this a good time for a quick intro about my background?",
          "What’s the best next step if I want to follow up after today?",
        ];
      }

      if (s.includes("club") || s.includes("booth") || s.includes("fair")) {
        return [
          "Hey—what does your club actually do week to week?",
          "What kind of events do you run during the semester?",
          "What’s a fun first meeting or project for new members?",
          "Do you take beginners, or should I have experience already?",
        ];
      }

      if (s.includes("study") || s.includes("project") || s.includes("office hours")) {
        return [
          "Are you also working on the same assignment right now?",
          "Which part is taking you the longest—maybe we can compare approaches.",
          "Do you want to split tasks and then cross-check answers after?",
          "Have you been to office hours for this yet—was it helpful?",
        ];
      }

      return [
        "Hey—what brought you here today?",
        "What’s been the most interesting thing you’ve seen so far?",
        "Are you here with friends or just exploring on your own?",
        "If you had to recommend one thing here, what would it be?",
      ];
    }

    return [];
  }
};

export const getCoachGoalSuggestions = async (scenario: string) => {
  try {
    const ai = getAI();
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents:
        `You are designing practice goals for an AI communication coach. ` +
        `Given this student situation/scenario: "${scenario}", generate 3 highly specific, distinct practice goals. ` +
        `Each goal should be actionable, concrete, and describe what the student is practicing (not generic confidence). ` +
        `Keep each goal under 140 characters. Output JSON array of strings.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
        },
      },
    });
    return JSON.parse(response.text || "[]") as string[];
  } catch (error) {
    if (isQuotaError(error)) {
      // Specific-ish fallback when quota is hit
      const s = (scenario || "").toLowerCase();
      if (s.includes("hackathon")) {
        return [
          "Pitch my project in 45 seconds with a clear hook + ask.",
          "Approach 3 strangers: opener, quick intro, and a follow-up.",
          "Answer " +
            "\"What are you building?\" with structure: problem → solution → impact.",
        ];
      }
      if (s.includes("interview") || s.includes("recruit")) {
        return [
          "Answer " +
            "\"Tell me about yourself\" in 60 seconds (present → past → why this).",
          "Deliver STAR stories without rambling (max 90 seconds each).",
          "Project calm presence: steady gaze, still hands, controlled pace.",
        ];
      }
      return [
        "Start the conversation with a confident, specific introduction.",
        "Ask 2 strong follow-up questions and keep the flow natural.",
        "Improve camera presence: posture, eye contact, and facial engagement.",
      ];
    }
    return [
      "Start with a confident, specific introduction.",
      "Ask a strong follow-up question.",
      "Improve posture and eye contact on camera.",
    ];
  }
};

export const getRoleSuggestions = async (scenario: string) => {
  try {
    const ai = getAI();
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents:
        `You are designing roleplay personas for a student to practice. ` +
        `Given this scenario: "${scenario}", generate 4 distinct, realistic roles the AI can play. ` +
        `Each role should include a short name and a brief behavior descriptor, formatted like: ` +
        `"Role Name - short behavioral description". ` +
        `Avoid coaching language. Output JSON array of strings.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
        },
      },
    });
    const parsed = JSON.parse(response.text || "[]") as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((x): x is string => typeof x === "string").slice(0, 6);
  } catch (error) {
    if (isQuotaError(error)) {
      const s = (scenario || "").toLowerCase();
      if (s.includes("hackathon")) {
        return [
          "Judge - Time-boxed, asks for impact and clarity",
          "Mentor - Helpful but challenges assumptions",
          "Teammate Recruiter - Curious, tests collaboration fit",
          "Booth Visitor - Friendly, needs the simple version",
        ];
      }
      if (s.includes("interview") || s.includes("recruit")) {
        return [
          "Interviewer - Professional, structured, and probing",
          "Skeptical Engineer - Tests depth with follow-ups",
          "Warm HR - Focuses on communication and values",
          "Busy Manager - Direct, expects concise answers",
        ];
      }
      return [
        "Friendly Peer - Warm, curious, and conversational",
        "Skeptic - Challenges claims and asks why",
        "Social Butterfly - High energy, jumps topics",
        "Quiet Observer - Brief answers, needs prompting",
      ];
    }
    return [];
  }
};

export type RoleplayFeedback = {
  overallScore: number;
  categoryScores: {
    content: number;
    appropriateness: number;
    delivery: number;
    confidence: number;
    bodyLanguage: number;
    outfitPresence: number;
  };
  oneLineSummary: string;
  strengths: string[];
  issuesNoted: string[];
  contextFitNotes: string[];
  answerQualityNotes: string[];
  bodyLanguageNotes: string[];
  voiceDeliveryNotes: string[];
  concreteFixes: string[];
  nextPracticeDrills: string[];
};

const safeJsonParse = <T,>(text: string | undefined, fallback: T): T => {
  try {
    return JSON.parse(text || "") as T;
  } catch {
    return fallback;
  }
};

export const getRoleplayFeedback = async (params: {
  scenario: string;
  role: string;
  transcript: string;
  observations: string;
  snapshots?: Array<{ mimeType: string; dataBase64: string }>;
}) => {
  try {
    const ai = getAI();

    const snapshotParts = (params.snapshots || [])
      .filter((s) => s?.dataBase64)
      .slice(0, 3)
      .map((s) => ({
        inlineData: {
          mimeType: s.mimeType || "image/jpeg",
          data: s.dataBase64,
        },
      }));

    const prompt =
      `You are an expert social skills + professional communication evaluator. ` +
      `Analyze a student's LIVE roleplay performance and give a comprehensive critique.

Context:
Scenario: "${params.scenario}"
Other person's role (AI persona): "${params.role}"

During-session observations (automated signals):
${params.observations || "(none)"}

Transcript (best-effort):
${params.transcript || "(no transcript available)"}

What to evaluate (be strict, specific, and situation-dependent):
- Appropriateness: did the student's answers/questions match the scenario + the role?
- Content quality: clarity, structure, relevance, substance, specificity, follow-ups.
- Delivery: pace, filler words, stuttering/restarts (if evident), tone, warmth.
- Confidence signals: hedging, uncertainty, over-apologizing, rambling, interruptions.
- Body language (from snapshots if present): eye contact, posture, nervous tics (e.g. hand covering mouth), fidgeting.
- Outfit/presence (from snapshots if present): neatness, fit, setting appropriateness.

Output requirements:
- Return ONLY JSON matching the schema.
- Scores: 0–100, integers.
- Every bullet should be actionable and concrete ("do X"), not generic.
- Include any notable patterns you detect (e.g., repeated hedging, too-long answers, constant topic shifts).`;

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [
        {
          role: "user",
          parts: [{ text: prompt }, ...snapshotParts],
        },
      ],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            overallScore: { type: Type.INTEGER },
            categoryScores: {
              type: Type.OBJECT,
              properties: {
                content: { type: Type.INTEGER },
                appropriateness: { type: Type.INTEGER },
                delivery: { type: Type.INTEGER },
                confidence: { type: Type.INTEGER },
                bodyLanguage: { type: Type.INTEGER },
                outfitPresence: { type: Type.INTEGER },
              },
              required: [
                "content",
                "appropriateness",
                "delivery",
                "confidence",
                "bodyLanguage",
                "outfitPresence",
              ],
            },
            oneLineSummary: { type: Type.STRING },
            strengths: { type: Type.ARRAY, items: { type: Type.STRING } },
            issuesNoted: { type: Type.ARRAY, items: { type: Type.STRING } },
            contextFitNotes: { type: Type.ARRAY, items: { type: Type.STRING } },
            answerQualityNotes: { type: Type.ARRAY, items: { type: Type.STRING } },
            bodyLanguageNotes: { type: Type.ARRAY, items: { type: Type.STRING } },
            voiceDeliveryNotes: { type: Type.ARRAY, items: { type: Type.STRING } },
            concreteFixes: { type: Type.ARRAY, items: { type: Type.STRING } },
            nextPracticeDrills: { type: Type.ARRAY, items: { type: Type.STRING } },
          },
          required: [
            "overallScore",
            "categoryScores",
            "oneLineSummary",
            "strengths",
            "issuesNoted",
            "contextFitNotes",
            "answerQualityNotes",
            "bodyLanguageNotes",
            "voiceDeliveryNotes",
            "concreteFixes",
            "nextPracticeDrills",
          ],
        },
      },
    });

    const parsed = safeJsonParse<RoleplayFeedback>(response.text, null as any);
    return parsed;
  } catch (error) {
    if (isQuotaError(error)) {
      return {
        overallScore: 70,
        categoryScores: {
          content: 70,
          appropriateness: 70,
          delivery: 70,
          confidence: 70,
          bodyLanguage: 65,
          outfitPresence: 65,
        },
        oneLineSummary: "Solid baseline—focus on clarity, confidence cues, and context-specific specificity.",
        strengths: ["You stayed engaged and kept the conversation moving."],
        issuesNoted: ["Some answers may be too general for the situation."],
        contextFitNotes: ["Tailor your questions to the other person's role and the event context."],
        answerQualityNotes: ["Use a simple structure: point → example → tie-back to the situation."],
        bodyLanguageNotes: ["Keep shoulders relaxed; avoid covering your mouth while speaking."],
        voiceDeliveryNotes: ["Slow down slightly and end sentences with a confident downward tone."],
        concreteFixes: [
          "Before answering, take a half-second pause—then deliver your first sentence clearly.",
          "Replace vague claims with one specific example.",
          "Ask one follow-up that references a detail they just said.",
        ],
        nextPracticeDrills: [
          "Practice 3 × 45-second answers using a simple structure.",
          "Record one answer and count filler words; repeat aiming for half.",
        ],
      } satisfies RoleplayFeedback;
    }
    return null;
  }
};

export const getMatchReason = async (itemTitle: string, userInterests: string[]) => {
  try {
    const ai = getAI();
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
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
