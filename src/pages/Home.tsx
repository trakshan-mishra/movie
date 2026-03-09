import React, { useEffect, useState, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { getTrending } from '../services/tmdb';
import MediaCard from '../components/MediaCard';
import { ChevronRight, ChevronLeft, Play, Info, Star } from 'lucide-react';

interface Media {
  id: number;
  title?: string;
  name?: string;
  poster_path?: string | null;
  backdrop_path?: string | null;
  vote_average: number;
  release_date?: string;
  first_air_date?: string;
  overview?: string;
  media_type?: string;
}

const CYCLE_INTERVAL = 7000; // ms per slide

function HeroSection({ items }: { items: Media[] }) {
  const [activeIdx, setActiveIdx] = useState(0);
  const [visible, setVisible] = useState(true); // for crossfade
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const goTo = useCallback((idx: number) => {
    setVisible(false);
    setTimeout(() => {
      setActiveIdx(idx);
      setVisible(true);
    }, 280); // fade out, swap, fade in
  }, []);

  const next = useCallback(() => {
    goTo((activeIdx + 1) % items.length);
  }, [activeIdx, items.length, goTo]);

  const prev = useCallback(() => {
    goTo((activeIdx - 1 + items.length) % items.length);
  }, [activeIdx, items.length, goTo]);

  // Auto-advance
  useEffect(() => {
    if (items.length <= 1) return;
    timerRef.current = setTimeout(next, CYCLE_INTERVAL);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [activeIdx, next, items.length]);

  if (!items.length) return null;

  const item = items[activeIdx];
  const type = item.media_type === 'tv' ? 'tv' : 'movie';
  const title = item.title || item.name || '';
  const year = new Date(item.release_date || item.first_air_date || '').getFullYear();

  const bgStyle: React.CSSProperties = item.backdrop_path
    ? {
        backgroundImage: `url(https://image.tmdb.org/t/p/original${item.backdrop_path})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center top',
        backgroundRepeat: 'no-repeat',
      }
    : { background: 'linear-gradient(135deg, #1a1a22, #2a2a38)' };

  return (
    <div style={{ position: 'relative', marginBottom: 40 }}>
      {/* Hero image container */}
      <div
        style={{
          position: 'relative',
          height: 'min(55vw, 520px)',
          borderRadius: 20,
          overflow: 'hidden',
          opacity: visible ? 1 : 0,
          transition: 'opacity 0.28s ease',
          ...bgStyle,
        }}
      >
        {/* Gradient overlay */}
        <div style={{
          position: 'absolute', inset: 0,
          background: 'linear-gradient(to top, #0a0a0f 0%, rgba(10,10,15,0.78) 35%, rgba(10,10,15,0.18) 70%, transparent 100%)',
        }} />

        {/* Content */}
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '40px 32px 32px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'rgba(245,245,247,0.45)' }}>
              {type === 'movie' ? 'Movie' : 'TV Show'}
            </span>
            {!isNaN(year) && (
              <>
                <span style={{ color: 'rgba(245,245,247,0.2)', fontSize: 11 }}>·</span>
                <span style={{ fontSize: 11, color: 'rgba(245,245,247,0.45)', fontWeight: 500 }}>{year}</span>
              </>
            )}
            <span style={{ color: 'rgba(245,245,247,0.2)', fontSize: 11 }}>·</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 12, color: '#ffd60a', fontWeight: 700 }}>
              <Star size={10} fill="#ffd60a" color="transparent" />
              {item.vote_average.toFixed(1)}
            </span>
          </div>

          <h2 style={{
            fontSize: 'clamp(24px, 4vw, 44px)',
            fontWeight: 700, letterSpacing: '-0.03em',
            color: '#f5f5f7', marginBottom: 10, lineHeight: 1.1,
          }}>
            {title}
          </h2>

          {item.overview && (
            <p style={{
              fontSize: 14, color: 'rgba(245,245,247,0.6)', marginBottom: 22,
              maxWidth: 480, lineHeight: 1.6,
              overflow: 'hidden', display: '-webkit-box',
              WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
            }}>
              {item.overview}
            </p>
          )}

          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <Link
              to={`/${type}/${item.id}`}
              style={{
                display: 'flex', alignItems: 'center', gap: 7,
                padding: '10px 22px', borderRadius: 10,
                background: '#f5f5f7', color: '#0a0a0f',
                fontWeight: 600, fontSize: 14, letterSpacing: '-0.01em',
                textDecoration: 'none', transition: 'background 0.15s ease',
              }}
              onMouseEnter={e => (e.currentTarget.style.background = '#d8d8da')}
              onMouseLeave={e => (e.currentTarget.style.background = '#f5f5f7')}
            >
              <Play size={14} fill="#0a0a0f" color="transparent" />
              Watch Now
            </Link>
            <Link
              to={`/${type}/${item.id}`}
              style={{
                display: 'flex', alignItems: 'center', gap: 7,
                padding: '10px 22px', borderRadius: 10,
                background: 'rgba(255,255,255,0.14)',
                color: '#f5f5f7', fontWeight: 600, fontSize: 14,
                textDecoration: 'none', border: '1px solid rgba(255,255,255,0.18)',
                transition: 'background 0.15s ease',
              }}
              onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.22)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.14)')}
            >
              <Info size={14} />
              Details
            </Link>
          </div>
        </div>

        {/* Prev / Next arrows */}
        {items.length > 1 && (
          <>
            <button
              onClick={prev}
              style={{
                position: 'absolute', top: '50%', left: 14,
                transform: 'translateY(-50%)',
                width: 36, height: 36, borderRadius: '50%',
                background: 'rgba(0,0,0,0.55)', border: '1px solid rgba(255,255,255,0.15)',
                color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', zIndex: 4, transition: 'background 0.15s ease',
              }}
              onMouseEnter={e => (e.currentTarget.style.background = 'rgba(0,0,0,0.8)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'rgba(0,0,0,0.55)')}
            >
              <ChevronLeft size={18} />
            </button>
            <button
              onClick={next}
              style={{
                position: 'absolute', top: '50%', right: 14,
                transform: 'translateY(-50%)',
                width: 36, height: 36, borderRadius: '50%',
                background: 'rgba(0,0,0,0.55)', border: '1px solid rgba(255,255,255,0.15)',
                color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', zIndex: 4, transition: 'background 0.15s ease',
              }}
              onMouseEnter={e => (e.currentTarget.style.background = 'rgba(0,0,0,0.8)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'rgba(0,0,0,0.55)')}
            >
              <ChevronRight size={18} />
            </button>
          </>
        )}
      </div>

      {/* Dot indicators */}
      {items.length > 1 && (
        <div style={{
          display: 'flex', justifyContent: 'center', gap: 6, marginTop: 12,
        }}>
          {items.map((_, i) => (
            <button
              key={i}
              onClick={() => goTo(i)}
              style={{
                width: i === activeIdx ? 20 : 6,
                height: 6, borderRadius: 3,
                background: i === activeIdx ? '#0a84ff' : 'rgba(255,255,255,0.2)',
                border: 'none', cursor: 'pointer', padding: 0,
                transition: 'all 0.3s cubic-bezier(0.25,0.46,0.45,0.94)',
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function Section({ title, items, type, linkTo }: {
  title: string; items: Media[]; type: 'movie' | 'tv'; linkTo: string;
}) {
  return (
    <section style={{ marginBottom: 44 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <h2 className="section-title">{title}</h2>
        <Link
          to={linkTo}
          style={{
            display: 'flex', alignItems: 'center', gap: 3,
            fontSize: 13, fontWeight: 500, color: '#0a84ff',
            textDecoration: 'none',
          }}
          onMouseEnter={e => (e.currentTarget.style.opacity = '0.65')}
          onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
        >
          See All <ChevronRight size={14} />
        </Link>
      </div>

      <div className="scroll-row stagger">
        {items.map((item, i) => (
          <div key={item.id} style={{ width: 130, flexShrink: 0 }}>
            <MediaCard media={item} type={type} index={i} />
          </div>
        ))}
      </div>
    </section>
  );
}

export default function Home() {
  const [movies, setMovies] = useState<Media[]>([]);
  const [shows, setShows] = useState<Media[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([getTrending('movie'), getTrending('tv')])
      .then(([m, s]) => { setMovies(m); setShows(s); })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '70vh' }}>
        <div className="spinner" />
      </div>
    );
  }

  // Use first 8 trending movies as hero candidates (filter those with backdrops)
  const heroItems = movies.filter(m => m.backdrop_path).slice(0, 8);

  return (
    <div className="page" style={{ paddingTop: 24 }}>
      <HeroSection items={heroItems} />
      <Section title="Trending Movies" items={movies.slice(0, 16)} type="movie" linkTo="/all/movie" />
      <Section title="Trending TV Shows" items={shows.slice(0, 16)} type="tv" linkTo="/all/tv" />
    </div>
  );
}
