import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Play, AlertCircle, RefreshCw, ExternalLink,
  Download, Copy, Check, ChevronDown, ChevronUp,
  Loader2, FileVideo, Zap, Terminal, List
} from 'lucide-react';

interface Props {
  type: 'movie' | 'tv';
  tmdbId: string;
  title: string;
  episodeData?: { season: number; episode: number };
}

// Auto-detect: localhost uses Vite proxy → local server, prod uses Render
const API_BASE = window.location.hostname === 'localhost'
  ? ''  // Vite proxies /api → localhost:4000
  : 'https://live-backend-1i4u.onrender.com';

const STREAM_SOURCES = [
  {
    name: 'VidLink',
    getUrl: (type: string, id: string, s?: number, e?: number) =>
      type === 'tv' && s && e
        ? `https://vidlink.pro/tv/${id}/${s}/${e}?autoplay=true&primaryColor=E53E3E`
        : `https://vidlink.pro/movie/${id}?autoplay=true&primaryColor=E53E3E`,
  },
   {
    name: 'VidSrc',
    getUrl: (type: string, id: string, season?: number, episode?: number) =>
      type === 'tv' && season && episode
        ? `https://vidsrc.cc/v2/embed/${type}/${id}/${season}/${episode}`
        : `https://vidsrc.cc/v2/embed/${type}/${id}`,
  }, 
  {
    name: 'VidSrc',
    getUrl: (type: string, id: string, season?: number, episode?: number) => 
      type === 'tv' && season && episode
        ? `https://vidsrc.icu/embed/${type}/${id}/${season}/${episode}`
        : `https://vidsrc.icu/embed/${type}/${id}`
  },
 
  {
    name: '2Embed.cc',
    getUrl: (type: string, id: string, season?: number, episode?: number) => {
      if (type === 'tv' && season && episode) {
        return `https://www.2embed.cc/embedtv/${id}&s=${season}&e=${episode}`;
      } else {
        return `https://www.2embed.cc/embed/${id}`;
      }
    },
  },
  {
    name: '2Embed.skin',
    getUrl: (type: string, id: string, season?: number, episode?: number) => {
      if (type === 'tv' && season && episode) {
        return `https://www.2embed.skin/embedtv/${id}&s=${season}&e=${episode}`;
      } else {
        return `https://www.2embed.skin/embed/${id}`;
      }
    },
  },
];

interface SourceEntry { name: string; playlist: string; }
interface DownloadState {
  status: 'idle' | 'loading' | 'success' | 'error';
  playlist: string | null;
  allSources: SourceEntry[];
  sourceId: string;
  error: string | null;
}

