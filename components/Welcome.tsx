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
      <div className="relative z-10 h-full w-full px-24 py-16 flex flex-col scale-[0.7] origin-center">
        {/* ================= TOP BRAND ================= */}
        <div className="flex flex-col items-center text-center">
          <div className="flex items-center gap-16">
            {/* Logo */}
            <div className="w-44 h-44 rounded-[4rem] bg-white/15 border border-white/30 backdrop-blur flex items-center justify-center shadow-2xl">
              <span className="text-white text-[8rem] font-black leading-none">
                U
              </span>
            </div>

            <div>
              <h1 className="text-white text-[9rem] leading-none font-black tracking-tight">
                UniLinks
              </h1>
              <div className="mt-6 text-white/85 text-2xl font-black uppercase tracking-[0.6em]">
                Connect • Community • Friendship
              </div>
            </div>
          </div>

          {/* McGill badge */}
          <div className="mt-14 inline-flex items-center gap-8 px-20 py-8 rounded-full bg-white/12 border border-white/25 backdrop-blur">
            <div className="w-18 h-18 rounded-full bg-white/15 border border-white/30 flex items-center justify-center">
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
              <div className="text-white text-5xl font-black">
                McGill University
              </div>
              <div className="mt-1 text-white/80 text-xl font-bold uppercase tracking-[0.35em]">
                Campus Community
              </div>
            </div>
          </div>
        </div>

        {/* ================= MAIN SECTION ================= */}
        <div className="flex-1 flex items-center">
          <div className="w-full max-w-[1700px] mx-auto grid grid-cols-[1.35fr_0.65fr] gap-32 items-center">
            {/* LEFT — TEXT */}
            <div className="-ml-6">
              <h2 className="text-white text-[6.2rem] leading-[1.05] font-black max-w-[56rem]">
                Make friends at McGill —{" "}
                <span className="text-white/90">starting today.</span>
              </h2>

              <div className="mt-12 max-w-[46rem]">
                <p className="text-white/95 text-3xl leading-relaxed">
                  Find <span className="font-black">lab partners</span>,{" "}
                  <span className="font-black">group members</span>,{" "}
                  <span className="font-black">competition teammates</span>, and
                  new <span className="font-black">friends</span> — through
                  shared classes, interests, and campus life.
                </p>
              </div>
            </div>

            {/* RIGHT — BUTTONS */}
            <div className="flex flex-col items-center gap-12 justify-self-end">
              <button
                onClick={onStart}
                className="w-[36rem] py-14 rounded-[3.5rem] bg-white text-[#5A0812] font-black text-5xl shadow-2xl hover:scale-[1.05] active:scale-[0.97] transition"
              >
                Let&apos;s Get Started
              </button>

              <button
                onClick={onStart}
                className="w-[36rem] py-14 rounded-[3.5rem] bg-white/10 border-2 border-white/35 text-white font-black text-5xl backdrop-blur hover:bg-white/15 hover:scale-[1.05] active:scale-[0.97] transition"
              >
                Complete Profile
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
