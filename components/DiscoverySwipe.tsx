
import React, { useState, useEffect } from 'react';
import { DiscoveryItem, DiscoveryType } from '../types';
import { getMatchReason } from '../services/gemini';
import HandshakeIcon from '../handshake.png';


const CATEGORIES = [
  { id: 'all', label: 'All Discovery', icon: '' },
  { id: 'courses', label: 'Courses & Study', icon: '' },
  { id: 'clubs', label: 'Clubs & Orgs', icon: '' },
  { id: 'events', label: 'Events & Parties', icon: '' },
  { id: 'networking', label: 'Networking', icon: '' },
];

const SUBCATEGORIES = [
  { id: 'hackathon', label: 'Hackathons', parent: 'events' },
  { id: 'frosh', label: 'Frosh', parent: 'events' },
  { id: 'lab', label: 'Lab Partners', parent: 'courses' },
  { id: 'capstone', label: 'Capstone', parent: 'courses' },
  { id: 'internship', label: 'Internships', parent: 'networking' },
  { id: 'full-time', label: 'Full-time', parent: 'networking' },
];

const MOCK_DATA: DiscoveryItem[] = [
  {
    id: '1',
    type: DiscoveryType.EVENT,
    title: 'Hack McWICS 2026',
    description: 'Come apply your coding skills!',
    image: 'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&q=80&w=800',
    tags: ['Tech', 'Hackathon'],
  },
  {
    id: '2',
    type: DiscoveryType.PARTNER,
    title: 'Sarah Desautels',
    description: 'Looking for a study lead for MGCR 341. Coffee is on me!',
    image: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=800',
    tags: ['Management', 'Lab Partner'],
  },
  {
    id: 'n1',
    type: DiscoveryType.NETWORKING,
    title: 'Google Cloud Canada',
    description: 'Hiring Cloud Engineering Interns for the Montreal office. Open to CS and SoftEng students.',
    image: 'https://images.unsplash.com/photo-1573164713988-8665fc963095?auto=format&fit=crop&q=80&w=800',
    tags: ['Networking', 'Internship', 'Tech'],
  },
  {
    id: 'n2',
    type: DiscoveryType.NETWORKING,
    title: 'CIBC',
    description: 'Connect with CIBC professionals in technology, finance, and analytics roles.',
    image: 'https://images.unsplash.com/photo-1554224154-22dec7ec8818?auto=format&fit=crop&q=80&w=800',
    tags: ['Networking', 'Finance', 'Internship'],
  },
  {
    id: 'n3',
    type: DiscoveryType.NETWORKING,
    title: 'Bombardier',
    description: 'Explore engineering and aerospace career opportunities with Bombardier.',
    image: 'https://images.unsplash.com/photo-1521791136064-7986c2920216?auto=format&fit=crop&q=80&w=800',
    tags: ['Networking', 'Engineering', 'Full-time'],
  },
  {
    id: '3',
    type: DiscoveryType.CLUB,
    title: 'The McGill Daily',
    description: 'Help us write the stories that shape our campus culture.',
    image: 'https://images.unsplash.com/photo-1504711434969-e33886168f5c?auto=format&fit=crop&q=80&w=800',
    tags: ['Journalism', 'Arts'],
  },
  {
    id: 'n4',
    type: DiscoveryType.NETWORKING,
    title: 'Matrox',
    description: 'Montreal-based tech company specializing in video, graphics, and embedded systems. Hiring software and hardware interns.',
    image: 'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&q=80&w=800',
    tags: ['Networking', 'Software', 'Hardware', 'Internship'],
  },
  ];


interface DiscoverySwipeProps {
  onHeart?: (item: DiscoveryItem) => void;
  externalItems?: DiscoveryItem[];
  userInterests: string[];
  onToggleInterested: (requestId: string) => void;
}

