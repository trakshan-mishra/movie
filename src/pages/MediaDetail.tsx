"use client"

import { useEffect, useState } from "react"
import { useParams } from "react-router-dom"
import { Clock, Calendar, Star, Tv } from "lucide-react"
import { getDetails } from "../services/tmdb"
import type { Movie, TVShow, MediaType } from "../types/tmdb"
import VideoPlayer from "../components/VideoPlayer"
import StreamPlayer from "../components/StreamPlayer"

export default function MediaDetail() {
  const { type, id } = useParams<{ type: MediaType; id: string }>()
  const [media, setMedia] = useState<Movie | TVShow | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedSeason, setSelectedSeason] = useState(1)
  const [selectedEpisode, setSelectedEpisode] = useState(1)

  useEffect(() => {
    const fetchDetails = async () => {
      if (id && type) {
        const details = await getDetails(id, type)
        setMedia(details)
        setLoading(false)
      }
    }

    fetchDetails()
  }, [id, type])

  if (loading || !media) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    )
  }

  const title = type === "movie" ? (media as Movie).title : (media as TVShow).name
  const releaseDate = type === "movie" ? (media as Movie).release_date : (media as TVShow).first_air_date

  return (
    <div className="pb-12">
      {/* Hero section with responsive adjustments */}
      <div
        className="h-[40vh] md:h-[60vh] bg-cover bg-center relative"
        style={{
          backgroundImage: `url(https://image.tmdb.org/t/p/original${media.backdrop_path})`,
        }}
      >
        <div className="absolute inset-0 bg-black bg-opacity-50"></div>
        <div className="absolute inset-0 flex items-center">
          <div className="w-full px-4 mx-auto max-w-7xl">
            {/* Responsive flex layout that stacks on mobile */}
            <div className="flex flex-col md:flex-row md:gap-8">
              <img
                src={`https://image.tmdb.org/t/p/w500${media.poster_path}`}
                alt={title}
                className="hidden md:block w-48 h-72 md:w-64 md:h-96 rounded-lg shadow-lg object-cover"
              />
              <div className="text-white">
                <h1 className="text-2xl md:text-4xl font-bold mb-2">{title}</h1>
                {media.tagline && (
                  <p className="text-lg md:text-xl text-gray-300 italic mb-2 md:mb-4">{media.tagline}</p>
                )}
                <div className="flex flex-wrap items-center gap-3 md:gap-6 mb-3 md:mb-4">
                  <div className="flex items-center">
                    <Star className="w-4 h-4 md:w-5 md:h-5 text-yellow-400 mr-1" />
                    <span className="text-sm md:text-base">{media.vote_average.toFixed(1)}</span>
                  </div>
                  <div className="flex items-center">
                    <Calendar className="w-4 h-4 md:w-5 md:h-5 mr-1" />
                    <span className="text-sm md:text-base">{new Date(releaseDate).getFullYear()}</span>
                  </div>
                  {type === "movie" ? (
                    <div className="flex items-center">
                      <Clock className="w-4 h-4 md:w-5 md:h-5 mr-1" />
                      <span className="text-sm md:text-base">{(media as Movie).runtime} min</span>
                    </div>
                  ) : (
                    <div className="flex items-center">
                      <Tv className="w-4 h-4 md:w-5 md:h-5 mr-1" />
                      <span className="text-sm md:text-base">
                        {(media as TVShow).number_of_seasons} Seasons, {(media as TVShow).number_of_episodes} Episodes
                      </span>
                    </div>
                  )}
                </div>
                <div className="flex flex-wrap gap-2 mb-3 md:mb-4">
                  {media.genres?.map((genre) => (
                    <span
                      key={genre.id}
                      className="px-2 py-0.5 md:px-3 md:py-1 bg-blue-500 rounded-full text-xs md:text-sm"
                    >
                      {genre.name}
                    </span>
                  ))}
                </div>
                <p className="text-sm md:text-lg leading-relaxed line-clamp-3 md:line-clamp-none">{media.overview}</p>

                {type === "tv" && (
                  <div className="mt-3 md:mt-4 flex flex-wrap gap-2 md:gap-4">
                    <select
                      value={selectedSeason}
                      onChange={(e) => setSelectedSeason(Number(e.target.value))}
                      className="px-2 py-1 md:px-3 md:py-2 text-sm md:text-base rounded-lg bg-gray-800 border border-gray-600"
                    >
                      {Array.from({ length: (media as TVShow).number_of_seasons || 0 }, (_, i) => (
                        <option key={i + 1} value={i + 1}>
                          Season {i + 1}
                        </option>
                      ))}
                    </select>
                    <select
                      value={selectedEpisode}
                      onChange={(e) => setSelectedEpisode(Number(e.target.value))}
                      className="px-2 py-1 md:px-3 md:py-2 text-sm md:text-base rounded-lg bg-gray-800 border border-gray-600"
                    >
                      {Array.from(
                        {
                          length:
                            (media as TVShow).seasons?.find((season) => season.season_number === selectedSeason)
                              ?.episode_count || 0,
                        },
                        (_, i) => (
                          <option key={i + 1} value={i + 1}>
                            Episode {i + 1}
                          </option>
                        ),
                      )}
                    </select>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile poster (shown only on mobile) */}
      <div className="md:hidden px-4 -mt-16 mb-4 flex justify-center">
        <img
          src={`https://image.tmdb.org/t/p/w500${media.poster_path}`}
          alt={title}
          className="w-32 h-48 rounded-lg shadow-lg object-cover border-2 border-gray-800"
        />
      </div>

      {/* Content section */}
      <div className="max-w-7xl mx-auto px-4">
        <div className="w-full aspect-video md:aspect-[16/9] relative">
          <StreamPlayer
            type={type}
            tmdbId={id || ""}
            title={title}
            episodeData={type === "tv" ? { season: selectedSeason, episode: selectedEpisode } : undefined}
          />
        </div>

        {media.videos?.results && (
          <div className="mt-6">
            <h2 className="text-xl md:text-2xl font-bold mb-4">Videos</h2>
            <VideoPlayer videos={media.videos.results} />
          </div>
        )}
      </div>
    </div>
  )
}
