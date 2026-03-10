import React, { useState, useEffect, useRef, useCallback } from "react";
import Hls from "hls.js";
import {
  Play, Pause, Download, Subtitles,
  Volume2, VolumeX, Maximize, Minimize, Settings,
  WifiOff, SkipBack, SkipForward, Loader2
} from "lucide-react";

interface Props {
  type: "movie" | "tv";
  tmdbId: string;
  title: string;
  episodeData?: { season: number; episode: number };
}

interface SubtitleTrack {
  label: string;
  lang: string;
  url: string;
}


interface StreamData {
  playlist: string;
  subtitles?: SubtitleTrack[];
  qualities?: { label: string; url: string }[];
}

// ─── Sources ────────────────────────────────────────────────────────────────

const API_BASE =
  typeof window !== "undefined" && window.location.hostname === "localhost"
    ? ""
    : "https://live-backend-1i4u.onrender.com";

/** Embed-based fallback sources (kept from original) */
const FALLBACK_SOURCES = [
  {
    name: "VidLink",
    getUrl: (t: string, id: string, s?: number, e?: number) =>
      t === "tv" && s && e
        ? `https://vidlink.pro/tv/${id}/${s}/${e}?primaryColor=e53935&autoplay=true`
        : `https://vidlink.pro/movie/${id}?primaryColor=e53935&autoplay=true`,
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

/** HLS-capable proxy sources (higher quality, self-hosted style) */
const HLS_SOURCES = [
  {
    name: "Primary API",
    fetch: async (type: string, id: string, season?: number, episode?: number): Promise<StreamData | null> => {
      const params = new URLSearchParams({
        isMovie: String(type === "movie"),
        id,
        season: String(season ?? 1),
        episode: String(episode ?? 1),
      });
      const res = await fetch(`${API_BASE}/api/stream?${params}`);
      if (!res.ok) return null;
      const data = await res.json();
      if (!data.stream?.playlist) return null;
      return {
        playlist: data.stream.playlist,
        subtitles: data.stream.subtitles,
        qualities: data.stream.qualities,
      };
    },
  },
  {
    name: "TMDB-HLS Mirror",
    fetch: async (type: string, id: string, season?: number, episode?: number): Promise<StreamData | null> => {
      // Example self-hosted HLS mirror endpoint pattern
      const path = type === "tv"
        ? `tv/${id}/${season}/${episode}`
        : `movie/${id}`;
      const res = await fetch(`https://hlsrouter.cinestream.cc/api/${path}`).catch(() => null);
      if (!res || !res.ok) return null;
      const data = await res.json().catch(() => null);
      if (!data?.m3u8) return null;
      return { playlist: data.m3u8, subtitles: data.subtitles };
    },
  },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatTime(s: number) {
  if (!isFinite(s)) return "0:00";
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, "0")}`;
}

function isCapacitor() {
  return typeof window !== "undefined" && !!(window as any).Capacitor;
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function StreamPlayer({ type, tmdbId, title, episodeData }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);
  const hideControlsTimer = useRef<ReturnType<typeof setTimeout>>();

  // Stream state
  const [stream, setStream] = useState<StreamData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [hlsSourceIndex, setHlsSourceIndex] = useState(0);
  const [fallbackIndex, setFallbackIndex] = useState(0);
  const [usingFallback, setUsingFallback] = useState(false);
  const [offline, setOffline] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState<number | null>(null);

  // Player state
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [buffered, setBuffered] = useState(0);
  const [volume, setVolume] = useState(1);
  const [muted, setMuted] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [showSubMenu, setShowSubMenu] = useState(false);

  // Subtitle state
  const [subtitles, setSubtitles] = useState<SubtitleTrack[]>([]);
  const [activeSub, setActiveSub] = useState<string | null>(null);

  // Quality state
  const [qualities, setQualities] = useState<{ label: string; url: string }[]>([]);
  const [activeQuality, setActiveQuality] = useState<string>("auto");

  const label = episodeData ? ` S${episodeData.season}E${episodeData.episode}` : "";

  // ── Load Stream ─────────────────────────────────────────────────────────────

  const loadStream = useCallback(async (hlsIdx = 0) => {
    setLoading(true);
    setError(false);
    setUsingFallback(false);
    setStream(null);
    setSubtitles([]);
    setQualities([]);
    setHlsSourceIndex(hlsIdx);

    for (let i = hlsIdx; i < HLS_SOURCES.length; i++) {
      try {
        const data = await HLS_SOURCES[i].fetch(
          type, tmdbId, episodeData?.season, episodeData?.episode
        );
        if (data) {
          setStream(data);
          if (data.subtitles?.length) setSubtitles(data.subtitles);
          if (data.qualities?.length) setQualities(data.qualities);
          setLoading(false);
          return;
        }
      } catch { /* try next */ }
    }

    // All HLS sources failed → use embed fallback
    setError(true);
    setUsingFallback(true);
    setLoading(false);
  }, [type, tmdbId, episodeData]);

  useEffect(() => { loadStream(0); }, [tmdbId, episodeData]);

  // ── HLS Init ────────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!stream?.playlist || !videoRef.current) return;
    const video = videoRef.current;

    // Cleanup previous instance
    if (hlsRef.current) { hlsRef.current.destroy(); hlsRef.current = null; }

    const playlistUrl = activeQuality !== "auto"
      ? qualities.find(q => q.label === activeQuality)?.url ?? stream.playlist
      : stream.playlist;

    if (video.canPlayType("application/vnd.apple.mpegurl")) {
      // Native HLS (Safari / iOS via Capacitor)
      video.src = playlistUrl;
    } else if (Hls.isSupported()) {
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: false,
        backBufferLength: 90,
        maxBufferLength: 60,
        maxMaxBufferLength: 120,
        startLevel: -1, // auto quality
      });
      hlsRef.current = hls;
      hls.loadSource(playlistUrl);
      hls.attachMedia(video);

      hls.on(Hls.Events.MANIFEST_PARSED, (_, data) => {
        if (!qualities.length && data.levels.length > 1) {
          setQualities([
            { label: "auto", url: playlistUrl },
            ...data.levels.map((l, idx) => ({
              label: `${l.height}p`,
              url: String(idx),
            })),
          ]);
        }
      });

      hls.on(Hls.Events.ERROR, (_, data) => {
        if (data.fatal) {
          if (data.type === Hls.ErrorTypes.NETWORK_ERROR) {
            hls.startLoad();
          } else {
            // Fatal error: fall to next HLS source
            if (hlsSourceIndex + 1 < HLS_SOURCES.length) {
              loadStream(hlsSourceIndex + 1);
            } else {
              setError(true);
              setUsingFallback(true);
            }
          }
        }
      });

      return () => { hls.destroy(); hlsRef.current = null; };
    }
  }, [stream, activeQuality]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    // Remove all existing <track> elements
    video.querySelectorAll("track").forEach(t => t.remove());

    subtitles.forEach((sub) => {
      const track = document.createElement("track");
      track.kind = "subtitles";
      track.label = sub.label;
      track.srclang = sub.lang;
      track.src = sub.url;
      if (sub.lang === activeSub) track.default = true;
      video.appendChild(track);
    });
  }, [subtitles, activeSub]);

  // ── Video Event Listeners ───────────────────────────────────────────────────

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const onTimeUpdate = () => {
      setCurrentTime(video.currentTime);
      if (video.buffered.length) {
        setBuffered(video.buffered.end(video.buffered.length - 1));
      }
    };
    const onDuration = () => setDuration(video.duration);
    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    const onVolumeChange = () => { setVolume(video.volume); setMuted(video.muted); };

    video.addEventListener("timeupdate", onTimeUpdate);
    video.addEventListener("durationchange", onDuration);
    video.addEventListener("play", onPlay);
    video.addEventListener("pause", onPause);
    video.addEventListener("volumechange", onVolumeChange);
    return () => {
      video.removeEventListener("timeupdate", onTimeUpdate);
      video.removeEventListener("durationchange", onDuration);
      video.removeEventListener("play", onPlay);
      video.removeEventListener("pause", onPause);
      video.removeEventListener("volumechange", onVolumeChange);
    };
  }, [stream]);

  // ── Controls Auto-hide ──────────────────────────────────────────────────────

  const resetHideTimer = useCallback(() => {
    setShowControls(true);
    clearTimeout(hideControlsTimer.current);
    hideControlsTimer.current = setTimeout(() => {
      if (playing) setShowControls(false);
    }, 3000);
  }, [playing]);

  useEffect(() => () => clearTimeout(hideControlsTimer.current), []);

  // ── Fullscreen ──────────────────────────────────────────────────────────────

  useEffect(() => {
    const handler = () => setFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", handler);
    return () => document.removeEventListener("fullscreenchange", handler);
  }, []);

  const toggleFullscreen = async () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      await containerRef.current.requestFullscreen();
    } else {
      await document.exitFullscreen();
    }
  };

  // ── Player Controls ─────────────────────────────────────────────────────────

  const togglePlay = () => {
    const v = videoRef.current;
    if (!v) return;
    v.paused ? v.play() : v.pause();
  };

  const seek = (e: React.MouseEvent<HTMLDivElement>) => {
    const bar = progressRef.current;
    const v = videoRef.current;
    if (!bar || !v) return;
    const rect = bar.getBoundingClientRect();
    const ratio = (e.clientX - rect.left) / rect.width;
    v.currentTime = ratio * duration;
  };

  const skip = (secs: number) => {
    const v = videoRef.current;
    if (!v) return;
    v.currentTime = Math.max(0, Math.min(duration, v.currentTime + secs));
  };

  // ── Download ─────────────────────────────────────────────────────────────────

  // Use Function() so Vite never statically resolves Capacitor packages
  const capacitorImport = (pkg: string) =>
    new Function("p", "return import(p)")(pkg) as Promise<any>;

  const downloadAbortRef = useRef<AbortController | null>(null);

  /**
   * Parse an M3U8 playlist and return absolute segment URLs.
   * Handles both master playlists (picks best bandwidth variant) and
   * media playlists directly.
   */
  async function resolveSegments(playlistUrl: string): Promise<string[]> {
    const res = await fetch(playlistUrl);
    const text = await res.text();
    const base = playlistUrl.substring(0, playlistUrl.lastIndexOf("/") + 1);

    const toAbs = (u: string) =>
      u.startsWith("http") ? u : base + u;

    // Master playlist → pick highest bandwidth variant
    if (text.includes("#EXT-X-STREAM-INF")) {
      const lines = text.split("\n").map(l => l.trim()).filter(Boolean);
      let bestBw = -1;
      let bestUri = "";
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].startsWith("#EXT-X-STREAM-INF")) {
          const bwMatch = lines[i].match(/BANDWIDTH=(\d+)/);
          const bw = bwMatch ? parseInt(bwMatch[1]) : 0;
          const uri = lines[i + 1];
          if (uri && !uri.startsWith("#") && bw > bestBw) {
            bestBw = bw;
            bestUri = toAbs(uri);
          }
        }
      }
      if (bestUri) return resolveSegments(bestUri);
      return [];
    }

    // Media playlist → collect .ts / .m4s segments
    return text
      .split("\n")
      .map(l => l.trim())
      .filter(l => l && !l.startsWith("#"))
      .map(toAbs);
  }

  /**
   * When no HLS stream loaded (embed fallback mode), try known direct-MP4
   * endpoints so the download button is never a dead end.
   */
  async function getDirectMp4Url(): Promise<string | null> {
    const s = episodeData?.season ?? 1;
    const e = episodeData?.episode ?? 1;
    const candidates = type === "movie"
      ? [
          `https://dl.vidsrc.vip/movie/${tmdbId}`,
          `https://multiembed.mov/directstream.php?video_id=${tmdbId}&tmdb=1`,
        ]
      : [
          `https://dl.vidsrc.vip/tv/${tmdbId}/${s}/${e}`,
          `https://multiembed.mov/directstream.php?video_id=${tmdbId}&tmdb=1&s=${s}&e=${e}`,
        ];
    for (const url of candidates) {
      try {
        const res = await fetch(url, { method: "HEAD", signal: AbortSignal.timeout(4000) });
        const ct = res.headers.get("content-type") ?? "";
        if (res.ok && (ct.includes("video") || ct.includes("octet-stream"))) return url;
      } catch { /* try next */ }
    }
    return null;
  }

  const handleDownload = async () => {
    // ── No HLS stream → try direct MP4 API or open download page ────────────
    if (!stream?.playlist) {
      setDownloadProgress(0);
      const mp4url = await getDirectMp4Url();
      if (mp4url) {
        const a = document.createElement("a");
        a.href = mp4url;
        a.download = `${title.replace(/[^a-z0-9]/gi, "_")}${label}.mp4`;
        a.target = "_blank";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      } else {
        // Open vidsrc download page as last resort
        const dlPage = type === "movie"
          ? `https://dl.vidsrc.vip/movie/${tmdbId}`
          : `https://dl.vidsrc.vip/tv/${tmdbId}/${episodeData?.season ?? 1}/${episodeData?.episode ?? 1}`;
        window.open(dlPage, "_blank");
      }
      setDownloadProgress(100);
      setTimeout(() => setDownloadProgress(null), 2000);
      return;
    }

    // ── Capacitor: write segments to device storage ──────────────────────────
    if (isCapacitor()) {
      try {
        const { Filesystem, Directory } = await capacitorImport("@capacitor/filesystem");
        const { Preferences } = await capacitorImport("@capacitor/preferences");
        setDownloadProgress(0);

        const segments = await resolveSegments(stream.playlist);
        const chunks: Uint8Array[] = [];
        for (let i = 0; i < segments.length; i++) {
          const buf = await fetch(segments[i]).then(r => r.arrayBuffer());
          chunks.push(new Uint8Array(buf));
          setDownloadProgress(Math.round(((i + 1) / segments.length) * 95));
        }

        const total = chunks.reduce((s, c) => s + c.length, 0);
        const merged = new Uint8Array(total);
        let offset = 0;
        for (const c of chunks) { merged.set(c, offset); offset += c.length; }

        // base64 encode for Capacitor Filesystem
        const b64 = btoa(String.fromCharCode(...merged));
        const filename = `${title.replace(/[^a-z0-9]/gi, "_")}${label}.ts`;
        await Filesystem.writeFile({
          path: `offline/${filename}`,
          data: b64,
          directory: Directory.Documents,
          recursive: true,
        });

        const key = `offline_${tmdbId}_${episodeData?.season ?? ""}_${episodeData?.episode ?? ""}`;
        await Preferences.set({
          key,
          value: JSON.stringify({ title, label, path: `offline/${filename}`, storedAt: Date.now() }),
        });

        setDownloadProgress(100);
        setOffline(true);
        setTimeout(() => setDownloadProgress(null), 2500);
      } catch (err) {
        console.error("Capacitor download failed:", err);
        setDownloadProgress(null);
      }
      return;
    }

    // ── Web: fetch all segments → merge → download as .ts file ──────────────
    try {
      const abort = new AbortController();
      downloadAbortRef.current = abort;
      setDownloadProgress(0);

      const segments = await resolveSegments(stream.playlist);
      if (!segments.length) throw new Error("No segments found");

      const chunks: ArrayBuffer[] = [];
      for (let i = 0; i < segments.length; i++) {
        if (abort.signal.aborted) return;
        const buf = await fetch(segments[i], { signal: abort.signal }).then(r => r.arrayBuffer());
        chunks.push(buf);
        setDownloadProgress(Math.round(((i + 1) / segments.length) * 100));
      }

      // Merge all TS segments into one blob and trigger browser download
      const blob = new Blob(chunks, { type: "video/mp2t" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${title.replace(/[^a-z0-9]/gi, "_")}${label}.ts`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 5000);

      setTimeout(() => setDownloadProgress(null), 2500);
    } catch (err: any) {
      if (err?.name !== "AbortError") console.error("Download failed:", err);
      setDownloadProgress(null);
    }
  };

  const cancelDownload = () => {
    downloadAbortRef.current?.abort();
    setDownloadProgress(null);
  };

  // ── Offline playback (Capacitor) ─────────────────────────────────────────────

  const loadOffline = async () => {
    if (!isCapacitor()) return;
    try {
      const { Filesystem, Directory } = await capacitorImport("@capacitor/filesystem");
      const { Preferences } = await capacitorImport("@capacitor/preferences");
      const key = `offline_${tmdbId}_${episodeData?.season ?? ""}_${episodeData?.episode ?? ""}`;
      const meta = await Preferences.get({ key });
      if (!meta.value) return;
      const { path } = JSON.parse(meta.value);
      const file = await Filesystem.readFile({ path, directory: Directory.Documents });
      const blob = new Blob([file.data as any], { type: "application/x-mpegURL" });
      const url = URL.createObjectURL(blob);
      setStream({ playlist: url });
      setUsingFallback(false);
      setError(false);
    } catch (e) {
      console.error("Offline load failed:", e);
    }
  };

  // ── Fallback source cycle ────────────────────────────────────────────────────

  const fallback = FALLBACK_SOURCES[fallbackIndex];
  const fallbackUrl = fallback.getUrl(type, tmdbId, episodeData?.season, episodeData?.episode);

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;
  const bufferedPct = duration > 0 ? (buffered / duration) * 100 : 0;

  // ─────────────────────────────────────────────────────────────────────────────

  return (
    <div className="mt-8 font-sans">
      {/* Title */}
      <h2 className="text-xl font-bold mb-3 flex items-center gap-2 text-white">
        <Play className="w-5 h-5 text-red-500 fill-red-500" />
        <span>{title}</span>
        {label && <span className="text-red-400 text-sm font-medium">{label}</span>}
        {offline && (
          <span className="ml-auto flex items-center gap-1 text-xs text-emerald-400 font-normal">
            <WifiOff className="w-3 h-3" /> Offline Ready
          </span>
        )}
      </h2>

      {/* Player container */}
      <div
        ref={containerRef}
        className="aspect-video bg-black rounded-xl overflow-hidden relative group select-none"
        onMouseMove={resetHideTimer}
        onMouseLeave={() => playing && setShowControls(false)}
        onClick={() => { if (!showSettings) togglePlay(); }}
        style={{ cursor: showControls ? "default" : "none" }}
      >
        {/* Loading overlay */}
        {loading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-white bg-black/80 z-10">
            <Loader2 className="w-10 h-10 animate-spin text-red-500 mb-3" />
            <span className="text-sm text-gray-300">Finding best stream…</span>
          </div>
        )}

        {/* Primary HLS video */}
        {stream && !usingFallback && (
          <video
            ref={videoRef}
            className="w-full h-full"
            onClick={e => e.stopPropagation()}
            onDoubleClick={toggleFullscreen}
            playsInline
            crossOrigin="anonymous"
          />
        )}

        {/* Fallback iframe */}
        {usingFallback && !loading && (
          <iframe
            src={fallbackUrl}
            className="w-full h-full border-0"
            allowFullScreen
            allow="autoplay; encrypted-media; picture-in-picture"
            title={`${title}${label}`}
          />
        )}

        {/* Custom Controls (only for HLS video) */}
        {stream && !usingFallback && (
          <div
            className="absolute inset-0 flex flex-col justify-end transition-opacity duration-300"
            style={{ opacity: showControls ? 1 : 0, pointerEvents: showControls ? "auto" : "none" }}
            onClick={e => e.stopPropagation()}
          >
            {/* Gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent pointer-events-none" />

            {/* Center play/pause indicator */}
            <div className="absolute inset-0 flex items-center justify-center gap-12 pointer-events-none">
              <button
                className="pointer-events-auto p-3 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-sm transition"
                onClick={() => skip(-10)}
              >
                <SkipBack className="w-6 h-6 text-white" />
              </button>
              <button
                className="pointer-events-auto p-5 rounded-full bg-red-600 hover:bg-red-500 shadow-lg shadow-red-900/50 transition"
                onClick={togglePlay}
              >
                {playing
                  ? <Pause className="w-8 h-8 text-white fill-white" />
                  : <Play className="w-8 h-8 text-white fill-white ml-1" />}
              </button>
              <button
                className="pointer-events-auto p-3 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-sm transition"
                onClick={() => skip(10)}
              >
                <SkipForward className="w-6 h-6 text-white" />
              </button>
            </div>

            {/* Bottom bar */}
            <div className="relative z-10 px-4 pb-3 space-y-2">
              {/* Progress bar */}
              <div
                ref={progressRef}
                className="w-full h-1 bg-white/20 rounded-full cursor-pointer group/bar hover:h-2 transition-all"
                onClick={seek}
              >
                {/* Buffered */}
                <div
                  className="absolute h-full bg-white/30 rounded-full"
                  style={{ width: `${bufferedPct}%` }}
                />
                {/* Played */}
                <div
                  className="h-full bg-red-500 rounded-full relative"
                  style={{ width: `${progress}%` }}
                >
                  <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full shadow opacity-0 group-hover/bar:opacity-100 transition" />
                </div>
              </div>

              {/* Controls row */}
              <div className="flex items-center gap-3">
                {/* Play/pause */}
                <button onClick={togglePlay} className="text-white hover:text-red-400 transition">
                  {playing
                    ? <Pause className="w-5 h-5 fill-current" />
                    : <Play className="w-5 h-5 fill-current" />}
                </button>

                {/* Volume */}
                <button onClick={() => { if (videoRef.current) videoRef.current.muted = !muted; }} className="text-white hover:text-red-400 transition">
                  {muted || volume === 0 ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                </button>
                <input
                  type="range" min={0} max={1} step={0.05} value={muted ? 0 : volume}
                  className="w-20 accent-red-500 cursor-pointer"
                  onChange={e => {
                    const v = parseFloat(e.target.value);
                    if (videoRef.current) { videoRef.current.volume = v; videoRef.current.muted = v === 0; }
                  }}
                />

                {/* Time */}
                <span className="text-white/70 text-xs tabular-nums">
                  {formatTime(currentTime)} / {formatTime(duration)}
                </span>

                {/* Spacer */}
                <div className="flex-1" />

                {/* Subtitle selector */}
                {subtitles.length > 0 && (
                  <div className="relative">
                    <button
                      onClick={() => { setShowSubMenu(s => !s); setShowSettings(false); }}
                      className={`text-white hover:text-red-400 transition ${activeSub ? "text-red-400" : ""}`}
                    >
                      <Subtitles className="w-5 h-5" />
                    </button>
                    {showSubMenu && (
                      <div className="absolute bottom-8 right-0 bg-gray-900 border border-white/10 rounded-lg shadow-xl p-1 min-w-[140px] z-50">
                        <button
                          className={`w-full text-left px-3 py-1.5 text-xs rounded hover:bg-white/10 ${!activeSub ? "text-red-400" : "text-white"}`}
                          onClick={() => { setActiveSub(null); setShowSubMenu(false); }}
                        >
                          Off
                        </button>
                        {subtitles.map(s => (
                          <button
                            key={s.lang}
                            className={`w-full text-left px-3 py-1.5 text-xs rounded hover:bg-white/10 ${activeSub === s.lang ? "text-red-400" : "text-white"}`}
                            onClick={() => { setActiveSub(s.lang); setShowSubMenu(false); }}
                          >
                            {s.label}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Settings (quality) */}
                {qualities.length > 0 && (
                  <div className="relative">
                    <button
                      onClick={() => { setShowSettings(s => !s); setShowSubMenu(false); }}
                      className="text-white hover:text-red-400 transition"
                    >
                      <Settings className="w-5 h-5" />
                    </button>
                    {showSettings && (
                      <div className="absolute bottom-8 right-0 bg-gray-900 border border-white/10 rounded-lg shadow-xl p-1 min-w-[120px] z-50">
                        <p className="px-3 py-1 text-xs text-gray-500 font-semibold uppercase tracking-wider">Quality</p>
                        {qualities.map(q => (
                          <button
                            key={q.label}
                            className={`w-full text-left px-3 py-1.5 text-xs rounded hover:bg-white/10 ${activeQuality === q.label ? "text-red-400" : "text-white"}`}
                            onClick={() => { setActiveQuality(q.label); setShowSettings(false); }}
                          >
                            {q.label}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Fullscreen */}
                <button onClick={toggleFullscreen} className="text-white hover:text-red-400 transition">
                  {fullscreen ? <Minimize className="w-5 h-5" /> : <Maximize className="w-5 h-5" />}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Bottom bar: SOURCE tabs + actions ── */}
      <div className="mt-3 space-y-2">

        {/* Row 1: SOURCE label + tabs */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[11px] font-semibold tracking-widest text-gray-500 uppercase">Source</span>

          {/* Embed source tabs */}
          {FALLBACK_SOURCES.map((src, i) => (
            <button
              key={src.name}
              onClick={() => { setFallbackIndex(i); setUsingFallback(true); setStream(null); setError(true); }}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
                usingFallback && fallbackIndex === i
                  ? "bg-red-500 text-white shadow shadow-red-900/50"
                  : "bg-gray-800 text-gray-300 hover:bg-gray-700 hover:text-white"
              }`}
            >
              {src.name}
            </button>
          ))}

          {/* HLS tab (if it loaded) */}
          {stream && !usingFallback && (
            <button
              className="px-3 py-1 rounded-full text-xs font-medium bg-emerald-600 text-white shadow shadow-emerald-900/40"
            >
              HLS ●
            </button>
          )}
        </div>

        {/* Row 2: status left, actions right */}
        <div className="flex items-center justify-between flex-wrap gap-2">

          {/* Playing via / status */}
          <span className="text-xs text-gray-500">
            {loading
              ? "Loading…"
              : stream && !usingFallback
                ? <span className="flex items-center gap-1.5">
                    Playing via <span className="text-white font-medium">HLS</span>
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />
                    <span className="text-emerald-400">Live</span>
                  </span>
                : <span className="flex items-center gap-1.5">
                    Playing via <span className="text-white font-medium">{FALLBACK_SOURCES[fallbackIndex].name}</span>
                  </span>
            }
          </span>

          {/* Right-side actions */}
          <div className="flex items-center gap-2">

            {/* Download */}
            <div className="flex items-center gap-1.5">
              <button
                onClick={downloadProgress !== null ? cancelDownload : handleDownload}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition ${
                  downloadProgress !== null
                    ? "bg-yellow-600 hover:bg-yellow-500 text-white"
                    : "bg-red-600 hover:bg-red-500 text-white shadow shadow-red-900/40"
                }`}
              >
                <Download className="w-3.5 h-3.5" />
                {downloadProgress === null
                  ? isCapacitor() ? "Save Offline" : "Download"
                  : downloadProgress === 100
                    ? "✓ Done!"
                    : `${downloadProgress}% · Cancel`}
              </button>
              {downloadProgress !== null && downloadProgress < 100 && (
                <div className="w-20 h-1 bg-gray-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-red-500 rounded-full transition-all duration-300"
                    style={{ width: `${downloadProgress}%` }}
                  />
                </div>
              )}
            </div>

            {/* Capacitor offline playback */}
            {isCapacitor() && offline && (
              <button
                onClick={loadOffline}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-gray-800 hover:bg-gray-700 text-emerald-400 rounded-lg font-medium border border-gray-700 transition"
              >
                <WifiOff className="w-3 h-3" />
                Play Offline
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
