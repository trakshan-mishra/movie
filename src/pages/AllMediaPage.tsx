import React, { useEffect, useState } from 'react';
import { Movie, TVShow, MediaType } from '../types/tmdb';
import MediaGrid from '../components/MediaGrid';

interface Props {
  type: MediaType;
}

const API_KEY = '51d91894475b90ea5449bb71c1cd0a65';

export default function AllMediaPage({ type }: Props) {
  const [media, setMedia] = useState<(Movie | TVShow)[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMedia = async () => {
      setLoading(true);
      try {
        const res = await fetch(
          `https://api.themoviedb.org/3/discover/${type}?api_key=${API_KEY}&page=${page}`
        );
        const data = await res.json();
        setMedia(data.results);
        setTotalPages(data.total_pages);
      } catch (error) {
        console.error('Failed to fetch media:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchMedia();
  }, [type, page]);

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">All {type === 'movie' ? 'Movies' : 'TV Shows'}</h1>

      {loading ? (
        <div className="text-center">Loading...</div>
      ) : (
        <>
          <MediaGrid items={media} type={type} />
          <div className="flex justify-center gap-4 mt-8">
            <button
              className="px-4 py-2 bg-gray-300 rounded disabled:opacity-50"
              disabled={page === 1}
              onClick={() => setPage((p) => p - 1)}
            >
              Previous
            </button>
            <span className="self-center">Page {page} of {totalPages}</span>
            <button
              className="px-4 py-2 bg-gray-300 rounded disabled:opacity-50"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </button>
          </div>
        </>
      )}
    </div>
  );
}
