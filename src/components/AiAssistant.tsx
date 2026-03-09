import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Send, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface TmdbItem {
  id: number;
  title?: string;
  name?: string;
  poster_path?: string | null;
  vote_average?: number;
  release_date?: string;
  first_air_date?: string;
  media_type?: string;
}

interface Msg {
  role: 'user' | 'assistant';
  content: string;
  picks?: TmdbItem[];
}

const TMDB_KEY = '51d91894475b90ea5449bb71c1cd0a65';

const SUGGESTIONS = [
  'Something great tonight 🌙',
  'Make me laugh 😂',
  'Hidden gems 💎',
  'Like Breaking Bad',
  'Best sci-fi ever',
  'Emotional tearjerker 😢',
];

const GENRE_MAP: Record<string, { movieId: string; tvId: string }> = {
  comedy:      { movieId: '35',    tvId: '35'    },
  funny:       { movieId: '35',    tvId: '35'    },
  laugh:       { movieId: '35',    tvId: '35'    },
  sad:         { movieId: '18',    tvId: '18'    },
  cry:         { movieId: '18',    tvId: '18'    },
  emotional:   { movieId: '18',    tvId: '18'    },
  thriller:    { movieId: '53',    tvId: '9648'  },
  suspense:    { movieId: '53',    tvId: '9648'  },
  action:      { movieId: '28',    tvId: '10759' },
  romance:     { movieId: '10749', tvId: '10749' },
  love:        { movieId: '10749', tvId: '10749' },
  horror:      { movieId: '27',    tvId: '27'    },
  scary:       { movieId: '27',    tvId: '27'    },
  scifi:       { movieId: '878',   tvId: '10765' },
  'sci-fi':    { movieId: '878',   tvId: '10765' },
  science:     { movieId: '878',   tvId: '10765' },
  mystery:     { movieId: '9648',  tvId: '9648'  },
  crime:       { movieId: '80',    tvId: '80'    },
  drama:       { movieId: '18',    tvId: '18'    },
  animation:   { movieId: '16',    tvId: '16'    },
  family:      { movieId: '10751', tvId: '10751' },
  fantasy:     { movieId: '14',    tvId: '10765' },
  adventure:   { movieId: '12',    tvId: '10759' },
  documentary: { movieId: '99',    tvId: '99'    },
};

const SIMILAR_SHOWS: Record<string, { query: string; type: 'movie' | 'tv' }> = {
  'breaking bad':    { query: 'Breaking Bad',    type: 'tv'    },
  'game of thrones': { query: 'Game of Thrones', type: 'tv'    },
  'the wire':        { query: 'The Wire',        type: 'tv'    },
  'sopranos':        { query: 'The Sopranos',    type: 'tv'    },
  'dark':            { query: 'Dark',            type: 'tv'    },
  'stranger things': { query: 'Stranger Things', type: 'tv'    },
  'succession':      { query: 'Succession',      type: 'tv'    },
  'true detective':  { query: 'True Detective',  type: 'tv'    },
  'inception':       { query: 'Inception',       type: 'movie' },
  'interstellar':    { query: 'Interstellar',    type: 'movie' },
};

const GENRE_MESSAGES: Record<string, string> = {
  comedy: "Here's some guaranteed laughs 😄",
  funny: "These will crack you up 😂",
  laugh: "Certified comedy gold 😂",
  sad: "Grab some tissues — these hit hard 💔",
  cry: "Beautiful, heartbreaking watches 😭",
  emotional: "These will move you deeply 💔",
  horror: "These will keep you up at night 👻",
  scary: "Sleep with the lights on 🔦",
  thriller: "Edge-of-your-seat picks 🎬",
  action: "Pure adrenaline — non-stop 💥",
  'sci-fi': "The best of science fiction 🚀",
  scifi: "The best of science fiction 🚀",
  science: "Mind-bending sci-fi 🚀",
  romance: "Love stories worth watching ❤️",
  mystery: "You won't see the ending coming 🔍",
  crime: "Gripping crime picks 🕵️",
  drama: "Powerful, emotional dramas 🎭",
  fantasy: "Worlds you won't want to leave ✨",
  adventure: "Epic adventures await 🗺️",
  documentary: "Fascinating true stories 🎥",
};

