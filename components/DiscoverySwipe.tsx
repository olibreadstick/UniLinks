import React, { useState, useEffect } from "react";
import { DiscoveryItem, DiscoveryType } from "../types";
import { getMatchReason } from "../services/gemini";
import HandshakeIcon from "../handshake.png";

const CATEGORIES = [
  { id: "all", label: "All Discovery", icon: "" },
  { id: "collabs", label: "Collaboration Requests", icon: "" },
  { id: "courses", label: "Courses & Study", icon: "" },
  { id: "clubs", label: "Clubs & Orgs", icon: "" },
  { id: "events", label: "Events & Parties", icon: "" },
  { id: "networking", label: "Networking", icon: "" },
];

const SUBCATEGORIES = [
  { id: "hackathon", label: "Hackathons", parent: "events" },
  { id: "frosh", label: "Frosh", parent: "events" },
  { id: "lab", label: "Lab Partners", parent: "courses" },
  { id: "capstone", label: "Capstone", parent: "courses" },
  { id: "internship", label: "Internships", parent: "networking" },
  { id: "full-time", label: "Full-time", parent: "networking" },
];

const MOCK_DATA: DiscoveryItem[] = [
  {
    id: "1",
    type: DiscoveryType.EVENT,
    title: "Hack McWICS 2026",
    description: "Come apply your coding skills!",
    image:
      "https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&q=80&w=800",
    tags: ["Tech", "Hackathon"],
    metadata: { date: "2026-02-14", organizer: "McWICS" },
    company: "McWICS",
    date: "2026-02-14",
  },
  {
    id: "2",
    type: DiscoveryType.PARTNER,
    title: "Sarah Desautels",
    description: "Looking for a study lead for MGCR 341. Coffee is on me!",
    image:
      "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=800",
    tags: ["Management", "Lab Partner"],
    creator: {
      id: "u123",
      name: "Sarah Desautels",
      major: "Management",
      interests: ["Leadership", "Study Groups"],
      bio: "Third-year student looking for study partners.",
      avatar:
        "https://images.unsplash.com/photo-1545996124-1b9d7b0a7f22?auto=format&fit=crop&q=80&w=400",
      gpa: "3.8",
      skills: ["coordination"],
      experience: [],
    },
  },
  {
    id: "n1",
    type: DiscoveryType.NETWORKING,
    title: "Google Cloud Canada",
    description:
      "Hiring Cloud Engineering Interns for the Montreal office. Open to CS and SoftEng students.",
    image:
      "https://images.unsplash.com/photo-1573164713988-8665fc963095?auto=format&fit=crop&q=80&w=800",
    tags: ["Networking", "Internship", "Tech"],
    company: "Google Cloud Canada",
    date: "2026-02-20",
  },
  {
    id: "n2",
    type: DiscoveryType.NETWORKING,
    title: "CIBC",
    description:
      "Connect with CIBC professionals in technology, finance, and analytics roles.",
    image:
      "https://images.unsplash.com/photo-1554224154-22dec7ec8818?auto=format&fit=crop&q=80&w=800",
    tags: ["Networking", "Finance", "Internship"],
    company: "CIBC",
    date: "2026-02-21",
  },
  {
    id: "n3",
    type: DiscoveryType.NETWORKING,
    title: "Bombardier",
    description:
      "Explore engineering and aerospace career opportunities with Bombardier.",
    image:
      "https://images.unsplash.com/photo-1521791136064-7986c2920216?auto=format&fit=crop&q=80&w=800",
    tags: ["Networking", "Engineering", "Full-time"],
    date: "2026-02-25",
  },
  {
    id: "3",
    type: DiscoveryType.CLUB,
    title: "The McGill Daily",
    description: "Help us write the stories that shape our campus culture.",
    image:
      "https://images.unsplash.com/photo-1504711434969-e33886168f5c?auto=format&fit=crop&q=80&w=800",
    tags: ["Journalism", "Arts"],
    date: "2026-02-10",
  },
  {
    id: "n4",
    type: DiscoveryType.NETWORKING,
    title: "Matrox",
    description:
      "Montreal-based tech company specializing in video, graphics, and embedded systems. Hiring software and hardware interns.",
    image:
      "https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&q=80&w=800",
    tags: ["Networking", "Software", "Hardware", "Internship"],
    company: "Matrox",
    date: "2026-02-17",
  },
];

