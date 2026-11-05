import express from 'express';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';
import { WebSocketServer, WebSocket } from 'ws';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const httpServer = http.createServer(app);
const PORT = parseInt(process.env.PORT || '3000', 10);

app.use(express.json({ limit: '2mb' }));

// Initialize Gemini SDK with telemetry header
const apiKey = process.env.GEMINI_API_KEY || '';
const ai = new GoogleGenAI({
  apiKey,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

// ============================================================================
// 1. PERSONALIZED RECOMMENDATIONS ENDPOINT
// ============================================================================
app.post('/api/recommendations', async (req, res) => {
  try {
    const { history = [] } = req.body;

    const watchedList =
      Array.isArray(history) && history.length > 0
        ? history
            .map((item: { title: string; mediaType?: string }) => `- ${item.title} (${item.mediaType || 'movie'})`)
            .join('\n')
        : 'No watch history yet. Provide universally acclaimed top trending movies and prestige TV series.';

    const prompt = `You are the expert recommendation engine for StreamFlix, a modern cinema streaming platform.
Analyze the user's viewing history and taste profile:
${watchedList}

Based on this, generate:
1. "tasteSummary": A single engaging sentence capturing their taste profile (e.g. "Because you enjoy intense psychological thrillers and cinematic sci-fi...").
2. "recommendations": An array of 6 to 8 specific, highly acclaimed, real movies and TV series that closely align with their viewing habits.

Return strictly valid JSON in this exact structure:
{
  "tasteSummary": "string",
  "recommendations": [
    {
      "title": "Exact Title of Movie or Series",
      "mediaType": "movie" | "tv",
      "genre": "Main Genre name",
      "reason": "1 brief sentence explaining why they will love it based on what they watched"
    }
  ]
}`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
      },
    });

    const responseText = response.text || '{}';
    let parsedData;
    try {
      parsedData = JSON.parse(responseText);
    } catch {
      parsedData = {
        tasteSummary: 'Curated premium cinematic selections based on your favorites.',
        recommendations: [],
      };
    }

    res.json(parsedData);
  } catch (error) {
    console.error('[Gemini API Error - Recommendations]', error);
    res.status(500).json({
      error: 'Failed to generate recommendations',
      tasteSummary: 'Popular cinematic highlights curated for you.',
      recommendations: [],
    });
  }
});

// ============================================================================
// 2. GLOBAL AI CHATBOT ENDPOINT (General Purpose, Cinema Discovery & Recs)
// ============================================================================
app.post('/api/chat/global', async (req, res) => {
  try {
    const { messages = [], history = [], watchlist = [] } = req.body;

    const historyContext =
      Array.isArray(history) && history.length > 0
        ? history.slice(0, 12).map((h: { title: string; mediaType?: string }) => `${h.title} (${h.mediaType || 'movie'})`).join(', ')
        : 'None recorded yet';

    const watchlistContext =
      Array.isArray(watchlist) && watchlist.length > 0
        ? watchlist.slice(0, 12).map((w: { title: string; mediaType?: string }) => `${w.title} (${w.mediaType || 'movie'})`).join(', ')
        : 'Empty';

    const conversationTranscript = Array.isArray(messages)
      ? messages
          .slice(-10)
          .map((m: { role: string; text: string }) => `${m.role === 'user' ? 'User' : 'StreamFlix AI'}: ${m.text}`)
          .join('\n')
      : '';

    const systemPrompt = `You are the Global StreamFlix AI Concierge — a friendly, deeply knowledgeable cinema & TV assistant built into the StreamFlix streaming platform.
You help users discover what to watch next, give personalized recommendations, answer film/TV trivia, compare shows, suggest mood-based watchlists, and help navigate the platform.

User's Recent Watch History: ${historyContext}
User's Saved Watchlist: ${watchlistContext}

Recent Conversation:
${conversationTranscript}

Instructions:
1. Provide a helpful, engaging, well-formatted response in "reply" (use concise paragraphs or bullet points).
2. Whenever your response recommends or mentions specific playable movies or TV series that the user might want to check out, include up to 4 of them in "suggestedTitles" so the UI can render interactive Play & Watchlist cards directly in the chat. If no specific titles are being recommended, return an empty array for "suggestedTitles".

Return strictly valid JSON matching this schema:
{
  "reply": "Your conversational response to the user",
  "suggestedTitles": [
    {
      "title": "Exact Movie or TV Show Title",
      "mediaType": "movie" | "tv",
      "reason": "Short 1-line hook"
    }
  ]
}`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: systemPrompt,
      config: {
        responseMimeType: 'application/json',
      },
    });

    const raw = response.text || '{}';
    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch {
      parsed = {
        reply: raw || "I'm here to help you find great movies and TV shows! Tell me what mood or genre you're in.",
        suggestedTitles: [],
      };
    }

    res.json({
      reply: parsed.reply || "I'd love to help you find something great to stream!",
      suggestedTitles: Array.isArray(parsed.suggestedTitles) ? parsed.suggestedTitles : [],
    });
  } catch (error) {
    console.error('[Gemini API Error - Global Chat]', error);
    res.status(500).json({
      error: 'Failed to process chat message',
      reply: 'Sorry, I encountered a temporary hiccup connecting to the AI service. Please try asking again in a moment!',
      suggestedTitles: [],
    });
  }
});

