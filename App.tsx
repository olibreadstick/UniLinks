import React, { useState, useEffect } from "react";
import Navigation from "./components/Navigation";
import DiscoverySwipe from "./components/DiscoverySwipe";
import AICoach from "./components/AICoach";
import Onboarding from "./components/Onboarding";
import Welcome from "./components/Welcome";
import { generateRecommendations } from "./services/gemini";
import { DiscoveryItem, DiscoveryType, CollabRequest } from "./types";
import type { UserProfile } from "./types";
import McGillCourses from "./components/McGillCourses";

const ACCOUNTS_KEY = "uc_accounts";
const ACTIVE_ACCOUNT_KEY = "uc_active_account";
const GLOBAL_COLLABS_KEY = "uc_global_collabs";


const profileKey = (id: string) => `uc_profile_${id}`;
const heartsKey = (id: string) => `uc_hearted_${id}`;




type Account = { id: string; name: string; createdAt: number };

const makeAccountId = () =>
  `acc_${Date.now()}_${Math.random().toString(16).slice(2)}`;

const FACULTIES = [
  {
    id: "science",
    name: "Faculty of Science",
    courses: ["BIOL 111", "CHEM 110", "PHYS 131", "MATH 140", "COMP 202"],
  },
  {
    id: "arts",
    name: "Faculty of Arts",
    courses: ["PSYC 100", "SOCI 210", "HIST 201", "ECON 208", "POLI 244"],
  },
  {
    id: "eng",
    name: "Faculty of Engineering",
    courses: ["ECSE 202", "FACC 100", "MECH 210", "CIVE 205", "COMP 250"],
  },
  {
    id: "mgmt",
    name: "Desautels Management",
    courses: ["MGCR 211", "MGCR 222", "MGCR 341", "FINE 342", "ORGB 321"],
  },
];

const COLLAB_GOALS = [
  "Looking for a lab partner?",
  "Searching for a capstone team?",
  "Need a study group?",
  "Just browsing campus events?",
];

const CREATE_TYPES = [
  { id: DiscoveryType.COLLAB_REQUEST, label: "Collaboration Request" },
  { id: DiscoveryType.EVENT, label: "Event" },
  { id: DiscoveryType.CLUB, label: "Club / Org" },
  { id: DiscoveryType.NETWORKING, label: "Networking" },
] as const;


const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState("discover");


  const [showWelcome, setShowWelcome] = useState(true);
  const [onboardingComplete, setOnboardingComplete] = useState(false);

  const [accounts, setAccounts] = useState<Account[]>([]);
  const [activeAccountId, setActiveAccountId] = useState<string | null>(null);

  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isEditingProfile, setIsEditingProfile] = useState(false);

  const [newReqType, setNewReqType] = useState<DiscoveryType>(DiscoveryType.COLLAB_REQUEST);

