import { useEffect, useState } from 'react';
import { Play, Star } from 'lucide-react';
import { Dialog } from './Dialog';
import { getPersonDetails } from '@/lib/tmdb';
import { profileUrl, imageUrl } from '@/lib/tmdb-config';
import type { TmdbPerson, TmdbPersonCredit } from '@/lib/tmdb-types';
import { navigate } from '@/lib/router';

interface CastDialogProps {
  personId: number | null;
  characterName?: string;
  onClose: () => void;
}

export function CastDialog({ personId, characterName, onClose }: CastDialogProps) {
  const [person, setPerson] = useState<TmdbPerson | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!personId) return;
    setLoading(true);
    setPerson(null);
    getPersonDetails(personId)
      .then(setPerson)
      .catch(() => setPerson(null))
      .finally(() => setLoading(false));
  }, [personId]);

  const open = !!personId;

  const handleCreditClick = (credit: TmdbPersonCredit) => {
    const mediaType = credit.media_type === 'tv' ? 'tv' : 'movie';
    const id = String(credit.id);
    navigate(`/player/${mediaType}/${id}`);
    onClose();
  };

  const filmography: TmdbPersonCredit[] = person?.combined_credits?.cast ?? [];
  const sortedFilms = [...filmography].sort((a, b) => {
    const dateA = a.release_date || a.first_air_date || '';
    const dateB = b.release_date || b.first_air_date || '';
    return dateB.localeCompare(dateA);
  });

  return (
    <Dialog open={open} onClose={onClose} maxWidth="max-w-4xl">
      {loading && (
        <div className="flex h-96 items-center justify-center">
          <div className="skeleton-spinner" />
        </div>
      )}
      {!loading && person && (
        <div className="max-h-[85vh] overflow-y-auto">
          {/* Header */}
          <div className="relative h-40 bg-gradient-to-b from-[#1a1f2e] to-[#0d1117]">
            <div className="absolute -bottom-16 left-6 flex gap-5">
              {person.profile_path ? (
                <img
                  src={profileUrl(person.profile_path, 'h632')}
                  alt={person.name}
                  className="h-32 w-24 rounded-lg object-cover shadow-xl ring-1 ring-white/10 sm:h-36 sm:w-28"
                />
              ) : (
                <div className="grid h-32 w-24 place-items-center rounded-lg bg-white/5 sm:h-36 sm:w-28">
                  <span className="text-3xl text-slate-600">{person.name[0]}</span>
                </div>
              )}
            </div>
          </div>

          <div className="px-6 pb-6 pt-20">
            <h2 className="text-2xl font-bold text-white">{person.name}</h2>
            {characterName && (
              <p className="mt-1 text-sm text-[#f52432]">as {characterName}</p>
            )}

            <div className="mt-4 flex flex-wrap gap-4 text-sm text-slate-400">
              {person.known_for_department && (
                <div>
                  <span className="text-slate-500">Known for: </span>
                  <span className="text-white">{person.known_for_department}</span>
                </div>
              )}
              {person.birthday && (
                <div>
                  <span className="text-slate-500">Born: </span>
                  <span className="text-white">
                    {person.birthday}
                    {person.place_of_birth ? ` · ${person.place_of_birth}` : ''}
                  </span>
                </div>
              )}
              {person.popularity > 0 && (
                <div>
                  <span className="text-slate-500">Popularity: </span>
                  <span className="text-white">{person.popularity.toFixed(1)}</span>
                </div>
              )}
            </div>

            {person.biography && (
              <div className="mt-5">
                <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-500">Biography</h3>
                <p className="text-sm leading-6 text-slate-300">{person.biography}</p>
              </div>
            )}

            {person.also_known_as && person.also_known_as.length > 0 && (
              <div className="mt-4">
                <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-500">Also Known As</h3>
                <div className="flex flex-wrap gap-2">
                  {person.also_known_as.slice(0, 8).map((alias) => (
                    <span key={alias} className="rounded-full bg-white/5 px-3 py-1 text-xs text-slate-300">
                      {alias}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {person.external_ids && (
              <div className="mt-4 flex gap-3">
                {person.external_ids.imdb_id && (
                  <a
                    href={`https://www.imdb.com/name/${person.external_ids.imdb_id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-slate-400 hover:text-white"
                  >
                    IMDb
                  </a>
                )}
                {person.external_ids.instagram_id && (
                  <a
                    href={`https://instagram.com/${person.external_ids.instagram_id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-slate-400 hover:text-white"
                  >
                    Instagram
                  </a>
                )}
                {person.external_ids.twitter_id && (
                  <a
                    href={`https://twitter.com/${person.external_ids.twitter_id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-slate-400 hover:text-white"
                  >
                    Twitter
                  </a>
                )}
              </div>
            )}

            {/* Filmography */}
            {sortedFilms.length > 0 && (
              <div className="mt-6">
                <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
                  Filmography ({sortedFilms.length})
                </h3>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                  {sortedFilms.slice(0, 24).map((credit) => {
                    const title = credit.title || credit.name || 'Unknown';
                    const year = (credit.release_date || credit.first_air_date || '').slice(0, 4);
                    return (
                      <button
                        key={credit.credit_id + credit.id}
                        onClick={() => handleCreditClick(credit)}
                        className="group rounded-lg bg-white/[0.03] p-2 text-left transition-all hover:bg-white/[0.06]"
                      >
                        {credit.poster_path ? (
                          <img
                            src={imageUrl(credit.poster_path, 'w185')}
                            alt={title}
                            className="aspect-[2/3] w-full rounded-md object-cover"
                          />
                        ) : (
                          <div className="grid aspect-[2/3] w-full place-items-center rounded-md bg-white/5 text-xs text-slate-600">
                            No Image
                          </div>
                        )}
                        <p className="mt-1.5 truncate text-xs font-semibold text-white">{title}</p>
                        <div className="flex items-center justify-between text-[10px] text-slate-500">
                          <span>{year || '—'}</span>
                          <span className="rounded bg-white/5 px-1 uppercase">
                            {credit.media_type === 'tv' ? 'TV' : 'Film'}
                          </span>
                        </div>
                        {credit.character && (
                          <p className="truncate text-[10px] text-slate-500">as {credit.character}</p>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </Dialog>
  );
}
