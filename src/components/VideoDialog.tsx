import { Dialog } from './Dialog';
import { getYouTubeEmbedUrl } from '@/lib/providers';
import type { TmdbVideo } from '@/lib/tmdb-types';
import { ExternalLink, Play, AlertCircle } from 'lucide-react';

interface VideoDialogProps {
  video: TmdbVideo | null;
  onClose: () => void;
}

export function VideoDialog({ video, onClose }: VideoDialogProps) {
  const open = !!video;
  const isSandboxed = typeof window !== 'undefined' && window.self !== window.top;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="max-w-3xl">
      {video && (
        <div className="overflow-hidden rounded-2xl">
          {/* In-dialog banner if inside a sandboxed iframe */}
          {isSandboxed && (
            <div className="flex items-center justify-between gap-3 border-b border-white/[0.08] bg-amber-500/10 px-4 py-2 text-xs text-amber-200">
              <div className="flex items-center gap-2">
                <AlertCircle size={14} className="flex-shrink-0 text-amber-400" />
                <span>
                  Container sandbox active: If YouTube shows <em>&ldquo;can&rsquo;t be embedded in a sandboxed frame&rdquo;</em>, click <strong>Watch on YouTube</strong>.
                </span>
              </div>
              <a
                href={`https://www.youtube.com/watch?v=${video.key}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-shrink-0 font-bold text-amber-300 underline hover:text-white"
              >
                Watch
              </a>
            </div>
          )}

          <div className="relative aspect-video bg-black">
            <iframe
              key={video.key}
              src={getYouTubeEmbedUrl(video.key)}
              title={video.name}
              className="h-full w-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
              referrerPolicy="strict-origin-when-cross-origin"
            />
          </div>

          <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0 flex-1">
              <h3 className="truncate text-base font-bold text-white sm:text-lg">{video.name}</h3>
              <div className="mt-1 flex items-center gap-3 text-sm text-slate-400">
                <span className="rounded bg-white/5 px-2 py-0.5 text-xs uppercase">{video.type}</span>
                {video.official && <span className="text-xs text-emerald-400">Official</span>}
                <span>{video.site}</span>
              </div>
            </div>
            <a
              href={`https://www.youtube.com/watch?v=${video.key}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 self-start rounded-lg bg-[#f52432] px-4 py-2 text-xs font-bold text-white shadow-lg shadow-[#f52432]/30 transition-all hover:bg-[#ff3340] sm:self-auto"
            >
              <Play size={14} fill="currentColor" />
              Watch on YouTube
              <ExternalLink size={13} />
            </a>
          </div>
        </div>
      )}
    </Dialog>
  );
}