const MAX_AVATAR_BYTES = 5_000_000; 

  const handleAvatarFile = (file: File | null) => {
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      alert("Please upload an image file (PNG/JPG/WebP).");
      return;
    }

    if (file.size > MAX_AVATAR_BYTES) {
      alert("That image is too large. Try one under ~5MB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      setUserProfile(prev => (prev ? { ...prev, avatar: dataUrl } : prev));
    };
    reader.onerror = () => alert("Could not read that file. Try another image.");
    reader.readAsDataURL(file);
  };


    const defaultImageFor = (t: DiscoveryType) => {
    switch (t) {
      case DiscoveryType.COLLAB_REQUEST:
      case DiscoveryType.PARTNER:
        return "https://images.unsplash.com/photo-1523240795612-9a054b0db644?auto=format&fit=crop&q=80&w=800";
      case DiscoveryType.EVENT:
        return "https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&q=80&w=800";
      case DiscoveryType.CLUB:
        return "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&q=80&w=800";
      case DiscoveryType.NETWORKING:
        return "https://images.unsplash.com/photo-1521791136064-7986c2920216?auto=format&fit=crop&q=80&w=800";
      default:
        return "https://images.unsplash.com/photo-1523240795612-9a054b0db644?auto=format&fit=crop&q=80&w=800";
    }
  };

  const [heartedItems, setHeartedItems] = useState<DiscoveryItem[]>([]);
  const [collabRequests, setCollabRequests] = useState<CollabRequest[]>([]);
  const [isCollabModalOpen, setIsCollabModalOpen] = useState(false);

  const [newReqTitle, setNewReqTitle] = useState("");
  const [newReqGoal, setNewReqGoal] = useState(COLLAB_GOALS[0]);
  const [newReqSize, setNewReqSize] = useState(2);

  const [newReqDescription, setNewReqDescription] = useState("");

  //olivia
  const [eventDate, setEventDate] = useState(""); // YYYY-MM-DD
  const [eventTime, setEventTime] = useState(""); // HH:MM


  const [recs, setRecs] = useState<{ title: string; reason: string }[]>([]);
  const [hasPersonalKey, setHasPersonalKey] = useState(false);

  useEffect(() => {
    const c = localStorage.getItem(GLOBAL_COLLABS_KEY);
    setCollabRequests(c ? JSON.parse(c) : []);

    const savedAccounts = localStorage.getItem(ACCOUNTS_KEY);
    const savedActive = localStorage.getItem(ACTIVE_ACCOUNT_KEY);

    const parsedAccounts: Account[] = savedAccounts ? JSON.parse(savedAccounts) : [];

    if (parsedAccounts.length === 0) {
      const id = makeAccountId();
      const defaultAcc: Account = {
        id,
        name: "New User",
        createdAt: Date.now(),
      };
      localStorage.setItem(ACCOUNTS_KEY, JSON.stringify([defaultAcc]));
      localStorage.setItem(ACTIVE_ACCOUNT_KEY, id);
      setAccounts([defaultAcc]);
      setActiveAccountId(id);
      return;
    }

    setAccounts(parsedAccounts);

    const activeId =
      savedActive && parsedAccounts.some((a) => a.id === savedActive)
        ? savedActive
        : parsedAccounts[0].id;

    setActiveAccountId(activeId);
    localStorage.setItem(ACTIVE_ACCOUNT_KEY, activeId);
  }, []);

  useEffect(() => {
    if (!activeAccountId) return;

    const p = localStorage.getItem(profileKey(activeAccountId));
    const h = localStorage.getItem(heartsKey(activeAccountId));
    const c = localStorage.getItem(GLOBAL_COLLABS_KEY);

    if (p) {
      setUserProfile(JSON.parse(p));
      setOnboardingComplete(true);
    } else {
      setUserProfile({
        id: activeAccountId,
        name: "New User",
        major: "",
        interests: [],
        bio: "Prospective high-achiever.",
        avatar: "",
        gpa: "3.8",
        skills: ["Python", "Teamwork", "Research"],
        experience: ["Research Assistant @ McGill", "Intern @ Shopify"],
      });
      setOnboardingComplete(false);
    }

    setHeartedItems(h ? JSON.parse(h) : []);
    setCollabRequests(c ? JSON.parse(c) : []);
  }, [activeAccountId, accounts]);

  useEffect(() => {
    const c = localStorage.getItem(GLOBAL_COLLABS_KEY);
    setCollabRequests(c ? JSON.parse(c) : []);
  }, []);

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === GLOBAL_COLLABS_KEY) {
        setCollabRequests(e.newValue ? JSON.parse(e.newValue) : []);
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);


  useEffect(() => {
  if (!userProfile || !activeAccountId) return;
  if (userProfile.id !== activeAccountId) return;

  setAccounts(prev => {
    const current = prev.find(a => a.id === activeAccountId);
    if (!current) return prev;

   
    if (current.name === userProfile.name) return prev;

    const updated = prev.map(acc =>
      acc.id === activeAccountId ? { ...acc, name: userProfile.name } : acc
    );

    localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(updated));
    return updated;
  });
}, [userProfile?.name, userProfile?.id, activeAccountId]);





  useEffect(() => {
    if (!activeAccountId || !userProfile) return;
    localStorage.setItem(profileKey(activeAccountId), JSON.stringify(userProfile));
  }, [activeAccountId, userProfile]);

  useEffect(() => {
    if (!activeAccountId) return;
    localStorage.setItem(heartsKey(activeAccountId), JSON.stringify(heartedItems));
  }, [activeAccountId, heartedItems]);

  useEffect(() => {
  localStorage.setItem(GLOBAL_COLLABS_KEY, JSON.stringify(collabRequests));
}, [collabRequests]);


  useEffect(() => {
    if (!userProfile) return;
    const fetchRecs = async () => {
      if (userProfile.interests.length > 0) {
        const suggestions = await generateRecommendations(userProfile.interests);
        setRecs(suggestions);
      }
    };
    if (activeTab === "community" && onboardingComplete) fetchRecs();
  }, [activeTab, onboardingComplete, userProfile]);

  const handleOnboardingComplete = (interests: string[], major: string) => {
    setUserProfile((prev) => (prev ? { ...prev, interests, major } : prev));
    setOnboardingComplete(true);
  };

  const handleHeart = (item: DiscoveryItem) => {
    if (!heartedItems.find((h) => h.id === item.id)) {
      setHeartedItems((prev) => [...prev, item]);
    }
  };


  {/* olivia */}
  const submitRequest = () => {
    if (!userProfile) return;

    const isEvent = newReqType === DiscoveryType.EVENT;
    const isCollab = newReqType === DiscoveryType.COLLAB_REQUEST;

    const title =
      newReqTitle ||
      (isCollab ? newReqGoal : isEvent ? "New Event" : "New Broadcast");

    const description = isEvent
      ? (newReqDescription?.trim() || `Event posted by ${userProfile.name}.`)
      : isCollab
        ? `Project request by ${userProfile.name}. Target team size: ${newReqSize}.`
        : `Posted by ${userProfile.name}.`;

        {/* olivia */}
    const newItem: CollabRequest = {
      id: `req_${Date.now()}`,
      type: newReqType,
      title,
      description,
      tags: [userProfile.major, "Collaboration"],
      creatorId: userProfile.id,
      creatorName: userProfile.name,
      creatorAvatar: userProfile.avatar || "",
      participants: [],
      image: defaultImageFor(newReqType),

      targetGroupSize: isCollab ? newReqSize : undefined,

      eventDate: isEvent ? eventDate : undefined,
      eventTime: isEvent ? eventTime : undefined,
    };

    setCollabRequests((prev) => [newItem, ...prev]);

    // reset modal state
    setIsCollabModalOpen(false);
    setNewReqTitle("");
    setNewReqDescription("");
    setEventDate("");
    setEventTime("");
    setNewReqType(DiscoveryType.COLLAB_REQUEST);
    setActiveTab("discover");
  };


  const onToggleInterested = (requestId: string) => {
    if (!activeAccountId) return;

    setCollabRequests((prev) => {
      const next = prev.map((r) => {
        if (r.id !== requestId) return r;

        const participants = Array.isArray(r.participants) ? r.participants : [];
        const already = participants.includes(activeAccountId);

        return {
          ...r,
          participants: already
            ? participants.filter((id) => id !== activeAccountId)
            : [...participants, activeAccountId],
        };
      });

      localStorage.setItem(GLOBAL_COLLABS_KEY, JSON.stringify(next));
      return next;
    });
  };

  const toggleArrayItem = (
    field: "skills" | "experience",
    index: number,
    value: string
  ) => {
    setUserProfile((prev) => {
      if (!prev) return prev;
      const updated = [...prev[field]];
      updated[index] = value;
      return { ...prev, [field]: updated };
    });
  };

  const addArrayItem = (field: "skills" | "experience") => {
    setUserProfile((prev) => (prev ? { ...prev, [field]: [...prev[field], ""] } : prev));
  };

  const removeArrayItem = (field: "skills" | "experience", index: number) => {
    setUserProfile((prev) =>
      prev ? { ...prev, [field]: prev[field].filter((_, i) => i !== index) } : prev,
    );
  };

  const handleUpdateKey = async () => {
    if ((window as any).aistudio?.openSelectKey) {
      await (window as any).aistudio.openSelectKey();
      setHasPersonalKey(true);
    }
  };

  {/* Olivia */}
  const needsDetails =
    newReqType === DiscoveryType.EVENT ||
    newReqType === DiscoveryType.NETWORKING ||
    newReqType === DiscoveryType.CLUB;




  if (showWelcome) {
    return (
      <Welcome
        onStart={() => {
          setShowWelcome(false);
          setActiveTab("discover");
        }}
      />
    );
  }

  if (!userProfile) return null;
  if (!onboardingComplete) return <Onboarding onComplete={handleOnboardingComplete} />;

  const renderContent = () => {
    switch (activeTab) {
      case "discover":
        return (
          <div className="h-full flex flex-col items-start p-6 lg:p-12 animate-in fade-in zoom-in-95 duration-500">
            <header className="w-full mb-6 px-8 py-6 text-left">
              <span className="text-xs font-black text-white/80 uppercase tracking-[0.3em] mb-2 block">
                Discovery
              </span>
              <h1 className="text-4xl lg:text-5xl font-black text-white tracking-tight">
                Connect with McGill
              </h1>
            </header>

            <div className="w-full flex-1">
              <DiscoverySwipe
                onHeart={handleHeart}
                externalItems={collabRequests}
                userInterests={userProfile.interests}
                onToggleInterested={onToggleInterested}
              />
            </div>
          </div>
        );
      case "coach":
        return <AICoach heartedItems={heartedItems} />;
      case "community":
        return (
          <div className="p-6 lg:p-12 pb-32 animate-in fade-in duration-500 max-w-6xl mx-auto">
            <header className="mb-12">
              <span className="text-xs font-bold text-mcgill-red uppercase tracking-[0.3em] mb-2 block">
                Your Hub
              </span>
              <h2 className="text-4xl lg:text-5xl font-black text-slate-900 tracking-tight">
                McGill Communities
              </h2>
            </header>

            <div className="bg-mcgill-red rounded-[3rem] p-10 lg:p-16 text-white relative overflow-hidden shadow-2xl shadow-red-100">
              <div className="relative z-10 grid lg:grid-cols-2 gap-12 items-center">
                <div>
                  <h3 className="text-3xl lg:text-5xl font-black mb-6 leading-[1.1]">
                    Personalized suggestions for {userProfile.major} students.
                  </h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-16">
                  {[
                    { name: "SSMU Club Fair", type: "Event", date: "Sept 14", color: "bg-indigo-500" },
                    { name: "McGill Outdoors Club", type: "Community", date: "Active Now", color: "bg-emerald-500" },
                    { name: "Gerts Student Bar", type: "Venue", date: "Open 4pm", color: "bg-amber-500" },
                    { name: "Desautels Networking", type: "Career", date: "Oct 02", color: "bg-rose-500" },
                    { name: "Redpath Study Group", type: "Academic", date: "Ongoing", color: "bg-sky-500" },
                    { name: "Daily Martlet Fans", type: "Athletics", date: "Saturday", color: "bg-mcgill-red" },
                  ].map((item) => (
                    <div
                      key={item.name}
                      className="group bg-white p-6 rounded-[2.5rem] shadow-sm border border-slate-50 hover:shadow-xl hover:shadow-slate-100 transition-all cursor-pointer"
                    >
                      <div
                        className={`w-14 h-14 rounded-2xl flex items-center justify-center text-white font-black text-xl mb-6 shadow-lg ${item.color}`}
                      >
                        {item.name[0]}
                      </div>
                      <h4 className="text-xl font-bold text-slate-900 mb-1">{item.name}</h4>
                      <div className="flex items-center justify-between">
                        <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">
                          {item.type}
                        </p>
                        <span className="text-[10px] font-black text-mcgill-red bg-red-50 px-2 py-1 rounded-full">
                          {item.date}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="space-y-4">
                  {recs.map((rec, i) => (
                    <div
                      key={i}
                      className="bg-white p-6 rounded-[2rem] border border-white/10 shadow-lg"
                    >
                      <h4 className="font-bold text-slate-900 text-lg mb-2">{rec.title}</h4>
                      <p className="text-sm text-slate-500 leading-relaxed font-medium">{rec.reason}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        );

      case "calendar":
        return (
          <div className="p-6 lg:p-12 pb-32 animate-in fade-in duration-500">
            <header className="mb-12 max-w-6xl mx-auto">
              <span className="text-xs font-bold text-white uppercase tracking-[0.3em] mb-2 block">
                Your Schedule
              </span>
              <h2 className="text-4xl lg:text-5xl font-black text-white tracking-tight">
                Event Calendar
              </h2>
            </header>
            <Calendar savedItems={heartedItems} allItems={collabRequests} onSaveItem={handleHeart} />
          </div>
        );

      case "courses":
        return (
          <McGillCourses
            userProfile={userProfile} // #mariam
            activeAccountId={activeAccountId!} // #mariam
          />
        ); // #mariam

      case "profile":
        return (
          <div className="p-8 lg:p-16 pb-32 max-w-6xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="grid lg:grid-cols-3 gap-12">
              <div className="bg-white rounded-[3.5rem] shadow-xl shadow-slate-100/50 p-10 border border-slate-50 text-center flex flex-col items-center h-fit sticky top-12">
                <div className="mb-8 relative">
                  <div className="w-32 h-32 rounded-full border-[6px] border-slate-50 shadow-2xl overflow-hidden bg-slate-100">
                    <img
                      src={
                        userProfile.avatar?.trim()
                          ? userProfile.avatar
                          : `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(
                              userProfile.name || "McGill Student"
                            )}`
                      }
                      alt="Profile" 
                      className="w-full h-full object-cover"
                    />

                  </div>
                </div>

                {isEditingProfile ? (
                  <div className="w-full space-y-4">
                    <div>
                      <label className="block text-[10px] font-black text-slate-400 uppercase text-left mb-1 ml-2">
                        Name
                      </label>
                      <input
                        value={userProfile.name}
                        onChange={(e) => setUserProfile({ ...userProfile, name: e.target.value })}
                        className="w-full p-3 bg-slate-50 rounded-xl font-bold"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-black text-slate-400 uppercase text-left mb-1 ml-2">
                        GPA
                      </label>
                      <input
                        value={userProfile.gpa}
                        onChange={(e) => setUserProfile({ ...userProfile, gpa: e.target.value })}
                        className="w-full p-3 bg-slate-50 rounded-xl font-bold"
                        placeholder="e.g. 4.0"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-black text-slate-400 uppercase text-left mb-1 ml-2">
                        Profile picture
                      </label>

                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleAvatarFile(e.target.files?.[0] ?? null)}
                        className="w-full p-3 bg-slate-50 rounded-xl font-bold"
                      />

                      <button
                        type="button"
                        onClick={() =>
                          setUserProfile((prev) => (prev ? { ...prev, avatar: "" } : prev))
                        }
                        className="w-full mt-3 py-3 bg-white border border-slate-200 rounded-xl text-[9px] font-black text-slate-400 hover:text-mcgill-red hover:border-mcgill-red transition-all uppercase"
                      >
                        Remove photo
                      </button>
                    </div>

                      <button
                        onClick={() => setIsEditingProfile(false)}
                        className="w-full py-4 bg-mcgill-red text-white rounded-2xl font-black uppercase text-xs shadow-lg"
                      >
                        Save Profile
                      </button>
                    </div>
                  ) : (

                    <>
                      <h2 className="text-3xl font-black text-slate-900 tracking-tight mb-1">
                        {userProfile.name}
                      </h2>
                      <p className="text-mcgill-red font-black text-sm uppercase tracking-widest mb-2">
                        {userProfile.major}
                      </p>
                      <p className="text-slate-400 font-bold text-xs mb-8 italic">
                        GPA: {userProfile.gpa}
                      </p>
                      <button
                        onClick={() => setIsEditingProfile(true)}
                        className="px-8 py-3 bg-slate-100 rounded-full text-[10px] font-black uppercase tracking-widest text-slate-500 hover:bg-slate-200 transition-all"
                      >
                        Edit Experience & Stats
                      </button>
                    </>
                  )}

                <div className="mt-8 w-full p-5 bg-slate-50 rounded-3xl border border-slate-100">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                      AI Connection
                    </span>
                    <div
                      className={`w-2 h-2 rounded-full ${
                        hasPersonalKey ? "bg-green-500" : "bg-amber-400"
                      } animate-pulse`}
                    />
                  </div>
                  <p className="text-[10px] text-slate-500 font-medium mb-3 text-left">
                    {hasPersonalKey
                      ? "Connected via Personal Key (Priority Access)"
                      : "Connected via Campus Shared Key"}
                  </p>
                  <button
                    onClick={handleUpdateKey}
                    className="w-full py-2 bg-white border border-slate-200 rounded-xl text-[9px] font-black text-slate-400 hover:text-mcgill-red hover:border-mcgill-red transition-all uppercase"
                  >
                    {hasPersonalKey ? "Manage Key" : "Connect Personal Key"}
                  </button>
                </div>

                <div className="mt-12 w-full space-y-8 text-left">
                  <div>
                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 flex justify-between items-center">
                      Experience
                      {isEditingProfile && (
                        <button onClick={() => addArrayItem("experience")} className="text-mcgill-red font-black text-lg">
                          +
                        </button>
                      )}
                    </h4>
                    <div className="space-y-2">
                      {userProfile.experience.map((exp, i) => (
                        <div key={i} className="flex gap-2">
                          {isEditingProfile ? (
                            <input
                              value={exp}
                              onChange={(e) => toggleArrayItem("experience", i, e.target.value)}
                              className="flex-1 p-3 bg-slate-50 rounded-xl text-xs font-medium border border-slate-100"
                            />
                          ) : (
                            <div className="flex-1 p-4 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-medium text-slate-600">
                              {exp}
                            </div>
                          )}
                          {isEditingProfile && (
                            <button onClick={() => removeArrayItem("experience", i)} className="text-slate-200 hover:text-red-500">
                              ×
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 flex justify-between items-center">
                      Skills
                      {isEditingProfile && (
                        <button onClick={() => addArrayItem("skills")} className="text-mcgill-red font-black text-lg">
                          +
                        </button>
                      )}
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {userProfile.skills.map((skill, i) => (
                        <div key={i} className="flex items-center gap-1">
                          {isEditingProfile ? (
                            <input
                              value={skill}
                              onChange={(e) => toggleArrayItem("skills", i, e.target.value)}
                              className="w-20 p-2 bg-slate-50 rounded-lg text-[9px] font-black"
                            />
                          ) : (
                            <span className="px-3 py-1.5 bg-slate-900 text-white text-[9px] font-black rounded-lg uppercase tracking-wider">
                              {skill}
                            </span>
                          )}
                          {isEditingProfile && (
                            <button onClick={() => removeArrayItem("skills", i)} className="text-slate-300">
                              ×
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="lg:col-span-2 space-y-8">
                <div className="bg-white rounded-[3rem] p-10 shadow-sm border border-slate-50">
                  <h3 className="text-2xl font-black text-slate-900 mb-8 flex items-center gap-4">
                    <span className="bg-mcgill-red text-white p-2 rounded-xl text-lg">❤️</span>
                    Saved & Hearted
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {heartedItems.length > 0 ? (
                      heartedItems.map((item) => (
                        <div
                          key={item.id}
                          className="p-6 bg-slate-50 rounded-3xl border border-slate-100 flex flex-col justify-between group relative overflow-hidden"
                        >
                          <div className="mb-4">
                            <span className="text-[9px] font-black text-mcgill-red uppercase tracking-widest mb-1 block">
                              {item.type}
                            </span>
                            <h5 className="font-bold text-slate-900">{item.title}</h5>
                          </div>
                          <button
                            onClick={() =>
                              setHeartedItems((prev) =>
                                prev.filter((h) => h.id !== item.id),
                              )
                            }
                            className="mt-4 text-[10px] font-bold text-slate-400 hover:text-red-500 transition-colors uppercase tracking-widest"
                          >
                            Unsave
                          </button>
                        </div>
                      ))
                    ) : (
                      <div className="col-span-full py-12 text-center text-slate-400 italic">
                        No hearted items yet. Swipe right on Discover!
                      </div>
                    )}
                  </div>
                </div>

                <div className="bg-white rounded-[3rem] p-10 shadow-sm border border-slate-50">
                  <h3 className="text-2xl font-black text-slate-900 mb-8 flex items-center gap-4">
                    <span className="bg-indigo-600 text-white p-2 rounded-xl text-lg">📡</span>
                    Your Campus Broadcasts
                  </h3>

                  <div className="space-y-4">
                    {collabRequests.filter((r) => r.creatorId === userProfile.id).length > 0 ? (
                      collabRequests
                        .filter((r) => r.creatorId === userProfile.id)
                        .map((req) => (
                          <div
                            key={req.id}
                            className="p-6 bg-slate-50 rounded-3xl border border-slate-100 flex items-center justify-between"
                          >
                            <div>
                              <h5 className="font-bold text-slate-900 text-lg mb-1">
                                {req.title}
                              </h5>
                              <p className="text-xs text-slate-500 font-bold">
                                By {req.creatorName ?? "Unknown"}
                              </p>

                              <div className="flex items-center gap-4">
                                <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">
                                  {req.participants.length} / {req.targetGroupSize} Interested
                                </p>
                                {req.participants.length > 0 && (
                                  <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                                )}
                              </div>
                            </div>
                            <button
                              onClick={() => setCollabRequests((prev) => prev.filter((r) => r.id !== req.id))}
                              className="text-slate-300 hover:text-red-500 transition-colors"
                            >
                              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth="2.5"
                                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                                ></path>
                              </svg>
                            </button>
                          </div>
                        ))
                    ) : (
                      <div className="py-12 text-center text-slate-400 italic font-medium">
                        You haven't sent any broadcasts. Click the + button below to start!
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        );

      default:
        return (
          <DiscoverySwipe
            userInterests={userProfile.interests}
            onHeart={handleHeart}
            externalItems={collabRequests}
            onToggleInterested={onToggleInterested}
          />
        );
    }
  };

  






  return (
    <div className="min-h-screen lg:flex bg-gradient-to-br from-[#6A0B17] via-[#B5122A] to-[#ED1B2F]">
      <Navigation
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        accounts={accounts}
        activeAccountId={activeAccountId}
        setActiveAccountId={(id) => {
          setActiveAccountId(id);
          localStorage.setItem(ACTIVE_ACCOUNT_KEY, id);
          setActiveTab("discover");
          setShowWelcome(true);
        }}
        onCreateAccount={() => {
          const id = makeAccountId();
          const newAcc = { id, name: "New User", createdAt: Date.now() };
          const next = [newAcc, ...accounts];

          setAccounts(next);
          localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(next));

          setActiveAccountId(id);
          localStorage.setItem(ACTIVE_ACCOUNT_KEY, id);

          setShowWelcome(true);
          setOnboardingComplete(false);
          setActiveTab("discover");
        }}
      />

      <main className="flex-1 min-h-screen lg:ml-0 overflow-y-auto relative bg-transparent">
        {renderContent()}

        <button
          onClick={() => setIsCollabModalOpen(true)}
          className="fixed bottom-8 right-8 w-16 h-16 bg-mcgill-red text-white rounded-full shadow-[0_20px_50px_rgba(237,27,47,0.3)] flex items-center justify-center hover:scale-110 active:scale-95 transition-all z-40 group"
        >
          <svg
            className="w-10 h-10 group-hover:rotate-90 transition-transform duration-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M12 4v16m8-8H4"></path>
          </svg>
          <span className="absolute right-24 bg-slate-900 text-white px-6 py-3 rounded-2xl text-xs font-black uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none shadow-xl">
            New Broadcast
          </span>
        </button>

        {isCollabModalOpen && (
          <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-md z-[110] flex items-center justify-center p-6">
            <div className="bg-white w-full max-w-xl rounded-[4rem] p-12 lg:p-16 shadow-2xl animate-in fade-in zoom-in-95 duration-300">
              {/* ... your existing modal code stays the same ... */}
              {/* (No changes needed for the swipe-avatar feature) */}
              <div className="flex justify-between items-center mb-10">
                <div>
                  <span className="text-xs font-black text-mcgill-red uppercase tracking-widest mb-1 block">
                    Campus Broadcast
                  </span>
                  <h3 className="text-3xl font-black text-slate-900 tracking-tighter">
                    New Collaboration
                  </h3>
                </div>
                <button
                  onClick={() => setIsCollabModalOpen(false)}
                  className="text-slate-200 hover:text-slate-900 transition-colors"
                >
                  <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12"></path>
                  </svg>
                </button>
              </div>

              <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">
                Broadcast Type
              </label>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {CREATE_TYPES.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setNewReqType(t.id)}
                    className={`p-4 rounded-2xl text-left text-[10px] font-black transition-all border-2 ${
                      newReqType === t.id
                        ? "border-mcgill-red bg-red-50 text-mcgill-red shadow-md"
                        : "border-slate-50 bg-slate-50 text-slate-500 hover:border-slate-100"
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>



              {/* olivia */}

              {/* Broadcast Name (shown for ALL types) */}
              <div className="mt-10">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">
                  Broadcast Name
                </label>
                <input
                  value={newReqTitle}
                  onChange={(e) => setNewReqTitle(e.target.value)}
                  placeholder={
                    newReqType === DiscoveryType.EVENT
                      ? "e.g. Redpath Study Jam"
                      : newReqType === DiscoveryType.CLUB
                        ? "e.g. McGill Robotics Club"
                        : newReqType === DiscoveryType.NETWORKING
                          ? "e.g. Google Networking Night"
                          : "e.g. Capstone Teammates Needed"
                  }
                  className="w-full p-5 bg-slate-50 border-2 border-slate-50 rounded-3xl font-bold outline-none focus:border-red-100 transition-all"
                />
              </div>




              <div className="mt-12 space-y-10">

              </div>
              {newReqType === DiscoveryType.COLLAB_REQUEST && (
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">
                  What's the goal?
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {COLLAB_GOALS.map((g) => (
                    <button
                      key={g}
                      type="button"
                      onClick={() => setNewReqGoal(g)}
                      className={`p-4 rounded-2xl text-left text-[10px] font-black transition-all border-2 ${
                        newReqGoal === g
                          ? "border-mcgill-red bg-red-50 text-mcgill-red shadow-md"
                          : "border-slate-50 bg-slate-50 text-slate-500 hover:border-slate-100"
                      }`}
                    >
                      {g}
                    </button>
                  ))}
                </div>
              </div>
            )}

                {/* olivia */}
                {needsDetails && (
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">
                    Event Description
                  </label>
                  <textarea
                    value={newReqDescription}
                    onChange={(e) => setNewReqDescription(e.target.value)}
                    placeholder="What’s happening? Where should people meet? Anything to bring?"
                    className="w-full p-6 bg-slate-50 border-2 border-slate-50 rounded-3xl font-bold text-base outline-none focus:border-red-100 transition-all min-h-[120px]"
                  />
                </div>
              )}


              {/* olivia */}
              {needsDetails && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">
                    Date
                  </label>
                  <input
                    type="date"
                    value={eventDate}
                    onChange={(e) => setEventDate(e.target.value)}
                    className="w-full p-5 bg-slate-50 border-2 border-slate-50 rounded-3xl font-bold outline-none focus:border-red-100 transition-all"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">
                    Time
                  </label>
                  <input
                    type="time"
                    value={eventTime}
                    onChange={(e) => setEventTime(e.target.value)}
                    className="w-full p-5 bg-slate-50 border-2 border-slate-50 rounded-3xl font-bold outline-none focus:border-red-100 transition-all"
                  />
                </div>
              </div>
            )}


                {/* olivia */}
                {newReqType === DiscoveryType.COLLAB_REQUEST && (
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">
                    Target Team Size
                  </label>
                  <div className="flex gap-4">
                    {[2, 3, 4, 5, 6].map((n) => (
                      <button
                        key={n}
                        type="button"
                        onClick={() => setNewReqSize(n)}
                        className={`w-14 h-14 rounded-2xl font-black text-xl transition-all ${
                          newReqSize === n
                            ? "bg-mcgill-red text-white shadow-xl"
                            : "bg-slate-50 text-slate-400 hover:bg-slate-100"
                        }`}
                      >
                        {n}
                      </button>
                    ))}
                  </div>
                </div>
              )}


                <button
                  onClick={submitRequest}
                  className="w-full mt-10 py-6 bg-slate-900 text-white font-black text-lg rounded-[2.5rem] shadow-2xl hover:bg-slate-800 transition-all transform active:scale-95"
                >
                  Send Broadcast
                </button>
              </div>
            </div>
        )}
      </main>
    </div>
  );
};

export default App;