async function getRecommendations(query: string): Promise<{ message: string; picks: TmdbItem[] }> {
  const q = query.toLowerCase();

  // "Like X" pattern
  for (const [key, val] of Object.entries(SIMILAR_SHOWS)) {
    if (q.includes(key)) {
      const res = await fetch(`https://api.themoviedb.org/3/search/${val.type}?api_key=${TMDB_KEY}&query=${encodeURIComponent(val.query)}`);
      const data = await res.json();
      const show = data.results?.[0];
      if (show) {
        const simRes = await fetch(`https://api.themoviedb.org/3/${val.type}/${show.id}/similar?api_key=${TMDB_KEY}`);
        const simData = await simRes.json();
        const picks = (simData.results || []).filter((r: TmdbItem) => r.poster_path).slice(0, 6);
        if (picks.length > 0) return { message: `If you love ${show.title || show.name}, try these 👇`, picks };
      }
    }
  }

  // Genre keywords
  for (const [keyword, genres] of Object.entries(GENRE_MAP)) {
    if (q.includes(keyword)) {
      const isTV = q.includes('show') || q.includes('series') || q.includes('tv');
      const type = isTV ? 'tv' : 'movie';
      const genreId = isTV ? genres.tvId : genres.movieId;
      const res = await fetch(`https://api.themoviedb.org/3/discover/${type}?api_key=${TMDB_KEY}&with_genres=${genreId}&sort_by=vote_average.desc&vote_count.gte=300`);
      const data = await res.json();
      const picks = (data.results || []).filter((r: TmdbItem) => r.poster_path).slice(0, 6);
      return { message: GENRE_MESSAGES[keyword] || 'Here are some great picks!', picks };
    }
  }

  // Hidden gems
  if (q.includes('hidden') || q.includes('underrated') || q.includes('gem') || q.includes('nobody')) {
    const res = await fetch(`https://api.themoviedb.org/3/discover/movie?api_key=${TMDB_KEY}&sort_by=vote_average.desc&vote_count.gte=200&vote_count.lte=2000`);
    const data = await res.json();
    const picks = (data.results || []).filter((r: TmdbItem) => r.poster_path).slice(0, 6);
    return { message: "Underrated gems most people haven't seen 💎", picks };
  }

  // Tonight / great / best
  if (q.includes('tonight') || q.includes('great') || q.includes('best') || q.includes('good')) {
    const res = await fetch(`https://api.themoviedb.org/3/trending/movie/week?api_key=${TMDB_KEY}`);
    const data = await res.json();
    const picks = (data.results || []).filter((r: TmdbItem) => r.poster_path).slice(0, 6);
    return { message: "Top picks for tonight 🍿", picks };
  }

  // Direct search
  const searchRes = await fetch(`https://api.themoviedb.org/3/search/multi?api_key=${TMDB_KEY}&query=${encodeURIComponent(query)}`);
  const searchData = await searchRes.json();
  const searchPicks = (searchData.results || [])
    .filter((r: TmdbItem) => r.poster_path && (r.media_type === 'movie' || r.media_type === 'tv'))
    .slice(0, 6);
  if (searchPicks.length > 0) return { message: `Here's what I found for "${query}" 🎬`, picks: searchPicks };

  // Fallback trending
  const fallback = await fetch(`https://api.themoviedb.org/3/trending/all/week?api_key=${TMDB_KEY}`);
  const fallbackData = await fallback.json();
  const picks = (fallbackData.results || []).filter((r: TmdbItem) => r.poster_path).slice(0, 6);
  return { message: "Hottest picks this week 🔥", picks };
}

