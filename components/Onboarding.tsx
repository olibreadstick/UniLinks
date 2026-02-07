
import React, { useState } from 'react';

interface OnboardingProps {
  onComplete: (interests: string[], major: string) => void;
}

const INTEREST_OPTIONS = [
  'Software Engineering', 'Philosophy', 'Jazz Performance', 'Biomedical Science', 
  'Sustainability', 'Entrepreneurship', 'Photography', 'Gaming', 'Social Justice', 
  'Robotics', 'Francophone Culture', 'Winter Sports', 'Debate', 'Pottery'
];

const Onboarding: React.FC<OnboardingProps> = ({ onComplete }) => {
  const [step, setStep] = useState(1);
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
  const [major, setMajor] = useState('');

  const toggleInterest = (interest: string) => {
    setSelectedInterests(prev => 
      prev.includes(interest) ? prev.filter(i => i !== interest) : [...prev, interest]
    );
  };

  const handleFinish = () => {
    if (selectedInterests.length > 0 && major) {
      onComplete(selectedInterests, major);
    }
  };

  return (
    <div className="min-h-screen bg-[#fcfcfc] flex items-center justify-center p-6">
      <div className="w-full max-w-2xl bg-white rounded-[3rem] shadow-2xl shadow-slate-200/50 p-12 lg:p-16 border border-slate-50">
        <div className="mb-12">
          <div className="flex gap-2 mb-10 max-w-xs mx-auto">
            {[1, 2].map(i => (
              <div key={i} className={`h-1.5 flex-1 rounded-full transition-all duration-700 ${step >= i ? 'bg-mcgill-red' : 'bg-slate-100'}`} />
            ))}
          </div>
          
          {step === 1 ? (
            <div className="animate-in fade-in slide-in-from-bottom-8 duration-700">
              <div className="text-center mb-10">
                <span className="text-xs font-bold text-mcgill-red uppercase tracking-[0.3em] mb-4 block">Step 01</span>
                <h1 className="text-4xl lg:text-5xl font-black text-slate-900 mb-4 leading-tight">What sparks your curiosity?</h1>
                <p className="text-slate-500 text-lg">Select 3 or more interests to personalize your McGill experience.</p>
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-12">
                {INTEREST_OPTIONS.map(interest => (
                  <button
                    key={interest}
                    onClick={() => toggleInterest(interest)}
                    className={`px-5 py-4 rounded-2xl text-sm font-bold transition-all border-2 text-center ${
                      selectedInterests.includes(interest)
                        ? 'bg-mcgill-red border-mcgill-red text-white shadow-xl shadow-red-100 scale-[1.03]'
                        : 'bg-white border-slate-100 text-slate-600 hover:border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    {interest}
                  </button>
                ))}
              </div>
              
              <button
                disabled={selectedInterests.length < 3}
                onClick={() => setStep(2)}
                className="w-full py-5 bg-mcgill-red text-white font-black text-lg rounded-3xl shadow-2xl shadow-red-100 disabled:opacity-30 disabled:shadow-none transition-all active:scale-95 hover:bg-red-600"
              >
                Next Step
              </button>
            </div>
          ) : (
            <div className="animate-in fade-in slide-in-from-right-8 duration-700">
              <div className="text-center mb-10">
                <span className="text-xs font-bold text-mcgill-red uppercase tracking-[0.3em] mb-4 block">Step 02</span>
                <h1 className="text-4xl lg:text-5xl font-black text-slate-900 mb-4 leading-tight">Tell us your Faculty</h1>
                <p className="text-slate-500 text-lg">We use this to find lab partners and peer collaborators.</p>
              </div>
              
              <div className="space-y-8 mb-12">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-4 ml-1">Your Program / Major</label>
                  <input 
                    type="text" 
                    value={major}
                    onChange={(e) => setMajor(e.target.value)}
                    placeholder="e.g. Desautels Management, Arts, Science..."
                    className="w-full p-6 bg-slate-50 border-2 border-slate-50 rounded-3xl outline-none focus:border-red-100 focus:bg-white transition-all text-slate-800 font-bold text-xl placeholder:text-slate-300"
                  />
                </div>
              </div>

              <div className="flex gap-4">
                <button
                  onClick={() => setStep(1)}
                  className="flex-1 py-5 bg-slate-50 text-slate-400 font-bold rounded-3xl hover:bg-slate-100 transition-all border border-slate-100"
                >
                  Back
                </button>
                <button
                  disabled={!major}
                  onClick={handleFinish}
                  className="flex-[2] py-5 bg-mcgill-red text-white font-black text-lg rounded-3xl shadow-2xl shadow-red-100 disabled:opacity-30 disabled:shadow-none transition-all active:scale-95 hover:bg-red-600"
                >
                  Begin Journey
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Onboarding;
