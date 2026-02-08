import React, { useState, useRef, useEffect, useMemo } from "react";
import { GoogleGenAI, LiveServerMessage, Modality, Blob } from "@google/genai";
import { getSocialIcebreakers } from "../services/gemini";
import { DiscoveryItem, DiscoveryType } from "../types";

type Scenario = {
  id: string;
  title: string;
  icon: string;
  desc: string;
  isCustom?: boolean;
};

type PracticeMode = "coach" | "roleplay";

type CoachSettings = {
  focusBodyLanguage: boolean;
  focusOutfit: boolean;
  focusFacialExpressions: boolean;
  strictness: number; // 0-100
};

const JOINED_COURSES_STORAGE_KEY = "mcg_joined_courses";

const DEFAULT_SCENARIOS: Scenario[] = [
  {
    id: "networking",
    title: "Desautels Mixer",
    icon: "💼",
    desc: "Practice networking for internship season.",
  },
  {
    id: "gerts",
    title: "Gerts Small Talk",
    icon: "🍺",
    desc: "Focus on casual vibes and weekend plans.",
  },
  {
    id: "lab",
    title: "Science Lab Partner",
    icon: "🧪",
    desc: "Discuss chemistry lab reports and workflow.",
  },
  {
    id: "frosh",
    title: "Frosh Leader Intro",
    icon: "📣",
    desc: "Practice high-energy icebreakers for new students.",
  },
];

// Role suggestions based on scenario type
const getRoleSuggestionsForScenario = (title: string): string[] => {
  const lower = title.toLowerCase();
  if (lower.includes("networking") || lower.includes("mixer") || lower.includes("desautels")) {
    return [
      "Skeptic Recruiter - Tests your depth",
      "Encouraging HR Pro - Supportive and warm",
      "Technical Question Asker - Digs into expertise",
      "Busy Executive - Limited time, direct",
    ];
  } else if (lower.includes("gerts") || lower.includes("bar") || lower.includes("small talk")) {
    return [
      "Laid-Back Friend - Casual and relatable",
      "Curious Stranger - Asks probing questions",
      "Party Host - Energetic and social",
      "Introverted Peer - Quiet but thoughtful",
    ];
  } else if (lower.includes("lab") || lower.includes("partner") || lower.includes("study")) {
    return [
      "Perfectionist Partner - Very detail-oriented",
      "Chill Collaborator - Relaxed and flexible",
      "Know-It-All - Confident, sometimes dismissive",
      "Struggling Student - Needs help and guidance",
    ];
  } else if (lower.includes("frosh") || lower.includes("leader")) {
    return [
      "Enthusiastic Mentor - High energy, inclusive",
      "Skeptical Freshman - Nervous, asking questions",
      "Social Butterfly - Wants to connect everyone",
      "Formal Coordinator - Professional and structured",
    ];
  }
  return [
    "Friendly Colleague",
    "Critical Thinker",
    "Enthusiastic Team Member",
    "Neutral Observer",
  ];
};

interface PersonalitySettings {
  pressure: number; // 0-100: how challenging should it be
  niceness: number; // 0-100: how friendly vs tough
  formality: number; // 0-100: how formal vs casual
}

interface AICoachProps {
  heartedItems?: DiscoveryItem[];
}