const FOLLOW_UPS = [
  "Love it! Here's more like that 👇",
  "Great taste! Try these too 🎯",
  "Oh you'll love these 🍿",
  "More where that came from 🎬",
  "Expanding your queue right now ✅",
];

// ─── Poster card component ────────────────────────────────────────────────────
function PosterCard({ item, onClick }: { item: TmdbItem; onClick: () => void }) {
  const [loaded, setLoaded] = useState(false);
  const title = item.title ?? item.name ?? '';
  const year = new Date(item.release_date || item.first_air_date || '').getFullYear();

  return (
    <div
      onClick={onClick}
      style={{ width: 100, flexShrink: 0, cursor: 'pointer' }}
    >
      <div
        style={{
          borderRadius: 10, overflow: 'hidden',
          background: '#1a1a22',
          aspectRatio: '2/3',
          transition: 'transform 0.2s cubic-bezier(0.25,0.46,0.45,0.94)',
          boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
        }}
        onMouseEnter={e => (e.currentTarget.style.transform = 'scale(1.06) translateY(-2px)')}
        onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1) translateY(0)')}
      >
        {item.poster_path ? (
          <img
            src={`https://image.tmdb.org/t/p/w185${item.poster_path}`}
            alt={title}
            style={{
              width: '100%', height: '100%', objectFit: 'cover',
              display: 'block',
              opacity: loaded ? 1 : 0,
              transition: 'opacity 0.3s ease',
            }}
            onLoad={() => setLoaded(true)}
            loading="lazy"
          />
        ) : (
          <div style={{
            width: '100%', height: '100%',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 10, color: 'rgba(255,255,255,0.25)',
            textAlign: 'center', padding: 8,
          }}>
            {title}
          </div>
        )}
      </div>
      <p style={{
        fontSize: 11, marginTop: 6, fontWeight: 600,
        color: 'rgba(245,245,247,0.85)', lineHeight: 1.3,
        overflow: 'hidden', display: '-webkit-box',
        WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
      }}>
        {title}
      </p>
      {!isNaN(year) && (
        <p style={{ fontSize: 10, color: 'rgba(245,245,247,0.3)', marginTop: 2 }}>{year}</p>
      )}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function AiAssistant() {
  const navigate = useNavigate();
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>([
    {
      role: 'assistant',
      content: "What are you in the mood for? 🎬 Tell me a vibe, a genre, or a show you love — I'll find the perfect watch.",
    },
  ]);

  const chatRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const turnCount = useRef(0);

  useEffect(() => {
    if (chatRef.current) {
      chatRef.current.scrollTop = chatRef.current.scrollHeight;
    }
  }, [msgs, loading]);

  const send = useCallback(async (text?: string) => {
    const content = (text ?? input).trim();
    if (!content || loading) return;

    setMsgs(prev => [...prev, { role: 'user', content }]);
    setInput('');
    setLoading(true);
    turnCount.current++;

    try {
      const { message, picks } = await getRecommendations(content);
      const finalMessage = turnCount.current > 1
        ? FOLLOW_UPS[Math.floor(Math.random() * FOLLOW_UPS.length)]
        : message;
      setMsgs(prev => [...prev, { role: 'assistant', content: finalMessage, picks }]);
    } catch {
      setMsgs(prev => [...prev, {
        role: 'assistant',
        content: "Couldn't load recommendations. Check your connection and try again!",
      }]);
    } finally {
      setLoading(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [input, loading]);

  const goPlay = (item: TmdbItem) => {
    const isTV = item.media_type === 'tv' || (!item.title && !!item.name);
    navigate(`/${isTV ? 'tv' : 'movie'}/${item.id}`);
  };

  return (
    <div className="page" style={{ paddingTop: 28, maxWidth: 760 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        <div style={{
          width: 44, height: 44, borderRadius: 12, flexShrink: 0,
          background: 'linear-gradient(135deg, #0a84ff, #5e5ce6)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Sparkles size={20} color="white" />
        </div>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 700, letterSpacing: '-0.02em' }}>CinemaBot</h1>
          <p style={{ fontSize: 12, color: 'rgba(245,245,247,0.4)', marginTop: 1 }}>
            Smart movie &amp; TV recommendations
          </p>
        </div>
      </div>

      {/* Chat messages */}
      <div
        ref={chatRef}
        className="glass"
        style={{
          borderRadius: 18,
          padding: '16px 16px 20px',
          /* No fixed height — grows with content, scrollable */
          maxHeight: '60vh',
          minHeight: 200,
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: 20,
        }}
      >
        {msgs.map((msg, i) => (
          <div key={i} style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: msg.role === 'user' ? 'flex-end' : 'flex-start',
            gap: 12,
          }}>
            {/* Bubble */}
            <div style={{
              maxWidth: '78%',
              padding: '10px 14px',
              borderRadius: msg.role === 'user' ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
              background: msg.role === 'user'
                ? '#0a84ff'
                : 'rgba(255,255,255,0.1)',
              fontSize: 14,
              lineHeight: 1.55,
              color: '#f5f5f7',
              fontWeight: 400,
            }}>
              {msg.content}
            </div>

            {/* Poster row — separate from bubble, full width */}
            {msg.picks && msg.picks.length > 0 && (
              <div style={{
                width: '100%',
                display: 'flex',
                gap: 10,
                overflowX: 'auto',
                paddingBottom: 6,
                /* Custom slim scrollbar */
                scrollbarWidth: 'thin',
              }}>
                {msg.picks.map(item => (
                  <PosterCard key={item.id} item={item} onClick={() => goPlay(item)} />
                ))}
              </div>
            )}
          </div>
        ))}

        {/* Typing dots */}
        {loading && (
          <div style={{
            alignSelf: 'flex-start',
            display: 'flex', gap: 5, alignItems: 'center',
            padding: '11px 15px',
            background: 'rgba(255,255,255,0.08)',
            borderRadius: '18px 18px 18px 4px',
          }}>
            {[0, 1, 2].map(i => (
              <div key={i} style={{
                width: 6, height: 6, borderRadius: '50%',
                background: 'rgba(245,245,247,0.45)',
                animation: 'livePulse 1.2s ease-in-out infinite',
                animationDelay: `${i * 0.18}s`,
              }} />
            ))}
          </div>
        )}
      </div>

      {/* Suggestion chips — only on first turn */}
      {msgs.length === 1 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 14 }}>
          {SUGGESTIONS.map(s => (
            <button
              key={s}
              onClick={() => send(s)}
              className="glass glass-hover"
              style={{
                padding: '7px 15px', borderRadius: 100, border: 'none',
                fontSize: 13, fontWeight: 500, color: 'rgba(245,245,247,0.72)',
                cursor: 'pointer', transition: 'all 0.15s ease',
              }}
            >
              {s}
            </button>
          ))}
        </div>
      )}

      {/* Input */}
      <div
        className="glass"
        style={{
          marginTop: 12, borderRadius: 14,
          padding: '10px 10px 10px 18px',
          display: 'flex', alignItems: 'center', gap: 8,
        }}
      >
        <input
          ref={inputRef}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') send(); }}
          placeholder="Ask for a movie or show…"
          style={{
            flex: 1, background: 'transparent',
            border: 'none', outline: 'none',
            color: '#f5f5f7', fontSize: 14, letterSpacing: '-0.01em',
          }}
        />
        <button
          onClick={() => send()}
          disabled={!input.trim() || loading}
          style={{
            width: 38, height: 38, borderRadius: 10, flexShrink: 0,
            background: input.trim() && !loading ? '#0a84ff' : 'rgba(255,255,255,0.07)',
            border: '1px solid rgba(255,255,255,0.08)',
            cursor: input.trim() && !loading ? 'pointer' : 'default',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'all 0.15s ease',
          }}
        >
          <Send size={15} color={input.trim() && !loading ? 'white' : 'rgba(255,255,255,0.3)'} />
        </button>
      </div>
    </div>
  );
}