// ============================================================================
// 3. PLAYER CONTEXT-AWARE AI COMPANION ENDPOINT
// ============================================================================
app.post('/api/chat/player', async (req, res) => {
  try {
    const { messages = [], mediaContext = {}, spoilerFree = true } = req.body;

    const {
      title = 'Unknown Title',
      mediaType = 'movie',
      year = '',
      overview = '',
      tagline = '',
      genres = [],
      rating = '',
      season,
      episode,
      episodeName = '',
      episodeOverview = '',
      currentTimestamp = '0:00',
      cast = [],
    } = mediaContext;

    const castSummary =
      Array.isArray(cast) && cast.length > 0
        ? cast.slice(0, 12).map((c: { name: string; character?: string }) => `${c.name} as ${c.character || 'Cast'}`).join(', ')
        : 'Not listed';

    const episodeContext =
      mediaType === 'tv'
        ? `Currently Playing: Season ${season || 1}, Episode ${episode || 1}${episodeName ? ` ("${episodeName}")` : ''}.
Episode Synopsis: ${episodeOverview || 'Not provided'}`
        : `Format: Feature Film`;

    const conversationTranscript = Array.isArray(messages)
      ? messages
          .slice(-10)
          .map((m: { role: string; text: string }) => `${m.role === 'user' ? 'Viewer' : 'Scene Companion AI'}: ${m.text}`)
          .join('\n')
      : '';

    const spoilerInstruction = spoilerFree
      ? `SPOILER-FREE MODE IS ON: The viewer is currently at timestamp ${currentTimestamp}${mediaType === 'tv' ? ` of Season ${season || 1}, Episode ${episode || 1}` : ''}. Do NOT spoil major plot twists, character deaths, or the ending that happen after their current point unless the user explicitly asks you to spoil the ending.`
      : `SPOILER-FREE MODE IS OFF: You may freely discuss the entire plot, twists, ending explanations, and lore in full detail.`;

    const prompt = `You are the StreamFlix Player AI Companion, sitting right beside the viewer while they watch "${title}" (${year}).
You have complete knowledge of this ${mediaType === 'tv' ? 'TV series' : 'movie'}, its characters, actors, lore, themes, production trivia, and episodes.

=== ACTIVE PLAYBACK CONTEXT ===
Title: ${title} (${year})
Type: ${mediaType === 'tv' ? 'TV Series' : 'Movie'}
Tagline: ${tagline || 'N/A'}
Genres: ${Array.isArray(genres) ? genres.join(', ') : ''}
Rating: ${rating}/10
Main Synopsis: ${overview}
${episodeContext}
Viewer's Current Playback Position: ${currentTimestamp}
Key Cast & Characters: ${castSummary}

=== SPOILER POLICY ===
${spoilerInstruction}

=== CONVERSATION TRANSCRIPT ===
${conversationTranscript}

Answer the viewer's latest question accurately, insightfully, and concisely with direct reference to "${title}".
Return strictly valid JSON:
{
  "reply": "Your answer to the viewer",
  "followUpSuggestions": ["Short follow-up question 1", "Short follow-up question 2"]
}`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
      },
    });

    const raw = response.text || '{}';
    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch {
      parsed = {
        reply: raw || `Ask me anything about ${title}!`,
        followUpSuggestions: [],
      };
    }

    res.json({
      reply: parsed.reply || `I'm ready to answer any questions about ${title}!`,
      followUpSuggestions: Array.isArray(parsed.followUpSuggestions) ? parsed.followUpSuggestions.slice(0, 3) : [],
    });
  } catch (error) {
    console.error('[Gemini API Error - Player Companion]', error);
    res.status(500).json({
      error: 'Failed to answer player question',
      reply: 'I ran into a temporary issue analyzing this title. Please try asking again!',
      followUpSuggestions: [],
    });
  }
});

// ============================================================================
// 4. REAL-TIME WATCH PARTY INFRASTRUCTURE (WebSockets + Authoritative State)
// ============================================================================
interface WatchPartyParticipant {
  id: string;
  name: string;
  color: string;
  isHost: boolean;
  isMuted?: boolean;
  joinedAt: number;
}

interface WatchPartyMessage {
  id: string;
  senderId: string;
  senderName: string;
  senderColor: string;
  text: string;
  timestamp: number;
  type: 'chat' | 'system' | 'reaction';
  isSpoiler?: boolean;
}

interface WatchPartyRoom {
  roomId: string;
  roomName: string;
  hostId: string;
  mediaType: 'movie' | 'tv';
  tmdbId: number;
  title: string;
  posterPath?: string;
  backdropPath?: string;
  season?: number;
  episode?: number;
  position: number;
  isPlaying: boolean;
  updatedAt: number;
  createdAt: number;
  security: 'public' | 'password' | 'invite';
  password?: string;
  maxParticipants: number;
  hostControlsOnly: boolean;
  genres?: string[];
  mutedUserIds: Set<string>;
  kickedUserIds: Set<string>;
  participants: Map<string, { info: WatchPartyParticipant; ws: WebSocket }>;
  messages: WatchPartyMessage[];
}

export interface ClosedWatchParty {
  id: string;
  roomId: string;
  roomName: string;
  mediaType: 'movie' | 'tv';
  tmdbId: number;
  title: string;
  posterPath?: string;
  backdropPath?: string;
  season?: number;
  episode?: number;
  hostName: string;
  totalParticipants: number;
  participantNames: string[];
  startedAt: number;
  closedAt: number;
  durationSeconds: number;
  genres?: string[];
  messages: WatchPartyMessage[];
  replayEvents?: Array<{ timestamp: number; position: number; event: string; user: string }>;
}

const watchPartyRooms = new Map<string, WatchPartyRoom>();

