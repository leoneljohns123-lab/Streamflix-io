import { useState, useRef, useEffect } from 'react';
import {
  Sparkles,
  Send,
  X,
  MessageSquare,
  Play,
  Plus,
  Check,
  Trash2,
  Star,
  Bot,
  Maximize2,
  Minimize2,
} from 'lucide-react';
import { useWatchHistory, useWatchlist } from '@/lib/hooks';
import { searchMovies, searchTv, searchMulti } from '@/lib/tmdb';
import { imageUrl } from '@/lib/tmdb-config';
import type { TmdbMovie, TmdbTv } from '@/lib/tmdb-types';
import { navigate } from '@/lib/router';

interface ResolvedSuggestion {
  id: number;
  title: string;
  mediaType: 'movie' | 'tv';
  poster_path: string | null;
  backdrop_path: string | null;
  vote_average: number;
  reason?: string;
}

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  timestamp: number;
  suggestions?: ResolvedSuggestion[];
}

const STARTER_PROMPTS = [
  'Recommend something based on my watch history',
  'Suggest a mind-bending sci-fi or thriller movie',
  'Best binge-worthy TV series right now',
  'Feel-good movie under 2 hours for tonight',
];

export function GlobalAiChatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome_msg',
      role: 'assistant',
      text: "Hi! I'm your StreamFlix AI Concierge. Ask me for personalized movie or TV recommendations, mood-based picks, cast trivia, or anything cinema-related!",
      timestamp: Date.now(),
    },
  ]);

  const { history } = useWatchHistory();
  const { watchlist, toggleWatchlist, isInWatchlist } = useWatchlist();
  const scrollEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      scrollEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen, sending]);

  const resolveSuggestions = async (
    rawList: Array<{ title: string; mediaType: 'movie' | 'tv'; reason?: string }>
  ): Promise<ResolvedSuggestion[]> => {
    if (!Array.isArray(rawList) || rawList.length === 0) return [];

    const results = await Promise.all(
      rawList.slice(0, 4).map(async (item): Promise<ResolvedSuggestion | null> => {
        try {
          const fn = item.mediaType === 'tv' ? searchTv : searchMovies;
          const res = await fn(item.title, 1);
          const match = res.results?.[0] as TmdbMovie | TmdbTv | undefined;
          if (match) {
            return {
              id: match.id,
              title: item.mediaType === 'tv' ? (match as TmdbTv).name : (match as TmdbMovie).title,
              mediaType: item.mediaType,
              poster_path: match.poster_path,
              backdrop_path: match.backdrop_path,
              vote_average: match.vote_average || 0,
              reason: item.reason,
            };
          }

          const multi = await searchMulti(item.title, 1);
          const firstValid = multi.results?.find((r) => 'poster_path' in r && (r as any).poster_path) as any;
          if (firstValid) {
            const type: 'movie' | 'tv' = firstValid.title ? 'movie' : 'tv';
            return {
              id: firstValid.id,
              title: firstValid.title || firstValid.name,
              mediaType: type,
              poster_path: firstValid.poster_path,
              backdrop_path: firstValid.backdrop_path || null,
              vote_average: firstValid.vote_average || 0,
              reason: item.reason,
            };
          }
          return null;
        } catch {
          return null;
        }
      })
    );

    return results.filter((r): r is ResolvedSuggestion => r !== null);
  };

  const handleSend = async (promptText?: string) => {
    const textToSend = (promptText ?? input).trim();
    if (!textToSend || sending) return;

    const userMsg: ChatMessage = {
      id: `user_${Date.now()}`,
      role: 'user',
      text: textToSend,
      timestamp: Date.now(),
    };

    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    if (!promptText) setInput('');
    setSending(true);

    try {
      const response = await fetch('/api/chat/global', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: updatedMessages.map((m) => ({ role: m.role, text: m.text })),
          history: history.slice(0, 12).map((h) => ({
            title: h.title,
            mediaType: h.media_type,
          })),
          watchlist: watchlist.slice(0, 12).map((w) => ({
            title: w.title,
            mediaType: w.media_type,
          })),
        }),
      });

      const data = await response.json();
      const resolved = await resolveSuggestions(data.suggestedTitles || []);

      const aiMsg: ChatMessage = {
        id: `ai_${Date.now()}`,
        role: 'assistant',
        text:
          data.reply ||
          "Here are some great picks! Let me know if you'd like a different genre or vibe.",
        timestamp: Date.now(),
        suggestions: resolved,
      };

      setMessages((prev) => [...prev, aiMsg]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: `err_${Date.now()}`,
          role: 'assistant',
          text: 'I had a brief connection issue reaching the AI server. Please try sending your message again!',
          timestamp: Date.now(),
        },
      ]);
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      {/* Floating Launcher Button */}
      {!isOpen && (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="fixed bottom-16 right-4 z-50 lg:bottom-6 lg:right-6 flex items-center gap-2.5 rounded-2xl border border-red-500/40 bg-gradient-to-r from-[#0e1624] via-[#141d2f] to-[#1f1224] px-4 py-3 text-xs font-black text-white shadow-[0_12px_40px_rgba(245,36,50,0.35)] transition-all hover:scale-105 hover:border-red-400 active:scale-95 cursor-pointer"
          aria-label="Open StreamFlix AI Concierge"
        >
          <div className="relative grid h-8 w-8 place-items-center rounded-xl bg-gradient-to-br from-[#f52432] to-amber-500 text-white shadow-md">
            <Sparkles size={16} />
            <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full border-2 border-[#0e1624] bg-emerald-400" />
          </div>
          <div className="text-left hidden sm:block">
            <p className="text-xs font-black tracking-tight text-white">StreamFlix AI</p>
            <p className="text-[10px] font-medium text-slate-300">Ask for picks & trivia</p>
          </div>
        </button>
      )}

      {/* Chat Drawer / Window */}
      {isOpen && (
        <div
          className={`fixed z-50 flex flex-col overflow-hidden rounded-2xl border border-white/15 bg-[#090e17]/95 shadow-[0_25px_70px_rgba(0,0,0,0.9)] backdrop-blur-2xl transition-all duration-200 ${
            isExpanded
              ? 'bottom-4 right-4 left-4 top-16 sm:left-auto sm:w-[540px] sm:h-[78vh]'
              : 'bottom-16 right-3 left-3 h-[540px] max-h-[78vh] sm:left-auto sm:bottom-6 sm:right-6 sm:w-[400px]'
          }`}
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-white/10 bg-gradient-to-r from-[#111927] to-[#1a111e] px-4 py-3">
            <div className="flex items-center gap-2.5">
              <div className="grid h-8 w-8 place-items-center rounded-xl bg-gradient-to-br from-[#f52432] to-amber-500 text-white shadow-md">
                <Bot size={17} />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <h3 className="text-sm font-black text-white">StreamFlix AI Concierge</h3>
                  <span className="rounded bg-emerald-500/20 px-1.5 py-0.2 text-[9px] font-bold uppercase text-emerald-300">
                    Gemini
                  </span>
                </div>
                <p className="text-[10px] text-slate-400">
                  Personalized recommendations, mood discovery & cinema Q&A
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() =>
                  setMessages([
                    {
                      id: 'welcome_reset',
                      role: 'assistant',
                      text: 'Chat cleared! What kind of movie or TV series are you in the mood for?',
                      timestamp: Date.now(),
                    },
                  ])
                }
                className="rounded-lg p-1.5 text-slate-400 hover:bg-white/10 hover:text-white transition-colors"
                title="Clear conversation"
              >
                <Trash2 size={14} />
              </button>
              <button
                type="button"
                onClick={() => setIsExpanded(!isExpanded)}
                className="hidden sm:grid rounded-lg p-1.5 text-slate-400 hover:bg-white/10 hover:text-white transition-colors"
                title={isExpanded ? 'Compact size' : 'Expand window'}
              >
                {isExpanded ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
              </button>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-white/10 hover:text-white transition-colors"
                title="Close AI Concierge"
              >
                <X size={16} />
              </button>
            </div>
          </div>

          {/* Messages Feed */}
          <div className="flex-1 space-y-4 overflow-y-auto p-4 [scrollbar-width:thin]">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
              >
                <div
                  className={`max-w-[88%] rounded-2xl px-3.5 py-2.5 text-xs leading-relaxed ${
                    msg.role === 'user'
                      ? 'bg-[#f52432] text-white font-medium rounded-br-sm'
                      : 'border border-white/10 bg-white/[0.05] text-slate-200 rounded-bl-sm'
                  }`}
                >
                  <p className="whitespace-pre-line">{msg.text}</p>
                </div>

                {/* Interactive Playable Cards if AI suggested titles */}
                {msg.suggestions && msg.suggestions.length > 0 && (
                  <div className="mt-2.5 w-full space-y-2">
                    {msg.suggestions.map((sug) => {
                      const inList = isInWatchlist(sug.id, sug.mediaType);
                      return (
                        <div
                          key={`${sug.mediaType}-${sug.id}`}
                          className="flex items-center gap-3 rounded-xl border border-white/10 bg-[#0d1522] p-2 shadow-md hover:border-white/25 transition-all"
                        >
                          {sug.poster_path ? (
                            <img
                              src={imageUrl(sug.poster_path, 'w185')}
                              alt={sug.title}
                              className="h-14 w-10 rounded-lg object-cover flex-shrink-0"
                            />
                          ) : (
                            <div className="grid h-14 w-10 place-items-center rounded-lg bg-white/5 text-[9px] text-slate-500 flex-shrink-0">
                              4K
                            </div>
                          )}

                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5">
                              <span className="rounded bg-white/10 px-1.5 py-0.2 text-[9px] font-bold uppercase text-slate-300">
                                {sug.mediaType === 'tv' ? 'Series' : 'Movie'}
                              </span>
                              {sug.vote_average > 0 && (
                                <span className="flex items-center gap-0.5 text-[10px] font-bold text-amber-400">
                                  <Star size={10} fill="currentColor" />
                                  {sug.vote_average.toFixed(1)}
                                </span>
                              )}
                            </div>
                            <p className="truncate text-xs font-bold text-white mt-0.5">{sug.title}</p>
                            {sug.reason && (
                              <p className="truncate text-[10px] text-slate-400">{sug.reason}</p>
                            )}
                          </div>

                          <div className="flex items-center gap-1.5 flex-shrink-0">
                            <button
                              type="button"
                              onClick={() => {
                                setIsOpen(false);
                                navigate(`/player/${sug.mediaType}/${sug.id}`);
                              }}
                              className="flex items-center gap-1 rounded-lg bg-white px-2.5 py-1.5 text-[10px] font-black text-black hover:bg-slate-200 transition-colors cursor-pointer"
                            >
                              <Play size={10} fill="black" />
                              <span>Play</span>
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                toggleWatchlist({
                                  tmdb_id: sug.id,
                                  media_type: sug.mediaType,
                                  title: sug.title,
                                  poster_path: sug.poster_path,
                                  backdrop_path: sug.backdrop_path,
                                })
                              }
                              className="grid h-7 w-7 place-items-center rounded-lg border border-white/15 bg-white/5 text-white hover:bg-white/15 transition-colors cursor-pointer"
                              title={inList ? 'In Watchlist' : 'Add to Watchlist'}
                            >
                              {inList ? <Check size={12} className="text-emerald-400" /> : <Plus size={12} />}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ))}

            {sending && (
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <div className="flex gap-1 rounded-2xl border border-white/10 bg-white/[0.04] px-3.5 py-2.5">
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[#f52432]" />
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[#f52432] [animation-delay:150ms]" />
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[#f52432] [animation-delay:300ms]" />
                </div>
                <span className="text-[11px]">Curating response...</span>
              </div>
            )}

            {/* Starter Prompts when conversation is fresh */}
            {messages.length <= 1 && !sending && (
              <div className="pt-2">
                <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Quick Prompts
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {STARTER_PROMPTS.map((prompt) => (
                    <button
                      key={prompt}
                      type="button"
                      onClick={() => handleSend(prompt)}
                      className="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-1.5 text-left text-[11px] font-medium text-slate-300 transition-colors hover:border-red-500/40 hover:bg-red-500/10 hover:text-white cursor-pointer"
                    >
                      {prompt}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div ref={scrollEndRef} />
          </div>

          {/* Input Bar */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="flex items-center gap-2 border-t border-white/10 bg-[#070b12] p-3"
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask for recommendations, genres, or film info..."
              className="flex-1 rounded-xl border border-white/10 bg-white/[0.05] px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:border-[#f52432] focus:outline-none"
            />
            <button
              type="submit"
              disabled={!input.trim() || sending}
              className="grid h-9 w-9 place-items-center rounded-xl bg-[#f52432] text-white transition-all hover:bg-[#d91b28] disabled:opacity-40 cursor-pointer"
              aria-label="Send message"
            >
              <Send size={14} />
            </button>
          </form>
        </div>
      )}
    </>
  );
}
