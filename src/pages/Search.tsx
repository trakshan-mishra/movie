import React, { useState } from 'react';
import { Search as SearchIcon, Film, Tv } from 'lucide-react';
import { search } from '../services/tmdb';
import MediaGrid from '../components/MediaGrid';
import { Movie, TVShow, MediaType } from '../types/tmdb';

const glass: React.CSSProperties = {
  background: 'rgba(255,255,255,0.07)',
  backdropFilter: 'blur(24px)',
  WebkitBackdropFilter: 'blur(24px)',
  border: '1px solid rgba(255,255,255,0.13)',
};

export default function Search() {
  const [query,    setQuery]    = useState('');
  const [type,     setType]     = useState<MediaType>('movie');
  const [results,  setResults]  = useState<(Movie | TVShow)[]>([]);
  const [loading,  setLoading]  = useState(false);
  const [searched, setSearched] = useState(false);

  const handleSearch = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!query.trim()) return;
    setLoading(true);
    const r = await search(query, type);
    setResults(r);
    setSearched(true);
    setLoading(false);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-10">
      <h1 className="text-4xl font-black text-white mb-8">Search</h1>

      <form onSubmit={handleSearch} className="mb-10">
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Type toggle */}
          <div className="flex p-1.5 rounded-2xl gap-1 shrink-0" style={glass}>
            {(['movie','tv'] as MediaType[]).map(t => (
              <button key={t} type="button" onClick={() => setType(t)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all active:scale-95 ${type===t?'text-white':'text-white/40 hover:text-white/70'}`}
                style={type===t ? { background:'linear-gradient(135deg,#7c3aed,#4f46e5)' } : {}}>
                {t==='movie'?<Film className="w-3.5 h-3.5"/>:<Tv className="w-3.5 h-3.5"/>}
                {t==='movie'?'Movies':'TV Shows'}
              </button>
            ))}
          </div>

          {/* Input + button */}
          <div className="flex flex-1 gap-2">
            <div className="relative flex-1">
              <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30 pointer-events-none"/>
              <input type="text" value={query} onChange={e => setQuery(e.target.value)}
                placeholder={`Search ${type==='movie'?'movies':'TV shows'}…`}
                className="w-full pl-10 pr-4 py-3 rounded-xl text-sm text-white placeholder-white/25 outline-none transition-all"
                style={{ background:'rgba(255,255,255,0.09)', border:'1px solid rgba(255,255,255,0.15)' }}
                onFocus={e  => (e.target.style.borderColor = 'rgba(139,92,246,0.6)')}
                onBlur={e   => (e.target.style.borderColor = 'rgba(255,255,255,0.15)')}/>
            </div>
            <button type="submit" disabled={!query.trim()||loading}
              className="px-6 py-3 rounded-xl text-sm font-black text-white transition-all active:scale-95 disabled:opacity-40"
              style={{ background:'linear-gradient(135deg,#7c3aed,#4f46e5)' }}>
              {loading ? '…' : 'Search'}
            </button>
          </div>
        </div>
      </form>

      {loading && (
        <div className="flex justify-center py-20">
          <div className="w-10 h-10 rounded-full border-2 border-violet-500 border-t-transparent animate-spin"/>
        </div>
      )}

      {!loading && searched && results.length===0 && (
        <div className="text-center py-16">
          <SearchIcon className="w-12 h-12 mx-auto mb-4 text-white/10"/>
          <p className="text-white/40 font-semibold text-lg">No results for "{query}"</p>
          <p className="text-white/20 text-sm mt-1">Try a different keyword</p>
        </div>
      )}

      {!loading && results.length>0 && (
        <section>
          <div className="flex items-center gap-3 mb-6">
            <h2 className="text-xl font-black text-white">Results for "{query}"</h2>
            <span className="text-xs font-bold text-violet-300 px-2.5 py-1 rounded-full"
              style={{ background:'rgba(139,92,246,0.15)', border:'1px solid rgba(139,92,246,0.3)' }}>
              {results.length} found
            </span>
          </div>
          <MediaGrid items={results} type={type}/>
        </section>
      )}
    </div>
  );
}