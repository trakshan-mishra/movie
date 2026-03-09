import React, { useState, useRef, useEffect } from 'react';
import { Search as SearchIcon, Film, Tv } from 'lucide-react';
import { search } from '../services/tmdb';
import MediaGrid from '../components/MediaGrid';

type MediaType = 'movie' | 'tv';

export default function Search() {
  const [query, setQuery] = useState('');
  const [type, setType] = useState<MediaType>('movie');
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSearch = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const q = query.trim();
    if (!q) return;
    setLoading(true);
    setResults([]);
    const r = await search(q, type).catch(() => []);
    setResults(r);
    setSearched(true);
    setLoading(false);
  };

  return (
    <div className="page" style={{ paddingTop: 32 }}>
      <h1 style={{ fontSize: 28, fontWeight: 700, letterSpacing: '-0.03em', marginBottom: 24 }}>Search</h1>

      <form onSubmit={handleSearch} style={{ marginBottom: 32 }}>
        {/* Type toggle */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
          {(['movie', 'tv'] as MediaType[]).map(t => (
            <button
              key={t}
              type="button"
              onClick={() => setType(t)}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '8px 16px', borderRadius: 10,
                fontSize: 13, fontWeight: 600,
                background: type === t ? '#0a84ff' : 'rgba(255,255,255,0.07)',
                color: type === t ? 'white' : 'rgba(245,245,247,0.5)',
                border: type === t ? 'none' : '1px solid rgba(255,255,255,0.1)',
                cursor: 'pointer', transition: 'all 0.15s ease',
              }}
            >
              {t === 'movie' ? <Film size={13} /> : <Tv size={13} />}
              {t === 'movie' ? 'Movies' : 'TV Shows'}
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          <div style={{ flex: 1, position: 'relative' }}>
            <SearchIcon size={15} style={{
              position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)',
              color: 'rgba(245,245,247,0.3)', pointerEvents: 'none',
            }} />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder={`Search ${type === 'movie' ? 'movies' : 'TV shows'}…`}
              className="apple-input"
              style={{
                width: '100%', padding: '12px 14px 12px 42px',
                fontSize: 15, letterSpacing: '-0.01em',
              }}
            />
          </div>
          <button
            type="submit"
            disabled={!query.trim() || loading}
            style={{
              padding: '12px 24px', borderRadius: 10,
              background: '#0a84ff', color: 'white',
              fontSize: 14, fontWeight: 600,
              border: 'none', cursor: 'pointer',
              opacity: (!query.trim() || loading) ? 0.4 : 1,
              transition: 'all 0.15s ease', letterSpacing: '-0.01em',
            }}
          >
            {loading ? '…' : 'Search'}
          </button>
        </div>
      </form>

      {loading && (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '60px 0' }}>
          <div className="spinner" />
        </div>
      )}

      {!loading && searched && results.length === 0 && (
        <div style={{ textAlign: 'center', padding: '60px 0' }}>
          <SearchIcon size={40} style={{ margin: '0 auto 16px', color: 'rgba(245,245,247,0.12)', display: 'block' }} />
          <p style={{ color: 'rgba(245,245,247,0.3)', fontSize: 15, fontWeight: 500 }}>No results for "{query}"</p>
        </div>
      )}

      {!loading && results.length > 0 && (
        <div className="animate-fadeUp">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
            <h2 style={{ fontSize: 18, fontWeight: 600, letterSpacing: '-0.02em' }}>
              Results for "{query}"
            </h2>
            <span style={{
              fontSize: 11, fontWeight: 700, padding: '3px 9px', borderRadius: 100,
              background: 'rgba(10,132,255,0.15)', border: '1px solid rgba(10,132,255,0.25)', color: '#0a84ff',
            }}>
              {results.length}
            </span>
          </div>
          <MediaGrid items={results} type={type} />
        </div>
      )}
    </div>
  );
}