import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import {
  Copy, Users, Send, Globe, Lock, Tv, Film,
  ChevronRight, Radio, RefreshCw, Check, X, Plus, Minus, Play
} from 'lucide-react';
import io from 'socket.io-client';

/* ─── Socket ─────────────────────────────────────────────────────────────── */
let _socket: any = null;
const getSocket = () => {
  if (!_socket || _socket.disconnected) {
    _socket = io('https://live-backend-1i4u.onrender.com', {
      transports: ['websocket', 'polling'],
      timeout: 20000,
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
    });
  }
  return _socket;
};

/* ─── Constants ──────────────────────────────────────────────────────────── */
const TMDB_KEY = '51d91894475b90ea5449bb71c1cd0a65';

const SOURCES = [
  { name: 'VidSrc',      getUrl: (t:string,id:string,s:number,e:number) => t==='tv' ? `https://vidsrc.cc/v2/embed/tv/${id}/${s}/${e}` : `https://vidsrc.cc/v2/embed/movie/${id}` },
  { name: 'VidSrc.icu',  getUrl: (t:string,id:string,s:number,e:number) => t==='tv' ? `https://vidsrc.icu/embed/tv/${id}/${s}/${e}` : `https://vidsrc.icu/embed/movie/${id}` },
  { name: '2Embed',      getUrl: (t:string,id:string,s:number,e:number) => t==='tv' ? `https://www.2embed.cc/embedtv/${id}&s=${s}&e=${e}` : `https://www.2embed.cc/embed/${id}` },
  { name: 'SuperEmbed',  getUrl: (t:string,id:string,s:number,e:number) => t==='tv' ? `https://multiembed.mov/directstream.php?video_id=${id}&tmdb=1&s=${s}&e=${e}` : `https://multiembed.mov/directstream.php?video_id=${id}&tmdb=1` },
];

/* ─── Shared style tokens ────────────────────────────────────────────────── */
const glass = {
  card: {
    background: 'rgba(255,255,255,0.07)',
    backdropFilter: 'blur(24px)',
    WebkitBackdropFilter: 'blur(24px)',
    border: '1px solid rgba(255,255,255,0.13)',
    boxShadow: '0 8px 32px rgba(0,0,0,0.35)',
  } as React.CSSProperties,
  input: {
    background: 'rgba(255,255,255,0.10)',
    border: '1px solid rgba(255,255,255,0.18)',
    color: '#fff',
  } as React.CSSProperties,
};

/* ─── Stepper (replaces <select> — works on Google TV) ───────────────────── */
function Stepper({ label, value, min=1, max=99, onChange, disabled }:
  { label:string; value:number; min?:number; max?:number; onChange:(v:number)=>void; disabled?:boolean }) {
  return (
    <div className="flex items-center gap-2 rounded-xl px-3 py-2" style={glass.card}>
      <span className="text-xs font-semibold text-white/50 w-14 shrink-0 uppercase tracking-wider">{label}</span>
      <button onClick={()=>onChange(Math.max(min,value-1))} disabled={disabled||value<=min}
        className="w-9 h-9 rounded-xl flex items-center justify-center disabled:opacity-30 transition-all active:scale-90"
        style={{ background:'rgba(255,255,255,0.12)', border:'1px solid rgba(255,255,255,0.15)' }}>
        <Minus className="w-3.5 h-3.5 text-white"/>
      </button>
      <span className="text-white font-black text-base w-8 text-center tabular-nums">{value}</span>
      <button onClick={()=>onChange(Math.min(max,value+1))} disabled={disabled||value>=max}
        className="w-9 h-9 rounded-xl flex items-center justify-center disabled:opacity-30 transition-all active:scale-90"
        style={{ background:'rgba(255,255,255,0.12)', border:'1px solid rgba(255,255,255,0.15)' }}>
        <Plus className="w-3.5 h-3.5 text-white"/>
      </button>
    </div>
  );
}

