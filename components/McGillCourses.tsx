import React, { useEffect, useMemo, useRef, useState } from "react";
import type { UserProfile } from "../types"; // #mariam

// #mariam — props so we can use the real account profile (name/avatar/gpa) inside swipe
type McGillCoursesProps = {
  userProfile: UserProfile; // #mariam
  activeAccountId: string; // #mariam
}; // #mariam

const SUBJECT_COURSES: Record<string, string[]> = {
  ECSE: ["ECSE 415", "ECSE 343", "ECSE 223", "ECSE 478 (Capstone)", "ECSE 551"],
  COMP: ["COMP 202", "COMP 206", "COMP 551"],

  CHEE: [],
  MECH: [],
  CIVE: [],
  ABEN: [],
  BMDE: [],
  MIME: [],
  BIEN: [],
};

const SUBJECT_LABELS: Record<string, string> = {
  ECSE: "ECSE (Electrical/Computer)",
  COMP: "COMP (Computer Sci)",
  CHEE: "CHEE (Chemical Eng)",
  MECH: "MECH (Mechanical Eng)",
  CIVE: "CIVE (Civil Eng)",
  ABEN: "ABEN (Agri/Bio Eng)",
  BMDE: "BMDE (Biomedical Eng)",
  MIME: "MIME (Materials Eng)",
  BIEN: "BIEN (Bioengineering)",
};

type Subject =
  | "ECSE"
  | "COMP"
  | "CHEE"
  | "MECH"
  | "CIVE"
  | "ABEN"
  | "BMDE"
  | "MIME"
  | "BIEN"
  | null;

const SUBJECTS: Exclude<Subject, null>[] = [
  "ECSE",
  "COMP",
  "CHEE",
  "MECH",
  "CIVE",
  "ABEN",
  "BMDE",
  "MIME",
  "BIEN",
];

type PanelMode = "discussion" | "groups" | null;

type ChatMessage = {
  id: string;
  author: string;
  text: string;
  createdAt: number;
};

type GroupPost = {
  id: string;
  author: string;
  title: string;
  details: string;
  createdAt: number;
  interestedCount: number;
};

const storageKeyChat = (course: string) => `mcg_chat_${course}`;
const storageKeyGroups = (course: string) => `mcg_groups_${course}`;
const storageKeyJoined = () => `mcg_joined_courses`;

// swipe / matchmaking storage
const storageKeySwipeSeed = (course: string) => `mcg_swipe_seed_${course}`;
const storageKeySwipeActions = (course: string, viewer: string) =>
  `mcg_swipe_actions_${course}_${viewer}`;
const storageKeyMatches = (course: string, viewer: string) =>
  `mcg_swipe_matches_${course}_${viewer}`;
const storageKeyDM = (course: string, viewer: string, otherId: string) =>
  `mcg_dm_${course}_${viewer}_${otherId}`;

// #mariam — course roster of real user profiles (so other accounts can swipe on you)
const storageKeyCourseRoster = (course: string) => `mcg_course_roster_${course}`; // #mariam