// Seeded rich closed watch parties for instant replay demonstration
const closedWatchParties: ClosedWatchParty[] = [
  {
    id: 'archived_dune_2',
    roomId: 'SF-7821',
    roomName: 'Dune: Part Two Friday Premiere Squad',
    mediaType: 'movie',
    tmdbId: 693134,
    title: 'Dune: Part Two',
    posterPath: '/8b8R8l88Qje9dn9OE8PY05Nxl1X.jpg',
    backdropPath: '/xOMo8BRK7PfcJv9JCnx7s520fff.jpg',
    genres: ['Sci-Fi', 'Adventure', 'Drama'],
    hostName: 'PaulMuadDib',
    totalParticipants: 8,
    participantNames: ['PaulMuadDib', 'Chani_Fremen', 'LadyJessica', 'StilgarVoice', 'GurneyHalleck', 'SciFiWatcher', 'CinemaLover', 'DenisFan99'],
    startedAt: Date.now() - 1000 * 60 * 60 * 28,
    closedAt: Date.now() - 1000 * 60 * 60 * 25,
    durationSeconds: 9960,
    messages: [
      {
        id: 'cmsg_1',
        senderId: 'user_1',
        senderName: 'PaulMuadDib',
        senderColor: '#f59e0b',
        text: 'Welcome everyone to the Dune 2 watch party! Grab your popcorn!',
        timestamp: Date.now() - 1000 * 60 * 60 * 28 + 15000,
        type: 'chat',
        isSpoiler: false,
      },
      {
        id: 'cmsg_2',
        senderId: 'user_2',
        senderName: 'StilgarVoice',
        senderColor: '#10b981',
        text: 'Lisan al Gaib! The sound design in this opening sequence gives me goosebumps every single time.',
        timestamp: Date.now() - 1000 * 60 * 60 * 28 + 140000,
        type: 'chat',
        isSpoiler: false,
      },
      {
        id: 'cmsg_3',
        senderId: 'user_3',
        senderName: 'LadyJessica',
        senderColor: '#8b5cf6',
        text: 'Wait until minute 55 when the Water of Life ritual takes place — pay attention to Alia\'s voice in her head!',
        timestamp: Date.now() - 1000 * 60 * 60 * 28 + 420000,
        type: 'chat',
        isSpoiler: true,
      },
      {
        id: 'cmsg_4',
        senderId: 'user_4',
        senderName: 'Chani_Fremen',
        senderColor: '#3b82f6',
        text: 'Zendaya’s reaction in that scene completely redefines the ending book lore. Super emotional.',
        timestamp: Date.now() - 1000 * 60 * 60 * 28 + 620000,
        type: 'chat',
        isSpoiler: true,
      },
      {
        id: 'cmsg_5',
        senderId: 'user_5',
        senderName: 'GurneyHalleck',
        senderColor: '#ec4899',
        text: 'Feyd-Rautha gladiator arena in black and white infrared! Hans Zimmer went all out!',
        timestamp: Date.now() - 1000 * 60 * 60 * 28 + 2400000,
        type: 'chat',
        isSpoiler: false,
      },
      {
        id: 'cmsg_6',
        senderId: 'user_1',
        senderName: 'PaulMuadDib',
        senderColor: '#f59e0b',
        text: 'Final knife duel approaching. No spoilers for anyone who hasn\'t seen the knife twist!',
        timestamp: Date.now() - 1000 * 60 * 60 * 28 + 7200000,
        type: 'chat',
        isSpoiler: true,
      },
      {
        id: 'cmsg_7',
        senderId: 'system',
        senderName: 'Watch Party',
        senderColor: '#38bdf8',
        text: 'Host PaulMuadDib concluded the watch party. Session archived.',
        timestamp: Date.now() - 1000 * 60 * 60 * 25,
        type: 'system',
      },
    ],
  },
  {
    id: 'archived_stranger_things',
    roomId: 'SF-4402',
    roomName: 'Hawkins Late Night Marathon (S4 E9 Finale)',
    mediaType: 'tv',
    tmdbId: 66732,
    title: 'Stranger Things',
    season: 4,
    episode: 9,
    posterPath: '/49WJfeN0moxb9IPfGn8AIqMGskD.jpg',
    backdropPath: '/56v2KjBlU4XaOv9rVYEQypROD7P.jpg',
    hostName: 'ElevenPower',
    totalParticipants: 6,
    participantNames: ['ElevenPower', 'DustinBuns', 'EddieMunsonRock', 'SteveHarrington', 'NancyWheeler', 'LucasSinclair'],
    startedAt: Date.now() - 1000 * 60 * 60 * 72,
    closedAt: Date.now() - 1000 * 60 * 60 * 69,
    durationSeconds: 8400,
    messages: [
      {
        id: 'st_1',
        senderId: 'u_eddie',
        senderName: 'EddieMunsonRock',
        senderColor: '#f52432',
        text: 'Master of Puppets solo incoming on top of the trailer! Best guitar scene in TV history!',
        timestamp: Date.now() - 1000 * 60 * 60 * 72 + 60000,
        type: 'chat',
        isSpoiler: false,
      },
      {
        id: 'st_2',
        senderId: 'u_dustin',
        senderName: 'DustinBuns',
        senderColor: '#10b981',
        text: 'Warning! Major tearjerker at timestamp 1:45:00 with the demobats... brace yourselves 😭',
        timestamp: Date.now() - 1000 * 60 * 60 * 72 + 180000,
        type: 'chat',
        isSpoiler: true,
      },
      {
        id: 'st_3',
        senderId: 'u_steve',
        senderName: 'SteveHarrington',
        senderColor: '#3b82f6',
        text: 'The Upside Down lightning storm effect is insane in 4K.',
        timestamp: Date.now() - 1000 * 60 * 60 * 72 + 300000,
        type: 'chat',
        isSpoiler: false,
      },
      {
        id: 'st_4',
        senderId: 'u_eleven',
        senderName: 'ElevenPower',
        senderColor: '#ec4899',
        text: 'Vecna’s mind lair fight begins! Kate Bush running up that hill melody in the orchestral score!',
        timestamp: Date.now() - 1000 * 60 * 60 * 72 + 500000,
        type: 'chat',
        isSpoiler: true,
      },
      {
        id: 'st_5',
        senderId: 'system',
        senderName: 'Watch Party',
        senderColor: '#38bdf8',
        text: 'Party closed by ElevenPower. All members enjoyed 2h 20m of playback.',
        timestamp: Date.now() - 1000 * 60 * 60 * 69,
        type: 'system',
      },
    ],
  },
  {
    id: 'archived_interstellar',
    roomId: 'SF-9104',
    roomName: 'Nolan Masters: Interstellar In-Depth Discussion',
    mediaType: 'movie',
    tmdbId: 157336,
    title: 'Interstellar',
    posterPath: '/gEU2QniE6E77NI6lCU6MxlNBvIx.jpg',
    backdropPath: '/xJHokMbljvjADYdit5fK5VQsXEG.jpg',
    genres: ['Sci-Fi', 'Drama'],
    hostName: 'DrBrandAstrophysics',
    totalParticipants: 10,
    participantNames: ['DrBrandAstrophysics', 'CooperTesseract', 'MurphEureka', 'TARS_Bot', 'KipThorneFan', 'GargantuaWatcher', 'HansZimmerEcho', 'RelativitySeeker', 'CinematographyGeek', 'WormholeTraveler'],
    startedAt: Date.now() - 1000 * 60 * 60 * 120,
    closedAt: Date.now() - 1000 * 60 * 60 * 117,
    durationSeconds: 10140,
    messages: [
      {
        id: 'int_1',
        senderId: 'cooper',
        senderName: 'CooperTesseract',
        senderColor: '#3b82f6',
        text: 'Docking scene rotation: "It\'s not possible." "No, it\'s necessary." Still gives me chills.',
        timestamp: Date.now() - 1000 * 60 * 60 * 120 + 35000,
        type: 'chat',
        isSpoiler: false,
      },
      {
        id: 'int_2',
        senderId: 'murph',
        senderName: 'MurphEureka',
        senderColor: '#f59e0b',
        text: 'Don\'t spoil the 5D bookshelf mystery for first time watchers please!',
        timestamp: Date.now() - 1000 * 60 * 60 * 120 + 120000,
        type: 'chat',
        isSpoiler: false,
      },
      {
        id: 'int_3',
        senderId: 'tars',
        senderName: 'TARS_Bot',
        senderColor: '#10b981',
        text: 'Honesty parameter set to 90%. That ticking sound in the Miller Planet tracks represents 1 full day passing on Earth every single tick.',
        timestamp: Date.now() - 1000 * 60 * 60 * 120 + 400000,
        type: 'chat',
        isSpoiler: false,
      },
      {
        id: 'int_4',
        senderId: 'cooper',
        senderName: 'CooperTesseract',
        senderColor: '#3b82f6',
        text: 'The wristwatch morse code revelation at the end — it was Cooper all along communicating across gravitational anomalies.',
        timestamp: Date.now() - 1000 * 60 * 60 * 120 + 600000,
        type: 'chat',
        isSpoiler: true,
      },
      {
        id: 'int_5',
        senderId: 'system',
        senderName: 'Watch Party',
        senderColor: '#38bdf8',
        text: 'Host DrBrandAstrophysics concluded party SF-9104. Session saved.',
        timestamp: Date.now() - 1000 * 60 * 60 * 117,
        type: 'system',
      },
    ],
  },
  {
    id: 'archived_spiderverse',
    roomId: 'SF-5521',
    roomName: 'Spider-Verse Animation Society Friday Screening',
    mediaType: 'movie',
    tmdbId: 569094,
    title: 'Spider-Man: Across the Spider-Verse',
    posterPath: '/8Vt6mWEReuy4Of61Lnj5Xj704m8.jpg',
    backdropPath: '/4HodYYKEIsGOdinkGi2Ucz6X9i0.jpg',
    genres: ['Animation', 'Action', 'Adventure'],
    hostName: 'MilesWeb99',
    totalParticipants: 9,
    participantNames: ['MilesWeb99', 'GwenStacy2099', 'PeterBParker', 'PavitrPrabhakar', 'HobieBrownPunk', 'DustinBuns', 'Chani_Fremen'],
    startedAt: Date.now() - 1000 * 60 * 60 * 72,
    closedAt: Date.now() - 1000 * 60 * 60 * 69,
    durationSeconds: 8400,
    messages: [
      {
        id: 'sp_1',
        senderId: 'miles',
        senderName: 'MilesWeb99',
        senderColor: '#ef4444',
        text: 'Welcome to the Spider-Verse watch party everyone! What an animation masterpiece!',
        timestamp: Date.now() - 1000 * 60 * 60 * 72 + 10000,
        type: 'chat',
      },
      {
        id: 'sp_2',
        senderId: 'gwen',
        senderName: 'GwenStacy2099',
        senderColor: '#ec4899',
        text: 'The watercolor mood shifts on Earth-65 are so expressive.',
        timestamp: Date.now() - 1000 * 60 * 60 * 72 + 60000,
        type: 'chat',
      },
    ],
  },
  {
    id: 'archived_stranger_things',
    roomId: 'SF-3310',
    roomName: 'Hawkins Watchers: Stranger Things S4 Epic Finale',
    mediaType: 'tv',
    tmdbId: 66732,
    title: 'Stranger Things',
    posterPath: '/49WJfeN0moxb9IPfGn8AIqMGskD.jpg',
    backdropPath: '/56v2KjBlU4XaOv9rVYEQypROD7P.jpg',
    season: 4,
    episode: 9,
    genres: ['Sci-Fi', 'Horror', 'Drama'],
    hostName: 'ElevenPower',
    totalParticipants: 7,
    participantNames: ['ElevenPower', 'DustinBuns', 'MikeWheeler_80s', 'LucasSinclair', 'MaxMayfield', 'SteveTheHair', 'NancyReporter'],
    startedAt: Date.now() - 1000 * 60 * 60 * 48,
    closedAt: Date.now() - 1000 * 60 * 60 * 45,
    durationSeconds: 8880,
    messages: [
      {
        id: 'st_1',
        senderId: 'eleven',
        senderName: 'ElevenPower',
        senderColor: '#ec4899',
        text: 'Two and a half hours feature length finale! Get your eggos ready!',
        timestamp: Date.now() - 1000 * 60 * 60 * 48 + 12000,
        type: 'chat',
      },
      {
        id: 'st_2',
        senderId: 'dustin',
        senderName: 'DustinBuns',
        senderColor: '#10b981',
        text: 'Eddie Munson master of puppets guitar solo incoming!! Most metal concert in history!',
        timestamp: Date.now() - 1000 * 60 * 60 * 48 + 240000,
        type: 'chat',
      },
    ],
  },
];

