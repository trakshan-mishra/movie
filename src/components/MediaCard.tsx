// src/components/MediaCard.tsx
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Star, Calendar } from 'lucide-react';
import { Movie, TVShow } from '../types/tmdb';

interface Props {
  media: Movie | TVShow;
  type: 'movie' | 'tv';
  onExpand?: () => void;
  isExpanded?: boolean;
}

export default function MediaCard({ media, type, onExpand, isExpanded }: Props) {
  const [isHovered, setIsHovered] = useState(false);
  const title = type === 'movie' ? (media as Movie).title : (media as TVShow).name;
  const releaseDate = type === 'movie' 
    ? (media as Movie).release_date 
    : (media as TVShow).first_air_date;

  return (
    <div 
      className="group relative hover-glow"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Clickable card that links to detail page */}
      <Link 
        to={`/${type}/${media.id}`} 
        className="block"
        onClick={(e) => {
          // Prevent navigation if we're clicking the seasons button
          if ((e.target as HTMLElement).closest('.seasons-button')) {
            e.preventDefault();
          }
        }}
      >
        <div className=" flex flex-col overflow-hidden rounded-xl shadow-lg hover:shadow-2xl hover:-translate-y-1 transition-all bg-white/5 dark:bg-black/20 backdrop-blur-md">
          <div className="aspect-[2/3] relative overflow-hidden">
            <img
              src={`https://image.tmdb.org/t/p/w500${media.poster_path}`}
              alt={title}
              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
              onError={(e) => {
                (e.target as HTMLImageElement).src = 'https://via.placeholder.com/500x750?text=No+Image';
              }}
            />
            
            {/* Overlay Gradient - appears on hover */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            
            {/* Rating Badge */}
            <div className="absolute top-2 right-2 flex items-center space-x-1 bg-black/60 backdrop-blur-md px-2 py-1 rounded-full text-sm z-10">
              <Star className="w-3 h-3 text-yellow-400" />
              <span>{media.vote_average.toFixed(1)}</span>
            </div>
          </div>
          
          <div className="p-4 relative">
            <h3 className="font-bold text-lg mb-2 line-clamp-2 dark:text-white transition-colors duration-300 group-hover:text-cyan-400">{title}</h3>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600 dark:text-gray-300 flex items-center">
                <Calendar className="w-3 h-3 mr-1" />
                {new Date(releaseDate).getFullYear()}
              </span>
              <div className="flex items-center">
                <Star className="w-4 h-4 text-yellow-400 mr-1" />
                <span className="text-sm">{media.vote_average.toFixed(1)}</span>
              </div>
            </div>
          </div>
        </div>
      </Link>

      {/* Seasons button for TV shows */}
      {type === 'tv' && onExpand && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onExpand();
          }}
          className={`seasons-button absolute bottom-4 right-4 z-10 text-xs bg-gradient-to-r from-cyan-500 to-purple-600 hover:from-cyan-600 hover:to-purple-700 px-2 py-1 rounded  transition-all duration-300 ${
            isExpanded ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
          }`}
          aria-label={isExpanded ? 'Hide seasons' : 'Show seasons'}
        >
          {isExpanded ? '▲' : '▼'} Seasons
        </button>
      )}
      
      {/* Hover Glow Effect */}
      {isHovered && (
        <div className="absolute -inset-0.5 bg-gradient-to-r from-cyan-500 to-purple-600 rounded-lg opacity-0 group-hover:opacity-70 blur-md transition-opacity duration-300 -z-10 animate-pulse-glow"></div>
      )}
    </div>
  );
}