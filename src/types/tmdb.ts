export interface Movie {
  id: number;
  title: string;
  poster_path: string;
  backdrop_path: string;
  overview: string;
  release_date: string;
  vote_average: number;
  runtime?: number;
  genres?: { id: number; name: string }[];
  tagline?: string;
  videos?: {
    results: Array<{
      key: string;
      site: string;
      type: string;
      name: string;
    }>;
  };
}
// src/types/tmdb.ts
export interface TVShow {
  id: number;
  name: string;
  overview: string;
  poster_path: string | null;
  backdrop_path: string | null;
  vote_average: number;
  first_air_date: string;
  genre_ids: number[];
  origin_country: string[];
  original_language: string;
  original_name: string;
  popularity: number;
  vote_count: number;
  media_type?: 'tv';
  seasons?: Array<{
    id: number;
    name: string;
    overview: string;
    episode_count: number;
    season_number: number;
    air_date: string;
    poster_path: string | null;
  }>;
}

export type MediaType = 'movie' | 'tv';