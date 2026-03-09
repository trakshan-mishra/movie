import React from 'react';
import MediaCard from './MediaCard';

interface Media {
  id: number;
  title?: string;
  name?: string;
  poster_path?: string | null;
  vote_average: number;
  release_date?: string;
  first_air_date?: string;
  genre_ids?: number[];
  overview?: string;
}

interface Props {
  items: Media[];
  type: 'movie' | 'tv';
}

export default function MediaGrid({ items, type }: Props) {
  if (!items || items.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '60px 0', color: 'rgba(245,245,247,0.3)', fontSize: 14 }}>
        No results found
      </div>
    );
  }

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))',
      gap: 12,
      /* CSS containment — browser knows each cell is isolated, huge scroll perf win */
      contain: 'layout',
    }}>
      {items.map((item, i) => (
        <MediaCard key={item.id} media={item} type={type} index={i} />
      ))}
    </div>
  );
} 