/* ─── Main Component ─────────────────────────────────────────────────────── */
export default function LiveRoom() {
  const { roomId }        = useParams<{ roomId:string }>();
  const [searchParams]    = useSearchParams();
  const navigate          = useNavigate();

  /* URL params */
  const urlType   = searchParams.get('type')   || '';
  const urlTmdbId = searchParams.get('tmdbId') || '';
  const urlTitle  = searchParams.get('title')  || '';

  /* Room */
  const [joined,       setJoined]       = useState(false);
  const [isHost,       setIsHost]       = useState(false);
  const [isPublic,     setIsPublic]     = useState(false);
  const [username,     setUsername]     = useState('');
  const [users,        setUsers]        = useState<string[]>([]);
  const [error,        setError]        = useState<string|null>(null);
  const [roomViewMode, setRoomViewMode] = useState<'public'|'private'>('public');
  const [publicRooms,  setPublicRooms]  = useState<any[]>([]);
  const [loadingRooms, setLoadingRooms] = useState(false);
  const [copied,       setCopied]       = useState(false);

  /* ── Live media — stored in a ref AND state so effects always see latest ── */
  const [mediaType,    setMediaType]    = useState(urlType);
  const [mediaTmdbId,  setMediaTmdbId]  = useState(urlTmdbId);
  const [mediaTitle,   setMediaTitle]   = useState(urlTitle);
  const mediaRef = useRef({ type: urlType, tmdbId: urlTmdbId, title: urlTitle });
  const syncRef  = (t:string, id:string, title:string) => {
    mediaRef.current = { type: t, tmdbId: id, title };
    setMediaType(t); setMediaTmdbId(id); setMediaTitle(title);
  };

  /* Playback */
  const [sourceIdx, setSourceIdx] = useState(0);
  const [season,    setSeason]    = useState(1);
  const [episode,   setEpisode]   = useState(1);
  const [iframeSrc, setIframeSrc] = useState('');
  const [playerKey, setPlayerKey] = useState(0); // increment to force iframe remount

  /* Chat */
  const [messages,    setMessages]    = useState<{username:string;message:string}[]>([]);
  const [newMessage,  setNewMessage]  = useState('');
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const chatEndRef = useRef<HTMLDivElement>(null);

  /* Host media search */
  const [searchQuery,   setSearchQuery]   = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searchType,    setSearchType]    = useState('movie');
  const [isSearching,   setIsSearching]   = useState(false);
  const [selectedMedia, setSelectedMedia] = useState<any>(null);

  const roomIdRef = useRef(roomId);
  useEffect(() => { roomIdRef.current = roomId; }, [roomId]);

  /* ── Build + load iframe ─────────────────────────────────────────────── */
  const applyPlayer = useCallback((type:string, id:string, src:number, s:number, e:number) => {
    if (!type || !id) return;
    const url = SOURCES[src].getUrl(type, id, s, e);
    setIframeSrc(url);
    setPlayerKey(k => k + 1); // force remount = clean reload
  }, []);

  /* ── Socket ──────────────────────────────────────────────────────────── */
  useEffect(() => {
    const sk = getSocket();

    sk.on('connect',       () => setError(null));
    sk.on('connect_error', () => setError('Connection lost — retrying…'));
    sk.on('disconnect',    (r:string) => { if(r==='io server disconnect') sk.connect(); });
    sk.on('room_users',    (u:string[]) => setUsers(u));
    sk.on('receive_message', (msg:any) => setMessages(p=>[...p,msg]));
    sk.on('user_typing', (name:string) => {
      setTypingUsers(p => p.includes(name) ? p : [...p, name]);
      setTimeout(() => setTypingUsers(p => p.filter(u=>u!==name)), 2000);
    });

    /* Host syncs: reload player at specific source/ep */
    sk.on('sync_load', (d:{type:string;tmdbId:string;sourceIdx:number;season:number;episode:number}) => {
      syncRef(d.type, d.tmdbId, mediaRef.current.title);
      setSourceIdx(d.sourceIdx); setSeason(d.season); setEpisode(d.episode);
      applyPlayer(d.type, d.tmdbId, d.sourceIdx, d.season, d.episode);
    });

    sk.on('media_changed', (info:{type:string;tmdbId:string;title:string}) => {
      syncRef(info.type, String(info.tmdbId), info.title);
      setSourceIdx(0); setSeason(1); setEpisode(1);
      applyPlayer(info.type, String(info.tmdbId), 0, 1, 1);
      navigate(
        `/live/${roomIdRef.current}?type=${info.type}&tmdbId=${info.tmdbId}&title=${encodeURIComponent(info.title)}`,
        { replace: true }
      );
    });

    sk.on('kicked',        () => { alert('You were kicked.'); navigate('/live'); });
    sk.on('public_rooms',  (rooms:any[]) => { setPublicRooms(rooms); setLoadingRooms(false); });

    return () => {
      ['connect','connect_error','disconnect','room_users','receive_message',
       'user_typing','sync_load','media_changed','kicked','public_rooms']
        .forEach(ev => sk.off(ev));
    };
  }, [navigate, applyPlayer]);

  /* ── Auto-check room on direct link ──────────────────────────────────── */
  useEffect(() => {
    if (!roomId || joined) return;
    const sk = getSocket();
    const check = () => {
      sk.emit('check_room', { roomId }, (resp:any) => {
        if (resp?.exists) {
          setIsPublic(resp.isPublic ?? false);
          if (resp.mediaInfo) {
            syncRef(resp.mediaInfo.type || urlType, String(resp.mediaInfo.tmdbId || urlTmdbId), resp.mediaInfo.title || urlTitle);
          }
        } else if (urlTmdbId) {
          setIsHost(true);
        } else {
          setError(`Room "${roomId}" not found. Ask the host to share the full link.`);
        }
      });
    };
    if (sk.connected) check(); else sk.once('connect', check);
  }, [roomId, joined, urlType, urlTmdbId, urlTitle]);

  /* ── Load player AFTER join — using ref to get latest media info ─────── */
  useEffect(() => {
    if (!joined) return;
    const { type, tmdbId } = mediaRef.current;
    if (type && tmdbId) {
      // Small delay ensures state is flushed
      setTimeout(() => applyPlayer(type, tmdbId, 0, 1, 1), 100);
    }
  }, [joined, applyPlayer]);

  /* ── Public rooms ─────────────────────────────────────────────────────── */
  useEffect(() => {
    if (roomViewMode !== 'public' || joined || roomId) return;
    const sk = getSocket();
    setLoadingRooms(true);
    const go = () => sk.emit('get_public_rooms');
    if (sk.connected) go(); else sk.once('connect', go);
    const iv = setInterval(go, 10000);
    return () => clearInterval(iv);
  }, [roomViewMode, joined, roomId]);

  /* ── Chat scroll ──────────────────────────────────────────────────────── */
  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior:'smooth' }); }, [messages]);

  /* ── Handlers ─────────────────────────────────────────────────────────── */
  const handleJoin = () => {
    if (!username.trim()) return;
    setError(null);
    const sk = getSocket();
    const { type, tmdbId, title } = mediaRef.current;
    const doJoin = () => {
      sk.emit('join_room', {
        roomId,
        username: username.trim(),
        isPublic,
        mediaInfo: tmdbId ? { type, tmdbId, title } : null,
      }, (resp:any) => {
        if (resp?.error) { setError(resp.error); return; }
        setIsHost(resp?.host ?? false);
        setJoined(true);
      });
    };
    if (sk.connected) doJoin(); else sk.once('connect', doJoin);
  };

  const broadcastSync = (src:number, s:number, e:number) => {
    const { type, tmdbId } = mediaRef.current;
    applyPlayer(type, tmdbId, src, s, e);
    if (isHost) {
      getSocket().emit('sync_load', { roomId, type, tmdbId, sourceIdx:src, season:s, episode:e });
    }
  };

  const handleSourceChange  = (idx:number) => { setSourceIdx(idx); broadcastSync(idx, season, episode); };
  const handleSeasonChange   = (s:number)   => { setSeason(s);      broadcastSync(sourceIdx, s, episode); };
  const handleEpisodeChange  = (e:number)   => { setEpisode(e);     broadcastSync(sourceIdx, season, e); };
  const reloadForEveryone    = ()            => broadcastSync(sourceIdx, season, episode);

  const sendMessage = () => {
    if (!newMessage.trim()) return;
    getSocket().emit('send_message', { roomId, username, message: newMessage.trim() });
    setNewMessage('');
  };
  const handleTyping = () => getSocket().emit('typing', { roomId, username });

  /* Share link always embeds full media info */
  const copyRoomLink = () => {
    const { type, tmdbId, title } = mediaRef.current;
    const url = `${window.location.origin}/live/${roomId}?type=${type}&tmdbId=${tmdbId}&title=${encodeURIComponent(title)}`;
    navigator.clipboard.writeText(url).catch(() => prompt('Copy this link:', url));
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const kickUser = (u:string) => { if(isHost) getSocket().emit('kick_user', { roomId, username:u }); };

  const searchTMDB = async () => {
    if (!searchQuery.trim()) return;
    setIsSearching(true);
    try {
      const res  = await fetch(`https://api.themoviedb.org/3/search/${searchType}?api_key=${TMDB_KEY}&query=${encodeURIComponent(searchQuery)}`);
      const data = await res.json();
      setSearchResults(data.results || []);
    } catch { setError('Search failed.'); }
    finally { setIsSearching(false); }
  };

  const changeMedia = (m:any) => {
    const newTitle = m.title || m.name;
    const newType  = searchType;
    const newId    = String(m.id);
    syncRef(newType, newId, newTitle);
    setSourceIdx(0); setSeason(1); setEpisode(1);
    navigate(`/live/${roomId}?type=${newType}&tmdbId=${newId}&title=${encodeURIComponent(newTitle)}`, { replace:true });
    getSocket().emit('change_media', { roomId, mediaInfo:{ type:newType, tmdbId:newId, title:newTitle } });
    setSearchResults([]); setSearchQuery('');
    applyPlayer(newType, newId, 0, 1, 1);
  };

  const handleCreateRoom = () => {
    if (!selectedMedia) return;
    const id    = Math.random().toString(36).substring(2,8).toUpperCase();
    const t     = selectedMedia.type || searchType;
    const title = selectedMedia.title || selectedMedia.name;
    navigate(`/live/${id}?type=${t}&tmdbId=${selectedMedia.id}&title=${encodeURIComponent(title)}`);
  };

  const handleJoinById = () => {
    const id = prompt('Enter Room ID:');
    if (id?.trim()) navigate(`/live/${id.trim().toUpperCase()}`);
  };

  /* ── Shared page background ──────────────────────────────────────────── */
  const pageBg: React.CSSProperties = {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #0f0c29 0%, #1a1a2e 50%, #16213e 100%)',
  };

  /* ════════════════════════════════════════════════════════════════════════
     VIEW: Inside the room
  ════════════════════════════════════════════════════════════════════════ */
  if (joined) return (
    <div style={pageBg}>
      {/* ── Top bar ── */}
      <div className="sticky top-0 z-40 px-4 py-3 flex flex-wrap items-center justify-between gap-3"
        style={{ background:'rgba(10,8,30,0.85)', backdropFilter:'blur(24px)', borderBottom:'1px solid rgba(255,255,255,0.08)' }}>
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-2 h-2 rounded-full bg-rose-500 animate-pulse shrink-0"/>
          <span className="text-white font-bold truncate max-w-[200px]">{mediaTitle || 'Live Room'}</span>
          <span className={`text-xs px-2 py-0.5 rounded-full font-semibold shrink-0 ${isPublic ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'}`}
            style={{ border: isPublic ? '1px solid rgba(52,211,153,0.3)' : '1px solid rgba(248,113,113,0.3)' }}>
            {isPublic ? '🌐 Public' : '🔒 Private'}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-white/30 text-xs font-mono hidden sm:block">#{roomId}</span>
          <button onClick={copyRoomLink}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold active:scale-95 transition-all"
            style={{ ...(copied ? { background:'rgba(52,211,153,0.2)', color:'#34d399' } : glass.card), color: copied ? '#34d399' : '#e5e7eb' }}>
            {copied ? <Check className="w-3.5 h-3.5"/> : <Copy className="w-3.5 h-3.5"/>}
            {copied ? 'Copied!' : 'Share'}
          </button>
          {isHost && (
            <button onClick={()=>{ setIsPublic(p=>!p); getSocket().emit('update_room_visibility',{roomId,isPublic:!isPublic}); }}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold active:scale-95 transition-all text-white"
              style={glass.card}>
              {isPublic ? <Lock className="w-3.5 h-3.5"/> : <Globe className="w-3.5 h-3.5"/>}
              {isPublic ? 'Make Private' : 'Make Public'}
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="mx-4 mt-3 px-4 py-2.5 rounded-xl flex justify-between items-center text-sm font-medium text-rose-300"
          style={{ background:'rgba(239,68,68,0.12)', border:'1px solid rgba(239,68,68,0.3)' }}>
          <span>{error}</span>
          <button onClick={()=>setError(null)}><X className="w-4 h-4"/></button>
        </div>
      )}

      <div className="max-w-7xl mx-auto p-4 grid grid-cols-1 xl:grid-cols-3 gap-4">
        {/* ── Video + controls ── */}
        <div className="xl:col-span-2 space-y-4">

          {/* Player */}
          <div className="rounded-2xl overflow-hidden" style={{ aspectRatio:'16/9', ...glass.card }}>
            {iframeSrc ? (
              <iframe
                key={`${playerKey}-${iframeSrc}`}
                src={iframeSrc}
                title={mediaTitle}
                className="w-full h-full border-0"
                allowFullScreen
                allow="autoplay; fullscreen; picture-in-picture; encrypted-media"
                referrerPolicy="no-referrer-when-downgrade"
              />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center gap-3">
                <Radio className="w-10 h-10 text-white/20 animate-pulse"/>
                <p className="text-white/30 text-sm">Loading player…</p>
              </div>
            )}
          </div>

          {/* Source + sync controls */}
          <div className="p-5 rounded-2xl space-y-4" style={glass.card}>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-white/40 uppercase tracking-widest">Stream Source</span>
              {isHost ? (
                <button onClick={reloadForEveryone}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-white active:scale-95 transition-all"
                  style={{ background:'rgba(139,92,246,0.25)', border:'1px solid rgba(139,92,246,0.4)' }}>
                  <RefreshCw className="w-3 h-3"/> Sync Everyone
                </button>
              ) : (
                <span className="text-xs text-white/30 italic">Host controls playback</span>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              {SOURCES.map((src,i) => (
                <button key={i} onClick={()=>isHost && handleSourceChange(i)}
                  className={`px-5 py-2.5 rounded-xl text-sm font-bold transition-all active:scale-95 ${
                    sourceIdx===i
                      ? 'text-white shadow-lg shadow-violet-900/40'
                      : isHost ? 'text-white/60 hover:text-white' : 'text-white/25 cursor-default'
                  }`}
                  style={sourceIdx===i
                    ? { background:'linear-gradient(135deg,#7c3aed,#4f46e5)', border:'1px solid rgba(139,92,246,0.5)' }
                    : glass.card}>
                  {src.name}
                </button>
              ))}
            </div>

            {mediaType === 'tv' && (
              <div className="flex flex-wrap gap-3 pt-2 border-t border-white/8">
                <Stepper label="Season"  value={season}  onChange={handleSeasonChange}  disabled={!isHost} max={30}/>
                <Stepper label="Episode" value={episode} onChange={handleEpisodeChange} disabled={!isHost} max={99}/>
                {!isHost && <span className="text-xs text-white/30 italic self-center">Only host can change episodes</span>}
              </div>
            )}
          </div>

          {/* Host: change media */}
          {isHost && (
            <div className="p-5 rounded-2xl space-y-3" style={glass.card}>
              <span className="text-xs font-bold text-white/40 uppercase tracking-widest">Change Media</span>
              <div className="flex gap-2">
                {['movie','tv'].map(t=>(
                  <button key={t} onClick={()=>setSearchType(t)}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all active:scale-95 ${searchType===t ? 'text-white' : 'text-white/50 hover:text-white'}`}
                    style={searchType===t
                      ? { background:'linear-gradient(135deg,#7c3aed,#4f46e5)', border:'1px solid rgba(139,92,246,0.5)' }
                      : glass.card}>
                    {t==='movie'?<Film className="w-3.5 h-3.5"/>:<Tv className="w-3.5 h-3.5"/>}
                    {t==='movie'?'Movies':'TV'}
                  </button>
                ))}
              </div>
              <div className="flex gap-2">
                <input value={searchQuery} onChange={e=>setSearchQuery(e.target.value)} onKeyDown={e=>e.key==='Enter'&&searchTMDB()}
                  placeholder="Search…" className="flex-1 rounded-xl px-4 py-2.5 text-sm outline-none placeholder-white/30"
                  style={glass.input}/>
                <button onClick={searchTMDB} disabled={isSearching}
                  className="px-5 py-2.5 rounded-xl text-sm font-bold text-white active:scale-95 disabled:opacity-50"
                  style={{ background:'linear-gradient(135deg,#7c3aed,#4f46e5)' }}>
                  {isSearching?'…':'Go'}
                </button>
              </div>
              {searchResults.length>0 && (
                <div className="space-y-1 max-h-40 overflow-y-auto">
                  {searchResults.slice(0,6).map(m=>(
                    <div key={m.id} onClick={()=>changeMedia(m)}
                      className="flex items-center justify-between p-3 rounded-xl cursor-pointer active:scale-[0.98] transition-all"
                      style={{ background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.1)' }}
                      onMouseEnter={e=>(e.currentTarget.style.background='rgba(255,255,255,0.12)')}
                      onMouseLeave={e=>(e.currentTarget.style.background='rgba(255,255,255,0.06)')}>
                      <span className="text-sm text-white truncate">{m.title||m.name}</span>
                      <ChevronRight className="w-3.5 h-3.5 text-white/40 shrink-0"/>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Sidebar ── */}
        <div className="space-y-4">
          {/* Viewers */}
          <div className="p-5 rounded-2xl" style={glass.card}>
            <div className="flex items-center gap-2 mb-4">
              <Users className="w-4 h-4 text-violet-400"/>
              <span className="text-sm font-bold text-white">Viewers ({users.length})</span>
            </div>
            <div className="space-y-2.5 max-h-36 overflow-y-auto">
              {users.map((u,i)=>(
                <div key={i} className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl flex items-center justify-center text-xs font-black text-white shrink-0"
                      style={{ background:'linear-gradient(135deg,#7c3aed,#06b6d4)' }}>
                      {u[0]?.toUpperCase()}
                    </div>
                    <span className="text-sm text-white/80 truncate">{u}{u===username?' (you)':''}</span>
                  </div>
                  {isHost && u!==username && (
                    <button onClick={()=>kickUser(u)}
                      className="text-xs font-semibold text-rose-400 hover:text-rose-300 px-2 py-0.5 rounded-lg transition-all"
                      style={{ background:'rgba(239,68,68,0.1)' }}>
                      kick
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Chat */}
          <div className="p-5 rounded-2xl flex flex-col" style={{ ...glass.card, height:'420px' }}>
            <h3 className="text-sm font-bold text-white mb-3">Chat</h3>
            <div className="flex-1 overflow-y-auto space-y-3 mb-3 pr-1" style={{ scrollbarWidth:'thin' }}>
              {messages.length===0 && (
                <p className="text-white/20 text-xs text-center mt-10">Say hello!</p>
              )}
              {messages.map((msg,i)=>(
                <div key={i} className={msg.username===username?'text-right':'text-left'}>
                  <span className={`text-[10px] font-bold ${msg.username===username?'text-violet-400':'text-cyan-400'}`}>
                    {msg.username}
                  </span>
                  <div className={`mt-1 inline-block px-3 py-2 rounded-xl text-sm max-w-[90%] break-words leading-relaxed ${
                    msg.username===username
                      ? 'text-white rounded-tr-sm'
                      : 'text-white/90 rounded-tl-sm'
                  }`}
                    style={{ background: msg.username===username ? 'rgba(124,58,237,0.5)' : 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.1)' }}>
                    {msg.message}
                  </div>
                </div>
              ))}
              {typingUsers.length>0 && (
                <p className="text-xs text-white/25 italic">{typingUsers.join(', ')} typing…</p>
              )}
              <div ref={chatEndRef}/>
            </div>
            <div className="flex gap-2">
              <input value={newMessage} onChange={e=>setNewMessage(e.target.value)}
                onKeyDown={e=>{ handleTyping(); if(e.key==='Enter') sendMessage(); }}
                placeholder="Message…" className="flex-1 rounded-xl px-3 py-2.5 text-sm outline-none placeholder-white/25"
                style={glass.input}/>
              <button onClick={sendMessage}
                className="w-10 h-10 rounded-xl flex items-center justify-center active:scale-90 transition-all shrink-0"
                style={{ background:'linear-gradient(135deg,#7c3aed,#4f46e5)' }}>
                <Send className="w-3.5 h-3.5 text-white"/>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  /* ════════════════════════════════════════════════════════════════════════
     VIEW: Join screen (arrived via shared link)
  ════════════════════════════════════════════════════════════════════════ */
  if (roomId) return (
    <div style={{ ...pageBg, display:'flex', alignItems:'center', justifyContent:'center', padding:'1rem' }}>
      <div className="w-full max-w-sm p-8 rounded-3xl" style={glass.card}>
        <div className="flex items-center gap-3 mb-6">
          <div className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0"
            style={{ background:'linear-gradient(135deg,#7c3aed,#06b6d4)' }}>
            <Radio className="w-5 h-5 text-white animate-pulse"/>
          </div>
          <div>
            <h2 className="text-xl font-black text-white">Join Room</h2>
            <p className="text-white/30 text-xs font-mono">#{roomId}</p>
          </div>
        </div>

        {error && (
          <div className="mb-4 px-4 py-3 rounded-xl text-sm font-medium text-rose-300"
            style={{ background:'rgba(239,68,68,0.12)', border:'1px solid rgba(239,68,68,0.3)' }}>
            {error}
          </div>
        )}

        {(mediaTitle || urlTitle) && (
          <div className="mb-5 p-4 rounded-2xl" style={{ background:'rgba(139,92,246,0.12)', border:'1px solid rgba(139,92,246,0.25)' }}>
            <div className="flex items-center gap-2 mb-1">
              <Play className="w-3.5 h-3.5 text-violet-400"/>
              <span className="text-[10px] text-violet-400 font-bold uppercase tracking-wider">Now Watching</span>
            </div>
            <p className="text-white font-bold">{mediaTitle || urlTitle}</p>
            <p className="text-white/30 text-xs mt-0.5">{(mediaType||urlType)==='movie'?'🎬 Movie':'📺 TV Show'}</p>
          </div>
        )}

        <input type="text" placeholder="Your display name"
          value={username} onChange={e=>setUsername(e.target.value)}
          onKeyDown={e=>e.key==='Enter'&&handleJoin()}
          className="w-full rounded-xl px-4 py-3 text-sm outline-none placeholder-white/25 mb-4"
          style={glass.input}/>

        <div className="flex gap-3">
          <button onClick={handleJoin} disabled={!username.trim()}
            className="flex-1 py-3 rounded-xl font-black text-white active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            style={{ background:'linear-gradient(135deg,#7c3aed,#4f46e5)' }}>
            Join Room
          </button>
          <button onClick={()=>navigate('/live')}
            className="px-5 py-3 rounded-xl text-sm font-bold text-white/60 hover:text-white active:scale-95 transition-all"
            style={glass.card}>
            Back
          </button>
        </div>
      </div>
    </div>
  );

  /* ════════════════════════════════════════════════════════════════════════
     VIEW: Lobby
  ════════════════════════════════════════════════════════════════════════ */
  return (
    <div style={pageBg} className="p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-4"
            style={{ background:'rgba(139,92,246,0.15)', border:'1px solid rgba(139,92,246,0.3)' }}>
            <Radio className="w-3.5 h-3.5 text-violet-400 animate-pulse"/>
            <span className="text-violet-300 text-sm font-semibold">Watch together, perfectly in sync</span>
          </div>
          <h1 className="text-5xl font-black text-white mb-3">Live Rooms</h1>
          <p className="text-white/40 text-lg">Host or join — everyone watches together.</p>
        </div>

        {error && (
          <div className="mb-6 px-4 py-3 rounded-xl text-sm font-medium text-rose-300 flex justify-between"
            style={{ background:'rgba(239,68,68,0.12)', border:'1px solid rgba(239,68,68,0.3)' }}>
            <span>{error}</span>
            <button onClick={()=>setError(null)}><X className="w-4 h-4"/></button>
          </div>
        )}

        {/* Tab toggle */}
        <div className="flex justify-center mb-8">
          <div className="flex p-1.5 rounded-2xl gap-1" style={glass.card}>
            {(['public','private'] as const).map(mode=>(
              <button key={mode} onClick={()=>setRoomViewMode(mode)}
                className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all active:scale-95 ${roomViewMode===mode?'text-white shadow-lg':'text-white/40 hover:text-white/70'}`}
                style={roomViewMode===mode ? { background:'linear-gradient(135deg,#7c3aed,#4f46e5)' } : {}}>
                {mode==='public'?'🌐 Browse Rooms':'🔒 Create Room'}
              </button>
            ))}
          </div>
        </div>

        {/* Public rooms */}
        {roomViewMode==='public' && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-black text-white">Active Rooms</h2>
              <button onClick={handleJoinById}
                className="px-4 py-2 rounded-xl text-sm font-bold text-white/70 hover:text-white active:scale-95 transition-all"
                style={glass.card}>
                🔗 Join by ID
              </button>
            </div>
            {loadingRooms ? (
              <div className="flex justify-center py-16">
                <div className="w-8 h-8 rounded-full border-2 border-violet-500 border-t-transparent animate-spin"/>
              </div>
            ) : publicRooms.length===0 ? (
              <div className="text-center py-16 space-y-3">
                <Radio className="w-12 h-12 mx-auto text-white/10"/>
                <p className="text-white/40 font-semibold">No public rooms yet</p>
                <p className="text-white/20 text-sm">Create one to get started!</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {publicRooms.map(room=>(
                  <div key={room.id}
                    onClick={()=>navigate(`/live/${room.id}?type=${room.mediaInfo?.type||''}&tmdbId=${room.mediaInfo?.tmdbId||''}&title=${encodeURIComponent(room.mediaInfo?.title||'')}`)}
                    className="p-5 rounded-2xl cursor-pointer active:scale-[0.97] transition-all group"
                    style={glass.card}
                    onMouseEnter={e=>(e.currentTarget.style.borderColor='rgba(139,92,246,0.5)')}
                    onMouseLeave={e=>(e.currentTarget.style.borderColor='rgba(255,255,255,0.13)')}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-black text-white group-hover:text-violet-300 transition-colors truncate text-lg">
                          {room.mediaInfo?.title||'Untitled Room'}
                        </p>
                        <p className="text-white/40 text-sm mt-1">
                          {room.mediaInfo?.type==='movie'?'🎬 Movie':'📺 TV'} · {room.users?.length??0} watching
                        </p>
                      </div>
                      <div className="flex items-center gap-1 text-xs font-bold text-rose-400 shrink-0 px-2 py-1 rounded-full"
                        style={{ background:'rgba(239,68,68,0.15)', border:'1px solid rgba(239,68,68,0.3)' }}>
                        <div className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse"/>
                        LIVE
                      </div>
                    </div>
                    <p className="text-white/20 text-[10px] font-mono mt-3">#{room.id}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Create private room */}
        {roomViewMode==='private' && (
          <div className="p-6 rounded-3xl space-y-5" style={glass.card}>
            <h2 className="text-xl font-black text-white">Create a Private Room</h2>
            <div className="flex gap-2">
              {['movie','tv'].map(t=>(
                <button key={t} onClick={()=>setSearchType(t)}
                  className={`flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-bold transition-all active:scale-95 ${searchType===t?'text-white':'text-white/50 hover:text-white'}`}
                  style={searchType===t
                    ? { background:'linear-gradient(135deg,#7c3aed,#4f46e5)', border:'1px solid rgba(139,92,246,0.5)' }
                    : glass.card}>
                  {t==='movie'?<Film className="w-4 h-4"/>:<Tv className="w-4 h-4"/>}
                  {t==='movie'?'Movies':'TV Shows'}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <input value={searchQuery} onChange={e=>setSearchQuery(e.target.value)} onKeyDown={e=>e.key==='Enter'&&searchTMDB()}
                placeholder={`Search for a ${searchType==='movie'?'movie':'show'}…`}
                className="flex-1 rounded-xl px-4 py-3 text-sm outline-none placeholder-white/25"
                style={glass.input}/>
              <button onClick={searchTMDB} disabled={isSearching}
                className="px-6 py-3 rounded-xl font-bold text-white active:scale-95 disabled:opacity-50"
                style={{ background:'linear-gradient(135deg,#7c3aed,#4f46e5)' }}>
                {isSearching?'…':'Search'}
              </button>
            </div>
            {searchResults.length>0 && (
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {searchResults.slice(0,8).map(m=>(
                  <div key={m.id}
                    onClick={()=>{ setSelectedMedia({...m,type:searchType,title:m.title||m.name}); setSearchResults([]); setSearchQuery(m.title||m.name); }}
                    className={`p-3.5 rounded-xl cursor-pointer active:scale-[0.98] transition-all border ${selectedMedia?.id===m.id?'border-violet-500':'border-transparent hover:border-white/15'}`}
                    style={{ background: selectedMedia?.id===m.id ? 'rgba(139,92,246,0.2)' : 'rgba(255,255,255,0.06)' }}>
                    <p className="text-sm font-bold text-white">{m.title||m.name}</p>
                    <p className="text-xs text-white/30 mt-0.5">{m.release_date||m.first_air_date||''}</p>
                  </div>
                ))}
              </div>
            )}
            {selectedMedia && (
              <div className="flex items-center gap-3 p-4 rounded-2xl"
                style={{ background:'rgba(139,92,246,0.15)', border:'1px solid rgba(139,92,246,0.3)' }}>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                  style={{ background:'linear-gradient(135deg,#7c3aed,#4f46e5)' }}>
                  {selectedMedia.type==='movie'?<Film className="w-5 h-5 text-white"/>:<Tv className="w-5 h-5 text-white"/>}
                </div>
                <div>
                  <p className="text-sm font-black text-white">{selectedMedia.title}</p>
                  <p className="text-xs text-violet-400 mt-0.5">Ready to create room ✓</p>
                </div>
              </div>
            )}
            <label className="flex items-center gap-3 cursor-pointer group">
              <div onClick={()=>setIsPublic(p=>!p)}
                className={`w-12 h-7 rounded-full transition-all relative cursor-pointer ${isPublic?'bg-violet-600':'bg-white/15'}`}>
                <div className={`absolute top-1 w-5 h-5 rounded-full bg-white shadow-lg transition-all ${isPublic?'left-6':'left-1'}`}/>
              </div>
              <span className="text-sm font-semibold text-white/60 group-hover:text-white transition-colors">Make room public</span>
            </label>
            <div className="flex gap-3 pt-2">
              <button onClick={handleCreateRoom} disabled={!selectedMedia}
                className="flex-1 py-3.5 rounded-xl font-black text-white active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                style={{ background:'linear-gradient(135deg,#7c3aed,#4f46e5)' }}>
                🚀 Create Room
              </button>
              <button onClick={handleJoinById}
                className="px-5 py-3.5 rounded-xl text-sm font-bold text-white/60 hover:text-white active:scale-95 transition-all"
                style={glass.card}>
                Join by ID
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}