// Initialize default active live watch party room SF-4200
const seedHostClient = {
  info: {
    id: 'client_host_paul',
    name: 'PaulMuadDib',
    color: '#f59e0b',
    isHost: true,
    joinedAt: Date.now() - 1000 * 60 * 35,
  },
  ws: { readyState: 1, send: () => {} } as unknown as WebSocket,
};

const seedFriendClient = {
  info: {
    id: 'client_friend_dustin',
    name: 'DustinBuns',
    color: '#10b981',
    isHost: false,
    joinedAt: Date.now() - 1000 * 60 * 30,
  },
  ws: { readyState: 1, send: () => {} } as unknown as WebSocket,
};

const seedViewerClient = {
  info: {
    id: 'client_friend_chani',
    name: 'Chani_Fremen',
    color: '#3b82f6',
    isHost: false,
    joinedAt: Date.now() - 1000 * 60 * 20,
  },
  ws: { readyState: 1, send: () => {} } as unknown as WebSocket,
};

const initialLiveRoom: WatchPartyRoom = {
  roomId: 'SF-4200',
  roomName: 'Dune: Part Two Arrakis Watch Party',
  hostId: 'client_host_paul',
  mediaType: 'movie',
  tmdbId: 693134,
  title: 'Dune: Part Two',
  posterPath: '/8b8R8l88Qje9dn9OE8PY05Nxl1X.jpg',
  backdropPath: '/xOMo8BRK7PfcJv9JCnx7s520fff.jpg',
  position: 2145,
  isPlaying: true,
  updatedAt: Date.now(),
  createdAt: Date.now() - 1000 * 60 * 35,
  security: 'public',
  maxParticipants: 50,
  hostControlsOnly: false,
  genres: ['Sci-Fi', 'Adventure', 'Drama'],
  mutedUserIds: new Set(),
  kickedUserIds: new Set(),
  participants: new Map([
    ['client_host_paul', seedHostClient],
    ['client_friend_dustin', seedFriendClient],
    ['client_friend_chani', seedViewerClient],
  ]),
  messages: [
    {
      id: 'live_m1',
      senderId: 'client_host_paul',
      senderName: 'PaulMuadDib',
      senderColor: '#f59e0b',
      text: 'Welcome to the live Dune 2 screening! Feel free to sync your playback anytime.',
      timestamp: Date.now() - 1000 * 60 * 34,
      type: 'chat',
    },
    {
      id: 'live_m2',
      senderId: 'client_friend_dustin',
      senderName: 'DustinBuns',
      senderColor: '#10b981',
      text: 'Soundtrack by Hans Zimmer is so good right now!',
      timestamp: Date.now() - 1000 * 60 * 25,
      type: 'chat',
    },
  ],
};

watchPartyRooms.set('SF-4200', initialLiveRoom);

function serializeRoomState(room: WatchPartyRoom) {
  return {
    roomId: room.roomId,
    roomName: room.roomName,
    hostId: room.hostId,
    mediaType: room.mediaType,
    tmdbId: room.tmdbId,
    title: room.title,
    posterPath: room.posterPath,
    backdropPath: room.backdropPath,
    season: room.season,
    episode: room.episode,
    position: room.position,
    isPlaying: room.isPlaying,
    updatedAt: room.updatedAt,
    createdAt: room.createdAt,
    security: room.security,
    isPasswordProtected: Boolean(room.password),
    maxParticipants: room.maxParticipants,
    hostControlsOnly: room.hostControlsOnly,
    participants: Array.from(room.participants.values()).map((p) => ({
      ...p.info,
      isMuted: room.mutedUserIds.has(p.info.id),
    })),
    messages: room.messages.slice(-150),
  };
}

