
import React from 'react';

interface NavProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

const Navigation: React.FC<NavProps> = ({ activeTab, setActiveTab }) => {
  const tabs = [
    { id: 'discover', label: 'Discover', icon: '' },
    { id: 'coach', label: 'Social Coach', icon: '' },
    { id: 'community', label: 'McGill Hub', icon: '' },
    { id: 'profile', label: 'Profile', icon: '👤' },
  ];

  return (
    <>
      {/* Desktop Sidebar */}
      <nav className="hidden lg:flex flex-col w-72 bg-white border-r border-slate-100 h-screen sticky top-0 p-8">
        <div className="mb-12">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-mcgill-red rounded-xl flex items-center justify-center shadow-lg shadow-red-100">
              <span className="text-white text-xl font-black">U</span>
            </div>
            <h1 className="text-xl font-black tracking-tighter text-slate-900">UniLinks</h1>
          </div>
          <p className="text-[10px] uppercase tracking-[0.2em] font-bold text-slate-400 pl-1">McGill Edition</p>
        </div>

        <div className="flex-1 space-y-2">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`w-full flex items-center gap-4 px-5 py-4 rounded-2xl transition-all font-semibold text-sm ${
                activeTab === tab.id 
                  ? 'bg-mcgill-red text-white shadow-xl shadow-red-100' 
                  : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'
              }`}
            >
              <span className="text-lg">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>

        <div className="pt-8 border-t border-slate-50">
          <div className="bg-slate-50 p-5 rounded-2xl">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Campus Status</p>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <p className="text-xs font-medium text-slate-600">Active community today</p>
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile Bottom Bar */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-100 px-6 py-3 z-50 flex justify-between items-center">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex flex-col items-center gap-1 transition-colors ${
              activeTab === tab.id ? 'text-mcgill-red' : 'text-slate-400'
            }`}
          >
            <span className="text-xl">{tab.icon}</span>
            <span className="text-[10px] font-bold uppercase tracking-wider">{tab.label.split(' ')[0]}</span>
          </button>
        ))}
      </nav>
    </>
  );
};

export default Navigation;
