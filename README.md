<div align="center">
  <img src="./handshake.png" alt="UniConnex Logo" width="200"/>
  <h1>UniConnex (UniLinks)</h1>
  <p><strong>A vibrant student networking platform featuring AI-powered social coaching, swiping discovery for events and partners, and intelligent campus recommendations.</strong></p>
</div>

---

## 🎯 Overview

UniConnex is a comprehensive student networking platform designed specifically for university students to connect, collaborate, and grow their social and professional networks. Built with AI-powered features, UniConnex helps students discover events, find collaboration partners, join clubs, and improve their social skills through interactive AI coaching.

### ✨ Key Features

#### 🔍 **Discovery Swipe**
- **Tinder-style interface** for discovering campus opportunities
- Swipe through collaboration requests, events, clubs, and networking opportunities
- AI-powered match recommendations based on your interests and academic profile
- Filter by categories: Collaboration Requests, Clubs & Orgs, Events & Parties, Networking
- Create your own collaboration requests, events, and networking posts

#### 🤖 **AI Social Coach**
- **Live roleplay practice** with AI personas for real-world scenarios
- Get personalized icebreaker suggestions for different social situations
- Practice interviews, networking mixers, hackathons, and study groups
- Receive comprehensive feedback on your:
  - Content quality and appropriateness
  - Delivery and confidence
  - Body language and presence
  - Voice tone and pacing
- Adjustable tone settings (pressure, niceness, formality)
- Real-time reply suggestions during practice sessions

#### 📚 **McGill Course Browser**
- Browse courses by faculty (Science, Arts, Engineering, Management)
- View detailed course information
- Find collaboration partners for specific courses
- Integrated with the discovery feed

#### 📅 **Calendar Integration**
- Track hearted events and collaboration requests
- Never miss important campus opportunities
- Visual calendar view of all your interests

#### 👤 **Rich User Profiles**
- Customizable avatars
- Academic information (major, GPA, skills, interests)
- Experience and bio sections
- Multi-account support for testing and privacy

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** (v16 or higher recommended)
- **npm** or **yarn**
- A **Gemini API key** from [Google AI Studio](https://ai.google.dev/)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/olibreadstick/UniLinks.git
   cd UniLinks
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   
   Create a `.env.local` file in the root directory:
   ```bash
   API_KEY=your_gemini_api_key_here
   ```
   
   Replace `your_gemini_api_key_here` with your actual Gemini API key.

4. **Run the development server**
   ```bash
   npm run dev
   ```

5. **Open your browser**
   
   Navigate to `http://localhost:5173` (or the port shown in your terminal)

---

## 🛠️ Technology Stack

- **Frontend Framework:** React 19 with TypeScript
- **Build Tool:** Vite
- **AI Integration:** Google Gemini AI (gemini-3-flash-preview)
- **Styling:** Custom CSS with modern UI components
- **State Management:** React Hooks (useState, useEffect)
- **Storage:** Browser LocalStorage for data persistence

---

## 📁 Project Structure

```
UniLinks/
├── components/           # React components
│   ├── AICoach.tsx      # AI social coaching interface
│   ├── DiscoverySwipe.tsx # Swipe interface for discoveries
│   ├── Navigation.tsx    # Bottom navigation bar
│   ├── Onboarding.tsx   # User onboarding flow
│   ├── Welcome.tsx      # Welcome screen
│   ├── McGillCourses.tsx # Course browser
│   └── Calendar.tsx     # Calendar view
├── services/
│   └── gemini.ts        # Gemini AI API integration
├── App.tsx              # Main application component
├── types.ts             # TypeScript type definitions
├── index.tsx            # Application entry point
├── metadata.json        # App metadata
├── package.json         # Dependencies and scripts
├── tsconfig.json        # TypeScript configuration
├── vite.config.ts       # Vite configuration
└── README.md           # This file
```

---

## 🎮 Usage Guide

### First Time Setup

1. **Create Your Profile**
   - Enter your name, major, and interests
   - Add skills and experiences
   - Upload a profile picture (optional)

2. **Explore the Discovery Feed**
   - Swipe right (❤️) on opportunities you like
   - Swipe left (✗) to pass
   - Click on cards to view more details

3. **Try the AI Coach**
   - Select a scenario (hackathon, interview, networking, etc.)
   - Choose a practice mode (coach tips or live roleplay)
   - Get personalized icebreakers and conversation starters
   - Practice with AI personas and receive detailed feedback

4. **Browse Courses**
   - Navigate to the McGill Courses tab
   - Select your faculty
   - View courses and find collaboration opportunities

5. **Check Your Calendar**
   - View all hearted events and collaboration requests
   - Plan your campus engagement

### Creating Collaboration Requests

1. Navigate to the Discovery tab
2. Click "Create New"
3. Select the type (Collaboration Request, Event, Club, Networking)
4. Fill in details:
   - Title and description
   - Target group size (for collaborations)
   - Tags and categories
   - Event date/time (for events)
5. Submit to make it discoverable by other students

---

## 🤝 Contributing

We welcome contributions! Here's how you can help:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

### Development Guidelines

- Follow the existing code style and TypeScript patterns
- Test your changes thoroughly
- Update documentation as needed
- Keep commits focused and descriptive

---

## 🔑 API Configuration

The app uses the Google Gemini AI API for intelligent features. The following functions require API access:

- **Recommendations:** Personalized event and club suggestions
- **Match Reasons:** Explaining why items match your interests
- **Icebreakers:** Context-specific conversation starters
- **Roleplay Practice:** AI personas for social skill development
- **Feedback Analysis:** Comprehensive communication coaching

**Note:** The app includes fallback responses when the API quota is exceeded, ensuring a smooth experience even without active API calls.

---

## 📱 Features in Detail

### AI Coach Modes

1. **Coach Mode:** Get tips, icebreakers, and suggestions for scenarios
2. **Roleplay Mode:** Practice live with AI personas who simulate real people you'd meet
3. **Feedback Analysis:** Receive detailed scores and actionable improvement suggestions

### Discovery Types

- **Collaboration Requests:** Find partners for projects, labs, or study groups
- **Events:** Hackathons, frosh week, campus parties, and social gatherings
- **Clubs & Organizations:** Discover student groups aligned with your interests
- **Networking:** Internship opportunities, career fairs, and professional events

### Smart Filtering

- Filter by category and subcategory
- AI-powered relevance matching
- Interest-based recommendations
- Faculty-specific content

---

## 🏗️ Building for Production

```bash
npm run build
```

This creates an optimized production build in the `dist/` directory.

To preview the production build:
```bash
npm run preview
```

---

## 📄 License

This project was created for educational purposes. Please refer to the repository for license information.

---

## 👥 Team & Credits

Built with ❤️ for university students looking to make meaningful connections on campus.

**Powered by:**
- React & TypeScript
- Google Gemini AI
- Vite

---

## 📞 Support & Links

- **View in AI Studio:** https://ai.studio/apps/drive/13wYN7yY90-nH4vfFb9u_hpSGMIKILmbE
- **Report Issues:** Use the GitHub Issues tab
- **Questions:** Open a discussion in the repository

---

<div align="center">
  <p>Made for students, by students 🎓</p>
</div>
