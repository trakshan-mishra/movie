import React, { useEffect, useState, useRef } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { getMovieGenres, getTVGenres } from '../services/tmdb';
import MediaGrid from '../components/MediaGrid';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const API_KEY = '51d91894475b90ea5449bb71c1cd0a65';

export default function AllMediaPage() {
  const { type } = useParams<{ type: 'movie' | 'tv' }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const page = parseInt(searchParams.get('page') || '1', 10);
  const selectedGenre = searchParams.get('genre') || '';

  const [media, setMedia] = useState<any[]>([]);
  const [genres, setGenres] = useState<{ id: number; name: string }[]>([]);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);

  // Genre scroll state
  const genreRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const updateScrollState = () => {
    const el = genreRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 4);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
  };

  useEffect(() => {
    // Give time for genres to render then check
    setTimeout(updateScrollState, 100);
  }, [genres]);

  const scrollGenres = (dir: 'left' | 'right') => {
    const el = genreRef.current;
    if (!el) return;
    el.scrollBy({ left: dir === 'right' ? 240 : -240, behavior: 'smooth' });
    setTimeout(updateScrollState, 320);
  };

  useEffect(() => {
    if (!type || (type !== 'movie' && type !== 'tv')) {
      navigate('/all/movie');
      return;
    }
    (type === 'movie' ? getMovieGenres() : getTVGenres()).then(g => {
      setGenres(g);
      setTimeout(updateScrollState, 100);
    });
  }, [type, navigate]);

  useEffect(() => {
    if (!type || (type !== 'movie' && type !== 'tv')) return;
    setLoading(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });

    const url = new URL(`https://api.themoviedb.org/3/discover/${type}`);
    url.searchParams.append('api_key', API_KEY);
    url.searchParams.append('page', String(page));
    url.searchParams.append('sort_by', 'popularity.desc');
    if (selectedGenre) url.searchParams.append('with_genres', selectedGenre);

    fetch(url.toString())
      .then(r => r.json())
      .then(data => {
        setMedia(data.results || []);
        setTotalPages(Math.min(data.total_pages || 1, 500));
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [type, page, selectedGenre]);

  const setGenre = (id: string) => setSearchParams({ genre: id, page: '1' });
  const goPage = (p: number) => setSearchParams({ genre: selectedGenre, page: String(p) });
  const mediaType = (type === 'movie' ? 'movie' : 'tv') as 'movie' | 'tv';

  // Arrow button style
  const arrowBtn = (visible: boolean): React.CSSProperties => ({
    flexShrink: 0,
    width: 32, height: 32, borderRadius: '50%',
    border: '1px solid rgba(255,255,255,0.12)',
    background: 'rgba(18,18,26,0.9)',
    backdropFilter: 'blur(20px)',
    color: '#f5f5f7',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    cursor: visible ? 'pointer' : 'default',
    opacity: visible ? 1 : 0,
    pointerEvents: visible ? 'auto' : 'none',
    transition: 'opacity 0.2s ease, background 0.15s ease',
    zIndex: 2,
  });

  return (
    <div className="page" style={{ paddingTop: 28 }}>
      <h1 style={{ fontSize: 28, fontWeight: 700, letterSpacing: '-0.03em', color: '#f5f5f7', marginBottom: 20 }}>
        {type === 'movie' ? 'Movies' : 'TV Shows'}
      </h1>

      {/* Genre row with scroll arrows */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 28 }}>
        {/* Left arrow */}
        <button
          style={arrowBtn(canScrollLeft)}
          onClick={() => scrollGenres('left')}
          onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.1)')}
          onMouseLeave={e => (e.currentTarget.style.background = 'rgba(18,18,26,0.9)')}
        >
          <ChevronLeft size={15} />
        </button>

        {/* Scrollable genre pills */}
        <div
          ref={genreRef}
          onScroll={updateScrollState}
          style={{
            flex: 1,
            display: 'flex',
            gap: 7,
            overflowX: 'auto',
            scrollbarWidth: 'none',
            msOverflowStyle: 'none',
            paddingBottom: 2,
          }}
        >
          <style>{`.genre-scroll::-webkit-scrollbar { display: none; }`}</style>

          {/* "All" pill */}
          <button
            onClick={() => setGenre('')}
            style={{
              flexShrink: 0,
              padding: '7px 18px', borderRadius: 100,
              fontSize: 13, fontWeight: 500, cursor: 'pointer',
              whiteSpace: 'nowrap', border: 'none',
              background: !selectedGenre ? '#0a84ff' : 'rgba(255,255,255,0.07)',
              color: !selectedGenre ? 'white' : 'rgba(245,245,247,0.6)',
              transition: 'all 0.15s ease',
            }}
          >
            All
          </button>

          {genres.map(g => (
            <button
              key={g.id}
              onClick={() => setGenre(String(g.id))}
              style={{
                flexShrink: 0,
                padding: '7px 18px', borderRadius: 100,
                fontSize: 13, fontWeight: 500, cursor: 'pointer',
                whiteSpace: 'nowrap', border: 'none',
                background: selectedGenre === String(g.id) ? '#0a84ff' : 'rgba(255,255,255,0.07)',
                color: selectedGenre === String(g.id) ? 'white' : 'rgba(245,245,247,0.6)',
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={e => {
                if (selectedGenre !== String(g.id))
                  (e.currentTarget.style.background = 'rgba(255,255,255,0.12)');
              }}
              onMouseLeave={e => {
                if (selectedGenre !== String(g.id))
                  (e.currentTarget.style.background = 'rgba(255,255,255,0.07)');
              }}
            >
              {g.name}
            </button>
          ))}
        </div>

        {/* Right arrow */}
        <button
          style={arrowBtn(canScrollRight)}
          onClick={() => scrollGenres('right')}
          onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.1)')}
          onMouseLeave={e => (e.currentTarget.style.background = 'rgba(18,18,26,0.9)')}
        >
          <ChevronRight size={15} />
        </button>
      </div>

      {/* Grid */}
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '80px 0' }}>
          <div className="spinner" />
        </div>
      ) : (
        <>
          <MediaGrid items={media} type={mediaType} />

          {/* Pagination */}
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 12, marginTop: 48 }}>
            <button
              onClick={() => goPage(page - 1)}
              disabled={page <= 1}
              className="glass glass-hover"
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '10px 18px', borderRadius: 10,
                fontSize: 13, fontWeight: 600, color: '#f5f5f7',
                border: 'none', cursor: page <= 1 ? 'not-allowed' : 'pointer',
                opacity: page <= 1 ? 0.3 : 1, transition: 'all 0.15s ease',
              }}
            >
              <ChevronLeft size={15} /> Prev
            </button>

            <span style={{
              padding: '10px 18px', borderRadius: 10,
              fontSize: 13, fontWeight: 500, color: 'rgba(245,245,247,0.4)',
              background: 'rgba(255,255,255,0.04)',
            }}>
              {page} / {totalPages}
            </span>

            <button
              onClick={() => goPage(page + 1)}
              disabled={page >= totalPages}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '10px 18px', borderRadius: 10,
                fontSize: 13, fontWeight: 600, color: 'white',
                background: 'linear-gradient(135deg, #0a84ff, #5e5ce6)',
                border: 'none', cursor: page >= totalPages ? 'not-allowed' : 'pointer',
                opacity: page >= totalPages ? 0.3 : 1, transition: 'all 0.15s ease',
              }}
            >
              Next <ChevronRight size={15} />
            </button>
          </div>
        </>
      )}
    </div>
  );
}