const DiscoverySwipe: React.FC<DiscoverySwipeProps> = ({ onHeart, externalItems = [], userInterests, onToggleInterested }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [swipeDir, setSwipeDir] = useState<'left' | 'right' | null>(null);
  const [matchReason, setMatchReason] = useState<string>('');
  const [activeCat, setActiveCat] = useState('all');
  const [activeSub, setActiveSub] = useState<string | null>(null);

  const combinedData = [...MOCK_DATA, ...externalItems];

  const filteredData = combinedData.filter(item => {
    if (activeCat === 'all' && !activeSub) return true;
    const matchesCat = 
      activeCat === 'courses' ? item.type === DiscoveryType.PARTNER || item.type === DiscoveryType.COURSE || item.type === DiscoveryType.COLLAB_REQUEST :
      activeCat === 'clubs' ? item.type === DiscoveryType.CLUB :
      activeCat === 'events' ? item.type === DiscoveryType.EVENT :
      activeCat === 'networking' ? item.type === DiscoveryType.NETWORKING : true;
    
    if (activeSub) {
      return item.tags.some(t => t.toLowerCase() === activeSub.toLowerCase());
    }
    return matchesCat;
  });

  const currentItem = filteredData[currentIndex % (filteredData.length || 1)] || combinedData[0];

  useEffect(() => {
    const fetchReason = async () => {
      setMatchReason('Scanning McGill records...');
      const reason = await getMatchReason(currentItem.title, userInterests);
      setMatchReason(reason || '');
    };
    if (filteredData.length > 0) fetchReason();
  }, [currentIndex, activeCat, activeSub, userInterests]);

  const handleSwipe = (direction: 'left' | 'right') => {
    if (direction === 'right') {
      onToggleInterested(currentItem.id);
    }
    if (direction === 'right' && onHeart) {
      onHeart(currentItem);
    }
    setSwipeDir(direction);
    setTimeout(() => {
      setSwipeDir(null);
      setCurrentIndex((prev) => (prev + 1));
    }, 300);
  };

  return (
    <div className="relative w-full min-h-screen flex flex-col items-center justify-start py-6 overflow-hidden bg-transparent">
    <div className="w-full mb-8 px-4 overflow-x-auto">
        <div className="flex gap-4 min-w-max pb-2">
          {CATEGORIES.map(cat => (
            <button
              key={cat.id}
              onClick={() => { setActiveCat(cat.id); setActiveSub(null); }}
              className={`px-6 py-3 rounded-2xl font-bold text-sm transition-all whitespace-nowrap flex items-center gap-2 ${
                activeCat === cat.id ? 'bg-mcgill-red text-white shadow-lg' : 'bg-white border border-slate-100 text-slate-500 hover:bg-slate-50'
              }`}
            >
              <span>{cat.icon}</span>
              {cat.label}
            </button>
          ))}
        </div>
        {activeCat !== 'all' && (
          <div className="flex gap-2 mt-4 animate-in fade-in slide-in-from-top-2 duration-300">
            {SUBCATEGORIES.filter(s => s.parent === activeCat).map(sub => (
              <button
                key={sub.id}
                onClick={() => setActiveSub(activeSub === sub.id ? null : sub.id)}
                className={`px-4 py-2 rounded-xl font-bold text-xs transition-all ${
                  activeSub === sub.id ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                }`}
              >
                {sub.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {filteredData.length > 0 ? (
        <div className="w-full max-w-4xl flex flex-col items-center">

          <div className={`relative w-full aspect-[16/9] rounded-[3.5rem] overflow-hidden shadow-2xl transition-all duration-500 ease-out bg-transparent ${
            swipeDir === 'left' ? '-translate-x-full opacity-0 -rotate-12 scale-90' : 
            swipeDir === 'right' ? 'translate-x-full opacity-0 rotate-12 scale-90' : 'translate-x-0 scale-100'
          }`}>
            <img 
              src={currentItem.image || 'https://images.unsplash.com/photo-1523240795612-9a054b0db644?auto=format&fit=crop&q=80&w=800'} 
              alt={currentItem.title} 
              className="absolute inset-0 w-full h-full object-cover grayscale-[0.2] hover:grayscale-0 transition-all duration-700"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-900/95 via-slate-900/30 to-transparent" />
            
            <div className="absolute top-8 left-8">
               <span className="px-5 py-2 bg-white/20 backdrop-blur-xl border border-white/20 text-white text-[10px] font-black uppercase rounded-full tracking-[0.2em]">
                {currentItem.type.replace('_', ' ')}
              </span>
            </div>

            <div className="absolute bottom-0 left-0 p-10 lg:p-12 text-white w-full">
              <h3 className="text-4xl lg:text-5xl font-black mb-4 leading-tight tracking-tighter">{currentItem.title}</h3>
              <p className="text-lg text-slate-300 mb-8 font-medium italic opacity-90 leading-relaxed">"{currentItem.description}"</p>
              
              <div className="bg-white/10 backdrop-blur-xl border border-white/10 rounded-3xl p-6 mb-8 transform hover:scale-[1.02] transition-transform">
                <p className="text-[10px] font-black text-red-400 uppercase tracking-[0.3em] mb-3 flex items-center gap-3">
                  <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                  UniMatch Intel
                </p>
                <p className="text-sm text-white leading-relaxed font-bold">{matchReason}</p>
              </div>

              <div className="flex flex-wrap gap-2">
                {currentItem.tags.map(tag => (
                  <span key={tag} className="text-[10px] bg-white text-red-700 font-black px-4 py-1.5 rounded-full uppercase tracking-tighter shadow-lg">
                    {tag}
                  </span>
                ))}
              </div>

              {currentItem.type === DiscoveryType.NETWORKING && (
                <div className="flex gap-2 mt-8">
                  <button className="flex-1 py-4 bg-mcgill-red text-white font-black text-xs uppercase tracking-widest rounded-2xl shadow-xl hover:bg-red-600 transition-all">
                    Apply Now
                  </button>
                  <button className="flex-1 py-4 bg-white/10 border border-white/20 text-white font-black text-xs uppercase tracking-widest rounded-2xl backdrop-blur-md hover:bg-white/20 transition-all">
                    Learn More
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="flex gap-10 mt-12">
            <button 
              onClick={() => handleSwipe('left')}
              className="w-20 h-20 rounded-full bg-white shadow-2xl flex items-center justify-center text-slate-300 hover:text-red-500 hover:scale-110 active:scale-90 transition-all border border-slate-50 group"
            >
              <svg className="w-8 h-8 group-hover:rotate-12 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12"></path></svg>
            </button>
            <button 
              onClick={() => handleSwipe('right')}
              className="w-20 h-20 rounded-full bg-mcgill-red shadow-2xl shadow-red-100 flex items-center justify-center text-white hover:bg-red-600 hover:scale-110 active:scale-90 transition-all group"
            >
              <img
              src={HandshakeIcon}
              alt="Connect"
              className="w-11 h-11 group-hover:scale-125 transition-transform"
            />
            </button>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center text-center p-12">
          <span className="text-6xl mb-6">🏜️</span>
          <h4 className="text-2xl font-black text-slate-900 mb-2">Feed Completed</h4>
          <p className="text-slate-500">Check back later for more McGill connections.</p>
        </div>
      )}
    </div>
  );
};

export default DiscoverySwipe;
