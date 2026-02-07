
import React from 'react';

interface WelcomeProps {
  onStart: () => void;
}

const Welcome: React.FC<WelcomeProps> = ({ onStart }) => {
  return (
    <div className="fixed inset-0 z-[100] bg-white flex flex-col items-center justify-center text-center px-6 overflow-hidden">
      {/* Background Decorative Elements */}
      <div className="absolute top-[-10%] right-[-10%] w-[50%] aspect-square bg-red-50 rounded-full blur-3xl opacity-50" />
      <div className="absolute bottom-[-5%] left-[-5%] w-[40%] aspect-square bg-slate-50 rounded-full blur-3xl opacity-50" />
      
      <div className="relative z-10 max-w-2xl">
        <div className="w-20 h-20 bg-mcgill-red rounded-3xl flex items-center justify-center shadow-2xl shadow-red-200 mx-auto mb-10 rotate-3 transform hover:rotate-0 transition-transform duration-500">
          <span className="text-white text-4xl font-black">U</span>
        </div>
        
        <h1 className="text-6xl lg:text-7xl font-black text-slate-900 tracking-tighter mb-6 leading-tight">
          Your McGill <br /> 
          <span className="text-mcgill-red">Connection</span> Starts Here.
        </h1>
        
        <p className="text-xl text-slate-500 mb-12 max-w-lg mx-auto leading-relaxed">
          The all-in-one platform for McGillians to find partners, build communities, and master social confidence.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
          <button 
            onClick={onStart}
            className="w-full sm:w-auto px-12 py-5 bg-mcgill-red text-white font-black text-xl rounded-full shadow-2xl shadow-red-200 hover:bg-red-600 hover:scale-105 active:scale-95 transition-all duration-300"
          >
            Enter UniConnex
          </button>
          <div className="text-slate-400 text-xs font-bold uppercase tracking-[0.2em]">
            Grand Descente 2024
          </div>
        </div>
      </div>

      <div className="absolute bottom-12 flex gap-8 text-slate-300 font-bold text-[10px] uppercase tracking-widest">
        <span>SSMU Verified</span>
        <span>•</span>
        <span>Peer-to-Peer</span>
        <span>•</span>
        <span>AI Assisted</span>
      </div>
    </div>
  );
};

export default Welcome;