const AICoach: React.FC<AICoachProps> = ({ heartedItems = [] }) => {
  const likedItemScenarios: Scenario[] = useMemo(() => {
    return heartedItems.map((item) => ({
      id: `like_${item.id}`,
      title: item.title,
      icon:
        item.type === DiscoveryType.EVENT
          ? "📅"
          : item.type === DiscoveryType.CLUB
          ? "🏛️"
          : item.type === DiscoveryType.PARTNER
          ? "👤"
          : item.type === DiscoveryType.COURSE
          ? "📚"
          : item.type === DiscoveryType.NETWORKING
          ? "🤝"
          : item.type === DiscoveryType.COLLAB_REQUEST
          ? "🧩"
          : "❤️",
      desc: item.description || `Practice for ${item.title}.`,
      isCustom: false,
    }));
  }, [heartedItems]);

  const [joinedCourses, setJoinedCourses] = useState<string[]>([]);

  useEffect(() => {
    const loadJoinedCourses = () => {
      try {
        const raw = localStorage.getItem(JOINED_COURSES_STORAGE_KEY);
        const parsed = raw ? (JSON.parse(raw) as unknown) : [];
        if (!Array.isArray(parsed)) return [] as string[];
        return parsed
          .filter((c): c is string => typeof c === "string")
          .map((c) => c.trim())
          .filter(Boolean);
      } catch {
        return [] as string[];
      }
    };

    setJoinedCourses(loadJoinedCourses());

    const onStorage = (e: StorageEvent) => {
      if (e.key === JOINED_COURSES_STORAGE_KEY) {
        setJoinedCourses(loadJoinedCourses());
      }
    };

    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const courseSuggestionScenarios: Scenario[] = useMemo(() => {
    const courses = joinedCourses.slice(0, 3);
    const templates = [
      (c: string) => ({
        title: `${c} Study Group`,
        desc: `Practice inviting classmates and setting up a study session for ${c}.`,
        icon: "📚",
      }),
      (c: string) => ({
        title: `${c} Project Team Chat`,
        desc: `Practice proposing roles, timelines, and collaboration for ${c}.`,
        icon: "🧩",
      }),
      (c: string) => ({
        title: `${c} Office Hours Question`,
        desc: `Practice asking clear, confident questions about assignments in ${c}.`,
        icon: "🧠",
      }),
    ];

    return courses.map((course, idx) => {
      const t = templates[idx % templates.length]!(course);
      return {
        id: `course_${course.replace(/\s+/g, "_")}_${idx}`,
        title: t.title,
        icon: t.icon,
        desc: t.desc,
        isCustom: false,
      };
    });
  }, [joinedCourses]);
  const [step, setStep] = useState<"prep" | "active">("prep");
  const [practiceMode, setPracticeMode] = useState<PracticeMode>("coach");
  const practiceModeRef = useRef<PracticeMode>("coach");
  const [selectedScenario, setSelectedScenario] = useState<Scenario>(() => {
    return likedItemScenarios[0] ?? courseSuggestionScenarios[0] ?? DEFAULT_SCENARIOS[0]!;
  });
  const [icebreakers, setIcebreakers] = useState<string[]>([]);
  const [isSessionActive, setIsSessionActive] = useState(false);
  const [status, setStatus] = useState<string>("Ready to practice?");
  const [isQuotaFull, setIsQuotaFull] = useState(false);
  const [customScenario, setCustomScenario] = useState("");
  const [showCustomInput, setShowCustomInput] = useState(false);

  const [coachSettings, setCoachSettings] = useState<CoachSettings>({
    focusBodyLanguage: true,
    focusOutfit: true,
    focusFacialExpressions: true,
    strictness: 55,
  });

  const [pendingCoachSettings, setPendingCoachSettings] = useState<CoachSettings>({
    focusBodyLanguage: true,
    focusOutfit: true,
    focusFacialExpressions: true,
    strictness: 55,
  });

  const hasPendingCoachChanges =
    pendingCoachSettings.focusBodyLanguage !== coachSettings.focusBodyLanguage ||
    pendingCoachSettings.focusOutfit !== coachSettings.focusOutfit ||
    pendingCoachSettings.focusFacialExpressions !== coachSettings.focusFacialExpressions ||
    pendingCoachSettings.strictness !== coachSettings.strictness;

  useEffect(() => {
    if (selectedScenario.isCustom) return;
    const existsInLikes = likedItemScenarios.some((s) => s.id === selectedScenario.id);
    const existsInCourses = courseSuggestionScenarios.some((s) => s.id === selectedScenario.id);
    const existsInFallback = DEFAULT_SCENARIOS.some((s) => s.id === selectedScenario.id);
    if (existsInLikes || existsInCourses || existsInFallback) return;

    setSelectedScenario(likedItemScenarios[0] ?? courseSuggestionScenarios[0] ?? DEFAULT_SCENARIOS[0]!);
  }, [likedItemScenarios, courseSuggestionScenarios, selectedScenario.id, selectedScenario.isCustom]);

  // New state for AI role customization
  const [roleOptions, setRoleOptions] = useState<string[]>([]);
  const [selectedRole, setSelectedRole] = useState<string>("");
  const [customRole, setCustomRole] = useState("");
  const [showCustomRoleInput, setShowCustomRoleInput] = useState(false);
  const [personalitySettings, setPersonalitySettings] = useState<PersonalitySettings>({
    pressure: 50,
    niceness: 50,
    formality: 50,
  });

  // Pending changes state - only apply when button clicked
  const [pendingSettings, setPendingSettings] = useState<PersonalitySettings>({
    pressure: 50,
    niceness: 50,
    formality: 50,
  });
  const [pendingRole, setPendingRole] = useState<string>("");
  const [pendingCustomRole, setPendingCustomRole] = useState("");
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const sessionRef = useRef<any>(null);
  const sidePanelScrollRef = useRef<HTMLDivElement | null>(null);
  const nextStartTimeRef = useRef<number>(0);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const isSpeakingRef = useRef<boolean>(false);
  const ignoreAudioUntilRef = useRef<number>(0);
  const roleStateRef = useRef({ selectedRole, customRole, pressure: personalitySettings.pressure, niceness: personalitySettings.niceness, formality: personalitySettings.formality });

  const setSpeakingState = (value: boolean) => {
    isSpeakingRef.current = value;
    setIsSpeaking(value);
  };

  useEffect(() => {
    practiceModeRef.current = practiceMode;
  }, [practiceMode]);

  useEffect(() => {
    isSpeakingRef.current = isSpeaking;
  }, [isSpeaking]);

  const pendingPersonaText = pendingCustomRole.trim() || pendingRole;
  const activePersonaText = customRole.trim() || selectedRole;
  const hasPendingChanges =
    pendingRole !== selectedRole ||
    pendingCustomRole !== customRole ||
    pendingSettings.pressure !== personalitySettings.pressure ||
    pendingSettings.niceness !== personalitySettings.niceness ||
    pendingSettings.formality !== personalitySettings.formality;

  // Generate role options when scenario changes
  useEffect(() => {
    const roles = getRoleSuggestionsForScenario(selectedScenario.title);
    setRoleOptions(roles);
    setSelectedRole(roles[0]);
    setCustomRole("");
    setShowCustomRoleInput(false);

    // Reset pending to match applied defaults for new scenario
    setPendingRole(roles[0]);
    setPendingCustomRole("");
  }, [selectedScenario]);

  const applyChanges = () => {
    const nextRole = pendingRole;
    const nextCustomRole = pendingCustomRole;
    const nextSettings = pendingSettings;

    setSelectedRole(nextRole);
    setCustomRole(nextCustomRole);
    setPersonalitySettings(nextSettings);
    setShowCustomRoleInput(!!nextCustomRole.trim());

    roleStateRef.current = {
      selectedRole: nextRole,
      customRole: nextCustomRole,
      pressure: nextSettings.pressure,
      niceness: nextSettings.niceness,
      formality: nextSettings.formality,
    };

    if (isSessionActive) {
      setStatus("Updating AI personality...");
      stopSession();
      setTimeout(() => {
        startSession("roleplay");
      }, 600);
    }
  };

  const scrollSidePanelToBottom = () => {
    const el = sidePanelScrollRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  };

  const handleOpenKeyDialog = async () => {
    if ((window as any).aistudio?.openSelectKey) {
      await (window as any).aistudio.openSelectKey();
      setIsQuotaFull(false);
      setStatus("Key updated. Try starting again.");
    }
  };

  const handleAddCustomScenario = () => {
    if (customScenario.trim()) {
      const newScenario = {
        id: `custom_${Date.now()}`,
        title: customScenario,
        icon: "✨",
        desc: `Custom practice for ${customScenario}.`,
        isCustom: true,
      };
      setSelectedScenario(newScenario);
      setCustomScenario("");
      setShowCustomInput(false);
    }
  };

  const buildRoleplayInstruction = (): string => {
    const roleText = customRole.trim() || selectedRole || "Conversation Partner";
    const pressureDesc =
      personalitySettings.pressure < 30
        ? "very relaxed and encouraging"
        : personalitySettings.pressure < 70
        ? "moderately challenging"
        : "very challenging and demanding";
    const nicenessDesc =
      personalitySettings.niceness < 30
        ? "critical and tougher"
        : personalitySettings.niceness < 70
        ? "balanced and professional"
        : "warm and supportive";
    const formalityDesc =
      personalitySettings.formality < 30
        ? "casual and conversational"
        : personalitySettings.formality < 70
        ? "professional yet friendly"
        : "formal and structured";

    return `You are roleplaying as: "${roleText}" in an immersive, realistic conversation for a McGill student in this scenario: "${selectedScenario.title}".
Your interaction style should be ${pressureDesc}, ${nicenessDesc}, and ${formalityDesc}.

CRITICAL RULES:
- Stay fully in character at all times.
- Do NOT mention coaching, practice, "training", or ask "are you ready to practice?".
- Do NOT give outfit/body language/facial expression feedback unless the user explicitly asks for feedback.
- The FIRST thing you say must immediately start the scenario in character with a natural opener appropriate to "${roleText}".
  Example (if interviewer): introduce yourself as the interviewer and begin the interview right away.

Keep the dialogue natural and responsive. Reference McGill/campus context when relevant.`;
  };

  const buildCoachInstruction = (): string => {
    const focusBits: string[] = [];
    if (coachSettings.focusBodyLanguage) focusBits.push("body language (posture, gestures, eye contact, confidence signals)");
    if (coachSettings.focusOutfit) focusBits.push("outfit/presentation (fit, appropriateness for the event, neatness)");
    if (coachSettings.focusFacialExpressions) focusBits.push("facial expressions (smile, warmth, engagement)");
    const focusText = focusBits.length ? focusBits.join(", ") : "general communication cues";

    const strictnessDesc =
      coachSettings.strictness < 30
        ? "very gentle and reassuring"
        : coachSettings.strictness < 70
        ? "direct but encouraging"
        : "highly critical, precise, and improvement-focused";

    return `You are an AI Coach for a McGill student practicing for "${selectedScenario.title}".
Your job is to give real-time coaching and actionable feedback based on their camera presence and communication.
Focus on: ${focusText}.
Your coaching tone should be ${strictnessDesc}.
Give short, specific feedback (1-3 bullets worth) and one concrete next action at a time.
Do NOT roleplay as a recruiter/friend/stranger; you are strictly a coach.`;
  };

  const buildSystemInstructionForMode = (mode: PracticeMode): string => {
    return mode === "coach" ? buildCoachInstruction() : buildRoleplayInstruction();
  };

  const setModeAndRestart = (nextMode: PracticeMode) => {
    if (nextMode === practiceMode) return;
    setPracticeMode(nextMode);

    if (isSessionActive) {
      setStatus(nextMode === "coach" ? "Switching to Coach Mode..." : "Switching to Roleplay Mode...");
      stopSession();
      setTimeout(() => {
        startSession(nextMode);
      }, 600);
    }
  };

  const applyCoachChanges = () => {
    setCoachSettings(pendingCoachSettings);
    if (isSessionActive && practiceMode === "coach") {
      setStatus("Updating coach settings...");
      stopSession();
      setTimeout(() => {
        startSession("coach");
      }, 600);
    }
  };

  // Select voice based on role and personality
  const selectVoiceForRole = (): string => {
    const roleText = (customRole.trim() || selectedRole).toLowerCase();
    const isHighPressure = personalitySettings.pressure > 70;
    const isFormal = personalitySettings.formality > 60;
    const isNice = personalitySettings.niceness > 60;

    // Male voices: Charon, Fenrir
    // Female voices: Pied Piper, Kore, Juniper, Stella

    // Professional/intense roles → diverse voices
    if (
      roleText.includes("recruiter") ||
      roleText.includes("executive") ||
      roleText.includes("interviewer") ||
      roleText.includes("judge") ||
      roleText.includes("ceo") ||
      roleText.includes("knows")
    ) {
      return isHighPressure ? "Charon" : isFormal ? "Fenrir" : "Pied Piper";
    }

    // Mentor/supportive roles → warm voices
    if (
      roleText.includes("mentor") ||
      roleText.includes("enthusiastic") ||
      roleText.includes("hr") ||
      roleText.includes("supportive") ||
      roleText.includes("encouraging")
    ) {
      return isNice ? "Stella" : "Juniper";
    }

    // Casual/friend-like roles → relaxed voices
    if (
      roleText.includes("friend") ||
      roleText.includes("host") ||
      roleText.includes("stranger") ||
      roleText.includes("casual") ||
      roleText.includes("chill")
    ) {
      return isHighPressure ? "Kore" : "Juniper";
    }

    // Critical/skeptical roles → confident voices
    if (
      roleText.includes("skeptic") ||
      roleText.includes("critical") ||
      roleText.includes("perfection")
    ) {
      return "Fenrir";
    }

    // Introverted/thoughtful roles
    if (
      roleText.includes("introverted") ||
      roleText.includes("quiet") ||
      roleText.includes("thoughtful") ||
      roleText.includes("struggling")
    ) {
      return "Stella";
    }

    // Default: mix based on formality and pressure
    if (isFormal && isHighPressure) return "Charon";
    if (isNice) return "Stella";
    return "Juniper";
  };

  const encode = (bytes: Uint8Array) => {
    let binary = "";
    for (let i = 0; i < bytes.byteLength; i++)
      binary += String.fromCharCode(bytes[i]);
    return btoa(binary);
  };

  const decode = (base64: string) => {
    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++)
      bytes[i] = binaryString.charCodeAt(i);
    return bytes;
  };

  const decodeAudioData = async (
    data: Uint8Array,
    ctx: AudioContext,
    sampleRate: number,
    numChannels: number,
  ): Promise<AudioBuffer> => {
    const dataInt16 = new Int16Array(data.buffer);
    const frameCount = dataInt16.length / numChannels;
    const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);
    for (let channel = 0; channel < numChannels; channel++) {
      const channelData = buffer.getChannelData(channel);
      for (let i = 0; i < frameCount; i++)
        channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
    return buffer;
  };

  const startSession = async (forcedMode?: PracticeMode) => {
    try {
      setIsQuotaFull(false);
      setStep("active");
      setStatus("Initializing AI...");
      setIsLoading(true);

      const modeToUse = forcedMode ?? practiceModeRef.current;

      // Reset any playback scheduling from prior sessions
      nextStartTimeRef.current = 0;
      sourcesRef.current.forEach((src) => {
        try {
          src.stop();
        } catch {
          // ignore
        }
      });
      sourcesRef.current.clear();
      
      // Fetch icebreakers when session starts
      const ice = await getSocialIcebreakers(selectedScenario.title);
      setIcebreakers(ice);
      
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
        video: true,
      });
      streamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;

      // Always create a fresh instance to catch any updated keys from openSelectKey()
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || "" });
      const inputCtx = new (
        window.AudioContext || (window as any).webkitAudioContext
      )({ sampleRate: 16000 });
      const outputCtx = new (
        window.AudioContext || (window as any).webkitAudioContext
      )({ sampleRate: 24000 });

      // Ensure contexts are running (autoplay policies can suspend them)
      try {
        await inputCtx.resume();
        await outputCtx.resume();
      } catch {
        // ignore
      }

      const sessionPromise = ai.live.connect({
        model: "gemini-2.5-flash-native-audio-preview-12-2025",
        callbacks: {
          onopen: () => {
            setStatus("Active Session: Analyzing Cues");
            setIsSessionActive(true);
            setIsLoading(false);
            const source = inputCtx.createMediaStreamSource(stream);
            const scriptProcessor = inputCtx.createScriptProcessor(4096, 1, 1);
            let lastInterruptTime = 0;
            const INTERRUPT_COOLDOWN = 300; // ms between interrupts
            const MIN_RMS_THRESHOLD = 0.018;
            const MIN_PEAK_THRESHOLD = 0.12;
            let speechFrames = 0;
            let noiseRms = 0.008;
            let noisePeak = 0.03;
            
            scriptProcessor.onaudioprocess = (e) => {
              const inputData = e.inputBuffer.getChannelData(0);
              
              // Detect user speech by calculating audio amplitude (RMS)
              let sum = 0;
              let peakAbs = 0;
              for (let i = 0; i < inputData.length; i++) {
                const sample = inputData[i] ?? 0;
                sum += sample * sample;
                const abs = Math.abs(sample);
                if (abs > peakAbs) peakAbs = abs;
              }
              const rms = Math.sqrt(sum / inputData.length);
              
              // Only interrupt when AI is actively speaking, and only after a few consecutive frames
              const aiIsSpeakingNow = isSpeakingRef.current || sourcesRef.current.size > 0;
              if (!aiIsSpeakingNow) {
                // Update noise floor when AI isn't speaking (EMA)
                noiseRms = noiseRms * 0.95 + rms * 0.05;
                noisePeak = noisePeak * 0.95 + peakAbs * 0.05;
              }

              const dynamicRmsThreshold = Math.max(MIN_RMS_THRESHOLD, noiseRms * 4);
              const dynamicPeakThreshold = Math.max(MIN_PEAK_THRESHOLD, noisePeak * 3);
              const userIsSpeaking = rms > dynamicRmsThreshold || peakAbs > dynamicPeakThreshold;

              if (userIsSpeaking && aiIsSpeakingNow) {
                speechFrames += 1;
              } else {
                speechFrames = 0;
              }

              if (speechFrames >= 2) {
                const now = Date.now();
                if (now - lastInterruptTime > INTERRUPT_COOLDOWN) {
                  lastInterruptTime = now;

                  // Briefly ignore incoming audio chunks after interrupt so the AI doesn't
                  // "keep talking" due to already-in-flight server audio.
                  ignoreAudioUntilRef.current = now + 4000;

                  // Stop all currently playing audio sources
                  sourcesRef.current.forEach((src) => {
                    try {
                      src.stop();
                    } catch (err) {
                      // Already stopped, ignore error
                    }
                  });
                  sourcesRef.current.clear();
                  nextStartTimeRef.current = outputCtx.currentTime;
                  setSpeakingState(false);
                }
              }
              
              const int16 = new Int16Array(inputData.length);
              for (let i = 0; i < inputData.length; i++) {
                const s = Math.max(-1, Math.min(1, inputData[i]));
                int16[i] = s < 0 ? s * 32768 : s * 32767;
              }
              sessionPromise.then((session) =>
                session.sendRealtimeInput({
                  audio: {
                    data: encode(new Uint8Array(int16.buffer)),
                    mimeType: "audio/pcm;rate=16000",
                  },
                }),
              );
            };
            source.connect(scriptProcessor);

            // Keep processor alive without routing mic audio to speakers
            const silence = inputCtx.createGain();
            silence.gain.value = 0;
            scriptProcessor.connect(silence);
            silence.connect(inputCtx.destination);

            const frameTimer = setInterval(() => {
              if (videoRef.current && canvasRef.current) {
                const ctx = canvasRef.current.getContext("2d");
                canvasRef.current.width = 320;
                canvasRef.current.height = 240;
                ctx?.drawImage(videoRef.current, 0, 0, 320, 240);
                canvasRef.current.toBlob(
                  async (blob) => {
                    if (blob) {
                      const reader = new FileReader();
                      reader.onloadend = () => {
                        const base64Data = (reader.result as string).split(
                          ",",
                        )[1];
                        sessionPromise.then((s) =>
                          s.sendRealtimeInput({
                            media: { data: base64Data, mimeType: "image/jpeg" },
                          }),
                        );
                      };
                      reader.readAsDataURL(blob);
                    }
                  },
                  "image/jpeg",
                  0.5,
                );
              }
            }, 3000);
            (window as any)._coachTimer = frameTimer;
          },
          onmessage: async (message: LiveServerMessage) => {
            if (Date.now() < ignoreAudioUntilRef.current) return;

            const parts = message.serverContent?.modelTurn?.parts || [];
            const audioParts = parts.filter((p: any) =>
              p?.inlineData?.data &&
              (p?.inlineData?.mimeType?.startsWith?.("audio/") ||
                p?.inlineData?.mimeType?.includes?.("audio")),
            );

            const fallbackData = (message as any)?.data as string | undefined;
            const base64FromParts = audioParts.length > 0 ? (audioParts[0].inlineData.data as string) : undefined;
            const base64Audio = base64FromParts || fallbackData;

            if (base64Audio) {
              if (Date.now() < ignoreAudioUntilRef.current) return;
              nextStartTimeRef.current = Math.max(nextStartTimeRef.current, outputCtx.currentTime);
              const audioBuffer = await decodeAudioData(
                decode(base64Audio),
                outputCtx,
                24000,
                1,
              );

              if (Date.now() < ignoreAudioUntilRef.current) return;
              const source = outputCtx.createBufferSource();
              source.buffer = audioBuffer;
              source.connect(outputCtx.destination);
              source.start(nextStartTimeRef.current);
              nextStartTimeRef.current += audioBuffer.duration;
              sourcesRef.current.add(source);
              
              // Set speaking state
              setSpeakingState(true);
              source.onended = () => {
                sourcesRef.current.delete(source);
                if (sourcesRef.current.size === 0) setSpeakingState(false);
              };
            }
          },
          onerror: (err: any) => {
            if (
              err?.message?.includes("429") ||
              err?.message?.includes("RESOURCE_EXHAUSTED")
            ) {
              setIsQuotaFull(true);
              setStatus("Service Busy (Quota Hit)");
            }
          },
        },
        config: {
          responseModalities: [Modality.AUDIO],
          systemInstruction: buildSystemInstructionForMode(modeToUse),
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: "Leda" } },
          },
        },
      });
      sessionRef.current = await sessionPromise;
    } catch (err: any) {
      setIsLoading(false);
      if (
        err?.message?.includes("429") ||
        err?.message?.includes("RESOURCE_EXHAUSTED")
      ) {
        setIsQuotaFull(true);
        setStatus("Campus quota reached.");
      } else {
        setStatus("Permissions or connection error.");
      }
    }
  };

  const stopSession = () => {
    setIsSessionActive(false);
    setSpeakingState(false);
    setIsQuotaFull(false);
    setIsLoading(false);
    setStep("prep");

    ignoreAudioUntilRef.current = 0;
    isSpeakingRef.current = false;

    nextStartTimeRef.current = 0;
    sourcesRef.current.forEach((src) => {
      try {
        src.stop();
      } catch {
        // ignore
      }
    });
    sourcesRef.current.clear();

    if (streamRef.current)
      streamRef.current.getTracks().forEach((t) => t.stop());
    if ((window as any)._coachTimer) clearInterval((window as any)._coachTimer);
    if (sessionRef.current) sessionRef.current.close();
  };

  // Loading Screen Component
  const LoadingScreen = () => (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center">
      <div className="bg-slate-900 border border-white/10 rounded-3xl p-12 max-w-md w-full mx-4 text-center shadow-2xl">
        <div className="mb-8 flex justify-center">
          <div className="relative w-16 h-16">
            <div className="absolute inset-0 border-4 border-white/10 rounded-full" />
            <div className="absolute inset-0 border-4 border-transparent border-t-mcgill-red rounded-full animate-spin" />
          </div>
        </div>
        <h3 className="text-xl font-black text-white mb-2">{status}</h3>
        <p className="text-sm text-slate-400">Setting up your practice session...</p>
        <div className="mt-6 flex gap-1 justify-center">
          <div className="w-2 h-2 bg-mcgill-red rounded-full animate-bounce" style={{ animationDelay: '0s' }} />
          <div className="w-2 h-2 bg-mcgill-red rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
          <div className="w-2 h-2 bg-mcgill-red rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
        </div>
      </div>
    </div>
  );

  if (step === "prep") {
    return (
      <>
        {isLoading && <LoadingScreen />}
        <div className="p-6 lg:p-16 h-full flex flex-col max-w-6xl mx-auto overflow-y-auto pb-32">
        <header className="mb-12">
          <span className="text-xs font-bold text-mcgill-red uppercase tracking-[0.3em] mb-2 block">
            Social Playground
          </span>
          <h2 className="text-4xl lg:text-5xl font-black text-slate-900 tracking-tight mb-4">
            Master Your Social Game
          </h2>
          <p className="text-slate-500 text-lg max-w-xl">
            A private, safe space to practice communication before hitting
            campus events.
          </p>
        </header>

        {isQuotaFull && (
          <div className="mb-8 p-6 bg-red-50 border border-red-100 rounded-[2rem] flex items-center justify-between">
            <div className="flex items-center gap-4">
              <span className="text-2xl">⏳</span>
              <div>
                <h5 className="font-bold text-mcgill-red">
                  Campus Quota Reached
                </h5>
                <p className="text-xs text-red-600 font-medium">
                  Too many students are practicing right now. Connect a personal
                  key to skip the queue.
                </p>
              </div>
            </div>
            <button
              onClick={handleOpenKeyDialog}
              className="px-6 py-3 bg-mcgill-red text-white text-[10px] font-black uppercase rounded-xl hover:bg-red-600 transition-all"
            >
              Connect Key
            </button>
          </div>
        )}

        <div className="mb-12">
          {likedItemScenarios.length > 0 && (
            <>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-black text-slate-700 uppercase tracking-[0.25em]">
                  From Your Likes
                </span>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                  {likedItemScenarios.length} saved
                </span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                {likedItemScenarios.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => setSelectedScenario(s)}
                    className={`p-8 rounded-[2.5rem] text-left transition-all border-4 ${
                      selectedScenario.id === s.id
                        ? "bg-white border-mcgill-red shadow-2xl shadow-red-50 scale-[1.02]"
                        : "bg-white border-slate-50 text-slate-700 hover:border-slate-100"
                    }`}
                  >
                    <div className="flex items-center gap-6">
                      <span className="text-4xl bg-slate-50 p-4 rounded-2xl">
                        {s.icon}
                      </span>
                      <div>
                        <h4 className="text-xl font-bold mb-1">{s.title}</h4>
                        <p
                          className={`text-sm ${selectedScenario.id === s.id ? "text-slate-500" : "text-slate-400"}`}
                        >
                          {s.desc}
                        </p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </>
          )}

          {courseSuggestionScenarios.length > 0 && (
            <>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-black text-slate-700 uppercase tracking-[0.25em]">
                  From Your Courses
                </span>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                  {courseSuggestionScenarios.length} suggested
                </span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                {courseSuggestionScenarios.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => setSelectedScenario(s)}
                    className={`p-8 rounded-[2.5rem] text-left transition-all border-4 ${
                      selectedScenario.id === s.id
                        ? "bg-white border-mcgill-red shadow-2xl shadow-red-50 scale-[1.02]"
                        : "bg-white border-slate-50 text-slate-700 hover:border-slate-100"
                    }`}
                  >
                    <div className="flex items-center gap-6">
                      <span className="text-4xl bg-slate-50 p-4 rounded-2xl">
                        {s.icon}
                      </span>
                      <div>
                        <h4 className="text-xl font-bold mb-1">{s.title}</h4>
                        <p
                          className={`text-sm ${selectedScenario.id === s.id ? "text-slate-500" : "text-slate-400"}`}
                        >
                          {s.desc}
                        </p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </>
          )}

          {likedItemScenarios.length === 0 && courseSuggestionScenarios.length === 0 && (
            <>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-black text-slate-700 uppercase tracking-[0.25em]">
                  Suggested Scenarios
                </span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                {DEFAULT_SCENARIOS.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => setSelectedScenario(s)}
                    className={`p-8 rounded-[2.5rem] text-left transition-all border-4 ${
                      selectedScenario.id === s.id
                        ? "bg-white border-mcgill-red shadow-2xl shadow-red-50 scale-[1.02]"
                        : "bg-white border-slate-50 text-slate-700 hover:border-slate-100"
                    }`}
                  >
                    <div className="flex items-center gap-6">
                      <span className="text-4xl bg-slate-50 p-4 rounded-2xl">
                        {s.icon}
                      </span>
                      <div>
                        <h4 className="text-xl font-bold mb-1">{s.title}</h4>
                        <p
                          className={`text-sm ${selectedScenario.id === s.id ? "text-slate-500" : "text-slate-400"}`}
                        >
                          {s.desc}
                        </p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Custom Practice Input */}
            <button
              onClick={() => setShowCustomInput(!showCustomInput)}
              className={`p-8 rounded-[2.5rem] text-left transition-all border-4 border-dashed ${
                showCustomInput
                  ? "bg-slate-50 border-mcgill-red"
                  : "bg-white border-slate-200 hover:border-slate-300"
              }`}
            >
              <div className="flex items-center gap-6">
                <span className="text-4xl bg-slate-50 p-4 rounded-2xl">✨</span>
                <div>
                  <h4 className="text-xl font-bold mb-1">Custom Practice</h4>
                  <p className="text-sm text-slate-400">
                    {showCustomInput ? "Enter your scenario" : "Create your own"}
                  </p>
                </div>
              </div>
            </button>
          </div>
        </div>

        {showCustomInput && (
          <div className="mb-12 p-6 bg-slate-50 rounded-[2.5rem] border border-slate-200 animate-in fade-in slide-in-from-top-2 duration-300">
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3">
              What scenario do you want to practice?
            </label>
            <div className="flex gap-3">
              <input
                type="text"
                placeholder="E.g., Interview with Shopify, Coffee chat with alumni..."
                value={customScenario}
                onChange={(e) => setCustomScenario(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAddCustomScenario()}
                className="flex-1 px-4 py-3 bg-white rounded-xl border border-slate-200 font-medium placeholder-slate-400 focus:outline-none focus:border-mcgill-red"
              />
              <button
                onClick={handleAddCustomScenario}
                className="px-6 py-3 bg-mcgill-red text-white font-black rounded-xl text-sm hover:bg-red-600 transition-all"
              >
                Add
              </button>
            </div>
          </div>
        )}

        <div className="flex justify-center mt-12">
          <div className="bg-mcgill-red rounded-[3rem] p-12 flex flex-col justify-center items-center text-center shadow-2xl shadow-red-100 w-full max-w-md">
            <h4 className="text-white font-black text-2xl mb-4">
              Ready to go?
            </h4>
            <p className="text-red-100 text-sm mb-8">
              You'll customize your AI coach and practice tips once you start.
            </p>
            <button
              onClick={() => {
                setPracticeMode("coach");
                startSession("coach");
              }}
              className="w-full py-6 bg-white text-mcgill-red font-black text-xl rounded-3xl shadow-xl transition-all hover:scale-105 active:scale-95"
            >
              Start Practice
            </button>
          </div>
        </div>
      </div>
      </>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-slate-900 text-white overflow-hidden">
      {isLoading && <LoadingScreen />}
      <div className="p-6 flex items-center justify-between border-b border-white/5 bg-slate-900/50 backdrop-blur-xl">
        <div className="flex items-center gap-4">
          <div
            className={`w-3 h-3 ${isQuotaFull ? "bg-amber-500" : "bg-red-500"} rounded-full animate-pulse`}
          />
          <div>
            <h2 className="text-lg font-black tracking-tight">
              {selectedScenario.title}
            </h2>
            <p className="text-[10px] text-slate-400 uppercase tracking-widest">
              {status}
            </p>
          </div>
        </div>
        <div className="flex gap-3">
          {isQuotaFull && (
            <button
              onClick={handleOpenKeyDialog}
              className="px-6 py-3 bg-mcgill-red text-white text-[10px] font-black rounded-2xl transition-all uppercase tracking-widest"
            >
              Upgrade Connection
            </button>
          )}
          <button
            onClick={stopSession}
            className="px-8 py-3 bg-white/10 hover:bg-white/20 text-white text-xs font-black rounded-2xl border border-white/10 transition-colors uppercase tracking-widest"
          >
            End Session
          </button>
        </div>
      </div>

      <div className="flex-1 flex flex-col lg:flex-row min-h-0">
        {isQuotaFull ? (
          <div className="flex-1 flex flex-col items-center justify-center p-12 text-center bg-slate-900">
            <span className="text-6xl mb-6">🛰️</span>
            <h3 className="text-3xl font-black mb-4 tracking-tighter">
              Connection Limit Reached
            </h3>
            <p className="text-slate-400 max-w-md mb-8">
              The campus servers are currently overwhelmed. To continue
              practicing immediately, please connect a personal Gemini API key.
            </p>
            <button
              onClick={handleOpenKeyDialog}
              className="px-12 py-5 bg-mcgill-red text-white font-black rounded-3xl shadow-2xl transition-transform hover:scale-105"
            >
              Select API Key
            </button>
          </div>
        ) : (
          <>
            <div className="flex-[2] relative bg-black min-h-0">
              <video
                ref={videoRef}
                autoPlay
                muted
                playsInline
                className="w-full h-full object-cover"
              />
              <canvas ref={canvasRef} className="hidden" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none" />
              {/* Speaking Animation Overlay */}
              {isSpeaking && (
                <div className="absolute inset-0 animate-pulse pointer-events-none">
                  <div className="absolute inset-0 bg-mcgill-red/10 rounded-lg" />
                  <div className="absolute inset-0 border-2 border-mcgill-red rounded-lg animate-pulse" />
                </div>
              )}
              <div className="absolute top-6 left-6 px-4 py-2 bg-black/40 backdrop-blur-md rounded-full border border-white/20 text-[10px] font-black uppercase tracking-[0.2em] flex items-center gap-3">
                <span className={`w-2 h-2 rounded-full ${isSpeaking ? 'bg-red-500 animate-pulse' : 'bg-slate-400'}`} />

                {/* Amplitude Visualizer */}
                <div className="flex items-end gap-0.5 h-4" aria-hidden="true">
                  {[0, 1, 2, 3, 4].map((i) => (
                    <div
                      key={i}
                      className={
                        `w-0.5 rounded-full ` +
                        (isSpeaking
                          ? "bg-mcgill-red animate-bounce"
                          : "bg-slate-400")
                      }
                      style={{
                        height: isSpeaking
                          ? [6, 14, 10, 16, 8][i]
                          : [4, 6, 5, 6, 4][i],
                        animationDelay: `${i * 0.08}s`,
                        animationDuration: isSpeaking ? "0.6s" : undefined,
                      }}
                    />
                  ))}
                </div>

                <span>{isSpeaking ? 'Speaking' : 'Listening'}</span>
              </div>
            </div>
            <div className="flex-1 bg-slate-800/50 p-8 flex flex-col overflow-hidden relative min-h-0">
              <button
                onClick={scrollSidePanelToBottom}
                className="absolute top-6 right-6 px-4 py-2 bg-white/10 hover:bg-white/20 text-white text-[10px] font-black rounded-2xl border border-white/10 transition-colors uppercase tracking-widest z-10"
              >
                Bottom
              </button>
              <div
                ref={sidePanelScrollRef}
                className="flex-1 min-h-0 overflow-y-auto pr-4"
                style={{ scrollbarGutter: "stable" }}
              >
              {/* Mode Switch */}
              <div className="mb-8">
                <span className="text-[10px] font-black text-mcgill-red uppercase tracking-[0.3em] mb-3 block">
                  🧭 Practice Mode
                </span>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setModeAndRestart("coach")}
                    className={`px-3 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all border ${
                      practiceMode === "coach"
                        ? "bg-mcgill-red text-white border-mcgill-red"
                        : "bg-white/5 text-white/70 border-white/10 hover:border-white/30"
                    }`}
                  >
                    Coach
                  </button>
                  <button
                    onClick={() => setModeAndRestart("roleplay")}
                    className={`px-3 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all border ${
                      practiceMode === "roleplay"
                        ? "bg-mcgill-red text-white border-mcgill-red"
                        : "bg-white/5 text-white/70 border-white/10 hover:border-white/30"
                    }`}
                  >
                    Roleplay
                  </button>
                </div>
              </div>

              {/* Icebreakers Section */}
              <div className="mb-8">
                <span className="text-[10px] font-black text-mcgill-red uppercase tracking-[0.3em] mb-3 block">
                  💬 Try These Lines
                </span>
                <div className="space-y-2">
                  {icebreakers.length > 0 ? (
                    icebreakers.map((ice, i) => (
                      <div key={i} className="bg-white/5 border border-white/10 p-3 rounded-lg">
                        <p className="text-xs text-white/80 italic leading-relaxed">"{ice}"</p>
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-slate-400 animate-pulse">Loading conversation starters...</p>
                  )}
                </div>
              </div>

              {practiceMode === "coach" && (
                <div className="mb-8">
                  <span className="text-[10px] font-black text-mcgill-red uppercase tracking-[0.3em] mb-3 block">
                    🧑‍🏫 Coach Focus
                  </span>

                  <div className="space-y-2">
                    <button
                      onClick={() =>
                        setPendingCoachSettings((prev) => ({
                          ...prev,
                          focusBodyLanguage: !prev.focusBodyLanguage,
                        }))
                      }
                      className={`w-full px-3 py-2 rounded-lg text-xs font-bold transition-all text-left border ${
                        pendingCoachSettings.focusBodyLanguage
                          ? "bg-mcgill-red text-white border-mcgill-red"
                          : "bg-white/5 text-white/70 border-white/10 hover:border-white/30"
                      }`}
                    >
                      Body language
                    </button>

                    <button
                      onClick={() =>
                        setPendingCoachSettings((prev) => ({
                          ...prev,
                          focusOutfit: !prev.focusOutfit,
                        }))
                      }
                      className={`w-full px-3 py-2 rounded-lg text-xs font-bold transition-all text-left border ${
                        pendingCoachSettings.focusOutfit
                          ? "bg-mcgill-red text-white border-mcgill-red"
                          : "bg-white/5 text-white/70 border-white/10 hover:border-white/30"
                      }`}
                    >
                      Outfit & presentation
                    </button>

                    <button
                      onClick={() =>
                        setPendingCoachSettings((prev) => ({
                          ...prev,
                          focusFacialExpressions: !prev.focusFacialExpressions,
                        }))
                      }
                      className={`w-full px-3 py-2 rounded-lg text-xs font-bold transition-all text-left border ${
                        pendingCoachSettings.focusFacialExpressions
                          ? "bg-mcgill-red text-white border-mcgill-red"
                          : "bg-white/5 text-white/70 border-white/10 hover:border-white/30"
                      }`}
                    >
                      Facial expressions
                    </button>
                  </div>

                  <div className="mt-4">
                    <div className="flex justify-between items-center mb-2">
                      <label className="text-[9px] text-white/70 font-bold">Coach Strictness</label>
                      <span className="text-[9px] font-bold text-mcgill-red">{pendingCoachSettings.strictness}%</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={pendingCoachSettings.strictness}
                      onChange={(e) =>
                        setPendingCoachSettings((prev) => ({
                          ...prev,
                          strictness: parseInt(e.target.value),
                        }))
                      }
                      className="w-full h-2 bg-white/10 rounded-lg appearance-none cursor-pointer accent-mcgill-red"
                    />
                    <div className="flex justify-between text-[8px] text-white/40 mt-1">
                      <span>Gentle</span>
                      <span>Direct</span>
                    </div>
                  </div>

                  <div className="mt-5">
                    <button
                      onClick={applyCoachChanges}
                      disabled={!hasPendingCoachChanges}
                      className={`w-full px-4 py-3 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] transition-all border ${
                        hasPendingCoachChanges
                          ? "bg-mcgill-red text-white border-mcgill-red hover:bg-red-600"
                          : "bg-white/5 text-white/30 border-white/10 cursor-not-allowed"
                      }`}
                    >
                      Apply Coach Settings
                    </button>
                  </div>
                </div>
              )}

              {practiceMode === "roleplay" && (
                <>
                  {/* AI Role Selection */}
                  <div className="mb-8">
                    <span className="text-[10px] font-black text-mcgill-red uppercase tracking-[0.3em] mb-3 block">
                      🎭 AI Role
                    </span>
                    <div className="space-y-2">
                      {roleOptions.map((role) => (
                        <button
                          key={role}
                          onClick={() => {
                            setPendingRole(role);
                            setPendingCustomRole("");
                            setShowCustomRoleInput(false);
                          }}
                          className={`w-full px-3 py-2 rounded-lg text-xs font-bold transition-all text-left ${
                            pendingRole === role && !pendingCustomRole.trim()
                              ? "bg-mcgill-red text-white"
                              : "bg-white/5 border border-white/10 text-white/70 hover:border-white/30"
                          }`}
                        >
                          {role}
                        </button>
                      ))}
                      <button
                        onClick={() => setShowCustomRoleInput(!showCustomRoleInput)}
                        className="w-full px-3 py-2 rounded-lg text-xs font-bold transition-all text-left bg-white/5 border border-dashed border-white/30 text-white/70 hover:border-white/50"
                      >
                        ✨ Custom Role
                      </button>
                    </div>
                    {showCustomRoleInput && (
                      <div className="mt-3 p-3 bg-white/5 rounded-lg animate-in fade-in">
                        <input
                          type="text"
                          placeholder="Define your own role..."
                          value={pendingCustomRole}
                          onChange={(e) => setPendingCustomRole(e.target.value)}
                          className="w-full px-2 py-2 bg-white/10 border border-white/20 rounded text-xs text-white placeholder-white/30 focus:outline-none focus:border-mcgill-red"
                        />
                      </div>
                    )}
                  </div>

                  {/* Personality Sliders */}
                  <div className="mb-8">
                    <span className="text-[10px] font-black text-mcgill-red uppercase tracking-[0.3em] mb-3 block">
                      ⚙️ Personality Tuning
                    </span>
                    <div className="space-y-4">
                  {/* Pressure Slider */}
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <label className="text-[9px] text-white/70 font-bold">Pressure Level</label>
                      <span className="text-[9px] font-bold text-mcgill-red">{pendingSettings.pressure}%</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={pendingSettings.pressure}
                      onChange={(e) =>
                        setPendingSettings({
                          ...pendingSettings,
                          pressure: parseInt(e.target.value),
                        })
                      }
                      className="w-full h-2 bg-white/10 rounded-lg appearance-none cursor-pointer accent-mcgill-red"
                    />
                    <div className="flex justify-between text-[8px] text-white/40 mt-1">
                      <span>Chill</span>
                      <span>Intense</span>
                    </div>
                  </div>

                  {/* Niceness Slider */}
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <label className="text-[9px] text-white/70 font-bold">Niceness</label>
                      <span className="text-[9px] font-bold text-mcgill-red">{pendingSettings.niceness}%</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={pendingSettings.niceness}
                      onChange={(e) =>
                        setPendingSettings({
                          ...pendingSettings,
                          niceness: parseInt(e.target.value),
                        })
                      }
                      className="w-full h-2 bg-white/10 rounded-lg appearance-none cursor-pointer accent-mcgill-red"
                    />
                    <div className="flex justify-between text-[8px] text-white/40 mt-1">
                      <span>Critical</span>
                      <span>Supportive</span>
                    </div>
                  </div>

                  {/* Formality Slider */}
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <label className="text-[9px] text-white/70 font-bold">Formality</label>
                      <span className="text-[9px] font-bold text-mcgill-red">{pendingSettings.formality}%</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={pendingSettings.formality}
                      onChange={(e) =>
                        setPendingSettings({
                          ...pendingSettings,
                          formality: parseInt(e.target.value),
                        })
                      }
                      className="w-full h-2 bg-white/10 rounded-lg appearance-none cursor-pointer accent-mcgill-red"
                    />
                    <div className="flex justify-between text-[8px] text-white/40 mt-1">
                      <span>Casual</span>
                      <span>Formal</span>
                    </div>
                  </div>
                    </div>
                  </div>

                  {/* Apply Changes */}
                  <div className="mb-8">
                    <button
                      onClick={applyChanges}
                      disabled={!hasPendingChanges}
                      className={`w-full px-4 py-3 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] transition-all border ${
                        hasPendingChanges
                          ? "bg-mcgill-red text-white border-mcgill-red hover:bg-red-600"
                          : "bg-white/5 text-white/30 border-white/10 cursor-not-allowed"
                      }`}
                    >
                      Apply Changes
                    </button>
                  </div>

                  {/* Current Role Display */}
                  {(pendingRole || pendingCustomRole) && (
                    <div className="pt-6 border-t border-white/10">
                      <div className="bg-emerald-500/10 border border-emerald-500/30 p-4 rounded-xl">
                        <p className="text-[10px] text-emerald-300 font-black mb-1">Pending Persona</p>
                        <p className="text-sm text-white font-bold break-words">{pendingPersonaText}</p>
                      </div>
                    </div>
                  )}
                </>
              )}
              </div>
              {/* Sticky Current Persona at Bottom */}
              {practiceMode === "roleplay" && (selectedRole || customRole) && (
                <div className="pt-6 border-t border-white/10 mt-auto">
                  <div className="bg-emerald-500/10 border border-emerald-500/30 p-4 rounded-xl">
                    <p className="text-[10px] text-emerald-300 font-black mb-1">Active Persona</p>
                    <p className="text-sm text-white font-bold break-words">{activePersonaText}</p>
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default AICoach;