function broadcastToRoom(room: WatchPartyRoom, payload: unknown, excludeClientId?: string) {
  const data = JSON.stringify(payload);
  for (const [clientId, entry] of room.participants.entries()) {
    if (excludeClientId && clientId === excludeClientId) continue;
    if (entry.ws.readyState === WebSocket.OPEN) {
      entry.ws.send(data);
    }
  }
}

// ----------------------------------------------------------------------------
// REST ENDPOINTS FOR WATCH PARTIES
// ----------------------------------------------------------------------------

// 1. List active live watch parties (with filters)
app.get('/api/watchparty/rooms', (req, res) => {
  const tmdbId = req.query.tmdbId ? Number(req.query.tmdbId) : undefined;
  const mediaType = req.query.mediaType as string | undefined;

  const list = Array.from(watchPartyRooms.values())
    .filter((room) => room.participants.size > 0)
    .filter((room) => {
      if (tmdbId && room.tmdbId !== tmdbId) return false;
      if (mediaType && room.mediaType !== mediaType) return false;
      return true;
    })
    .map((room) => ({
      roomId: room.roomId,
      roomName: room.roomName || `${room.title} Party`,
      title: room.title,
      mediaType: room.mediaType,
      tmdbId: room.tmdbId,
      posterPath: room.posterPath,
      backdropPath: room.backdropPath,
      season: room.season,
      episode: room.episode,
      position: room.position,
      participantCount: room.participants.size,
      maxParticipants: room.maxParticipants,
      hostName: room.participants.get(room.hostId)?.info.name || 'Host',
      security: room.security,
      isPasswordProtected: Boolean(room.password),
      hostControlsOnly: room.hostControlsOnly,
      genres: room.genres || [],
      participants: Array.from(room.participants.values()).map((p) => ({
        id: p.info.id,
        name: p.info.name,
        color: p.info.color,
        isHost: p.info.isHost,
      })),
      createdAt: room.createdAt,
    }));

  res.json({ rooms: list });
});

// 2. Create a new Watch Party with security options
app.post('/api/watchparty/create', (req, res) => {
  try {
    const {
      roomName,
      mediaType = 'movie',
      tmdbId = 0,
      title = 'Featured Title',
      posterPath,
      backdropPath,
      season = 1,
      episode = 1,
      security = 'public',
      password = '',
      maxParticipants = 50,
      hostControlsOnly = false,
      initialPosition = 0,
      genres = [],
    } = req.body;

    const generatedId = `SF-${Math.floor(1000 + Math.random() * 9000)}`;
    const finalRoomId = generatedId.toUpperCase();

    const newRoom: WatchPartyRoom = {
      roomId: finalRoomId,
      roomName: String(roomName || `${title} Party`).trim().slice(0, 60),
      hostId: '', // Set when host joins WebSocket
      mediaType,
      tmdbId: Number(tmdbId),
      title: String(title),
      posterPath,
      backdropPath,
      season: Number(season),
      episode: Number(episode),
      position: Math.max(0, Number(initialPosition)),
      isPlaying: true,
      updatedAt: Date.now(),
      createdAt: Date.now(),
      security: security === 'password' || security === 'invite' ? security : 'public',
      password: security === 'password' && password ? String(password).trim() : undefined,
      maxParticipants: Math.min(100, Math.max(2, Number(maxParticipants) || 50)),
      hostControlsOnly: Boolean(hostControlsOnly),
      genres: Array.isArray(genres) ? genres : [],
      mutedUserIds: new Set(),
      kickedUserIds: new Set(),
      participants: new Map(),
      messages: [],
    };

    watchPartyRooms.set(finalRoomId, newRoom);

    res.json({
      success: true,
      roomId: finalRoomId,
      room: {
        roomId: newRoom.roomId,
        roomName: newRoom.roomName,
        title: newRoom.title,
        mediaType: newRoom.mediaType,
        tmdbId: newRoom.tmdbId,
        security: newRoom.security,
        isPasswordProtected: Boolean(newRoom.password),
        maxParticipants: newRoom.maxParticipants,
        hostControlsOnly: newRoom.hostControlsOnly,
        genres: newRoom.genres,
      },
    });
  } catch (err) {
    console.error('[WatchParty Create Error]', err);
    res.status(500).json({ error: 'Failed to create watch party room' });
  }
});

// 3. Verify password for joining a protected party room
app.post('/api/watchparty/verify-password', (req, res) => {
  const { roomId, password } = req.body;
  if (!roomId) return res.status(400).json({ valid: false, error: 'Missing room ID' });

  const room = watchPartyRooms.get(String(roomId).trim().toUpperCase());
  if (!room) {
    return res.status(404).json({ valid: false, error: 'Room does not exist or has expired' });
  }

  if (room.security !== 'password' || !room.password) {
    return res.json({ valid: true });
  }

  const isValid = room.password === String(password || '').trim();
  res.json({ valid: isValid, error: isValid ? undefined : 'Incorrect password' });
});

// 4. List closed / archived watch parties (read-only replay list)
app.get('/api/watchparty/closed', (_req, res) => {
  const summaries = closedWatchParties.map((p) => ({
    id: p.id,
    roomId: p.roomId,
    roomName: p.roomName,
    mediaType: p.mediaType,
    tmdbId: p.tmdbId,
    title: p.title,
    posterPath: p.posterPath,
    backdropPath: p.backdropPath,
    season: p.season,
    episode: p.episode,
    hostName: p.hostName,
    totalParticipants: p.totalParticipants,
    participantNames: p.participantNames,
    startedAt: p.startedAt,
    closedAt: p.closedAt,
    durationSeconds: p.durationSeconds,
    genres: p.genres || [],
    messageCount: p.messages.length,
  }));

  res.json({ parties: summaries });
});

