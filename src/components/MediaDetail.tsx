import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Star, Calendar, Clock, Tv, Play, ChevronLeft, ChevronDown } from 'lucide-react';
import StreamPlayer from '../components/StreamPlayer';
import VideoPlayer from '../components/VideoPlayer';

const API_KEY = '51d91894475b90ea5449bb71c1cd0a65';

type MediaType = 'movie' | 'tv';

interface Genre { id: number; name: string; }
interface Season { id: number; name: string; season_number: number; episode_count: number; air_date: string; }
interface CastMember { id: number; name: string; character: string; profile_path: string | null; }
interface Video { key: string; site: string; type: string; name: string; }

interface MediaData {
  id: number;
  title?: string;
  name?: string;
  overview: string;
  backdrop_path: string | null;
  poster_path: string | null;
  vote_average: number;
  vote_count: number;
  release_date?: string;
  first_air_date?: string;
  runtime?: number;
  number_of_seasons?: number;
  number_of_episodes?: number;
  genres?: Genre[];
  seasons?: Season[];
  tagline?: string;
  credits?: { cast: CastMember[] };
  videos?: { results: Video[] };
}

export default function MediaDetail() {
  // Support both /:type/:id and route where type comes from params
  const params = useParams<{ type?: MediaType; id?: string }>();
  const type = params.type as MediaType;
  const id = params.id;

  const [media, setMedia] = useState<MediaData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedSeason, setSelectedSeason] = useState(1);
  const [selectedEpisode, setSelectedEpisode] = useState(1);
  const [showStream, setShowStream] = useState(false);

  useEffect(() => {
    if (!id || !type) return;
    setLoading(true);
    setMedia(null);
    setShowStream(false);
    setSelectedSeason(1);
    setSelectedEpisode(1);

    fetch(`https://api.themoviedb.org/3/${type}/${id}?api_key=${API_KEY}&append_to_response=videos,credits`)
      .then(r => {
        if (!r.ok) throw new Error('Not found');
        return r.json();
      })
      .then(data => setMedia(data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [id, type]);

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '70vh' }}>
        <div className="spinner" />
      </div>
    );
  }

  if (!media || !type) {
    return (
      <div className="page" style={{ paddingTop: 40 }}>
        <p style={{ color: 'rgba(245,245,247,0.5)' }}>Content not found.</p>
        <Link to="/" style={{ color: '#0a84ff', textDecoration: 'none', marginTop: 12, display: 'inline-block' }}>← Back to Home</Link>
      </div>
    );
  }

  const title = media.title || media.name || '';
  const releaseDate = media.release_date || media.first_air_date || '';
  const year = releaseDate ? new Date(releaseDate).getFullYear() : null;
  const cast = media.credits?.cast?.slice(0, 8) || [];

  const seasonOptions = media.seasons?.filter(s => s.season_number > 0) || [];
  const currentSeason = seasonOptions.find(s => s.season_number === selectedSeason);

  return (
    <div>
      {/* Hero backdrop */}
      <div style={{ position: 'relative', height: 'min(50vw, 480px)', overflow: 'hidden' }}>
        {media.backdrop_path ? (
          <img
            src={`https://image.tmdb.org/t/p/original${media.backdrop_path}`}
            alt={title}
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
          />
        ) : (
          <div style={{ width: '100%', height: '100%', background: 'linear-gradient(135deg, #1a1a22, #2a2a35)' }} />
        )}
        <div className="hero-overlay" style={{ position: 'absolute', inset: 0 }} />

        {/* Back button */}
        <Link
          to={`/all/${type}`}
          style={{
            position: 'absolute', top: 20, left: 20,
            display: 'flex', alignItems: 'center', gap: 4,
            padding: '8px 14px', borderRadius: 100,
            background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(20px)',
            color: 'rgba(245,245,247,0.8)', fontSize: 13, fontWeight: 500,
            textDecoration: 'none', zIndex: 10, border: '1px solid rgba(255,255,255,0.1)',
            transition: 'all 0.15s ease',
          }}
        >
          <ChevronLeft size={14} /> Back
        </Link>
      </div>

      <div className="page" style={{ paddingTop: 0 }}>
        {/* Content area */}
        <div style={{ display: 'flex', gap: 28, marginTop: -60, position: 'relative', zIndex: 5, flexWrap: 'wrap' }}>
          {/* Poster */}
          <div style={{ flexShrink: 0, width: 140 }} className="hidden sm:block">
            {media.poster_path && (
              <img
                src={`https://image.tmdb.org/t/p/w300${media.poster_path}`}
                alt={title}
                style={{ width: '100%', borderRadius: 12, display: 'block', boxShadow: '0 20px 60px rgba(0,0,0,0.7)' }}
              />
            )}
          </div>

          {/* Info */}
          <div style={{ flex: 1, minWidth: 0, paddingTop: 70 }}>
            <h1 style={{ fontSize: 'clamp(20px, 3vw, 32px)', fontWeight: 700, letterSpacing: '-0.03em', color: '#f5f5f7', marginBottom: 10 }}>
              {title}
            </h1>

            {/* Meta row */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginBottom: 14, alignItems: 'center' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 13, color: '#ffd60a', fontWeight: 600 }}>
                <Star size={12} fill="#ffd60a" color="transparent" />
                {media.vote_average.toFixed(1)}
                <span style={{ color: 'rgba(245,245,247,0.3)', fontWeight: 400 }}>({media.vote_count?.toLocaleString()})</span>
              </span>
              {year && (
                <span style={{ fontSize: 13, color: 'rgba(245,245,247,0.5)', display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Calendar size={12} /> {year}
                </span>
              )}
              {media.runtime && (
                <span style={{ fontSize: 13, color: 'rgba(245,245,247,0.5)', display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Clock size={12} /> {media.runtime}m
                </span>
              )}
              {type === 'tv' && media.number_of_seasons && (
                <span style={{ fontSize: 13, color: 'rgba(245,245,247,0.5)', display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Tv size={12} /> {media.number_of_seasons} Seasons
                </span>
              )}
            </div>

            {/* Genres */}
            {media.genres && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 14 }}>
                {media.genres.map(g => (
                  <span key={g.id} className="pill">{g.name}</span>
                ))}
              </div>
            )}

            {/* Overview */}
            {media.overview && (
              <p style={{ fontSize: 14, lineHeight: 1.6, color: 'rgba(245,245,247,0.65)', maxWidth: 600, marginBottom: 20 }}>
                {media.overview}
              </p>
            )}

            {/* Buttons */}
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <button
                onClick={() => setShowStream(v => !v)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 7,
                  padding: '11px 22px', borderRadius: 10,
                  background: showStream ? 'rgba(255,255,255,0.15)' : '#0a84ff',
                  color: 'white', fontWeight: 600, fontSize: 14,
                  border: showStream ? '1px solid rgba(255,255,255,0.2)' : 'none',
                  cursor: 'pointer', transition: 'all 0.15s ease',
                  backdropFilter: showStream ? 'blur(20px)' : 'none',
                }}
              >
                <Play size={14} fill="white" color="transparent" />
                {showStream ? 'Hide Player' : 'Stream Now'}
              </button>
            </div>
          </div>
        </div>

        {/* TV Season/Episode selector */}
        {type === 'tv' && seasonOptions.length > 0 && (
          <div className="glass" style={{ borderRadius: 14, padding: '16px 20px', marginTop: 28, display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center' }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: 'rgba(245,245,247,0.6)' }}>Episode</span>
            <div style={{ position: 'relative', display: 'inline-block' }}>
              <select
                value={selectedSeason}
                onChange={e => { setSelectedSeason(Number(e.target.value)); setSelectedEpisode(1); }}
                className="apple-input"
                style={{ padding: '8px 32px 8px 12px', fontSize: 13, fontWeight: 500, cursor: 'pointer', appearance: 'none', minWidth: 120 }}
              >
                {seasonOptions.map(s => (
                  <option key={s.id} value={s.season_number} style={{ background: '#1a1a22' }}>
                    Season {s.season_number}
                  </option>
                ))}
              </select>
              <ChevronDown size={12} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: 'rgba(245,245,247,0.4)' }} />
            </div>
            <div style={{ position: 'relative', display: 'inline-block' }}>
              <select
                value={selectedEpisode}
                onChange={e => setSelectedEpisode(Number(e.target.value))}
                className="apple-input"
                style={{ padding: '8px 32px 8px 12px', fontSize: 13, fontWeight: 500, cursor: 'pointer', appearance: 'none', minWidth: 120 }}
              >
                {Array.from({ length: currentSeason?.episode_count || 1 }, (_, i) => (
                  <option key={i + 1} value={i + 1} style={{ background: '#1a1a22' }}>
                    Episode {i + 1}
                  </option>
                ))}
              </select>
              <ChevronDown size={12} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: 'rgba(245,245,247,0.4)' }} />
            </div>
          </div>
        )}

        {/* Stream player */}
        {showStream && (
          <div style={{ marginTop: 24 }} className="animate-scaleIn">
            <StreamPlayer
              type={type}
              tmdbId={id || ''}
              title={title}
              episodeData={type === 'tv' ? { season: selectedSeason, episode: selectedEpisode } : undefined}
            />
          </div>
        )}

        {/* Trailer */}
        {!showStream && media.videos?.results && (
          <div style={{ marginTop: 28 }}>
            <VideoPlayer videos={media.videos.results} />
          </div>
        )}

        {/* Cast */}
        {cast.length > 0 && (
          <div style={{ marginTop: 36 }}>
            <h2 style={{ fontSize: 18, fontWeight: 600, letterSpacing: '-0.02em', marginBottom: 16 }}>Cast</h2>
            <div className="scroll-row stagger">
              {cast.map((actor, i) => (
                <div key={actor.id} style={{ width: 80, flexShrink: 0, textAlign: 'center' }}>
                  <div style={{
                    width: 72, height: 72, borderRadius: '50%', overflow: 'hidden',
                    background: '#1a1a22', margin: '0 auto 8px', border: '1px solid rgba(255,255,255,0.1)',
                  }}>
                    {actor.profile_path ? (
                      <img
                        src={`https://image.tmdb.org/t/p/w185${actor.profile_path}`}
                        alt={actor.name}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        loading="lazy"
                      />
                    ) : (
                      <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>
                        👤
                      </div>
                    )}
                  </div>
                  <p style={{ fontSize: 11, fontWeight: 600, color: 'rgba(245,245,247,0.8)', lineHeight: 1.3 }}>{actor.name}</p>
                  <p style={{ fontSize: 10, color: 'rgba(245,245,247,0.35)', marginTop: 2 }}>{actor.character}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}