import { GoogleGenAI } from '@google/genai';

interface IncomingRequest {
  method?: string;
  body?: {
    history?: Array<{ title: string; mediaType?: string }>;
  };
}

interface OutgoingResponse {
  status: (code: number) => OutgoingResponse;
  json: (data: unknown) => void;
  setHeader: (name: string, value: string) => void;
}

export default async function handler(req: IncomingRequest, res: OutgoingResponse) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  if (req.method === 'OPTIONS') {
    res.status(200).json({ ok: true });
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method Not Allowed' });
    return;
  }

  try {
    const history = req.body?.history || [];

    const apiKey = process.env.GEMINI_API_KEY || '';
    if (!apiKey) {
      res.status(200).json({
        tasteSummary: 'Universal blockbuster recommendations curated for your cinema journey.',
        recommendations: [
          {
            title: 'Inception',
            mediaType: 'movie',
            genre: 'Sci-Fi',
            reason: 'A timeless mind-bending thriller that rewards repeat viewings.',
          },
          {
            title: 'Interstellar',
            mediaType: 'movie',
            genre: 'Sci-Fi',
            reason: 'An emotional, cosmic journey with incredible visual spectacle.',
          },
          {
            title: 'Breaking Bad',
            mediaType: 'tv',
            genre: 'Drama',
            reason: 'One of the highest-rated prestige television dramas ever created.',
          },
        ],
      });
      return;
    }

    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });

    const watchedList =
      Array.isArray(history) && history.length > 0
        ? history
            .map((item) => `- ${item.title} (${item.mediaType || 'movie'})`)
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

    const text = response.text || '{}';
    const parsed = JSON.parse(text);
    res.status(200).json(parsed);
  } catch (error) {
    console.error('[Vercel Recommendations Error]', error);
    res.status(200).json({
      tasteSummary: 'Top trending cinema selections curated for you.',
      recommendations: [
        {
          title: 'Dune: Part Two',
          mediaType: 'movie',
          genre: 'Sci-Fi',
          reason: 'Monumental sci-fi world-building with striking visual cinematography.',
        },
        {
          title: 'The Dark Knight',
          mediaType: 'movie',
          genre: 'Action',
          reason: 'Masterclass superhero crime thriller with legendary performances.',
        },
        {
          title: 'Severance',
          mediaType: 'tv',
          genre: 'Thriller',
          reason: 'Compelling mystery box storytelling with exceptional tension.',
        },
      ],
    });
  }
}
