// src/components/MediaGrid.tsx
import React, { useState } from 'react';
import MediaCard from './MediaCard';
import { Movie, TVShow, MediaType } from '../types/tmdb';
import { getTVShowWithSeasons } from '../services/tmdb';

interface Props {
  items: (Movie | TVShow)[];
  type: MediaType;
}

export default function MediaGrid({ items, type }: Props) {
  const [expandedShow, setExpandedShow] = useState<number | null>(null);
  const [detailedShows, setDetailedShows] = useState<Record<number, TVShow>>({});

  const handleShowExpand = async (showId: number) => {
    if (expandedShow === showId) {
      setExpandedShow(null);
      return;
    }

    if (!detailedShows[showId]) {
      try {
        const detailedShow = await getTVShowWithSeasons(showId);
        setDetailedShows(prev => ({
          ...prev,
          [showId]: detailedShow
        }));
      } catch (error) {
        console.error('Error fetching TV show details:', error);
        return;
      }
    }
    setExpandedShow(showId);
  };

  if (!items || items.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        No results found. Try adjusting your filters.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 md:gap-6">
      {items.map((item) => (
        <div key={item.id} className="relative">
          <MediaCard 
            media={item} 
            type={type}
            onExpand={type === 'tv' ? () => handleShowExpand(item.id) : undefined}
            isExpanded={expandedShow === item.id}
          />
          
          {type === 'tv' && expandedShow === item.id && detailedShows[item.id] && (
            <div className="absolute z-20 top-full left-0 right-0 mt-2 bg-white dark:bg-dark-secondary rounded-lg shadow-xl p-4">
              <h3 className="font-bold text-lg mb-2 dark:text-white">Seasons</h3>
              <div className="max-h-60 overflow-y-auto">
                {detailedShows[item.id].seasons?.map(season => (
                  <div key={season.id} className="mb-3 last:mb-0">
                    <h4 className="font-medium dark:text-gray-200">
                      {season.name} ({season.episode_count} episodes)
                    </h4>
                    {season.air_date && (
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {new Date(season.air_date).getFullYear()}
                      </p>
                    )}
                    {season.overview && (
                      <p className="text-sm mt-1 text-gray-700 dark:text-gray-300 line-clamp-2">
                        {season.overview}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}