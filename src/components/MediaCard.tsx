import React, { useRef, useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Star, Layers } from 'lucide-react';

interface Media {
  id: number;
  title?: string;
  name?: string;
  poster_path?: string | null;
  vote_average: number;
  release_date?: string;
  first_air_date?: string;
  genre_ids?: number[];
}

interface Season {
  id: number;
  season_number: number;
  episode_count: number;
}

interface Props {
  media: Media;
  type: 'movie' | 'tv';
  index?: number;
}

const TMDB_KEY = '51d91894475b90ea5449bb71c1cd0a65';

export default function MediaCard({ media, type, index = 0 }: Props) {
  const navigate = useNavigate();
  const imgRef = useRef<HTMLImageElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number>(0);

  const [seasons, setSeasons] = useState<Season[] | null>(null);
  const [showSeasons, setShowSeasons] = useState(false);
  const [loadingSeasons, setLoadingSeasons] = useState(false);
  const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0, width: 0 });

  const title = type === 'movie' ? media.title : media.name;
  const year = new Date(media.release_date || media.first_air_date || '').getFullYear();

  // Throttled position update using rAF — never blocks scroll thread
  const updatePos = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(() => {
      if (!cardRef.current) return;
      const r = cardRef.current.getBoundingClientRect();
      setDropdownPos({
        top: r.bottom + window.scrollY + 6,
        left: r.left + window.scrollX,
        width: r.width,
      });
    });
  }, []);

  // Close on outside click + passive scroll listener
  useEffect(() => {
    if (!showSeasons) return;
    updatePos();

    const onScroll = () => updatePos();
    const onResize = () => updatePos();
    const onMouseDown = (e: MouseEvent) => {
      if (
        dropdownRef.current?.contains(e.target as Node) ||
        cardRef.current?.contains(e.target as Node)
      ) return;
      setShowSeasons(false);
    };

    // passive: true is critical — scroll listener never blocks scrolling
    window.addEventListener('scroll', onScroll, { passive: true, capture: true });
    window.addEventListener('resize', onResize, { passive: true });
    document.addEventListener('mousedown', onMouseDown);

    return () => {
      window.removeEventListener('scroll', onScroll, true);
      window.removeEventListener('resize', onResize);
      document.removeEventListener('mousedown', onMouseDown);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [showSeasons, updatePos]);

  const handleLoad = () => {
    if (imgRef.current) imgRef.current.style.opacity = '1';
  };

  const handleSeasonsClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (showSeasons) { setShowSeasons(false); return; }

    updatePos();

    if (!seasons) {
      setLoadingSeasons(true);
      try {
        const res = await fetch(`https://api.themoviedb.org/3/tv/${media.id}?api_key=${TMDB_KEY}`);
        const data = await res.json();
        setSeasons((data.seasons || []).filter((s: Season) => s.season_number > 0));
      } catch {
        setSeasons([]);
      } finally {
        setLoadingSeasons(false);
      }
    }
    setShowSeasons(true);
  };

  const goToShow = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setShowSeasons(false);
    navigate(`/tv/${media.id}`);
  };

  return (
    <>
      <div
        ref={cardRef}
        style={{
          animationDelay: `${Math.min(index * 25, 200)}ms`,
          /* contain prevents layout recalcs from spilling outside the card */
          contain: 'layout style',
        }}
        className="animate-fadeUp"
      >
        <Link to={`/${type}/${media.id}`} style={{ textDecoration: 'none', display: 'block' }}>
          <div className="media-card">
            {/* Poster area */}
            <div style={{ position: 'relative', overflow: 'hidden' }}>
              <div style={{ aspectRatio: '2/3', background: '#13131a', overflow: 'hidden' }}>
                {media.poster_path ? (
                  <img
                    ref={imgRef}
                    src={`https://image.tmdb.org/t/p/w342${media.poster_path}`}
                    alt={title}
                    style={{
                      width: '100%', height: '100%', objectFit: 'cover',
                      display: 'block', opacity: 0,
                      transition: 'opacity 0.25s ease, transform 0.35s cubic-bezier(0.25,0.46,0.45,0.94)',
                    }}
                    onLoad={handleLoad}
                    loading="lazy"
                    decoding="async"
                    onError={e => { (e.target as HTMLImageElement).style.opacity = '1'; }}
                  />
                ) : (
                  <div style={{
                    width: '100%', height: '100%',
                    background: 'linear-gradient(135deg, #13131a, #1e1e28)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 10, color: 'rgba(255,255,255,0.18)', textAlign: 'center', padding: 8,
                  }}>
                    {title}
                  </div>
                )}
              </div>

              {/* Rating */}
              <div className="rating-badge" style={{ position: 'absolute', top: 7, right: 7, zIndex: 2 }}>
                <Star size={9} fill="#ffd60a" color="transparent" />
                {media.vote_average.toFixed(1)}
              </div>

              {/* Seasons button — TV only */}
              {type === 'tv' && (
                <button
                  onClick={handleSeasonsClick}
                  style={{
                    position: 'absolute', bottom: 7, left: 7, zIndex: 3,
                    display: 'flex', alignItems: 'center', gap: 4,
                    padding: '4px 9px', borderRadius: 100,
                    /* Solid bg — no backdrop-filter here, too expensive on cards */
                    background: showSeasons ? '#0a84ff' : 'rgba(0,0,0,0.75)',
                    border: '1px solid rgba(255,255,255,0.18)',
                    color: 'white', fontSize: 10, fontWeight: 700,
                    cursor: 'pointer',
                    transition: 'background 0.15s ease',
                  }}
                >
                  <Layers size={9} />
                  {loadingSeasons ? '…' : showSeasons ? '▲ Close' : '▲ Seasons'}
                </button>
              )}
            </div>

            {/* Title + year */}
            <div style={{ padding: '9px 11px 11px' }}>
              <p style={{
                fontSize: 12, fontWeight: 600, letterSpacing: '-0.01em',
                color: 'rgba(245,245,247,0.88)', lineHeight: 1.3,
                overflow: 'hidden', display: '-webkit-box',
                WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
              }}>
                {title}
              </p>
              {!isNaN(year) && (
                <p style={{ fontSize: 10, color: 'rgba(245,245,247,0.3)', marginTop: 3, fontWeight: 500 }}>
                  {year}
                </p>
              )}
            </div>
          </div>
        </Link>
      </div>

      {/* Dropdown — fixed position, escapes overflow:hidden, z-index above everything */}
      {type === 'tv' && showSeasons && (
        <div
          ref={dropdownRef}
          style={{
            position: 'absolute',
            top: dropdownPos.top,
            left: dropdownPos.left,
            width: Math.max(dropdownPos.width, 160),
            zIndex: 9999,
            borderRadius: 14,
            padding: '6px 0',
            maxHeight: 240,
            overflowY: 'auto',
            /* Solid dark bg — NO backdrop-filter, this is already elevated */
            background: '#1a1a26',
            border: '1px solid rgba(255,255,255,0.12)',
            boxShadow: '0 20px 50px rgba(0,0,0,0.8)',
          }}
          className="animate-scaleIn"
        >
          <p style={{
            fontSize: 10, fontWeight: 700, letterSpacing: '0.06em',
            textTransform: 'uppercase', color: 'rgba(245,245,247,0.28)',
            padding: '6px 14px 8px',
          }}>
            {title}
          </p>
          {seasons && seasons.length > 0 ? seasons.map(s => (
            <button
              key={s.id}
              onClick={goToShow}
              style={{
                width: '100%', textAlign: 'left',
                padding: '9px 14px', background: 'transparent',
                border: 'none', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                transition: 'background 0.1s ease',
              }}
              onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.06)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            >
              <span style={{ fontSize: 12, fontWeight: 600, color: '#f5f5f7' }}>
                Season {s.season_number}
              </span>
              <span style={{ fontSize: 10, color: 'rgba(245,245,247,0.32)' }}>
                {s.episode_count} eps
              </span>
            </button>
          )) : (
            <p style={{ fontSize: 12, color: 'rgba(245,245,247,0.3)', padding: '10px 14px' }}>
              No seasons found
            </p>
          )}
        </div>
      )}
    </>
  );
}