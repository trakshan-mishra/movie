import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { getDetails } from '../services/tmdb';
import { Movie, TVShow, MediaType } from '../types/tmdb';
import VideoPlayer from '../components/VideoPlayer';
import StreamPlayer from '../components/StreamPlayer';
import { ArrowLeft, Calendar, Clock, Star, Info, Tag, Play, ThumbsUp, ThumbsDown } from 'lucide-react';
import { Link } from 'react-router-dom';

interface DetailProps {
  type: MediaType;
}

export default function MediaDetail({ type }: DetailProps) {
  const { id } = useParams<{ id: string }>();
  const [details, setDetails] = useState<Movie | TVShow | null>(null);
  const [loading, setLoading] = useState(true);
  const [showStream, setShowStream] = useState(false);
  const [selectedSeason, setSelectedSeason] = useState(1);
  const [selectedEpisode, setSelectedEpisode] = useState(1);
  const [showTrailer, setShowTrailer] = useState(false);

  useEffect(() => {
    const fetchDetails = async () => {
      if (!id) return;
      
      setLoading(true);
      try {
        const data = await getDetails(id, type);
        setDetails(data);
        
        // For TV shows, set initial season and episode
        if (type === 'tv' && data.seasons && data.seasons.length > 0) {
          setSelectedSeason(1); // Start with season 1
          setSelectedEpisode(1); // Start with episode 1
        }
      } catch (error) {
        console.error('Error fetching details:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDetails();
  }, [id, type]);

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[80vh]">
        <div className="w-16 h-16 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!details) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-4">Content not found</h1>
        <Link to={`/${type}s`} className="text-cyan-500 flex items-center">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to {type === 'movie' ? 'Movies' : 'TV Shows'}
        </Link>
      </div>
    );
  }

  // Extract cast for display
  const cast = details.credits?.cast?.slice(0, 5) || [];
  
  // Helper for release date format
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  // TV show specific data
  const seasonOptions = type === 'tv' && details.seasons ? details.seasons : [];
  const episodeCount = type === 'tv' && details.seasons && details.seasons[selectedSeason - 1]
    ? details.seasons[selectedSeason - 1].episodes
    : [];

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <Link to={`/${type}s`} className="text-cyan-500 flex items-center mb-6 hover:text-cyan-400 transition-colors duration-200">
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back to {type === 'movie' ? 'Movies' : 'TV Shows'}
      </Link>

      {/* Hero Section with Backdrop */}
      <div className="relative rounded-xl overflow-hidden mb-8 shadow-xl">
        <div className="absolute inset-0 bg-black/60 z-10"></div>
        <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent z-20"></div>
        
        {details.backdrop_path ? (
          <img
            src={`https://image.tmdb.org/t/p/original${details.backdrop_path}`}
            alt={details.title || details.name}
            className="w-full h-[40vh] object-cover"
          />
        ) : (
          <div className="w-full h-[40vh] bg-gradient-to-r from-slate-900 to-purple-900"></div>
        )}
        
        {/* Content Overlay */}
        <div className="absolute bottom-0 left-0 right-0 z-30 p-6">
          <div className="flex flex-col md:flex-row gap-8 items-end">
            {/* Title and Metadata */}
            <div className="flex-1">
              <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">{details.title || details.name}</h1>
              
              <div className="flex flex-wrap gap-4 mb-4 text-white/80">
                {(details.release_date || details.first_air_date) && (
                  <div className="flex items-center">
                    <Calendar className="w-4 h-4 mr-1 text-cyan-400" />
                    {formatDate(details.release_date || details.first_air_date)}
                  </div>
                )}
                
                {details.runtime && (
                  <div className="flex items-center">
                    <Clock className="w-4 h-4 mr-1 text-cyan-400" />
                    {details.runtime} minutes
                  </div>
                )}
                
                <div className="flex items-center">
                  <Star className="w-4 h-4 mr-1 text-yellow-500" />
                  {details.vote_average.toFixed(1)} ({details.vote_count} votes)
                </div>
              </div>
              
              {/* Action Buttons */}
              <div className="flex gap-4 mt-2">
                <button 
                  onClick={() => setShowStream(!showStream)}
                  className="px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white rounded-md flex items-center transition-all duration-300 hover:shadow-[0_0_15px_rgba(6,182,212,0.5)]"
                >
                  <Play className="w-4 h-4 mr-2" />
                  {showStream ? 'Hide Stream' : 'Stream Now'}
                </button>
                
                <button 
                  onClick={() => setShowTrailer(true)}
                  className="px-4 py-2 bg-white/10 backdrop-blur-sm hover:bg-white/20 text-white rounded-md flex items-center transition-colors duration-200 border border-white/20"
                >
                  <Play className="w-4 h-4 mr-2" />
                  Watch Trailer
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-8">
        {/* Poster */}
        <div className="w-full md:w-1/3 lg:w-1/4">
          <div className="rounded-lg overflow-hidden shadow-lg hover-glow">
            {details.poster_path ? (
              <img
                src={`https://image.tmdb.org/t/p/w500${details.poster_path}`}
                alt={details.title || details.name}
                className="w-full h-auto hover-scale"
              />
            ) : (
              <div className="bg-gray-200 w-full aspect-[2/3] flex items-center justify-center">
                <Info className="w-12 h-12 text-gray-400" />
              </div>
            )}
          </div>
        </div>

        {/* Details */}
        <div className="w-full md:w-2/3 lg:w-3/4">
          {/* Genres */}
          {details.genres && details.genres.length > 0 && (
            <div className="mb-4">
              <div className="flex items-center gap-2 flex-wrap">
                <Tag className="w-4 h-4 text-cyan-400" />
                {details.genres.map(genre => (
                  <span key={genre.id} className="bg-white/10 backdrop-blur-sm px-3 py-1 rounded-full text-sm hover:bg-cyan-500/20 transition-colors duration-200 cursor-pointer">
                    {genre.name}
                  </span>
                ))}
              </div>
            </div>
          )}
          
          {/* Overview */}
          {details.overview && (
            <div className="mb-6 glass-card p-6 rounded-xl">
              <h2 className="text-xl font-semibold mb-2">Overview</h2>
              <p className="text-gray-800 dark:text-gray-200">{details.overview}</p>
            </div>
          )}
          
          {/* Cast */}
          {cast.length > 0 && (
            <div className="mb-6 glass-card p-6 rounded-xl">
              <h2 className="text-xl font-semibold mb-4">Cast</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
                {cast.map(actor => (
                  <div key={actor.id} className="bg-white/10 rounded-lg overflow-hidden hover:bg-white/20 transition-colors duration-200 hover-scale">
                    <div className="aspect-[3/4] bg-gray-800 flex items-center justify-center">
                      <Info className="w-8 h-8 text-gray-600" />
                    </div>
                    <div className="p-3">
                      <h3 className="font-medium text-white group-hover:text-cyan-300 transition-colors duration-200">
                        {actor.name}
                      </h3>
                      <p className="text-sm text-white/70">{actor.character}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TV Show Season/Episode Selector */}
          {type === 'tv' && (
            <div className="mb-6 glass-card p-6 rounded-xl">
              <h2 className="text-xl font-semibold mb-2">Season & Episode</h2>
              <div className="flex flex-wrap gap-4">
                {/* Season Dropdown */}
                <div className="w-full sm:w-auto">
                  <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">Season</label>
                  <select 
                    value={selectedSeason}
                    onChange={(e) => {
                      setSelectedSeason(parseInt(e.target.value));
                      setSelectedEpisode(1); // Reset episode when season changes
                    }}
                    className="w-full sm:w-36 rounded-md border border-gray-300 dark:border-gray-700 bg-white/10 backdrop-blur-sm dark:bg-gray-800/50 px-3 py-2 focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all duration-200"
                  >
                    {seasonOptions.map((season) => (
                      <option key={season.id} value={season.season_number}>
                        Season {season.season_number} {season.name !== `Season ${season.season_number}` ? `(${season.name})` : ''}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Episode Dropdown */}
                <div className="w-full sm:w-auto">
                  <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">Episode</label>
                  <select 
                    value={selectedEpisode}
                    onChange={(e) => setSelectedEpisode(parseInt(e.target.value))}
                    className="w-full sm:w-36 rounded-md border border-gray-300 dark:border-gray-700 bg-white/10 backdrop-blur-sm dark:bg-gray-800/50 px-3 py-2 focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all duration-200"
                  >
                    {episodeCount.map((episode) => (
                      <option key={episode.id} value={episode.episode_number}>
                        Episode {episode.episode_number} {episode.name !== `Episode ${episode.episode_number}` ? `(${episode.name})` : ''}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Video Section */}
      {details.videos && !showStream && <VideoPlayer videos={details.videos.results} />}
      
      {/* Stream Section */}
      {showStream && (
        <StreamPlayer 
          type={type} 
          tmdbId={id || ''} 
          title={details.title || details.name || ''}
          episodeData={type === 'tv' ? { season: selectedSeason, episode: selectedEpisode } : undefined}
        />
      )}
      
      {/* Trailer Modal */}
      {showTrailer && details.videos && details.videos.results && details.videos.results.length > 0 && (
        <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4">
          <div className="relative w-full max-w-4xl">
            <button
              onClick={() => setShowTrailer(false)}
              className="absolute -top-12 right-0 text-white hover:bg-white/10 rounded-full p-2"
            >
              <ArrowLeft className="w-6 h-6" />
              <span className="sr-only">Close</span>
            </button>

            <div className="aspect-video bg-black">
              <iframe
                src={`https://www.youtube.com/embed/${details.videos.results[0].key}`}
                title="YouTube video player"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                className="w-full h-full"
              ></iframe>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}