// 5. Group Watch Party Statistics Dashboard endpoint
app.get('/api/watchparty/stats', (_req, res) => {
  let totalDurationSeconds = 0;
  let totalParticipantsCount = 0;
  const genreCountMap: Record<string, { count: number; seconds: number }> = {};
  const hostStatsMap: Record<string, { name: string; partyCount: number; seconds: number }> = {};

  for (const party of closedWatchParties) {
    totalDurationSeconds += party.durationSeconds || 0;
    totalParticipantsCount += party.totalParticipants || (party.participantNames?.length || 1);

    const genres = party.genres && party.genres.length > 0 ? party.genres : ['Sci-Fi', 'Drama'];
    for (const g of genres) {
      if (!genreCountMap[g]) genreCountMap[g] = { count: 0, seconds: 0 };
      genreCountMap[g].count += 1;
      genreCountMap[g].seconds += party.durationSeconds || 0;
    }

    const h = party.hostName || 'Host';
    if (!hostStatsMap[h]) hostStatsMap[h] = { name: h, partyCount: 0, seconds: 0 };
    hostStatsMap[h].partyCount += 1;
    hostStatsMap[h].seconds += party.durationSeconds || 0;
  }

  for (const room of watchPartyRooms.values()) {
    const elapsed = Math.max(60, Math.floor((Date.now() - room.createdAt) / 1000));
    totalDurationSeconds += elapsed;
    totalParticipantsCount += room.participants.size;

    const genres = room.genres && room.genres.length > 0 ? room.genres : ['Sci-Fi', 'Adventure'];
    for (const g of genres) {
      if (!genreCountMap[g]) genreCountMap[g] = { count: 0, seconds: 0 };
      genreCountMap[g].count += 1;
      genreCountMap[g].seconds += elapsed;
    }

    const hostName = room.participants.get(room.hostId)?.info.name || 'Host';
    if (!hostStatsMap[hostName]) hostStatsMap[hostName] = { name: hostName, partyCount: 0, seconds: 0 };
    hostStatsMap[hostName].partyCount += 1;
    hostStatsMap[hostName].seconds += elapsed;
  }

  const totalSessions = closedWatchParties.length + watchPartyRooms.size;
  const totalHours = Number((totalDurationSeconds / 3600).toFixed(1));

  const popularGenres = Object.entries(genreCountMap)
    .map(([genre, data]) => ({
      genre,
      count: data.count,
      totalHours: Number((data.seconds / 3600).toFixed(1)),
      percentage: totalSessions > 0 ? Math.round((data.count / totalSessions) * 100) : 0,
    }))
    .sort((a, b) => b.count - a.count || b.totalHours - a.totalHours);

  const topHosts = Object.values(hostStatsMap)
    .map((h) => ({
      name: h.name,
      partyCount: h.partyCount,
      totalHours: Number((h.seconds / 3600).toFixed(1)),
    }))
    .sort((a, b) => b.partyCount - a.partyCount || b.totalHours - a.totalHours);

  res.json({
    totalDurationSeconds,
    totalHours,
    totalSessions,
    totalParticipantsCount,
    popularGenres,
    topHosts,
  });
});

// 5. Get full replay data for a closed party
app.get('/api/watchparty/closed/:id', (req, res) => {
  const party = closedWatchParties.find((p) => p.id === req.params.id);
  if (!party) {
    return res.status(404).json({ error: 'Archived party session not found' });
  }
  res.json({ party });
});

// 6. Host closes party and archives to closed list
app.post('/api/watchparty/rooms/:id/close', (req, res) => {
  const { id } = req.params;
  const { hostClientId } = req.body;
  const normalizedId = String(id).trim().toUpperCase();

  const room = watchPartyRooms.get(normalizedId);
  if (!room) {
    return res.status(404).json({ error: 'Active room not found' });
  }

  if (room.hostId && hostClientId && room.hostId !== hostClientId) {
    return res.status(403).json({ error: 'Only the party host can close this room' });
  }

  const archivedId = `archived_${room.roomId.toLowerCase()}_${Date.now()}`;
  const hostName = room.participants.get(room.hostId)?.info.name || 'Host';

  const archived: ClosedWatchParty = {
    id: archivedId,
    roomId: room.roomId,
    roomName: room.roomName || `${room.title} Watch Party`,
    mediaType: room.mediaType,
    tmdbId: room.tmdbId,
    title: room.title,
    posterPath: room.posterPath,
    backdropPath: room.backdropPath,
    season: room.season,
    episode: room.episode,
    hostName,
    totalParticipants: Math.max(room.participants.size, 1),
    participantNames: Array.from(room.participants.values()).map((p) => p.info.name),
    startedAt: room.createdAt,
    closedAt: Date.now(),
    durationSeconds: Math.floor((Date.now() - room.createdAt) / 1000),
    messages: [
      ...room.messages,
      {
        id: `sys_close_${Date.now()}`,
        senderId: 'system',
        senderName: 'Watch Party',
        senderColor: '#ef4444',
        text: `Party closed by ${hostName}. Session has been saved to the Closed Parties archive.`,
        timestamp: Date.now(),
        type: 'system',
      },
    ],
  };

  closedWatchParties.unshift(archived);

  // Notify all connected clients in the room that party was closed
  broadcastToRoom(room, {
    type: 'room:closed',
    payload: {
      message: 'This watch party has been concluded by the host.',
      archivedId,
      roomName: archived.roomName,
    },
  });

  // Remove room from active memory
  watchPartyRooms.delete(normalizedId);

  res.json({ success: true, archivedId });
});

const wss = new WebSocketServer({ noServer: true });

httpServer.on('upgrade', (request, socket, head) => {
  const url = new URL(request.url || '/', `http://${request.headers.host || 'localhost'}`);
  if (url.pathname === '/ws/watchparty') {
    wss.handleUpgrade(request, socket, head, (ws) => {
      wss.emit('connection', ws, request);
    });
  }
});

