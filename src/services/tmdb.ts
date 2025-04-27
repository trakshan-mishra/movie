import axios from 'axios';
import { Movie, TVShow, MediaType } from '../types/tmdb';

const API_KEY = '51d91894475b90ea5449bb71c1cd0a65';
const BASE_URL = 'https://api.themoviedb.org/3';

const tmdbApi = axios.create({
  baseURL: BASE_URL,
  params: {
    api_key: API_KEY,
  },
});

const filterResults = (results: (Movie | TVShow)[], genre?: number, minRating?: number) => {
  return results.filter((item) => {
    const passesGenre = !genre || (item.genre_ids && item.genre_ids.includes(genre));
    const passesRating = !minRating || item.vote_average >= minRating;
    return passesGenre && passesRating;
  });
};

export const getLatest = async (type: MediaType, { genre, minRating }: { genre?: number; minRating?: number } = {}) => {
  const endpoint = type === 'movie' ? '/movie/now_playing' : '/tv/on_the_air';
  const response = await tmdbApi.get(endpoint);
  return filterResults(response.data.results, genre, minRating);
};
export const getSimilarMovies = async (movieId: number): Promise<Movie[]> => {
  try {
    const response = await fetch(`${BASE_URL}/movie/${movieId}/similar?api_key=${API_KEY}&language=en-US&page=1`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    // Add 'media_type' for consistency if needed by your components
    return (data.results || []).map((item: any) => ({ ...item, media_type: 'movie' })) as Movie[];
  } catch (error) {
    console.error(`Error fetching similar movies for ID ${movieId}:`, error);
    return []; // Return empty array on error
  }
};
export const getSimilarTVShows = async (tvId: number): Promise<TVShow[]> => {
  try {
    const response = await fetch(`${BASE_URL}/tv/${tvId}/similar?api_key=${API_KEY}&language=en-US&page=1`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    // Add 'media_type' for consistency
    return (data.results || []).map((item: any) => ({ ...item, media_type: 'tv' })) as TVShow[];
  } catch (error) {
    console.error(`Error fetching similar TV shows for ID ${tvId}:`, error);
    return []; // Return empty array on error
  }
};
export const getUpcoming = async (type: MediaType, { genre, minRating }: { genre?: number; minRating?: number } = {}) => {
  const endpoint = type === 'movie' ? '/movie/upcoming' : '/tv/airing_today';
  const response = await tmdbApi.get(endpoint);
  return filterResults(response.data.results, genre, minRating);
};

export const getTrending = async (type: MediaType, { genre, minRating }: { genre?: number; minRating?: number } = {}) => {
  const response = await tmdbApi.get(`/trending/${type}/week`);
  return filterResults(response.data.results, genre, minRating);
};

export const search = async (query: string, type: MediaType, { genre, minRating }: { genre?: number; minRating?: number } = {}) => {
  const response = await tmdbApi.get(`/search/${type}`, {
    params: { query },
  });
  return filterResults(response.data.results, genre, minRating);
};


export const getDetails = async (id: string, type: MediaType) => {
  const response = await tmdbApi.get(`/${type}/${id}`, {
    params: {
      append_to_response: 'videos',
    },
  });
  return response.data;
};

export const getGenres = async (type: MediaType) => {
  const response = await tmdbApi.get(`/genre/${type}/list`);
  return response.data.genres;
};


export const getMovieGenres = async (): Promise<{id: number, name: string}[]> => {
  const response = await fetch(`${BASE_URL}/genre/movie/list?api_key=${API_KEY}`);
  const data = await response.json();
  return data.genres || [];
};

export const getTVGenres = async (): Promise<{id: number, name: string}[]> => {
  const response = await fetch(`${BASE_URL}/genre/tv/list?api_key=${API_KEY}`);
  const data = await response.json();
  return data.genres || [];
};

export const discoverMedia = async (
  type: MediaType,
  params: {
    with_genres?: string;
    primary_release_year?: number;
    with_origin_country?: string;
    sort_by?: string;
  }
): Promise<(Movie | TVShow)[]> => {
  const queryParams = new URLSearchParams();
  
  if (params.with_genres) queryParams.append('with_genres', params.with_genres);
  if (params.primary_release_year) queryParams.append('primary_release_year', params.primary_release_year.toString());
  if (params.with_origin_country) queryParams.append('with_origin_country', params.with_origin_country);
  if (params.sort_by) queryParams.append('sort_by', params.sort_by);
  
  const response = await fetch(
    `${BASE_URL}/discover/${type}?api_key=${API_KEY}&${queryParams.toString()}`
  );
  const data = await response.json();
  return data.results || [];
};
// In your tmdb service file, add:
export const getTVShowWithSeasons = async (tvId: number): Promise<TVShow> => {
  const response = await fetch(
    `${BASE_URL}/tv/${tvId}?api_key=${API_KEY}&append_to_response=seasons`
  );
  const data = await response.json();
  return data;
};
