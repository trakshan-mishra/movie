import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getTrending } from '../services/tmdb';
import MediaCard from '../components/MediaCard';
import { ChevronRight, Play, Info, Star } from 'lucide-react';

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
}

function HeroSection({ item, type }: { item: Media; type: 'movie' | 'tv' }) {
  const title = item.title || item.name || '';
  const year = new Date(item.release_date || item.first_air_date || '').getFullYear();

  // CSS background-image avoids any img-tag CORS / render issues
  const bgStyle: React.CSSProperties = item.backdrop_path
    ? {
        backgroundImage: `url(https://image.tmdb.org/t/p/original${item.backdrop_path})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center top',
        backgroundRepeat: 'no-repeat',
      }
    : { background: 'linear-gradient(135deg, #1a1a22, #2a2a38)' };

  return (
    <div
      style={{
        position: 'relative',
        height: 'min(55vw, 520px)',
        marginBottom: 40,
        borderRadius: 20,
        overflow: 'hidden',
        ...bgStyle,
      }}
      className="animate-fadeIn"
    >
      {/* Gradient overlay so text is always readable */}
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
              backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
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

  const hero = movies[0];

  return (
    <div className="page" style={{ paddingTop: 24 }}>
      {hero && <HeroSection item={hero} type="movie" />}
      <Section title="Trending Movies" items={movies.slice(1)} type="movie" linkTo="/all/movie" />
      <Section title="Trending TV Shows" items={shows} type="tv" linkTo="/all/tv" />
    </div>
  );
}