wss.on('connection', (ws: WebSocket) => {
  let currentRoomId: string | null = null;
  let currentClientId: string | null = null;

  ws.on('message', (raw) => {
    try {
      const msg = JSON.parse(String(raw));
      const { type, payload } = msg;

      if (type === 'room:join') {
        const {
          roomId,
          clientId,
          userName,
          userColor,
          mediaType = 'movie',
          tmdbId = 0,
          title = 'Featured Title',
          season = 1,
          episode = 1,
          position = 0,
          password = '',
        } = payload || {};

        if (!roomId || !clientId) return;
        const normalizedRoomId = String(roomId).trim().toUpperCase();
        const cid = String(clientId);

        let room = watchPartyRooms.get(normalizedRoomId);

        // Security check: has this user been kicked?
        if (room && room.kickedUserIds.has(cid)) {
          ws.send(
            JSON.stringify({
              type: 'room:error',
              payload: {
                code: 'KICKED',
                message: 'You have been removed from this watch party and cannot rejoin.',
              },
            })
          );
          ws.close();
          return;
        }

        // Security check: password validation for protected rooms
        if (room && room.security === 'password' && room.password && room.hostId !== cid) {
          if (String(password).trim() !== room.password) {
            ws.send(
              JSON.stringify({
                type: 'room:error',
                payload: {
                  code: 'INVALID_PASSWORD',
                  message: 'Incorrect password for this protected party.',
                },
              })
            );
            return;
          }
        }

        // Security check: room participant limit
        if (room && !room.participants.has(cid) && room.participants.size >= room.maxParticipants) {
          ws.send(
            JSON.stringify({
              type: 'room:error',
              payload: {
                code: 'ROOM_FULL',
                message: `This watch party is full (maximum ${room.maxParticipants} participants).`,
              },
            })
          );
          return;
        }

        // Leave previous room if switching
        if (currentRoomId && currentRoomId !== normalizedRoomId && currentClientId) {
          const prevRoom = watchPartyRooms.get(currentRoomId);
          if (prevRoom) {
            prevRoom.participants.delete(currentClientId);
            if (prevRoom.participants.size === 0) {
              watchPartyRooms.delete(currentRoomId);
            } else {
              broadcastToRoom(prevRoom, {
                type: 'room:state',
                payload: serializeRoomState(prevRoom),
              });
            }
          }
        }

        currentRoomId = normalizedRoomId;
        currentClientId = cid;

        const isCreating = !room || room.participants.size === 0;

        if (!room) {
          room = {
            roomId: normalizedRoomId,
            roomName: `${title} Party`,
            hostId: currentClientId,
            mediaType,
            tmdbId,
            title,
            season,
            episode,
            position,
            isPlaying: true,
            updatedAt: Date.now(),
            createdAt: Date.now(),
            security: 'public',
            maxParticipants: 50,
            hostControlsOnly: false,
            mutedUserIds: new Set(),
            kickedUserIds: new Set(),
            participants: new Map(),
            messages: [],
          };
          watchPartyRooms.set(normalizedRoomId, room);
        }

        const existingParticipant = room.participants.get(currentClientId);
        const participantInfo: WatchPartyParticipant = {
          id: currentClientId,
          name: userName || existingParticipant?.info.name || 'Cinema Fan',
          color: userColor || existingParticipant?.info.color || '#f52432',
          isHost: room.hostId === currentClientId || isCreating,
          isMuted: room.mutedUserIds.has(currentClientId),
          joinedAt: existingParticipant?.info.joinedAt || Date.now(),
        };

        if (isCreating) {
          room.hostId = currentClientId;
          participantInfo.isHost = true;
        }

        const isNewJoin = !existingParticipant;
        room.participants.set(currentClientId, { info: participantInfo, ws });

        if (isNewJoin) {
          const sysMsg: WatchPartyMessage = {
            id: `sys_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
            senderId: 'system',
            senderName: 'Watch Party',
            senderColor: '#38bdf8',
            text: `${participantInfo.name} joined the watch party`,
            timestamp: Date.now(),
            type: 'system',
          };
          room.messages.push(sysMsg);
        }

        // Send full authoritative room state to everyone in the room
        broadcastToRoom(room, {
          type: 'room:state',
          payload: serializeRoomState(room),
        });
      } else if (type === 'sync:playback') {
        if (!currentRoomId || !currentClientId) return;
        const room = watchPartyRooms.get(currentRoomId);
        if (!room) return;

        // Security check: Host controls only
        if (room.hostControlsOnly && room.hostId !== currentClientId) {
          ws.send(
            JSON.stringify({
              type: 'room:error',
              payload: {
                code: 'PERMISSION_DENIED',
                message: 'Host-only sync is enabled. Only the host can seek or change playback.',
              },
            })
          );
          return;
        }

        const { season, episode, position, isPlaying, title, tmdbId, mediaType, announce } = payload || {};

        if (typeof season === 'number') room.season = season;
        if (typeof episode === 'number') room.episode = episode;
        if (typeof position === 'number') room.position = Math.max(0, Math.floor(position));
        if (typeof isPlaying === 'boolean') room.isPlaying = isPlaying;
        if (title) room.title = title;
        if (tmdbId) room.tmdbId = tmdbId;
        if (mediaType) room.mediaType = mediaType;
        room.updatedAt = Date.now();

        const sender = room.participants.get(currentClientId)?.info;
        if (announce && sender) {
          const mins = Math.floor(room.position / 60);
          const secs = (room.position % 60).toString().padStart(2, '0');
          const epTag = room.mediaType === 'tv' ? ` (S${room.season || 1} E${room.episode || 1})` : '';
          const sysMsg: WatchPartyMessage = {
            id: `sync_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
            senderId: 'system',
            senderName: 'Watch Party',
            senderColor: '#10b981',
            text: `${sender.name} synced everyone to ${mins}:${secs}${epTag}`,
            timestamp: Date.now(),
            type: 'system',
          };
          room.messages.push(sysMsg);
        }

        broadcastToRoom(room, {
          type: 'playback:synced',
          payload: {
            roomId: room.roomId,
            triggeredBy: currentClientId,
            triggeredByName: sender?.name || 'Member',
            mediaType: room.mediaType,
            tmdbId: room.tmdbId,
            title: room.title,
            season: room.season,
            episode: room.episode,
            position: room.position,
            isPlaying: room.isPlaying,
            updatedAt: room.updatedAt,
            messages: room.messages.slice(-100),
          },
        });
      } else if (type === 'chat:message') {
        if (!currentRoomId || !currentClientId) return;
        const room = watchPartyRooms.get(currentRoomId);
        if (!room) return;

        // Security check: is the user muted?
        if (room.mutedUserIds.has(currentClientId)) {
          ws.send(
            JSON.stringify({
              type: 'room:error',
              payload: {
                code: 'MUTED',
                message: 'You have been muted by the party host and cannot send messages.',
              },
            })
          );
          return;
        }

        const { id, text, isSpoiler = false } = payload || {};
        if (!text || !String(text).trim()) return;

        const msgId = id || `msg_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
        // Idempotency guard
        if (room.messages.some((m) => m.id === msgId)) return;

        const sender = room.participants.get(currentClientId)?.info;
        const chatMsg: WatchPartyMessage = {
          id: msgId,
          senderId: currentClientId,
          senderName: sender?.name || 'Viewer',
          senderColor: sender?.color || '#f52432',
          text: String(text).trim().slice(0, 500),
          timestamp: Date.now(),
          type: 'chat',
          isSpoiler: Boolean(isSpoiler),
        };

        room.messages.push(chatMsg);
        if (room.messages.length > 200) {
          room.messages = room.messages.slice(-200);
        }

        broadcastToRoom(room, {
          type: 'chat:new_message',
          payload: chatMsg,
        });
      } else if (type === 'reaction:send') {
        if (!currentRoomId || !currentClientId) return;
        const room = watchPartyRooms.get(currentRoomId);
        if (!room) return;

        // Muted users cannot send reactions either
        if (room.mutedUserIds.has(currentClientId)) return;

        const { emoji, id } = payload || {};
        if (!emoji) return;

        const sender = room.participants.get(currentClientId)?.info;
        broadcastToRoom(room, {
          type: 'reaction:burst',
          payload: {
            id: id || `react_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
            emoji: String(emoji),
            senderId: currentClientId,
            senderName: sender?.name || 'Viewer',
            senderColor: sender?.color || '#f52432',
            timestamp: Date.now(),
          },
        });
      } else if (type === 'user:rename') {
        if (!currentRoomId || !currentClientId) return;
        const room = watchPartyRooms.get(currentRoomId);
        if (!room) return;

        const { newName } = payload || {};
        const participant = room.participants.get(currentClientId);
        if (participant && newName && String(newName).trim()) {
          participant.info.name = String(newName).trim().slice(0, 30);
          broadcastToRoom(room, {
            type: 'room:state',
            payload: serializeRoomState(room),
          });
        }
      } else if (type === 'admin:mute') {
        // Host only action
        if (!currentRoomId || !currentClientId) return;
        const room = watchPartyRooms.get(currentRoomId);
        if (!room || room.hostId !== currentClientId) return;

        const { targetClientId, isMuted } = payload || {};
        if (!targetClientId || targetClientId === room.hostId) return;

        if (isMuted) {
          room.mutedUserIds.add(targetClientId);
        } else {
          room.mutedUserIds.delete(targetClientId);
        }

        const target = room.participants.get(targetClientId)?.info;
        if (target) {
          target.isMuted = Boolean(isMuted);
          room.messages.push({
            id: `sys_mute_${Date.now()}`,
            senderId: 'system',
            senderName: 'Watch Party',
            senderColor: isMuted ? '#f59e0b' : '#10b981',
            text: isMuted
              ? `${target.name} was muted by the host.`
              : `${target.name} was unmuted by the host.`,
            timestamp: Date.now(),
            type: 'system',
          });
        }

        broadcastToRoom(room, {
          type: 'room:state',
          payload: serializeRoomState(room),
        });
      } else if (type === 'admin:kick') {
        // Host only action
        if (!currentRoomId || !currentClientId) return;
        const room = watchPartyRooms.get(currentRoomId);
        if (!room || room.hostId !== currentClientId) return;

        const { targetClientId, reason } = payload || {};
        if (!targetClientId || targetClientId === room.hostId) return;

        const kickedEntry = room.participants.get(targetClientId);
        room.kickedUserIds.add(targetClientId);
        room.mutedUserIds.delete(targetClientId);
        room.participants.delete(targetClientId);

        if (kickedEntry) {
          if (kickedEntry.ws.readyState === WebSocket.OPEN) {
            kickedEntry.ws.send(
              JSON.stringify({
                type: 'room:kicked',
                payload: {
                  reason: reason || 'You were removed from the room by the host.',
                },
              })
            );
            kickedEntry.ws.close();
          }

          room.messages.push({
            id: `sys_kick_${Date.now()}`,
            senderId: 'system',
            senderName: 'Watch Party',
            senderColor: '#ef4444',
            text: `${kickedEntry.info.name} was removed from the party by the host.`,
            timestamp: Date.now(),
            type: 'system',
          });
        }

        broadcastToRoom(room, {
          type: 'room:state',
          payload: serializeRoomState(room),
        });
      } else if (type === 'admin:toggle_host_controls') {
        // Host toggles host-only sync
        if (!currentRoomId || !currentClientId) return;
        const room = watchPartyRooms.get(currentRoomId);
        if (!room || room.hostId !== currentClientId) return;

        room.hostControlsOnly = !room.hostControlsOnly;
        room.messages.push({
          id: `sys_hc_${Date.now()}`,
          senderId: 'system',
          senderName: 'Watch Party',
          senderColor: '#38bdf8',
          text: room.hostControlsOnly
            ? 'Host locked playback controls: Only host can sync position now.'
            : 'Host opened playback controls: Any member can sync position.',
          timestamp: Date.now(),
          type: 'system',
        });

        broadcastToRoom(room, {
          type: 'room:state',
          payload: serializeRoomState(room),
        });
      } else if (type === 'admin:close_room') {
        // Host manually ends the party
        if (!currentRoomId || !currentClientId) return;
        const room = watchPartyRooms.get(currentRoomId);
        if (!room || room.hostId !== currentClientId) return;

        const archivedId = `archived_${room.roomId.toLowerCase()}_${Date.now()}`;
        const hostName = room.participants.get(room.hostId)?.info.name || 'Host';

        const archived: ClosedWatchParty = {
          id: archivedId,
          roomId: room.roomId,
          roomName: room.roomName,
          mediaType: room.mediaType,
          tmdbId: room.tmdbId,
          title: room.title,
          posterPath: room.posterPath,
          backdropPath: room.backdropPath,
          season: room.season,
          episode: room.episode,
          hostName,
          totalParticipants: Math.max(room.participants.size, 1),
          participantNames: Array.from(room.participants.values()).map((p) => p.info.name),
          startedAt: room.createdAt,
          closedAt: Date.now(),
          durationSeconds: Math.floor((Date.now() - room.createdAt) / 1000),
          messages: [
            ...room.messages,
            {
              id: `sys_end_${Date.now()}`,
              senderId: 'system',
              senderName: 'Watch Party',
              senderColor: '#ef4444',
              text: `Watch party closed by ${hostName}. Session saved to replay archives.`,
              timestamp: Date.now(),
              type: 'system',
            },
          ],
        };

        closedWatchParties.unshift(archived);

        broadcastToRoom(room, {
          type: 'room:closed',
          payload: {
            message: 'This watch party has been concluded by the host.',
            archivedId,
            roomName: archived.roomName,
          },
        });

        watchPartyRooms.delete(currentRoomId);
      }
    } catch (err) {
      console.warn('[WatchParty WS Error]', err);
    }
  });

  ws.on('close', () => {
    if (currentRoomId && currentClientId) {
      const room = watchPartyRooms.get(currentRoomId);
      if (room) {
        const leaving = room.participants.get(currentClientId);
        room.participants.delete(currentClientId);

        if (room.participants.size === 0) {
          watchPartyRooms.delete(currentRoomId);
        } else {
          // Reassign host if the host disconnected
          if (room.hostId === currentClientId) {
            const nextHostEntry = room.participants.values().next().value;
            if (nextHostEntry) {
              room.hostId = nextHostEntry.info.id;
              nextHostEntry.info.isHost = true;
            }
          }

          if (leaving) {
            room.messages.push({
              id: `sys_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
              senderId: 'system',
              senderName: 'Watch Party',
              senderColor: '#94a3b8',
              text: `${leaving.info.name} left the room`,
              timestamp: Date.now(),
              type: 'system',
            });
          }

          broadcastToRoom(room, {
            type: 'room:state',
            payload: serializeRoomState(room),
          });
        }
      }
    }
  });
});

// Health check endpoint
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', hasGeminiKey: Boolean(apiKey), activePartyRooms: watchPartyRooms.size });
});

// Start server: In development mount Vite middleware, in production serve static dist
async function startServer() {
  const isProd = process.env.NODE_ENV === 'production';

  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        host: '0.0.0.0',
        port: PORT,
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`[StreamFlix Server] Listening on http://0.0.0.0:${PORT} (HTTP + WatchParty WS)`);
  });
}

startServer().catch((err) => {
  console.error('[Server Start Failure]', err);
  process.exit(1);
});
