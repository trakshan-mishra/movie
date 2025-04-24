import React, { useState, useEffect, useRef } from 'react';
import { Play, AlertCircle, RefreshCw, ExternalLink } from 'lucide-react';

interface Props {
  type: 'movie' | 'tv';
  tmdbId: string;
  title: string;
  episodeData?: {
    season: number;
    episode: number;
  };
}

// List of streaming sources to try
const SOURCES = [
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

export default function StreamPlayer({ type, tmdbId, title, episodeData }: Props) {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [activeSourceIndex, setActiveSourceIndex] = useState(0);
  const [attemptCount, setAttemptCount] = useState(0);
  const playerRef = useRef<HTMLDivElement | null>(null);

  // Scroll into view when changing source manually
  const scrollToPlayer = () => {
    if (playerRef.current) {
      playerRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  // Get current source URL
  const currentSource = SOURCES[activeSourceIndex];
  const currentUrl = currentSource?.getUrl(
    type,
    tmdbId,
    episodeData?.season,
    episodeData?.episode
  );

  // Reset states when props change
  useEffect(() => {
    setIsLoading(true);
    setHasError(false);
    setActiveSourceIndex(0);
    setAttemptCount(0);
  }, [tmdbId, episodeData]);

  // Handle timeout for loading
  useEffect(() => {
    if (!isLoading) return;

    const timeoutId = setTimeout(() => {
      if (isLoading) {
        setHasError(true);
        setIsLoading(false);
      }
    }, 12000); // 12 seconds timeout

    return () => clearTimeout(timeoutId);
  }, [isLoading]);

  const handleIframeLoad = () => {
    setIsLoading(false);
    setHasError(false);
  };

  const handleIframeError = () => {
    setIsLoading(false);
    setHasError(true);
  };

  const tryNextSource = () => {
    const nextIndex = (activeSourceIndex + 1) % SOURCES.length;
    setActiveSourceIndex(nextIndex);
    setIsLoading(true);
    setHasError(false);
    setAttemptCount(attemptCount + 1);
  };

  const retry = () => {
    if (attemptCount >= SOURCES.length) {
      setActiveSourceIndex(0);
    }

    setIsLoading(true);
    setHasError(false);
    setAttemptCount(attemptCount + 1);
  };

  const allSourcesFailed = attemptCount >= SOURCES.length && hasError;

  return (
    <div className="mt-8">
      <h2 className="text-2xl font-bold mb-4 flex items-center dark:text-white">
        <Play className="w-6 h-6 mr-2" />
        Watch {title}
      </h2>

      <div ref={playerRef} className="aspect-video rounded-lg overflow-hidden shadow-lg bg-black relative">
        {isLoading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-900 bg-opacity-75 text-white">
            <RefreshCw className="w-12 h-12 animate-spin mb-4" />
            <p className="text-center">Loading {currentSource?.name} player...</p>
            <p className="text-sm mt-2 text-gray-400">Source {activeSourceIndex + 1} of {SOURCES.length}</p>
          </div>
        )}

        {hasError && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-900 bg-opacity-90 text-white p-6">
            <AlertCircle className="w-12 h-12 mb-4 text-red-500" />

            {allSourcesFailed ? (
              <>
                <p className="text-center mb-2 text-lg">All streaming sources are currently unavailable</p>
                <p className="text-center mb-6 text-sm text-gray-400">
                  This could be due to server issues or regional restrictions
                </p>

                <div className="flex flex-col sm:flex-row gap-4 mt-2">
                  <button
                    onClick={retry}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-md flex items-center justify-center"
                  >
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Try Again
                  </button>

                  <a
                    href={`https://www.themoviedb.org/${type}/${tmdbId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-4 py-2 bg-gray-600 hover:bg-gray-700 rounded-md flex items-center justify-center"
                  >
                    <ExternalLink className="w-4 h-4 mr-2" />
                    View on TMDB
                  </a>
                </div>
              </>
            ) : (
              <>
                <p className="text-center mb-2">
                  {currentSource?.name} is currently unavailable
                </p>

                <div className="flex gap-4 mt-4">
                  <button
                    onClick={retry}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-md flex items-center"
                  >
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Retry
                  </button>

                  <button
                    onClick={tryNextSource}
                    className="px-4 py-2 bg-gray-600 hover:bg-gray-700 rounded-md"
                  >
                    Try Next Source
                  </button>
                </div>
              </>
            )}
          </div>
        )}

        {currentUrl && (
          <iframe
            key={`${currentSource?.name}-${attemptCount}`}
            src={currentUrl}
            width="100%"
            height="100%"
            allowFullScreen
            allow="autoplay; fullscreen"
            frameBorder="0"
            title={`Stream ${title} - ${currentSource?.name}`}
            className="w-full h-full"
            onLoad={handleIframeLoad}
            onError={handleIframeError}
          ></iframe>
        )}
      </div>

      {/* Switch Source Dropdown */}
      <div className="mt-4">
        <label htmlFor="source-select" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Switch Source
        </label>
        <select
          id="source-select"
          value={activeSourceIndex}
          onChange={(e) => {
            const index = parseInt(e.target.value);
            setActiveSourceIndex(index);
            setIsLoading(true);
            setHasError(false);
            setAttemptCount(attemptCount + 1);
            scrollToPlayer();
          }}
          className="w-full sm:w-64 p-2 border rounded-md bg-white dark:bg-gray-800 dark:text-white dark:border-gray-700"
        >
          {SOURCES.map((source, index) => (
            <option key={source.name} value={index}>
              {source.name}
            </option>
          ))}
        </select>
      </div>

      <div className="mt-4 flex flex-col sm:flex-row sm:items-center justify-between">
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Playing from {currentSource?.name} {hasError ? "(error)" : ""}
        </p>
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 sm:mt-0">
          {!hasError && !isLoading ? "Playback started successfully" : ""}
        </p>
      </div>
    </div>
  );
}
