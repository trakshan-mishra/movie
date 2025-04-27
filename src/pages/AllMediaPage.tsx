import React, { useEffect, useState } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { Movie, TVShow, MediaType } from '../types/tmdb';
import { getMovieGenres, getTVGenres } from '../services/tmdb';
import MediaGrid from '../components/MediaGrid';

const API_KEY = '51d91894475b90ea5449bb71c1cd0a65';

export default function AllMediaPage() {
  const { type } = useParams<{ type: MediaType }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const page = parseInt(searchParams.get('page') || '1', 10);
  const selectedGenre = searchParams.get('genre') || '';

  const [media, setMedia] = useState<(Movie | TVShow)[]>([]);
  const [genres, setGenres] = useState<{ id: number; name: string }[]>([]);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);

  // Load genres on type change
  useEffect(() => {
    if (!type || (type !== 'movie' && type !== 'tv')) {
      navigate('/all/movie');
      return;
    }

    const loadGenres = async () => {
      const genreList = type === 'movie' ? await getMovieGenres() : await getTVGenres();
      setGenres(genreList);
    };

    loadGenres();
  }, [type, navigate]);

  // Fetch media on page or genre change
  useEffect(() => {
    const fetchMedia = async () => {
      if (!type || (type !== 'movie' && type !== 'tv')) return;

      setLoading(true);
      try {
        const url = new URL(`https://api.themoviedb.org/3/discover/${type}`);
        url.searchParams.append('api_key', API_KEY);
        url.searchParams.append('page', String(page));
        if (selectedGenre) {
          url.searchParams.append('with_genres', selectedGenre);
        }

        const res = await fetch(url.toString());
        const data = await res.json();

        setMedia(data.results);
        setTotalPages(data.total_pages);
      } catch (err) {
        console.error('Error fetching media:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchMedia();
  }, [type, page, selectedGenre]);

  const handleGenreChange = (genreId: string) => {
    setSearchParams({ genre: genreId, page: '1' }); // reset to page 1
  };

  const goToPage = (pageNum: number) => {
    setSearchParams({ genre: selectedGenre, page: String(pageNum) });
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">
        All {type === 'movie' ? 'Movies' : 'TV Shows'}
      </h1>

      {/* Genre Filter */}
      <div className="mb-6">
        <label className="block font-medium mb-2 text-lg">Filter by Genre:</label>
        <select
          value={selectedGenre}
          onChange={(e) => handleGenreChange(e.target.value)}
          className="px-4 py-2 rounded border border-yellow-500 text-black dark:bg-dark-secondary"
        >
          <option value="">All Genres</option>
          {genres.map((genre) => (
            <option key={genre.id} value={genre.id}>
              {genre.name}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="text-center">Loading...</div>
      ) : (
        <>
          <MediaGrid items={media} type={type || 'movie'} />
          <div className="flex justify-center items-center gap-4 mt-8">
            <button
              onClick={() => goToPage(page - 1)}
              disabled={page <= 1}
              className="px-4 py-2 bg-yellow-600 rounded disabled:opacity-50"
            >
              Previous
            </button>
            <span className="self-center">Page {page} of {totalPages}</span>
            <button
              onClick={() => goToPage(page + 1)}
              disabled={page >= totalPages}
              className="px-4 py-2 bg-red-300 rounded disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </>
      )}
    </div>
  );
}