import React from "react";

interface WelcomeProps {
  onStart: () => void;
}

const Welcome: React.FC<WelcomeProps> = ({ onStart }) => {
  return (
    <div className="fixed inset-0 z-[100] overflow-hidden">
      {/* ================= BACKGROUND ================= */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#4F0710] via-[#A90F24] to-[#ED1B2F]" />
      <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-black/10 to-black/30" />

      {/* Ambient glow */}
      <div className="absolute -top-[28rem] -right-[28rem] w-[110rem] h-[110rem] bg-white/10 rounded-full blur-3xl" />
      <div className="absolute -bottom-[28rem] -left-[28rem] w-[110rem] h-[110rem] bg-black/30 rounded-full blur-3xl" />

      {/* Dot texture */}
      <div className="absolute inset-0 opacity-[0.06] bg-[radial-gradient(circle_at_1px_1px,rgba(255,255,255,0.9)_1px,transparent_0)] [background-size:32px_32px]" />

      {/* ================= CONTENT ================= */}
      <div className="relative z-10 h-full w-full px-12 pt-16 pb-8 flex flex-col">
        {/* ================= TOP BRAND ================= */}
        <div className="flex flex-col items-center text-center">
          <div className="flex items-center gap-2">
            {/* New SVG badge logo */}
            <div className="w-28 h-28 rounded-2xl bg-white/06 flex items-center justify-center shadow-md">
              <svg
                className="w-full h-full"
                viewBox="0 0 64 64"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <defs>
                  <linearGradient id="g1" x1="0" x2="1">
                    <stop offset="0%" stopColor="#B91C1C" />
                    <stop offset="100%" stopColor="#7F0D11" />
                  </linearGradient>
                </defs>
                <rect
                  x="2"
                  y="2"
                  width="60"
                  height="60"
                  rx="12"
                  fill="url(#g1)"
                />
                <text
                  x="32"
                  y="42"
                  textAnchor="middle"
                  fontWeight="700"
                  fontSize="40"
                  fill="white"
                  fontFamily="Inter, ui-sans-serif, system-ui"
                >
                  U
                </text>
              </svg>
            </div>

            <div>
              <h1 className="text-white text-[7rem] leading-none font-black tracking-tight">
                UniLinks
              </h1>
              <div className="mt-3 text-white/85 text-sm font-black uppercase tracking-[0.45em]">
                Connect • Community • Friendship
              </div>
            </div>
          </div>

          {/* McGill badge */}
          <div className="mt-10 inline-flex items-center gap-4 px-8 py-3 rounded-full bg-white/10 border border-white/20 backdrop-blur">
            <div className="w-12 h-12 rounded-full bg-white/15 border border-white/30 flex items-center justify-center">
              <svg width="36" height="36" viewBox="0 0 24 24" fill="none">
                <path
                  d="M12 2l8 3v7c0 6-4 9-8 10-4-1-8-4-8-10V5l8-3z"
                  stroke="rgba(255,255,255,0.95)"
                  strokeWidth="2"
                />
                <path
                  d="M8.2 11.2l1.6 1.6 3.8-3.8"
                  stroke="rgba(255,255,255,0.95)"
                  strokeWidth="2"
                />
              </svg>
            </div>

            <div className="text-left">
              <div className="text-white text-2xl font-black">
                McGill University
              </div>
              <div className="mt-1 text-white/80 text-sm font-bold uppercase tracking-[0.35em]">
                Campus Community
              </div>
            </div>
          </div>
        </div>

        {/* ================= MAIN SECTION ================= */}
        <div className="flex-1 flex items-center">
          <div className="w-full max-w-[1200px] mx-auto grid grid-cols-[1.2fr_0.8fr] gap-16 items-center">
            {/* LEFT — TEXT */}
            <div>
              <h2 className="text-white text-[3.2rem] leading-[1.05] font-black max-w-[48rem]">
                Make friends at McGill —{" "}
                <span className="text-white/90">starting today.</span>
              </h2>

              <div className="mt-6 max-w-[42rem]">
                <p className="text-white/95 text-lg leading-relaxed">
                  Find <span className="font-black">lab partners</span>,{" "}
                  <span className="font-black">group members</span>,{" "}
                  <span className="font-black">competition teammates</span>, and
                  new <span className="font-black">friends</span> — through
                  shared classes, interests, and campus life.
                </p>
              </div>
            </div>

            {/* RIGHT — BUTTONS */}
            <div className="flex flex-col items-center gap-6 justify-self-center">
              <button
                onClick={onStart}
                className="w-64 py-3 rounded-2xl bg-white text-[#5A0812] font-black text-xl shadow-md hover:scale-105 active:scale-95 transition"
              >
                Let&apos;s Get Started
              </button>
            </div>
          </div>
        </div>

        {/* ================= FOOTER ================= */}
        <div className="text-center text-white/70 text-sm font-bold uppercase tracking-[0.45em]">
          UniLinks • McGill Community
        </div>
      </div>
    </div>
  );
};

export default Welcome;
