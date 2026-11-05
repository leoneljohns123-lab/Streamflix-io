import { useState, useRef, useEffect } from 'react';
import {
  Sparkles,
  Send,
  ShieldCheck,
  ShieldAlert,
  Film,
  Tv,
  Trash2,
  Clock,
  HelpCircle,
} from 'lucide-react';
import type { TmdbCastMember } from '@/lib/tmdb-types';

export interface PlayerMediaContext {
  title: string;
  mediaType: 'movie' | 'tv';
  year: string;
  overview: string;
  tagline?: string;
  genres: string[];
  rating: string;
  season?: number;
  episode?: number;
  episodeName?: string;
  episodeOverview?: string;
  currentTimestamp: string;
  cast: TmdbCastMember[];
}

interface PlayerChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  timestamp: number;
  followUpSuggestions?: string[];
}

export function PlayerAiAssistant({ context }: { context: PlayerMediaContext }) {
  const [spoilerFree, setSpoilerFree] = useState(true);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [messages, setMessages] = useState<PlayerChatMessage[]>([]);
  const scrollEndRef = useRef<HTMLDivElement>(null);

  // Initialize or reset welcome message when the movie/show changes
  useEffect(() => {
    const epBadge =
      context.mediaType === 'tv'
        ? ` (Season ${context.season || 1}, Episode ${context.episode || 1}${
            context.episodeName ? ` · "${context.episodeName}"` : ''
          })`
        : '';

    setMessages([
      {
        id: `welcome_${context.title}_${context.season || 0}_${context.episode || 0}`,
        role: 'assistant',
        text: `I'm synced with "${context.title}"${epBadge}. Ask me anything about the plot, characters, cast, symbolism, or production trivia!`,
        timestamp: Date.now(),
        followUpSuggestions:
          context.mediaType === 'tv'
            ? [
                `What is S${context.season || 1} E${context.episode || 1} about (no spoilers)?`,
                `Who are the key characters and actors in ${context.title}?`,
                `Explain the main themes & backstory of ${context.title}`,
              ]
            : [
                `Summarize the premise of ${context.title} (no spoilers)`,
                `Who are the main actors and characters in ${context.title}?`,
                `Share cool behind-the-scenes trivia about ${context.title}`,
              ],
      },
    ]);
  }, [context.title, context.mediaType, context.season, context.episode, context.episodeName]);

  useEffect(() => {
    scrollEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, sending]);

  const handleAsk = async (questionText?: string) => {
    const question = (questionText ?? input).trim();
    if (!question || sending) return;

    const userMsg: PlayerChatMessage = {
      id: `u_${Date.now()}`,
      role: 'user',
      text: question,
      timestamp: Date.now(),
    };

    const nextMessages = [...messages, userMsg];
    setMessages(nextMessages);
    if (!questionText) setInput('');
    setSending(true);

    try {
      const response = await fetch('/api/chat/player', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: nextMessages.map((m) => ({ role: m.role, text: m.text })),
          mediaContext: {
            ...context,
            cast: context.cast.slice(0, 12).map((c) => ({
              name: c.name,
              character: c.character,
            })),
          },
          spoilerFree,
        }),
      });

      const data = await response.json();
      const aiMsg: PlayerChatMessage = {
        id: `ai_${Date.now()}`,
        role: 'assistant',
        text: data.reply || `Here's what you need to know about ${context.title}.`,
        timestamp: Date.now(),
        followUpSuggestions: Array.isArray(data.followUpSuggestions)
          ? data.followUpSuggestions
          : [],
      };

      setMessages((prev) => [...prev, aiMsg]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: `err_${Date.now()}`,
          role: 'assistant',
          text: 'Connection hiccup while analyzing this scene. Try asking again!',
          timestamp: Date.now(),
        },
      ]);
    } finally {
      setSending(false);
    }
  };

  const latestFollowUps =
    messages.length > 0 ? messages[messages.length - 1].followUpSuggestions || [] : [];

  return (
    <div className="flex h-[520px] flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#090e17]/90 shadow-xl backdrop-blur-xl">
      {/* Header Bar with Context Awareness Indicator & Spoiler Guard */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 bg-gradient-to-r from-[#0e1624] to-[#191122] px-4 py-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="grid h-8 w-8 flex-shrink-0 place-items-center rounded-xl bg-gradient-to-br from-blue-600 to-purple-600 text-white shadow-md">
            <Sparkles size={15} />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <h3 className="truncate text-xs sm:text-sm font-black text-white">
                Scene & Story AI Companion
              </h3>
              <span className="rounded bg-blue-500/20 border border-blue-500/30 px-1.5 py-0.2 text-[9px] font-bold uppercase text-blue-300">
                Context-Aware
              </span>
            </div>
            <p className="truncate text-[10px] text-slate-400 flex items-center gap-1.5 mt-0.5">
              {context.mediaType === 'tv' ? <Tv size={10} /> : <Film size={10} />}
              <span className="truncate">{context.title}</span>
              {context.mediaType === 'tv' && (
                <span className="text-blue-400 font-bold">
                  · S{context.season || 1} E{context.episode || 1}
                </span>
              )}
              <span className="inline-flex items-center gap-0.5 text-emerald-400 font-mono">
                · <Clock size={9} /> {context.currentTimestamp}
              </span>
            </p>
          </div>
        </div>

        {/* Spoiler-Free Toggle & Reset */}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setSpoilerFree(!spoilerFree)}
            className={`inline-flex items-center gap-1 rounded-lg border px-2.5 py-1 text-[10px] font-bold transition-all cursor-pointer ${
              spoilerFree
                ? 'border-emerald-500/40 bg-emerald-500/15 text-emerald-300'
                : 'border-amber-500/40 bg-amber-500/15 text-amber-300'
            }`}
            title={
              spoilerFree
                ? 'Spoiler Guard Active: AI avoids spoiling future plot twists'
                : 'Spoilers Allowed: AI can discuss endings & full plot twists'
            }
          >
            {spoilerFree ? <ShieldCheck size={12} /> : <ShieldAlert size={12} />}
            <span>{spoilerFree ? 'Spoiler-Free' : 'Spoilers On'}</span>
          </button>

          <button
            type="button"
            onClick={() =>
              setMessages((prev) => (prev.length > 0 ? [prev[0]] : []))
            }
            className="rounded-lg p-1.5 text-slate-400 hover:bg-white/10 hover:text-white transition-colors"
            title="Clear chat"
          >
            <Trash2 size={13} />
          </button>
        </div>
      </div>

      {/* Chat Messages Area */}
      <div className="flex-1 space-y-3.5 overflow-y-auto p-4 [scrollbar-width:thin]">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
          >
            <div
              className={`max-w-[90%] rounded-2xl px-3.5 py-2.5 text-xs leading-relaxed ${
                msg.role === 'user'
                  ? 'bg-blue-600 text-white font-medium rounded-br-sm'
                  : 'border border-white/10 bg-white/[0.04] text-slate-200 rounded-bl-sm'
              }`}
            >
              <p className="whitespace-pre-line">{msg.text}</p>
            </div>
          </div>
        ))}

        {sending && (
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <div className="flex gap-1 rounded-2xl border border-white/10 bg-white/[0.04] px-3.5 py-2.5">
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-blue-400" />
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-blue-400 [animation-delay:150ms]" />
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-blue-400 [animation-delay:300ms]" />
            </div>
            <span className="text-[11px]">Analyzing {context.title}...</span>
          </div>
        )}

        {/* Contextual Follow-up Suggestions */}
        {!sending && latestFollowUps.length > 0 && (
          <div className="pt-1">
            <p className="mb-1.5 flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
              <HelpCircle size={10} className="text-blue-400" />
              <span>Suggested Questions</span>
            </p>
            <div className="flex flex-wrap gap-1.5">
              {latestFollowUps.map((q) => (
                <button
                  key={q}
                  type="button"
                  onClick={() => handleAsk(q)}
                  className="rounded-xl border border-blue-500/25 bg-blue-950/30 px-2.5 py-1.5 text-left text-[11px] font-medium text-blue-200 transition-colors hover:border-blue-400/50 hover:bg-blue-900/40 hover:text-white cursor-pointer"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        <div ref={scrollEndRef} />
      </div>

      {/* Input Form */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleAsk();
        }}
        className="flex items-center gap-2 border-t border-white/10 bg-[#060a11] p-3"
      >
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={`Ask anything about ${context.title}...`}
          className="flex-1 rounded-xl border border-white/10 bg-white/[0.05] px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none"
        />
        <button
          type="submit"
          disabled={!input.trim() || sending}
          className="grid h-9 w-9 place-items-center rounded-xl bg-blue-600 text-white transition-all hover:bg-blue-500 disabled:opacity-40 cursor-pointer"
          aria-label="Ask Player AI"
        >
          <Send size={14} />
        </button>
      </form>
    </div>
  );
}