const safeParse = <T,>(raw: string | null, fallback: T): T => {
  try {
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
};

// “Tinder-ish” profiles (local demo)
type SwipeProgram =
  | "Electrical Engineering"
  | "Software Engineering"
  | "Computer Engineering"
  | "Computer Science"
  | "Mechanical Engineering"
  | "Chemical Engineering"
  | "Civil Engineering"
  | "Biomedical Engineering"
  | "Materials Engineering"
  | "Bioengineering"
  | "Agricultural Engineering";

type SwipeProfile = {
  id: string;
  name: string;
  age: number;
  program: SwipeProgram;
  gpa?: string;
  image: string;
  tagline: string;
};

type SwipeAction = {
  profileId: string;
  action: "like" | "pass";
  createdAt: number;
};

type DirectMessage = {
  id: string;
  from: string;
  to: string;
  text: string;
  createdAt: number;
};

const PROGRAM_ALLOWLIST_BY_SUBJECT: Record<string, SwipeProgram[]> = {
  ECSE: [
    "Electrical Engineering",
    "Software Engineering",
    "Computer Engineering",
  ],
  COMP: ["Computer Science"],
  CHEE: ["Chemical Engineering"],
  MECH: ["Mechanical Engineering"],
  CIVE: ["Civil Engineering"],
  BMDE: ["Biomedical Engineering"],
  MIME: ["Materials Engineering"],
  BIEN: ["Bioengineering"],
  ABEN: ["Agricultural Engineering"],
};

// helper: infer subject from course code prefix
const inferSubjectFromCourse = (
  course: string,
): Exclude<Subject, null> | null => {
  const prefix = course.trim().split(" ")[0]?.toUpperCase();
  if (prefix === "ECSE") return "ECSE";
  if (prefix === "COMP") return "COMP";
  if (prefix === "CHEE") return "CHEE";
  if (prefix === "MECH") return "MECH";
  if (prefix === "CIVE") return "CIVE";
  if (prefix === "ABEN") return "ABEN";
  if (prefix === "BMDE") return "BMDE";
  if (prefix === "MIME") return "MIME";
  if (prefix === "BIEN") return "BIEN";
  return null;
};

// #mariam — map a user major string into one of your program labels (best-effort)
const majorToProgram = (majorRaw: string, fallback: SwipeProgram): SwipeProgram => { // #mariam
  const m = (majorRaw || "").toLowerCase(); // #mariam
  if (m.includes("software")) return "Software Engineering"; // #mariam
  if (m.includes("computer science") || m.includes("comp sci")) return "Computer Science"; // #mariam
  if (m.includes("computer")) return "Computer Engineering"; // #mariam
  if (m.includes("electrical")) return "Electrical Engineering"; // #mariam
  if (m.includes("mechanical")) return "Mechanical Engineering"; // #mariam
  if (m.includes("chemical")) return "Chemical Engineering"; // #mariam
  if (m.includes("civil")) return "Civil Engineering"; // #mariam
  if (m.includes("biomed")) return "Biomedical Engineering"; // #mariam
  if (m.includes("material")) return "Materials Engineering"; // #mariam
  if (m.includes("bioengineering")) return "Bioengineering"; // #mariam
  if (m.includes("agric")) return "Agricultural Engineering"; // #mariam
  return fallback; // #mariam
}; // #mariam

// deterministic-ish demo seed so profiles feel “stable” per course
const getCourseSeed = (course: string) => {
  const existing = localStorage.getItem(storageKeySwipeSeed(course));
  if (existing) return existing;
  const seed = `seed_${course}_${Date.now()}_${Math.random().toString(16).slice(2)}`;
  localStorage.setItem(storageKeySwipeSeed(course), seed);
  return seed;
};

// #mariam — generate demo profiles per course (frontend-only)
const makeDemoProfilesForCourse = (course: string): SwipeProfile[] => {
  const subject = inferSubjectFromCourse(course) ?? "ECSE";
  const allow =
    PROGRAM_ALLOWLIST_BY_SUBJECT[subject] ?? PROGRAM_ALLOWLIST_BY_SUBJECT.ECSE;

  const seed = getCourseSeed(course);
  const names = [
    "Sarah",
    "Omar",
    "Lina",
    "Adam",
    "Noor",
    "Youssef",
    "Maya",
    "Khaled",
    "Ava",
    "Zayn",
    "Lea",
    "Nora",
    "Hadi",
    "Sami",
    "Aya",
    "Rami",
  ];

  const taglines = [
    "Looking for group members",
    "Need a partner for labs + assignments",
    "Prefer someone consistent weekly",
    "Down to grind — let’s ace this",
    "I’m strong in problem sets, weak in reports 😭",
    "I can help with coding, need help with theory",
    "Looking for 2-3 teammates",
    "Let’s split work fairly & meet regularly",
  ];

  const pick = <T,>(arr: T[], idx: number) => arr[idx % arr.length];

  const hash = (s: string) => {
    let h = 0;
    for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
    return h;
  };

  const base = hash(seed);
  const out: SwipeProfile[] = [];
  for (let i = 0; i < 12; i++) {
    const h = (base + i * 9973) >>> 0;
    const name =
      pick(names, h % names.length) +
      (h % 2 === 0 ? "" : ` ${String.fromCharCode(65 + (h % 26))}.`);
    const age = 19 + (h % 6);
    const program = pick(allow, (h >>> 3) % allow.length);
    const gpa = h % 3 === 0 ? undefined : (3.2 + (h % 9) * 0.1).toFixed(1);
    const avatarSeed = encodeURIComponent(`${course}_${name}_${h}`);
    const image = `https://api.dicebear.com/7.x/avataaars/svg?seed=${avatarSeed}`;
    const tagline = pick(taglines, (h >>> 5) % taglines.length);

    out.push({
      id: `p_${course}_${i}_${h.toString(16)}`,
      name,
      age,
      program,
      gpa,
      image,
      tagline,
    });
  }
  return out;
};

// #mariam — load "real" users joined to this course (roster)
const loadCourseRoster = (course: string): SwipeProfile[] => { // #mariam
  return safeParse<SwipeProfile[]>(localStorage.getItem(storageKeyCourseRoster(course)), []); // #mariam
}; // #mariam

// #mariam — upsert the current user into the course roster (so other accounts can swipe on them)
const upsertMeIntoRoster = (course: string, me: SwipeProfile) => { // #mariam
  const roster = loadCourseRoster(course); // #mariam
  const next = roster.some((p) => p.id === me.id)
    ? roster.map((p) => (p.id === me.id ? me : p))
    : [me, ...roster]; // #mariam
  localStorage.setItem(storageKeyCourseRoster(course), JSON.stringify(next)); // #mariam
}; // #mariam

const McGillCourses: React.FC<McGillCoursesProps> = ({ userProfile, activeAccountId }) => { // #mariam
  const [selectedSubject, setSelectedSubject] = useState<Subject>(null);

  const [selectedCourse, setSelectedCourse] = useState<string | null>(null);
  const [joinPromptCourse, setJoinPromptCourse] = useState<string | null>(null);
  const [joinedCourses, setJoinedCourses] = useState<Record<string, boolean>>(
    {},
  );
  const [activePanel, setActivePanel] = useState<PanelMode>(null);

  // local “name” for chats
  const [displayName, setDisplayName] = useState<string>(() => {
    const saved = localStorage.getItem("mcg_display_name");
    return saved || userProfile.name || "Anonymous"; // #mariam
  });

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [messageDraft, setMessageDraft] = useState("");

  const [groupPosts, setGroupPosts] = useState<GroupPost[]>([]);
  const [groupTitle, setGroupTitle] = useState("");
  const [groupDetails, setGroupDetails] = useState("");

  const [groupMode, setGroupMode] = useState<"swipe" | "posts">("swipe");
  const [swipeProfiles, setSwipeProfiles] = useState<SwipeProfile[]>([]);
  const [swipeActions, setSwipeActions] = useState<SwipeAction[]>([]);
  const [matches, setMatches] = useState<SwipeProfile[]>([]);
  const [dmTarget, setDmTarget] = useState<SwipeProfile | null>(null);
  const [dmDraft, setDmDraft] = useState<string>("");
  const [dmThread, setDmThread] = useState<DirectMessage[]>([]);

  const courses = useMemo(() => {
    if (!selectedSubject) return [];
    return SUBJECT_COURSES[selectedSubject] ?? [];
  }, [selectedSubject]);

  // load joined courses once
  useEffect(() => {
    const joined = safeParse<Record<string, boolean>>(
      localStorage.getItem(storageKeyJoined()),
      {},
    );
    setJoinedCourses(joined);
  }, []);

  // persist display name
  useEffect(() => {
    localStorage.setItem("mcg_display_name", displayName);
  }, [displayName]);

  // #mariam — keep displayName synced if user changes profile name in Profile tab
  useEffect(() => { // #mariam
    if (!userProfile?.name) return; // #mariam
    setDisplayName((prev) => (prev === "Anonymous" ? userProfile.name : prev)); // #mariam
  }, [userProfile.name]); // #mariam

  // when selectedCourse changes, load that course’s data
  useEffect(() => {
    if (!selectedCourse) {
      setMessages([]);
      setGroupPosts([]);
      setSwipeProfiles([]);
      setSwipeActions([]);
      setMatches([]);
      return;
    }

    const m = safeParse<ChatMessage[]>(
      localStorage.getItem(storageKeyChat(selectedCourse)),
      [],
    );
    const g = safeParse<GroupPost[]>(
      localStorage.getItem(storageKeyGroups(selectedCourse)),
      [],
    );

    // #mariam — swipe data: combine demo profiles + real roster profiles
    const demo = makeDemoProfilesForCourse(selectedCourse); // #mariam
    const roster = loadCourseRoster(selectedCourse); // #mariam

    const viewer = (displayName?.trim() || "Anonymous").replace(/\s+/g, "_");
    const actions = safeParse<SwipeAction[]>(
      localStorage.getItem(storageKeySwipeActions(selectedCourse, viewer)),
      [],
    );
    const savedMatches = safeParse<SwipeProfile[]>(
      localStorage.getItem(storageKeyMatches(selectedCourse, viewer)),
      [],
    );

    setMessages(m);
    setGroupPosts(g);

    // #mariam — IMPORTANT: show roster profiles + demo profiles, but NOT the viewer themselves
    const viewerProfileId = `acc_${activeAccountId}`; // #mariam
    const rosterWithoutMe = roster.filter((p) => p.id !== viewerProfileId); // #mariam
    setSwipeProfiles([...rosterWithoutMe, ...demo]); // #mariam

    setSwipeActions(actions);
    setMatches(savedMatches);
  }, [selectedCourse, displayName, activeAccountId]); // #mariam (added deps)

  // reload swipe actions when display name changes (viewer identity)
  useEffect(() => {
    if (!selectedCourse) return;
    const viewer = (displayName?.trim() || "Anonymous").replace(/\s+/g, "_");
    const actions = safeParse<SwipeAction[]>(
      localStorage.getItem(storageKeySwipeActions(selectedCourse, viewer)),
      [],
    );
    const savedMatches = safeParse<SwipeProfile[]>(
      localStorage.getItem(storageKeyMatches(selectedCourse, viewer)),
      [],
    );
    setSwipeActions(actions);
    setMatches(savedMatches);
  }, [displayName, selectedCourse]);

  // persist chat + groups whenever they change
  useEffect(() => {
    if (!selectedCourse) return;
    localStorage.setItem(storageKeyChat(selectedCourse), JSON.stringify(messages));
  }, [messages, selectedCourse]);

  useEffect(() => {
    if (!selectedCourse) return;
    localStorage.setItem(storageKeyGroups(selectedCourse), JSON.stringify(groupPosts));
  }, [groupPosts, selectedCourse]);

  // persist swipe actions + matches
  useEffect(() => {
    if (!selectedCourse) return;
    const viewer = (displayName?.trim() || "Anonymous").replace(/\s+/g, "_");
    localStorage.setItem(
      storageKeySwipeActions(selectedCourse, viewer),
      JSON.stringify(swipeActions),
    );
  }, [swipeActions, selectedCourse, displayName]);

  useEffect(() => {
    if (!selectedCourse) return;
    const viewer = (displayName?.trim() || "Anonymous").replace(/\s+/g, "_");
    localStorage.setItem(
      storageKeyMatches(selectedCourse, viewer),
      JSON.stringify(matches),
    );
  }, [matches, selectedCourse, displayName]);

  // #mariam — whenever THIS user is joined in the selected course, publish them into roster
  useEffect(() => { // #mariam
    if (!selectedCourse) return; // #mariam
    if (!joinedCourses[selectedCourse]) return; // #mariam

    const subj = inferSubjectFromCourse(selectedCourse) ?? "ECSE"; // #mariam
    const defaultProgram = (PROGRAM_ALLOWLIST_BY_SUBJECT[subj]?.[0] ??
      "Computer Engineering") as SwipeProgram; // #mariam

    const program = majorToProgram(userProfile.major || "", defaultProgram); // #mariam

    const image =
      userProfile.avatar?.trim()
        ? userProfile.avatar
        : `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(
            userProfile.name || "McGill Student",
          )}`; // #mariam

    const me: SwipeProfile = { // #mariam
      id: `acc_${activeAccountId}`, // #mariam
      name: userProfile.name || displayName || "McGill Student", // #mariam
      age: 20, // #mariam (no age in profile yet, so we pick a default)
      program, // #mariam
      gpa: userProfile.gpa || undefined, // #mariam
      image, // #mariam
      tagline: "Looking for group members", // #mariam
    }; // #mariam

    upsertMeIntoRoster(selectedCourse, me); // #mariam

    // #mariam — also refresh swipeProfiles list so it includes the latest roster (for this viewer it excludes them, but keeps others updated)
    const roster = loadCourseRoster(selectedCourse).filter((p) => p.id !== me.id); // #mariam
    const demo = makeDemoProfilesForCourse(selectedCourse); // #mariam
    setSwipeProfiles([...roster, ...demo]); // #mariam
  }, [
    selectedCourse,
    joinedCourses,
    userProfile.name,
    userProfile.avatar,
    userProfile.gpa,
    userProfile.major,
    activeAccountId,
    displayName,
  ]); // #mariam

  const openCourse = (course: string) => {
    setSelectedCourse(course);
    if (!joinedCourses[course]) {
      setJoinPromptCourse(course);
      setActivePanel(null);
    } else {
      setActivePanel("discussion");
    }
  };

  const joinCourse = (course: string) => {
    setJoinedCourses((prev) => {
      const next = { ...prev, [course]: true };
      localStorage.setItem(storageKeyJoined(), JSON.stringify(next));
      return next;
    });
    setJoinPromptCourse(null);
    setActivePanel("discussion");
  };

  const leaveCourse = (course: string) => {
    setJoinedCourses((prev) => {
      const next = { ...prev };
      delete next[course];
      localStorage.setItem(storageKeyJoined(), JSON.stringify(next));
      return next;
    });
    if (selectedCourse === course) {
      setActivePanel(null);
    }
  };

  const sendMessage = () => {
    if (!selectedCourse) return;
    const text = messageDraft.trim();
    if (!text) return;

    const msg: ChatMessage = {
      id: `msg_${Date.now()}_${Math.random().toString(16).slice(2)}`,
      author: displayName.trim() || "Anonymous",
      text,
      createdAt: Date.now(),
    };

    setMessages((prev) => [msg, ...prev]);
    setMessageDraft("");
  };

  const postGroup = () => {
    if (!selectedCourse) return;
    const t = groupTitle.trim();
    const d = groupDetails.trim();
    if (!t) return;

    const post: GroupPost = {
      id: `grp_${Date.now()}_${Math.random().toString(16).slice(2)}`,
      author: displayName.trim() || "Anonymous",
      title: t,
      details: d,
      createdAt: Date.now(),
      interestedCount: 0,
    };

    setGroupPosts((prev) => [post, ...prev]);
    setGroupTitle("");
    setGroupDetails("");
  };

  const bumpInterested = (postId: string) => {
    setGroupPosts((prev) =>
      prev.map((p) =>
        p.id === postId ? { ...p, interestedCount: p.interestedCount + 1 } : p,
      ),
    );
  };

  const viewerId = (displayName?.trim() || "Anonymous").replace(/\s+/g, "_");

  const swipedIds = useMemo(() => {
    const set = new Set<string>();
    for (const a of swipeActions) set.add(a.profileId);
    return set;
  }, [swipeActions]);

  const swipeQueue = useMemo(() => {
    const subj = selectedCourse ? inferSubjectFromCourse(selectedCourse) : null;
    const allow = subj ? PROGRAM_ALLOWLIST_BY_SUBJECT[subj] : undefined;

    const filtered = swipeProfiles.filter((p) => {
      if (!allow) return true;
      return allow.includes(p.program);
    });

    return filtered.filter((p) => !swipedIds.has(p.id));
  }, [swipeProfiles, swipedIds, selectedCourse]);

  const currentSwipe = swipeQueue[0] ?? null;

  const doSwipe = (profile: SwipeProfile, action: "like" | "pass") => {
    const a: SwipeAction = {
      profileId: profile.id,
      action,
      createdAt: Date.now(),
    };
    setSwipeActions((prev) => [a, ...prev]);

    if (action === "like") {
      setMatches((prev) => {
        if (prev.some((m) => m.id === profile.id)) return prev;
        return [profile, ...prev];
      });

      setDmTarget(profile);
      setDmDraft(
        `Hi ${profile.name}! 👋 I saw you're looking for group members for ${selectedCourse}. Want to team up?`,
      );
    }
  };

  const loadDMThread = (course: string, otherId: string) => {
    const thread = safeParse<DirectMessage[]>(
      localStorage.getItem(storageKeyDM(course, viewerId, otherId)),
      [],
    );
    setDmThread(thread);
  };

  const sendDM = () => {
    if (!selectedCourse || !dmTarget) return;
    const text = dmDraft.trim();
    if (!text) return;

    const msg: DirectMessage = {
      id: `dm_${Date.now()}_${Math.random().toString(16).slice(2)}`,
      from: viewerId,
      to: dmTarget.id,
      text,
      createdAt: Date.now(),
    };

    const next = [msg, ...dmThread];
    setDmThread(next);
    localStorage.setItem(
      storageKeyDM(selectedCourse, viewerId, dmTarget.id),
      JSON.stringify(next),
    );

    setDmDraft("");
  };

  const clearSubject = () => {
    setSelectedSubject(null);
    setSelectedCourse(null);
    setActivePanel(null);
    setJoinPromptCourse(null);
  };

  const panelTopRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (activePanel && panelTopRef.current) {
      panelTopRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [activePanel]);

  const joined = selectedCourse ? !!joinedCourses[selectedCourse] : false;

  return (
    <div className="p-6 lg:p-12 pb-40 animate-in fade-in duration-500 max-w-6xl mx-auto">
      <header className="mb-8">
        <span className="text-xs font-black text-white/80 uppercase tracking-[0.3em] mb-2 block">
          Academics
        </span>

        <h2 className="text-4xl lg:text-5xl font-black text-white tracking-tight drop-shadow-sm">
          McGill Courses
        </h2>

        <p className="mt-4 text-white/80 font-semibold">
          Choose your engineering subject:
        </p>

        <div className="mt-5 max-w-md">
          <label className="block text-[10px] font-black text-white/70 uppercase tracking-widest mb-2">
            Your display name (for chats)
          </label>
          <input
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            className="w-full px-4 py-3 rounded-2xl bg-white/10 border border-white/20 text-white placeholder:text-white/50 font-semibold outline-none focus:bg-white/15"
            placeholder="e.g. Mariam"
          />
        </div>
      </header>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 mb-10 w-full">
        {SUBJECTS.map((subj) => {
          const isActive = selectedSubject === subj;

          return (
            <button
              key={subj}
              onClick={() => {
                setSelectedSubject(subj);
                setSelectedCourse(null);
                setActivePanel(null);
                setJoinPromptCourse(null);
              }}
              className={`px-6 py-4 rounded-2xl font-black text-sm sm:text-base transition-all border ${
                isActive
                  ? "bg-white text-mcgill-red shadow-xl border-white"
                  : "bg-white/10 text-white border-white/20 hover:bg-white/20"
              }`}
              title={SUBJECT_LABELS[subj]}
            >
              <div className="text-left leading-tight">
                <div className="text-lg sm:text-xl">{subj}</div>
                <div className="text-[10px] sm:text-xs font-bold opacity-80">
                  {SUBJECT_LABELS[subj]}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {selectedSubject ? (
        <div className="bg-white/10 border border-white/20 rounded-[2rem] p-5 sm:p-6">
          <div className="flex items-end justify-between gap-4 mb-4">
            <div>
              <h3 className="text-white font-black text-2xl">
                {selectedSubject} Courses
              </h3>
              <p className="text-white/70 text-sm font-medium">
                {SUBJECT_LABELS[selectedSubject]}
              </p>
            </div>

            <button
              onClick={clearSubject}
              className="px-4 py-2 rounded-xl bg-white/15 hover:bg-white/25 border border-white/20 text-white text-xs font-black uppercase tracking-widest transition-all"
            >
              Clear
            </button>
          </div>

          <div className="max-h-[48vh] overflow-y-auto pr-2">
            {courses.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {courses.map((course) => {
                  const courseJoined = !!joinedCourses[course];
                  const courseSelected = selectedCourse === course;

                  return (
                    <div
                      key={course}
                      className={`rounded-[1.75rem] border transition-all ${
                        courseSelected
                          ? "border-white/40 bg-white/15"
                          : "border-white/15 bg-white/10 hover:bg-white/15"
                      }`}
                    >
                      <button
                        onClick={() => openCourse(course)}
                        className="w-full text-left p-6 rounded-[1.75rem]"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <h4 className="text-lg font-black text-white">
                            {course}
                          </h4>
                          <span
                            className={`text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full border ${
                              courseJoined
                                ? "bg-white text-mcgill-red border-white"
                                : "bg-white/10 text-white border-white/20"
                            }`}
                          >
                            {courseJoined ? "Joined" : "Not Joined"}
                          </span>
                        </div>

                        <p className="mt-2 text-white/70 text-sm font-medium">
                          Tap to open options
                        </p>
                      </button>

                      {courseJoined && (
                        <div className="px-6 pb-6 -mt-2">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <button
                              onClick={() => {
                                setSelectedCourse(course);
                                setActivePanel("discussion");
                              }}
                              className="py-3 rounded-2xl bg-white text-mcgill-red font-black text-sm hover:scale-[1.01] active:scale-[0.99] transition-all"
                            >
                              💬 Discussion Board
                            </button>

                            <button
                              onClick={() => {
                                setSelectedCourse(course);
                                setActivePanel("groups");
                                setGroupMode("swipe");
                              }}
                              className="py-3 rounded-2xl bg-white/15 border border-white/20 text-white font-black text-sm hover:bg-white/20 transition-all"
                            >
                              👥 Find Group Members
                            </button>
                          </div>

                          <button
                            onClick={() => leaveCourse(course)}
                            className="mt-3 w-full py-2 rounded-xl text-[10px] font-black uppercase tracking-widest text-white/70 hover:text-white bg-white/5 border border-white/10 hover:bg-white/10 transition-all"
                          >
                            Leave course
                          </button>
                        </div>
                      )}

                      {!courseJoined && (
                        <div className="px-6 pb-6 -mt-2">
                          <button
                            onClick={() => {
                              setSelectedCourse(course);
                              setJoinPromptCourse(course);
                            }}
                            className="w-full py-3 rounded-2xl bg-white/15 border border-white/20 text-white font-black text-sm hover:bg-white/20 transition-all"
                          >
                            Join course community
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="py-10 text-center">
                <p className="text-white/80 font-semibold">
                  No courses listed yet for {selectedSubject}.
                </p>
                <p className="text-white/60 text-sm mt-2">
                  Add course codes inside{" "}
                  <span className="font-black">SUBJECT_COURSES</span> in this
                  file.
                </p>
              </div>
            )}
          </div>
        </div>
      ) : (
        <p className="text-white/70 italic">Select a subject to view courses.</p>
      )}

      {joinPromptCourse && (
        <div className="fixed inset-0 z-[120] bg-slate-900/70 backdrop-blur-md flex items-center justify-center p-6">
          <div className="w-full max-w-lg bg-white rounded-[2.5rem] p-8 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                  Course Community
                </p>
                <h3 className="text-2xl font-black text-slate-900 mt-1">
                  Join {joinPromptCourse}?
                </h3>
                <p className="text-slate-500 font-medium mt-3">
                  This unlocks:
                  <span className="font-black text-slate-700"> Discussion Board </span>
                  +{" "}
                  <span className="font-black text-slate-700">Find Group Members</span>.
                </p>
              </div>

              <button
                onClick={() => setJoinPromptCourse(null)}
                className="text-slate-300 hover:text-slate-900 transition-colors"
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                onClick={() => joinCourse(joinPromptCourse)}
                className="py-4 rounded-2xl bg-mcgill-red text-white font-black hover:bg-red-600 transition-all"
              >
                Yes, join
              </button>
              <button
                onClick={() => setJoinPromptCourse(null)}
                className="py-4 rounded-2xl bg-slate-100 text-slate-700 font-black hover:bg-slate-200 transition-all"
              >
                Not now
              </button>
            </div>

            <p className="mt-4 text-[11px] text-slate-400 font-medium">
              Note: this demo stores posts on your device (localStorage). For a
              real class-wide chat across phones, you’ll connect a backend later.
            </p>
          </div>
        </div>
      )}

      {selectedCourse && joined && activePanel && (
        <div
          ref={panelTopRef}
          className="mt-10 bg-white/10 border border-white/20 rounded-[2rem] p-6"
        >
          <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-white/70">
                {selectedCourse} Community
              </p>
              <h3 className="text-2xl font-black text-white">
                {activePanel === "discussion"
                  ? "Discussion Board"
                  : "Find Group Members"}
              </h3>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setActivePanel("discussion")}
                className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest border transition-all ${
                  activePanel === "discussion"
                    ? "bg-white text-mcgill-red border-white"
                    : "bg-white/10 text-white border-white/20 hover:bg-white/15"
                }`}
              >
                Discussion
              </button>
              <button
                onClick={() => setActivePanel("groups")}
                className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest border transition-all ${
                  activePanel === "groups"
                    ? "bg-white text-mcgill-red border-white"
                    : "bg-white/10 text-white border-white/20 hover:bg-white/15"
                }`}
              >
                Groups
              </button>
              <button
                onClick={() => {
                  setActivePanel(null);
                  setSelectedCourse(null);
                }}
                className="px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest bg-white/10 text-white border border-white/20 hover:bg-white/15 transition-all"
              >
                Close
              </button>
            </div>
          </div>

          {activePanel === "discussion" && (
            <div className="grid lg:grid-cols-3 gap-6">
              <div className="lg:col-span-1 bg-white rounded-[1.75rem] p-6">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">
                  Ask a question
                </p>
                <textarea
                  value={messageDraft}
                  onChange={(e) => setMessageDraft(e.target.value)}
                  className="w-full min-h-[140px] p-4 rounded-2xl bg-slate-50 border border-slate-100 font-semibold text-slate-800 outline-none focus:border-red-200"
                  placeholder="Example: Can someone explain the last part of today’s lecture?"
                />
                <button
                  onClick={sendMessage}
                  className="mt-4 w-full py-4 rounded-2xl bg-mcgill-red text-white font-black hover:bg-red-600 transition-all"
                >
                  Post
                </button>

                <p className="mt-3 text-[11px] text-slate-400 font-medium">
                  Tip: Keep it respectful & course-related.
                </p>
              </div>

              <div className="lg:col-span-2 bg-white/10 border border-white/20 rounded-[1.75rem] p-6">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-[10px] font-black uppercase tracking-widest text-white/70">
                    Recent posts
                  </p>
                  <p className="text-white/60 text-xs font-semibold">
                    {messages.length} posts
                  </p>
                </div>

                <div className="max-h-[48vh] overflow-y-auto pr-2 space-y-3">
                  {messages.length === 0 ? (
                    <div className="py-10 text-center text-white/70 font-semibold">
                      No posts yet. Be the first to ask something ✨
                    </div>
                  ) : (
                    messages.map((m) => (
                      <div
                        key={m.id}
                        className="bg-white p-5 rounded-[1.5rem] border border-slate-100 shadow-sm"
                      >
                        <div className="flex items-center justify-between gap-3 mb-2">
                          <p className="text-slate-900 font-black">{m.author}</p>
                          <p className="text-[11px] text-slate-400 font-semibold">
                            {new Date(m.createdAt).toLocaleString()}
                          </p>
                        </div>
                        <p className="text-slate-700 font-medium leading-relaxed">
                          {m.text}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}

          {activePanel === "groups" && (
            <div>
              <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setGroupMode("swipe")}
                    className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest border transition-all ${
                      groupMode === "swipe"
                        ? "bg-white text-mcgill-red border-white"
                        : "bg-white/10 text-white border-white/20 hover:bg-white/15"
                    }`}
                  >
                    Swipe
                  </button>
                  <button
                    onClick={() => setGroupMode("posts")}
                    className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest border transition-all ${
                      groupMode === "posts"
                        ? "bg-white text-mcgill-red border-white"
                        : "bg-white/10 text-white border-white/20 hover:bg-white/15"
                    }`}
                  >
                    Posts
                  </button>
                </div>

                <p className="text-white/70 text-xs font-semibold">
                  {groupMode === "swipe"
                    ? "Tap ✕ or 🤝 to browse classmates looking for teammates."
                    : "Post a request + see who’s interested."}
                </p>
              </div>

              {groupMode === "swipe" && (
                <div className="grid lg:grid-cols-3 gap-6">
                  <div className="lg:col-span-2">
                    <div className="bg-white/10 border border-white/20 rounded-[2rem] p-6">
                      <div className="flex items-center justify-between mb-4">
                        <p className="text-[10px] font-black uppercase tracking-widest text-white/70">
                          Classmate cards
                        </p>
                        <p className="text-white/60 text-xs font-semibold">
                          Remaining: {swipeQueue.length}
                        </p>
                      </div>

                      {currentSwipe ? (
                        <div className="relative">
                          <div className="bg-white rounded-[2.25rem] overflow-hidden shadow-2xl">
                            <div className="relative h-[360px] sm:h-[420px] bg-slate-100">
                              <img
                                src={currentSwipe.image}
                                alt={currentSwipe.name}
                                className="w-full h-full object-cover"
                              />

                              <div className="absolute inset-0 bg-gradient-to-t from-slate-900/70 via-slate-900/10 to-transparent" />

                              <div className="absolute bottom-0 left-0 right-0 p-6">
                                <div className="flex items-end justify-between gap-4">
                                  <div>
                                    <h4 className="text-3xl font-black text-white leading-tight">
                                      {currentSwipe.name},{" "}
                                      <span className="text-white/80">
                                        {currentSwipe.age}
                                      </span>
                                    </h4>
                                    <p className="text-white/80 font-semibold mt-1">
                                      {currentSwipe.program}
                                    </p>
                                  </div>

                                  {currentSwipe.gpa && (
                                    <div className="bg-white/15 border border-white/20 backdrop-blur-md px-4 py-2 rounded-2xl">
                                      <p className="text-[10px] uppercase tracking-widest font-black text-white/80">
                                        GPA
                                      </p>
                                      <p className="text-white font-black text-lg">
                                        {currentSwipe.gpa}
                                      </p>
                                    </div>
                                  )}
                                </div>

                                <div className="mt-4 bg-white/10 border border-white/15 rounded-2xl px-4 py-3">
                                  <p className="text-white font-semibold">
                                    {currentSwipe.tagline}
                                  </p>
                                  <p className="text-white/70 text-sm mt-1">
                                    Course:{" "}
                                    <span className="font-black">
                                      {selectedCourse}
                                    </span>
                                  </p>
                                </div>
                              </div>
                            </div>

                            <div className="p-6 flex items-center justify-center gap-4">
                              <button
                                onClick={() => doSwipe(currentSwipe, "pass")}
                                className="w-16 h-16 rounded-full bg-slate-100 text-slate-700 font-black text-2xl shadow-sm hover:bg-slate-200 transition-all active:scale-95"
                                title="Pass"
                                aria-label="Pass"
                              >
                                ✕
                              </button>

                              <button
                                onClick={() => doSwipe(currentSwipe, "like")}
                                className="w-20 h-20 rounded-full bg-mcgill-red text-white font-black text-2xl shadow-[0_20px_50px_rgba(237,27,47,0.35)] hover:bg-red-600 transition-all active:scale-95"
                                title="Match"
                                aria-label="Match"
                              >
                                🤝
                              </button>
                            </div>

                            <div className="px-6 pb-6 -mt-2 text-center">
                              <p className="text-[11px] text-slate-500 font-semibold">
                                If you match 🤝, you can DM them about teaming up.
                              </p>
                            </div>
                          </div>

                          {swipeQueue.length > 1 && (
                            <div className="hidden sm:block absolute -z-10 top-6 left-6 right-6 h-[420px] bg-white/10 border border-white/20 rounded-[2.25rem]" />
                          )}
                        </div>
                      ) : (
                        <div className="py-14 text-center">
                          <p className="text-white font-black text-2xl">
                            You’re done swiping 🎉
                          </p>
                          <p className="text-white/70 font-semibold mt-2">
                            Check your matches on the right and message someone!
                          </p>

                          <button
                            onClick={() => {
                              if (!selectedCourse) return;
                              localStorage.removeItem(
                                storageKeySwipeActions(selectedCourse, viewerId),
                              );
                              setSwipeActions([]);
                            }}
                            className="mt-6 px-6 py-3 rounded-2xl bg-white text-mcgill-red font-black hover:scale-[1.01] active:scale-[0.99] transition-all"
                          >
                            Reset Swipes (demo)
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="lg:col-span-1">
                    <div className="bg-white rounded-[2rem] p-6">
                      <div className="flex items-center justify-between mb-4">
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                          Your matches
                        </p>
                        <p className="text-slate-500 text-xs font-semibold">
                          {matches.length}
                        </p>
                      </div>

                      <div className="max-h-[52vh] overflow-y-auto pr-2 space-y-3">
                        {matches.length === 0 ? (
                          <div className="py-10 text-center text-slate-400 font-semibold">
                            No matches yet. Tap 🤝 on someone you like.
                          </div>
                        ) : (
                          matches.map((p) => (
                            <div
                              key={p.id}
                              className="p-4 bg-slate-50 border border-slate-100 rounded-2xl flex items-center gap-3"
                            >
                              <div className="w-12 h-12 rounded-xl overflow-hidden bg-slate-100">
                                <img
                                  src={p.image}
                                  alt={p.name}
                                  className="w-full h-full object-cover"
                                />
                              </div>

                              <div className="flex-1 min-w-0">
                                <p className="font-black text-slate-900 truncate">
                                  {p.name}
                                </p>
                                <p className="text-[11px] text-slate-500 font-semibold truncate">
                                  {p.program} • {p.age}
                                  {p.gpa ? ` • GPA ${p.gpa}` : ""}
                                </p>
                              </div>

                              <button
                                onClick={() => {
                                  setDmTarget(p);
                                  if (selectedCourse) loadDMThread(selectedCourse, p.id);
                                  setDmDraft(
                                    `Hi ${p.name}! 👋 Want to team up for ${selectedCourse}?`,
                                  );
                                }}
                                className="px-3 py-2 rounded-xl bg-mcgill-red text-white text-[10px] font-black uppercase tracking-widest hover:bg-red-600 transition-all"
                              >
                                DM
                              </button>
                            </div>
                          ))
                        )}
                      </div>

                      <div className="mt-4">
                        <p className="text-[11px] text-slate-400 font-medium">
                          Tip: Matches are stored locally on this device for now.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {groupMode === "posts" && (
                <div className="grid lg:grid-cols-3 gap-6">
                  <div className="lg:col-span-1 bg-white rounded-[1.75rem] p-6">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">
                      Create a group post
                    </p>

                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 mt-3">
                      Headline
                    </label>
                    <input
                      value={groupTitle}
                      onChange={(e) => setGroupTitle(e.target.value)}
                      className="w-full p-4 rounded-2xl bg-slate-50 border border-slate-100 font-semibold text-slate-800 outline-none focus:border-red-200"
                      placeholder="Need 2 people for Assignment 2"
                    />

                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 mt-4">
                      Details (optional)
                    </label>
                    <textarea
                      value={groupDetails}
                      onChange={(e) => setGroupDetails(e.target.value)}
                      className="w-full min-h-[120px] p-4 rounded-2xl bg-slate-50 border border-slate-100 font-semibold text-slate-800 outline-none focus:border-red-200"
                      placeholder="Times available, goals, preferred tools, etc."
                    />

                    <button
                      onClick={postGroup}
                      className="mt-4 w-full py-4 rounded-2xl bg-slate-900 text-white font-black hover:bg-slate-800 transition-all"
                    >
                      Post
                    </button>

                    <p className="mt-3 text-[11px] text-slate-400 font-medium">
                      Others can click “I’m interested” and you can connect in DM later.
                    </p>
                  </div>

                  <div className="lg:col-span-2 bg-white/10 border border-white/20 rounded-[1.75rem] p-6">
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-[10px] font-black uppercase tracking-widest text-white/70">
                        Group posts
                      </p>
                      <p className="text-white/60 text-xs font-semibold">
                        {groupPosts.length} posts
                      </p>
                    </div>

                    <div className="max-h-[48vh] overflow-y-auto pr-2 space-y-3">
                      {groupPosts.length === 0 ? (
                        <div className="py-10 text-center text-white/70 font-semibold">
                          No group posts yet. Create one to start building a team 👥
                        </div>
                      ) : (
                        groupPosts.map((p) => (
                          <div
                            key={p.id}
                            className="bg-white p-5 rounded-[1.5rem] border border-slate-100 shadow-sm"
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <p className="text-slate-900 font-black">{p.title}</p>
                                <p className="text-[11px] text-slate-400 font-semibold mt-1">
                                  Posted by {p.author} • {new Date(p.createdAt).toLocaleString()}
                                </p>
                              </div>

                              <div className="text-right">
                                <span className="inline-flex items-center gap-2 text-[11px] font-black text-mcgill-red bg-red-50 px-3 py-1 rounded-full">
                                  {p.interestedCount} interested
                                </span>
                              </div>
                            </div>

                            {p.details?.trim() && (
                              <p className="mt-3 text-slate-700 font-medium leading-relaxed">
                                {p.details}
                              </p>
                            )}

                            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                              <button
                                onClick={() => bumpInterested(p.id)}
                                className="py-3 rounded-2xl bg-mcgill-red text-white font-black hover:bg-red-600 transition-all"
                              >
                                🙋 I’m interested
                              </button>
                              <button
                                onClick={() => {
                                  const text = `Hi! I'm interested in your ${selectedCourse} group: "${p.title}".`;
                                  navigator.clipboard?.writeText(text);
                                  alert("Copied a message to clipboard. Paste it into DM!");
                                }}
                                className="py-3 rounded-2xl bg-slate-100 text-slate-800 font-black hover:bg-slate-200 transition-all"
                              >
                                ✉️ Copy DM message
                              </button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {dmTarget && selectedCourse && (
        <div className="fixed inset-0 z-[130] bg-slate-900/70 backdrop-blur-md flex items-center justify-center p-6">
          <div className="w-full max-w-2xl bg-white rounded-[2.75rem] p-8 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl overflow-hidden bg-slate-100">
                  <img
                    src={dmTarget.image}
                    alt={dmTarget.name}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                    Message future team member
                  </p>
                  <h3 className="text-2xl font-black text-slate-900">{dmTarget.name}</h3>
                  <p className="text-slate-500 font-semibold text-sm">
                    {selectedCourse} • {dmTarget.program} • {dmTarget.age}
                    {dmTarget.gpa ? ` • GPA ${dmTarget.gpa}` : ""}
                  </p>
                </div>
              </div>

              <button
                onClick={() => {
                  setDmTarget(null);
                  setDmDraft("");
                  setDmThread([]);
                }}
                className="text-slate-300 hover:text-slate-900 transition-colors"
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            <div className="mt-6 grid lg:grid-cols-5 gap-6">
              <div className="lg:col-span-2">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">
                  Your message
                </p>
                <textarea
                  value={dmDraft}
                  onChange={(e) => setDmDraft(e.target.value)}
                  className="w-full min-h-[160px] p-4 rounded-2xl bg-slate-50 border border-slate-100 font-semibold text-slate-800 outline-none focus:border-red-200"
                  placeholder="Write something friendly..."
                />
                <button
                  onClick={sendDM}
                  className="mt-4 w-full py-4 rounded-2xl bg-mcgill-red text-white font-black hover:bg-red-600 transition-all"
                >
                  Send DM
                </button>

                <button
                  onClick={() => {
                    const text = `Hi ${dmTarget.name}! 👋 Want to team up for ${selectedCourse}?`;
                    navigator.clipboard?.writeText(text);
                    alert("Copied a message to clipboard.");
                  }}
                  className="mt-3 w-full py-3 rounded-2xl bg-slate-100 text-slate-800 font-black hover:bg-slate-200 transition-all"
                >
                  Copy a template
                </button>

                <p className="mt-3 text-[11px] text-slate-400 font-medium">
                  Demo note: DMs are stored locally for now (no backend yet).
                </p>
              </div>

              <div className="lg:col-span-3 bg-slate-50 border border-slate-100 rounded-[2rem] p-5">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                    Conversation
                  </p>
                  <p className="text-slate-500 text-xs font-semibold">
                    {dmThread.length} messages
                  </p>
                </div>

                <div className="max-h-[300px] overflow-y-auto pr-2 space-y-3">
                  {dmThread.length === 0 ? (
                    <div className="py-10 text-center text-slate-400 font-semibold">
                      No messages yet — send the first DM ✨
                    </div>
                  ) : (
                    dmThread.map((m) => (
                      <div
                        key={m.id}
                        className={`p-4 rounded-2xl ${
                          m.from === viewerId
                            ? "bg-white border border-slate-100"
                            : "bg-slate-900 text-white"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-3 mb-1">
                          <p
                            className={`text-[11px] font-black uppercase tracking-widest ${
                              m.from === viewerId ? "text-slate-400" : "text-white/70"
                            }`}
                          >
                            {m.from === viewerId ? "You" : dmTarget.name}
                          </p>
                          <p
                            className={`text-[11px] font-semibold ${
                              m.from === viewerId ? "text-slate-400" : "text-white/70"
                            }`}
                          >
                            {new Date(m.createdAt).toLocaleString()}
                          </p>
                        </div>
                        <p
                          className={`font-semibold leading-relaxed ${
                            m.from === viewerId ? "text-slate-700" : "text-white"
                          }`}
                        >
                          {m.text}
                        </p>
                      </div>
                    ))
                  )}
                </div>

                <button
                  onClick={() => {
                    loadDMThread(selectedCourse, dmTarget.id);
                  }}
                  className="mt-4 w-full py-3 rounded-2xl bg-white border border-slate-200 text-slate-700 font-black hover:bg-slate-100 transition-all"
                >
                  Refresh thread
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default McGillCourses;