interface DiscoverySwipeProps {
  onHeart?: (item: DiscoveryItem) => void;
  externalItems?: DiscoveryItem[];
  userInterests: string[];
  onToggleInterested: (requestId: string) => void;
}

const DiscoverySwipe: React.FC<DiscoverySwipeProps> = ({
  onHeart,
  externalItems = [],
  userInterests,
  onToggleInterested,
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [swipeDir, setSwipeDir] = useState<"left" | "right" | null>(null);
  const [matchReason, setMatchReason] = useState<string>("");
  const [activeCat, setActiveCat] = useState("all");
  const [activeSub, setActiveSub] = useState<string | null>(null);

  const [modalOpen, setModalOpen] = useState(false);

  
  const [modalSubject, setModalSubject] = useState<{
    type: "profile" | "company" | "event";
    id: string | null;
    name?: string;
  } | null>(null);

  const openSubjectModal = (
    type: "profile" | "company" | "event",
    id: string | null,
    name?: string,
  ) => {
    setModalSubject({ type, id, name });
    setModalOpen(true);
  };
  const closeModal = () => {
    setModalOpen(false);
    setModalSubject(null);
  };

  const combinedData = [...MOCK_DATA, ...externalItems];

  const filteredData = combinedData.filter((item) => {
    if (activeCat === "all" && !activeSub) return true;
    const matchesCat =
      activeCat === "collabs"
        ? item.type === DiscoveryType.COLLAB_REQUEST
        : activeCat === "courses"
          ? item.type === DiscoveryType.PARTNER ||
            item.type === DiscoveryType.COURSE ||
            item.type === DiscoveryType.COLLAB_REQUEST
          : activeCat === "clubs"
            ? item.type === DiscoveryType.CLUB
            : activeCat === "events"
              ? item.type === DiscoveryType.EVENT
              : activeCat === "networking"
                ? item.type === DiscoveryType.NETWORKING
                : true;

    if (activeSub) {
      return item.tags.some((t) => t.toLowerCase() === activeSub.toLowerCase());
    }
    return matchesCat;
  });

  const currentItem =
    filteredData[currentIndex % (filteredData.length || 1)] || combinedData[0];

  const authorName =
  (currentItem as any)?.creatorName || currentItem.creator?.name;

const authorAvatar =
  (currentItem as any)?.creatorAvatar || currentItem.creator?.avatar;

const authorMajor =
  (currentItem as any)?.creatorMajor || currentItem.creator?.major;

const hasAuthor = Boolean(authorName);



  const eventDateRaw =
    currentItem?.date ||
    currentItem?.metadata?.date ||
    currentItem?.metadata?.startDate;
  const formattedEventDate = eventDateRaw
    ? new Date(eventDateRaw).toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : null;

  useEffect(() => {
    const fetchReason = async () => {
      setMatchReason("Scanning McGill records...");
      const reason = await getMatchReason(currentItem.title, userInterests);
      setMatchReason(reason || "");
    };
    if (filteredData.length > 0) fetchReason();
  }, [currentIndex, activeCat, activeSub, userInterests]);

  const handleSwipe = (direction: "left" | "right") => {
    if (direction === "right") {
      onToggleInterested(currentItem.id);
    }
    if (direction === "right" && onHeart) {
      onHeart(currentItem);
    }
    setSwipeDir(direction);
    setTimeout(() => {
      setSwipeDir(null);
      setCurrentIndex((prev) => prev + 1);
    }, 300);
  };

  return (
    <div className="relative w-full min-h-screen flex flex-col items-center justify-start py-6 overflow-hidden bg-transparent">
      <div className="w-full mb-8 px-4 overflow-x-auto">
        <div className="flex gap-4 min-w-max pb-2">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              onClick={() => {
                setActiveCat(cat.id);
                setActiveSub(null);
              }}
              className={`px-6 py-3 rounded-2xl font-bold text-sm transition-all whitespace-nowrap flex items-center gap-2 ${
                activeCat === cat.id
                  ? "bg-mcgill-red text-white shadow-lg"
                  : "bg-white border border-slate-100 text-slate-500 hover:bg-slate-50"
              }`}
            >
              <span>{cat.icon}</span>
              {cat.label}
            </button>
          ))}
        </div>
        {activeCat !== "all" && (
          <div className="flex gap-2 mt-4 animate-in fade-in slide-in-from-top-2 duration-300">
            {SUBCATEGORIES.filter((s) => s.parent === activeCat).map((sub) => (
              <button
                key={sub.id}
                onClick={() =>
                  setActiveSub(activeSub === sub.id ? null : sub.id)
                }
                className={`px-4 py-2 rounded-xl font-bold text-xs transition-all ${
                  activeSub === sub.id
                    ? "bg-slate-900 text-white"
                    : "bg-slate-100 text-slate-500 hover:bg-slate-200"
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
          <div
            className={`relative w-full aspect-[16/9] rounded-[3.5rem] overflow-hidden shadow-2xl transition-all duration-500 ease-out bg-transparent ${
              swipeDir === "left"
                ? "-translate-x-full opacity-0 -rotate-12 scale-90"
                : swipeDir === "right"
                  ? "translate-x-full opacity-0 rotate-12 scale-90"
                  : "translate-x-0 scale-100"
            }`}
          >
            <img
              src={
                currentItem.image ||
                "https://images.unsplash.com/photo-1523240795612-9a054b0db644?auto=format&fit=crop&q=80&w=800"
              }
              alt={currentItem.title}
              className="absolute inset-0 w-full h-full object-cover grayscale-[0.2] hover:grayscale-0 transition-all duration-700"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-900/95 via-slate-900/30 to-transparent" />

            <div className="absolute top-8 left-8">
              <span className="px-5 py-2 bg-white/20 backdrop-blur-xl border border-white/20 text-white text-[10px] font-black uppercase rounded-full tracking-[0.2em]">
                {currentItem.type.replace("_", " ")}
              </span>
            </div>

            <div className="absolute top-8 right-8 flex items-center gap-3">
              {hasAuthor ? (
                <button
                  onClick={() =>
                    openSubjectModal(
                      "profile",
                      (currentItem as any).creatorId || currentItem.creator?.id || null,
                      authorName
                    )
                  }
                  className="flex items-center gap-3 bg-white/10 backdrop-blur-md rounded-full px-3 py-2 border border-white/10 hover:scale-105 transition-transform"
                >
                  <img
                    src={
                      authorAvatar?.trim()
                        ? authorAvatar
                        : `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(
                            authorName || "Student"
                          )}`
                    }
                    alt={authorName}
                    className="w-10 h-10 rounded-full object-cover"
                  />
                  <div className="text-right">
                    <div className="text-sm font-black text-white">{authorName}</div>
                    <div className="text-[10px] text-slate-200">
                      {authorMajor || "McGill Student"}
                    </div>
                  </div>
                </button>
              ) : (
                <button
                  onClick={() =>
                    openSubjectModal(
                      "company",
                      currentItem.company || currentItem.id,
                      currentItem.company || currentItem.title
                    )
                  }
                  className="flex items-center gap-3 bg-white/10 backdrop-blur-md rounded-full px-3 py-2 border border-white/10 hover:scale-105 transition-transform"
                >
                  <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center text-white font-black">
                    {(currentItem.company || currentItem.title || "")
                      .slice(0, 2)
                      .toUpperCase()}
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-black text-white">
                      {currentItem.company || currentItem.title}
                    </div>
                    <div className="text-[10px] text-slate-200">
                      {currentItem.metadata?.organizer || ""}
                    </div>
                  </div>
                </button>
              )}
            </div>

            <div className="absolute bottom-0 left-0 p-10 lg:p-12 text-white w-full">
              <h3 className="text-4xl lg:text-5xl font-black mb-4 leading-tight tracking-tighter">
                {currentItem.title}
              </h3>
              <p className="text-lg text-slate-300 mb-2 font-medium italic opacity-90 leading-relaxed">
                "{currentItem.description}"
              </p>

              {formattedEventDate && (
                <button
                  onClick={() =>
                    openSubjectModal("event", currentItem.id, currentItem.title)
                  }
                  className="inline-block bg-white/10 text-white px-3 py-2 rounded-xl font-bold text-sm mb-6 hover:opacity-90 transition-opacity"
                >
                  {formattedEventDate}
                </button>
              )}
              <div className="mb-6" />

              <div className="bg-white/10 backdrop-blur-xl border border-white/10 rounded-3xl p-6 mb-8 transform hover:scale-[1.02] transition-transform">
                <p className="text-[10px] font-black text-red-400 uppercase tracking-[0.3em] mb-3 flex items-center gap-3">
                  <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                  UniMatch Intel
                </p>
                <p className="text-sm text-white leading-relaxed font-bold">
                  {matchReason}
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                {currentItem.tags.map((tag) => (
                  <span
                    key={tag}
                    className="text-[10px] bg-white text-red-700 font-black px-4 py-1.5 rounded-full uppercase tracking-tighter shadow-lg"
                  >
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
              onClick={() => handleSwipe("left")}
              className="w-20 h-20 rounded-full bg-white shadow-2xl flex items-center justify-center text-slate-300 hover:text-red-500 hover:scale-110 active:scale-90 transition-all border border-slate-50 group"
            >
              <svg
                className="w-8 h-8 group-hover:rotate-12 transition-transform"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="3"
                  d="M6 18L18 6M6 6l12 12"
                ></path>
              </svg>
            </button>
            <button
              onClick={() => handleSwipe("right")}
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
          <h4 className="text-2xl font-black text-slate-900 mb-2">
            Feed Completed
          </h4>
          <p className="text-slate-500">
            Check back later for more McGill connections.
          </p>
        </div>
      )}
      {modalOpen && modalSubject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-black/60" onClick={closeModal} />
          <div className="relative z-60 max-w-3xl w-full bg-white rounded-2xl shadow-2xl overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex items-start justify-between gap-4">
              <div>
                <h4 className="text-lg font-black text-slate-900">
                  {modalSubject.name || modalSubject.type}
                </h4>
                <p className="text-sm text-slate-500">
                  {modalSubject.type.toUpperCase()}
                </p>
              </div>
              <button
                onClick={closeModal}
                className="text-slate-400 hover:text-slate-700"
              >
                ✕
              </button>
            </div>
            <div className="p-6">
              {modalSubject.type === "profile" &&
                (() => {
                  const creator = combinedData.find(
                    (i) => i.creator?.id === modalSubject.id,
                  )?.creator;
                  const profile = creator as any;
                  const related = combinedData.filter(
                    (i) => i.creator?.id === modalSubject.id,
                  );
                  return (
                    <div>
                      {profile ? (
                        <div className="flex gap-4 items-center mb-4">
                          <img
                            src={profile.avatar}
                            className="w-16 h-16 rounded-full object-cover"
                          />
                          <div>
                            <div className="font-black text-slate-900">
                              {profile.name}
                            </div>
                            <div className="text-sm text-slate-500">
                              {profile.major}
                            </div>
                            <div className="text-sm text-slate-500">
                              {profile.bio}
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="text-sm text-slate-500 mb-4">
                          Profile details not available.
                        </div>
                      )}
                      <div>
                        <div className="text-sm font-black mb-2">
                          Related posts / events
                        </div>
                        <div className="flex flex-col gap-2">
                          {related.length ? (
                            related.map((r) => (
                              <button
                                key={r.id}
                                onClick={() => {
                                  const idx = filteredData.findIndex(
                                    (f) => f.id === r.id,
                                  );
                                  if (idx >= 0) setCurrentIndex(idx);
                                  closeModal();
                                }}
                                className="text-left p-3 bg-slate-50 rounded-md hover:bg-slate-100"
                              >
                                {r.title}{" "}
                                <span className="text-xs text-slate-400">
                                  {" "}
                                  — {r.type}
                                </span>
                              </button>
                            ))
                          ) : (
                            <div className="text-sm text-slate-500">
                              No related items.
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })()}

              {modalSubject.type === "company" &&
                (() => {
                  const companyName = modalSubject.name;
                  const related = combinedData.filter(
                    (i) =>
                      (i.company || "").toLowerCase() ===
                      (companyName || "").toLowerCase(),
                  );
                  return (
                    <div>
                      <div className="mb-4 text-sm text-slate-700">
                        Organization:{" "}
                        <span className="font-bold">{companyName}</span>
                      </div>
                      <div className="text-sm font-black mb-2">
                        Related opportunities & events
                      </div>
                      <div className="flex flex-col gap-2">
                        {related.length ? (
                          related.map((r) => (
                            <button
                              key={r.id}
                              onClick={() => {
                                const idx = filteredData.findIndex(
                                  (f) => f.id === r.id,
                                );
                                if (idx >= 0) setCurrentIndex(idx);
                                closeModal();
                              }}
                              className="text-left p-3 bg-slate-50 rounded-md hover:bg-slate-100"
                            >
                              {r.title}{" "}
                              <span className="text-xs text-slate-400">
                                {" "}
                                — {r.type}
                              </span>
                            </button>
                          ))
                        ) : (
                          <div className="text-sm text-slate-500">
                            No items found for this company.
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })()}

              {modalSubject.type === "event" &&
                (() => {
                  const evt = combinedData.find(
                    (i) => i.id === modalSubject.id,
                  );
                  const related = combinedData.filter(
                    (i) =>
                      (i.company &&
                        evt?.company &&
                        i.company === evt.company) ||
                      (i.metadata?.organizer &&
                        evt?.metadata?.organizer &&
                        i.metadata.organizer === evt.metadata.organizer),
                  );
                  return (
                    <div>
                      {evt ? (
                        <div>
                          <div className="mb-4 text-slate-800 font-black">
                            {evt.title}
                          </div>
                          <div className="text-sm text-slate-600 mb-2">
                            {evt.description}
                          </div>
                          <div className="text-sm text-slate-500 mb-4">
                            Date: {evt.metadata?.date || evt.date || "TBA"}
                          </div>
                        </div>
                      ) : (
                        <div className="text-sm text-slate-500 mb-4">
                          Event details not available.
                        </div>
                      )}
                      <div className="text-sm font-black mb-2">
                        Other events
                      </div>
                      <div className="flex flex-col gap-2">
                        {related.length ? (
                          related.map((r) => (
                            <button
                              key={r.id}
                              onClick={() => {
                                const idx = filteredData.findIndex(
                                  (f) => f.id === r.id,
                                );
                                if (idx >= 0) setCurrentIndex(idx);
                                closeModal();
                              }}
                              className="text-left p-3 bg-slate-50 rounded-md hover:bg-slate-100"
                            >
                              {r.title}{" "}
                              <span className="text-xs text-slate-400">
                                {" "}
                                — {r.type}
                              </span>
                            </button>
                          ))
                        ) : (
                          <div className="text-sm text-slate-500">
                            No related events.
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DiscoverySwipe;
