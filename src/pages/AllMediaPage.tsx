import React, { useEffect, useState } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { Movie, TVShow, MediaType } from '../types/tmdb';
import { getMovieGenres, getTVGenres } from '../services/tmdb';
import MediaGrid from '../components/MediaGrid';
import { ChevronLeft, ChevronRight, SlidersHorizontal, Check } from 'lucide-react';

const API_KEY = '51d91894475b90ea5449bb71c1cd0a65';

const glass: React.CSSProperties = {
  background: 'rgba(255,255,255,0.07)',
  backdropFilter: 'blur(24px)',
  WebkitBackdropFilter: 'blur(24px)',
  border: '1px solid rgba(255,255,255,0.13)',
};

export default function AllMediaPage() {
  const { type }   = useParams<{ type: MediaType }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate   = useNavigate();

  const page          = parseInt(searchParams.get('page') || '1', 10);
  const selectedGenre = searchParams.get('genre') || '';

  const [media,      setMedia]      = useState<(Movie | TVShow)[]>([]);
  const [genres,     setGenres]     = useState<{ id: number; name: string }[]>([]);
  const [totalPages, setTotalPages] = useState(1);
  const [loading,    setLoading]    = useState(true);
  const [showGenres, setShowGenres] = useState(false);

  useEffect(() => {
    if (!type || (type !== 'movie' && type !== 'tv')) { navigate('/all/movie'); return; }
    (type === 'movie' ? getMovieGenres() : getTVGenres()).then(setGenres);
  }, [type, navigate]);

  useEffect(() => {
    if (!type || (type !== 'movie' && type !== 'tv')) return;
    setLoading(true);
    const url = new URL(`https://api.themoviedb.org/3/discover/${type}`);
    url.searchParams.append('api_key', API_KEY);
    url.searchParams.append('page', String(page));
    if (selectedGenre) url.searchParams.append('with_genres', selectedGenre);

    fetch(url.toString())
      .then(r => r.json())
      .then(data => { setMedia(data.results); setTotalPages(data.total_pages); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [type, page, selectedGenre]);

  const setGenre = (id: string) => setSearchParams({ genre: id, page: '1' });
  const goPage   = (p: number)  => setSearchParams({ genre: selectedGenre, page: String(p) });

  const activeGenreName = genres.find(g => String(g.id) === selectedGenre)?.name || 'All Genres';

  return (
    <div className="max-w-7xl mx-auto px-4 py-10">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
        <h1 className="text-4xl font-black text-white">{type === 'movie' ? 'Movies' : 'TV Shows'}</h1>

        {/* Genre picker — button-based, no <select> */}
        <div className="relative">
          <button onClick={() => setShowGenres(s => !s)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white transition-all active:scale-95"
            style={glass}>
            <SlidersHorizontal className="w-4 h-4 text-violet-400"/>
            {activeGenreName}
            <ChevronRight className={`w-3.5 h-3.5 text-white/40 transition-transform ${showGenres ? 'rotate-90' : ''}`}/>
          </button>

          {showGenres && (
            <div className="absolute right-0 mt-2 w-52 rounded-2xl overflow-hidden z-20 py-1 max-h-72 overflow-y-auto"
              style={{ ...glass, boxShadow:'0 20px 60px rgba(0,0,0,0.6)' }}>
              {[{ id: 0, name: 'All Genres' }, ...genres].map(g => (
                <button key={g.id}
                  onClick={() => { setGenre(g.id === 0 ? '' : String(g.id)); setShowGenres(false); }}
                  className="w-full text-left px-4 py-2.5 text-sm font-medium flex items-center justify-between transition-all"
                  style={{
                    color: String(g.id) === selectedGenre || (g.id === 0 && !selectedGenre) ? '#a78bfa' : '#e2e8f0',
                    background: 'transparent',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'rgba(139,92,246,0.15)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                  {g.name}
                  {(String(g.id) === selectedGenre || (g.id === 0 && !selectedGenre)) && (
                    <Check className="w-3.5 h-3.5 text-violet-400"/>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Click outside to close */}
      {showGenres && (
        <div className="fixed inset-0 z-10" onClick={() => setShowGenres(false)}/>
      )}

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-10 h-10 rounded-full border-2 border-violet-500 border-t-transparent animate-spin"/>
        </div>
      ) : (
        <>
          <MediaGrid items={media} type={type || 'movie'}/>
          <div className="flex justify-center items-center gap-4 mt-12">
            <button onClick={() => goPage(page - 1)} disabled={page <= 1}
              className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-sm font-bold text-white active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
              style={glass}>
              <ChevronLeft className="w-4 h-4"/> Prev
            </button>
            <div className="px-5 py-2.5 rounded-xl text-sm font-bold text-white/60" style={glass}>
              {page} / {totalPages}
            </div>
            <button onClick={() => goPage(page + 1)} disabled={page >= totalPages}
              className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-sm font-bold text-white active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
              style={{ background:'linear-gradient(135deg,#7c3aed,#4f46e5)', border:'1px solid rgba(139,92,246,0.5)' }}>
              Next <ChevronRight className="w-4 h-4"/>
            </button>
          </div>
        </>
      )}
    </div>
  );
}