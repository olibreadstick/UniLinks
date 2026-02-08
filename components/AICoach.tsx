import React, { useState, useRef, useEffect } from "react";
import { GoogleGenAI, LiveServerMessage, Modality, Blob } from "@google/genai";
import { getSocialIcebreakers } from "../services/gemini";

const SCENARIOS = [
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

const AICoach: React.FC = () => {
  const [step, setStep] = useState<"prep" | "active">("prep");
  const [selectedScenario, setSelectedScenario] = useState(SCENARIOS[0]);
  const [icebreakers, setIcebreakers] = useState<string[]>([]);
  const [isSessionActive, setIsSessionActive] = useState(false);
  const [status, setStatus] = useState<string>("Ready to practice?");
  const [isQuotaFull, setIsQuotaFull] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const sessionRef = useRef<any>(null);
  const nextStartTimeRef = useRef<number>(0);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());

  useEffect(() => {
    const fetchIce = async () => {
      const ice = await getSocialIcebreakers(selectedScenario.title);
      setIcebreakers(ice);
    };
    fetchIce();
  }, [selectedScenario]);

  const handleOpenKeyDialog = async () => {
    if ((window as any).aistudio?.openSelectKey) {
      await (window as any).aistudio.openSelectKey();
      setIsQuotaFull(false);
      setStatus("Key updated. Try starting again.");
    }
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

  const startSession = async () => {
    try {
      setIsQuotaFull(false);
      setStep("active");
      setStatus("Initializing AI...");
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
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

      const sessionPromise = ai.live.connect({
        model: "gemini-2.5-flash-native-audio-preview-12-2025",
        callbacks: {
          onopen: () => {
            setStatus("Active Session: Analyzing Cues");
            setIsSessionActive(true);
            const source = inputCtx.createMediaStreamSource(stream);
            const scriptProcessor = inputCtx.createScriptProcessor(4096, 1, 1);
            scriptProcessor.onaudioprocess = (e) => {
              const inputData = e.inputBuffer.getChannelData(0);
              const int16 = new Int16Array(inputData.length);
              for (let i = 0; i < inputData.length; i++)
                int16[i] = inputData[i] * 32768;
              sessionPromise.then((session) =>
                session.sendRealtimeInput({
                  media: {
                    data: encode(new Uint8Array(int16.buffer)),
                    mimeType: "audio/pcm;rate=16000",
                  },
                }),
              );
            };
            source.connect(scriptProcessor);
            scriptProcessor.connect(inputCtx.destination);

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
            const base64Audio =
              message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
            if (base64Audio) {
              nextStartTimeRef.current = Math.max(
                nextStartTimeRef.current,
                outputCtx.currentTime,
              );
              const audioBuffer = await decodeAudioData(
                decode(base64Audio),
                outputCtx,
                24000,
                1,
              );
              const source = outputCtx.createBufferSource();
              source.buffer = audioBuffer;
              source.connect(outputCtx.destination);
              source.start(nextStartTimeRef.current);
              nextStartTimeRef.current += audioBuffer.duration;
              sourcesRef.current.add(source);
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
          systemInstruction: `You are a supportive, calm social coach for a McGill student practicing for ${selectedScenario.title}. Monitor video for body language. Remind them to smile or keep eye contact. Be very encouraging. Mention local McGill context if possible.`,
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: "Leda" } },
          },
        },
      });
      sessionRef.current = await sessionPromise;
    } catch (err: any) {
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
    setIsQuotaFull(false);
    setStep("prep");
    if (streamRef.current)
      streamRef.current.getTracks().forEach((t) => t.stop());
    if ((window as any)._coachTimer) clearInterval((window as any)._coachTimer);
    if (sessionRef.current) sessionRef.current.close();
  };

  if (step === "prep") {
    return (
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

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-12">
          {SCENARIOS.map((s) => (
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

        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 bg-slate-50/50 rounded-[3rem] p-10 border border-slate-100">
            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-6">
              AI Prep Kit
            </h4>
            <div className="space-y-6">
              {icebreakers.length > 0 ? (
                icebreakers.map((ice, i) => (
                  <div key={i} className="flex gap-5 items-start">
                    <div className="w-8 h-8 rounded-full bg-mcgill-red text-white flex items-center justify-center font-black text-xs flex-shrink-0 mt-1 shadow-md shadow-red-100">
                      {i + 1}
                    </div>
                    <p className="text-lg text-slate-700 font-medium italic">
                      "{ice}"
                    </p>
                  </div>
                ))
              ) : (
                <p className="text-slate-400 animate-pulse">
                  Gathering McGill icebreakers...
                </p>
              )}
            </div>
          </div>
          <div className="bg-mcgill-red rounded-[3rem] p-10 flex flex-col justify-center items-center text-center shadow-2xl shadow-red-100">
            <h4 className="text-white font-black text-2xl mb-4">
              Ready to go?
            </h4>
            <p className="text-red-100 text-sm mb-8">
              We'll provide live feedback on your smile, posture, and pacing.
            </p>
            <button
              onClick={startSession}
              className="w-full py-5 bg-white text-mcgill-red font-black text-lg rounded-3xl shadow-xl transition-all hover:scale-105 active:scale-95"
            >
              Start Practice
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-slate-900 text-white overflow-hidden">
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

      <div className="flex-1 flex flex-col lg:flex-row">
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
            <div className="flex-[2] relative bg-black">
              <video
                ref={videoRef}
                autoPlay
                muted
                playsInline
                className="w-full h-full object-cover"
              />
              <canvas ref={canvasRef} className="hidden" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none" />
              <div className="absolute top-6 left-6 px-4 py-2 bg-black/40 backdrop-blur-md rounded-full border border-white/20 text-[10px] font-black uppercase tracking-[0.2em]">
                Visual Analysis Active
              </div>
            </div>
            <div className="flex-1 bg-slate-800/50 p-10 flex flex-col justify-center">
              <div className="mb-8">
                <span className="text-[10px] font-black text-mcgill-red uppercase tracking-[0.3em] mb-4 block">
                  Coach Feedback
                </span>
                <h3 className="text-3xl font-black mb-6 leading-tight">
                  Social Intuition
                </h3>
                <div className="space-y-6">
                  <div className="bg-white/5 border border-white/10 p-6 rounded-[2rem]">
                    <p className="text-white/90 text-lg leading-relaxed font-medium">
                      "You're doing great! Try to lean in slightly to show
                      engagement. McGill networking is all about active
                      listening."
                    </p>
                  </div>
                  <div className="flex gap-4">
                    <div className="flex-1 bg-emerald-500/10 border border-emerald-500/30 p-4 rounded-2xl text-center">
                      <span className="block text-emerald-400 font-black text-sm uppercase tracking-widest mb-1">
                        Posture
                      </span>
                      <span className="text-white font-bold">Excellent</span>
                    </div>
                    <div className="flex-1 bg-amber-500/10 border border-amber-500/30 p-4 rounded-2xl text-center">
                      <span className="block text-amber-400 font-black text-sm uppercase tracking-widest mb-1">
                        Pacing
                      </span>
                      <span className="text-white font-bold">Slow Down</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default AICoach;