export default function StreamPlayer({ type, tmdbId, title, episodeData }: Props) {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [activeSourceIndex, setActiveSourceIndex] = useState(0);
  const [attemptCount, setAttemptCount] = useState(0);
  const [showDownload, setShowDownload] = useState(false);
  const [dl, setDl] = useState<DownloadState>({
    status: 'idle', playlist: null, allSources: [], sourceId: '', error: null
  });
  const [copied, setCopied] = useState<string | null>(null);
  const playerRef = useRef<HTMLDivElement>(null);

  const currentSource = STREAM_SOURCES[activeSourceIndex];
  const currentUrl = currentSource?.getUrl(type, tmdbId, episodeData?.season, episodeData?.episode);
  const label = episodeData
    ? ` S${String(episodeData.season).padStart(2,'0')}E${String(episodeData.episode).padStart(2,'0')}`
    : '';

  useEffect(() => {
    setIsLoading(true); setHasError(false);
    setActiveSourceIndex(0); setAttemptCount(0);
    setDl({ status: 'idle', playlist: null, allSources: [], sourceId: '', error: null });
    setShowDownload(false);
  }, [tmdbId, episodeData]);

  useEffect(() => {
    if (!isLoading) return;
    const t = setTimeout(() => { setHasError(true); setIsLoading(false); }, 12000);
    return () => clearTimeout(t);
  }, [isLoading, activeSourceIndex]);

  const fetchStream = useCallback(async () => {
    setDl(d => ({ ...d, status: 'loading', error: null }));
    try {
      const params = new URLSearchParams({
        isMovie: String(type === 'movie'),
        id: tmdbId,
        season: String(episodeData?.season ?? 1),
        episode: String(episodeData?.episode ?? 1),
      });

      const res = await fetch(`${API_BASE}/api/stream?${params}`);
      const data = await res.json();

      if (!res.ok || data.error) throw new Error(data.error || `Server error ${res.status}`);

      const playlist = data.stream?.playlist;
      if (!playlist) throw new Error('No stream URL in response');

      setDl({
        status: 'success',
        playlist,
        allSources: data.allSources || [{ name: data.stream.sourceId, playlist }],
        sourceId: data.stream.sourceId || 'vidsrc',
        error: null,
      });
    } catch (err: any) {
      setDl({ status: 'error', playlist: null, allSources: [], sourceId: '', error: err.message });
    }
  }, [type, tmdbId, episodeData]);

  const copy = async (text: string) => {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
      } else {
        const ta = document.createElement('textarea');
        ta.value = text; ta.style.cssText = 'position:fixed;opacity:0';
        document.body.appendChild(ta); ta.focus(); ta.select();
        document.execCommand('copy'); document.body.removeChild(ta);
      }
      setCopied(text);
      setTimeout(() => setCopied(null), 2500);
    } catch { window.prompt('Copy manually:', text); }
  };

  const ytdlp = dl.playlist
    ? `yt-dlp "${dl.playlist}" -o "${title.replace(/[^a-z0-9]/gi,'_')}${label}.%(ext)s"`
    : '';

  const switchSource = (i: number) => {
    setActiveSourceIndex(i); setIsLoading(true); setHasError(false);
    setAttemptCount(c => c + 1);
    playerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };
  const allFailed = attemptCount >= STREAM_SOURCES.length && hasError;

  const CopyBtn = ({ text, label }: { text: string; label: string }) => (
    <button onClick={() => copy(text)}
      className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-red-600 hover:bg-red-500 text-white rounded-lg transition-colors font-medium whitespace-nowrap">
      {copied === text ? <><Check className="w-3.5 h-3.5 text-green-300"/> Copied!</> : <><Copy className="w-3.5 h-3.5"/> {label}</>}
    </button>
  );

  return (
    <div className="mt-8">
      <h2 className="text-2xl font-bold mb-4 flex items-center gap-2 dark:text-white">
        <Play className="w-6 h-6 text-red-500" />
        {title}<span className="text-red-400 text-lg font-mono">{label}</span>
      </h2>

      {/* Player */}
      <div ref={playerRef} className="aspect-video rounded-2xl overflow-hidden shadow-2xl bg-black relative ring-1 ring-white/10">
        {isLoading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-950/90 text-white gap-3">
            <div className="relative">
              <div className="w-14 h-14 rounded-full border-2 border-red-500/30 border-t-red-500 animate-spin"/>
              <Play className="absolute inset-0 m-auto w-5 h-5 text-red-400"/>
            </div>
            <p className="text-sm text-gray-300">Loading <span className="text-white font-medium">{currentSource?.name}</span>...</p>
            <p className="text-xs text-gray-500">Source {activeSourceIndex + 1} of {STREAM_SOURCES.length}</p>
          </div>
        )}
        {hasError && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-950/95 text-white p-6 gap-4">
            <AlertCircle className="w-12 h-12 text-red-500"/>
            {allFailed ? (
              <>
                <p className="text-lg font-semibold">All sources unavailable</p>
                <div className="flex gap-3">
                  <button onClick={() => { setIsLoading(true); setHasError(false); setAttemptCount(0); setActiveSourceIndex(0); }}
                    className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm flex items-center gap-2">
                    <RefreshCw className="w-4 h-4"/> Retry All
                  </button>
                  <button onClick={() => { setShowDownload(true); fetchStream(); }}
                    className="px-4 py-2 bg-red-600 hover:bg-red-500 rounded-lg text-sm flex items-center gap-2">
                    <Download className="w-4 h-4"/> Get Direct Link
                  </button>
                </div>
              </>
            ) : (
              <>
                <p>{currentSource?.name} is unavailable</p>
                <div className="flex gap-3">
                  <button onClick={() => { setIsLoading(true); setHasError(false); setAttemptCount(c => c + 1); }}
                    className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm flex items-center gap-2">
                    <RefreshCw className="w-4 h-4"/> Retry
                  </button>
                  <button onClick={() => switchSource((activeSourceIndex + 1) % STREAM_SOURCES.length)}
                    className="px-4 py-2 bg-red-600 hover:bg-red-500 rounded-lg text-sm">Next →</button>
                </div>
              </>
            )}
          </div>
        )}
        {currentUrl && (
          <iframe key={`${currentSource?.name}-${attemptCount}`} src={currentUrl}
            width="100%" height="100%" allowFullScreen allow="autoplay; fullscreen"
            frameBorder="0" title={`${title}${label}`} className="w-full h-full"
            onLoad={() => { setIsLoading(false); setHasError(false); }}
            onError={() => { setIsLoading(false); setHasError(true); }}/>
        )}
      </div>

      {/* Controls */}
      <div className="mt-3 flex flex-col sm:flex-row gap-2 items-start sm:items-center justify-between">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-widest font-medium">Source</span>
          <div className="flex gap-1 flex-wrap">
            {STREAM_SOURCES.map((s, i) => (
              <button key={i} onClick={() => switchSource(i)}
                className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
                  i === activeSourceIndex
                    ? 'bg-red-600 text-white shadow-lg shadow-red-900/40'
                    : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white'
                }`}>{s.name}</button>
            ))}
          </div>
        </div>
        <div className="flex gap-2 flex-shrink-0">
          <button onClick={() => copy(currentUrl || '')}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white rounded-lg transition-colors border border-gray-700">
            {copied === currentUrl ? <Check className="w-3.5 h-3.5 text-green-400"/> : <Copy className="w-3.5 h-3.5"/>}
            {copied === currentUrl ? 'Copied!' : 'Copy Link'}
          </button>
          <button onClick={() => { setShowDownload(v => !v); if (!showDownload && dl.status === 'idle') fetchStream(); }}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-red-600 hover:bg-red-500 text-white rounded-lg font-medium">
            <Download className="w-3.5 h-3.5"/> Download
            {showDownload ? <ChevronUp className="w-3 h-3"/> : <ChevronDown className="w-3 h-3"/>}
          </button>
        </div>
      </div>

      {/* Download Panel */}
      {showDownload && (
        <div className="mt-3 rounded-2xl border border-gray-700/60 bg-gray-950 overflow-hidden shadow-xl">
          <div className="px-5 py-3 bg-gray-900 border-b border-gray-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-red-400"/>
              <span className="text-sm font-semibold text-white">Direct Stream Link</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-900/60 text-red-300 font-mono uppercase tracking-wider">Live</span>
            </div>
            <span className="text-xs text-gray-500 truncate max-w-[200px]">{title}{label}</span>
          </div>

          <div className="p-5 space-y-4">
            {/* Loading */}
            {dl.status === 'loading' && (
              <div className="flex flex-col items-center gap-3 py-8 text-gray-400">
                <Loader2 className="w-8 h-8 animate-spin text-red-500"/>
                <p className="text-sm">Scraping stream from VidSrc...</p>
                <p className="text-xs text-gray-600">This may take 5–10 seconds</p>
              </div>
            )}

            {/* Error */}
            {dl.status === 'error' && (
              <div className="rounded-xl bg-red-950/40 border border-red-800/50 p-4">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-red-400 mt-0.5 flex-shrink-0"/>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-red-300">Could not fetch stream URL</p>
                    <p className="text-xs text-red-400/70 mt-1 font-mono break-all">{dl.error}</p>

                    {dl.error?.includes("not installed") ? (
                      <div className="mt-3 p-3 rounded-lg bg-gray-900 border border-yellow-700/40">
                        <p className="text-xs text-yellow-300 font-semibold mb-2">Run this once in your project folder:</p>
                        <div className="flex gap-2 items-center">
                          <pre className="flex-1 text-xs text-yellow-200/80 font-mono">npm install vidsrc.ts</pre>
                          <CopyBtn text="npm install vidsrc.ts" label="Copy"/>
                        </div>
                        <p className="text-xs text-gray-500 mt-2">Then restart your server: <code className="bg-gray-800 px-1 rounded">npm run start-server</code></p>
                      </div>
                    ) : dl.error?.includes('localhost') || dl.error?.includes('fetch') ? (
                      <div className="mt-3 p-3 rounded-lg bg-gray-900 border border-gray-700">
                        <p className="text-xs text-gray-400 font-semibold mb-1">Make sure server is running:</p>
                        <pre className="text-xs text-yellow-300/80 font-mono">npm run start-server</pre>
                      </div>
                    ) : null}

                    <div className="flex gap-2 mt-3">
                      <button onClick={fetchStream}
                        className="flex items-center gap-1.5 text-xs px-3 py-1.5 bg-red-700 hover:bg-red-600 rounded-lg text-white transition-colors">
                        <RefreshCw className="w-3 h-3"/> Retry
                      </button>
                      <a href={currentUrl || '#'} target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-1.5 text-xs px-3 py-1.5 bg-gray-700 hover:bg-gray-600 rounded-lg text-white transition-colors">
                        <ExternalLink className="w-3 h-3"/> Open Player (has download button)
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Success */}
            {dl.status === 'success' && dl.playlist && (
              <div className="space-y-4">

                {/* Primary M3U8 URL */}
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <FileVideo className="w-4 h-4 text-green-400"/>
                    <span className="text-xs font-semibold text-green-400 uppercase tracking-wider">HLS Stream (.m3u8)</span>
                    <span className="text-[10px] text-gray-500 ml-auto">via {dl.sourceId}</span>
                  </div>
                  <div className="flex gap-2">
                    <input readOnly value={dl.playlist}
                      onClick={e => (e.target as HTMLInputElement).select()}
                      className="flex-1 text-xs bg-gray-800/80 border border-gray-700 rounded-xl px-3 py-2.5 text-gray-200 font-mono focus:outline-none focus:border-red-500 transition-colors cursor-text"/>
                    <CopyBtn text={dl.playlist} label="Copy URL"/>
                  </div>
                </div>

                {/* All sources if multiple */}
                {dl.allSources.length > 1 && (
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <List className="w-4 h-4 text-purple-400"/>
                      <span className="text-xs font-semibold text-purple-400 uppercase tracking-wider">
                        All Sources ({dl.allSources.length})
                      </span>
                    </div>
                    <div className="space-y-2">
                      {dl.allSources.map((src, i) => (
                        <div key={i} className="flex gap-2 items-center">
                          <span className="text-[10px] text-gray-500 w-16 shrink-0 truncate">{src.name}</span>
                          <input readOnly value={src.playlist}
                            onClick={e => (e.target as HTMLInputElement).select()}
                            className="flex-1 text-xs bg-gray-800/60 border border-gray-700/60 rounded-lg px-2 py-1.5 text-gray-300 font-mono focus:outline-none focus:border-purple-500 cursor-text"/>
                          <button onClick={() => copy(src.playlist)}
                            className="p-1.5 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors shrink-0">
                            {copied === src.playlist ? <Check className="w-3 h-3 text-green-400"/> : <Copy className="w-3 h-3 text-gray-400"/>}
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* yt-dlp command */}
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Terminal className="w-4 h-4 text-yellow-400"/>
                    <span className="text-xs font-semibold text-yellow-400 uppercase tracking-wider">yt-dlp</span>
                    <span className="text-[10px] text-gray-600">downloads as .mp4</span>
                  </div>
                  <div className="flex gap-2">
                    <pre className="flex-1 text-xs bg-gray-900 border border-gray-700 rounded-xl px-3 py-2.5 text-yellow-200/80 font-mono overflow-x-auto whitespace-nowrap">{ytdlp}</pre>
                    <CopyBtn text={ytdlp} label="Copy"/>
                  </div>
                </div>

                {/* Quick actions */}
                <div className="pt-1 border-t border-gray-800 flex flex-wrap gap-2">
                  <a href={`vlc://${dl.playlist}`}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-orange-900/40 hover:bg-orange-900/70 border border-orange-700/40 text-orange-300 rounded-lg transition-colors">
                    🎬 Open in VLC
                  </a>
                  <a href={dl.playlist} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-gray-800 hover:bg-gray-700 border border-gray-700 text-gray-300 rounded-lg transition-colors">
                    <ExternalLink className="w-3 h-3"/> Open Raw .m3u8
                  </a>
                </div>
              </div>
            )}

            {/* Footer */}
            {dl.status !== 'loading' && (
              <div className="pt-2 border-t border-gray-800/60 flex items-center justify-between">
                <p className="text-[10px] text-gray-600">URLs expire ~24h. Re-fetch if broken.</p>
                <button onClick={fetchStream}
                  className="flex items-center gap-1.5 text-xs px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white rounded-lg transition-colors">
                  <RefreshCw className="w-3 h-3"/> Re-fetch
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="mt-2 flex items-center justify-between text-xs text-gray-600 dark:text-gray-500 px-1">
        <span>Playing via <span className="text-gray-400">{currentSource?.name}</span>{hasError ? ' · ⚠ error' : ''}</span>
        {!hasError && !isLoading && (
          <span className="text-green-600 font-medium flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block"/> Live
          </span>
        )}
      </div>
    </div>
  );
}
