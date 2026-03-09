import React, { useEffect, useState } from 'react';
import { getTrending } from '../services/tmdb';
import MediaGrid from '../components/MediaGrid';
import { Movie, TVShow } from '../types/tmdb';
import { TrendingUp, Tv, Sparkles } from 'lucide-react';

export default function Home() {
  const [trendingMovies, setTrendingMovies] = useState<Movie[]>([]);
  const [trendingTVShows, setTrendingTVShows] = useState<TVShow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTrending = async () => {
      const [movies, tvShows] = await Promise.all([
        getTrending('movie'),
        getTrending('tv'),
      ]);
      setTrendingMovies(movies);
      setTrendingTVShows(tvShows);
      setLoading(false);
    };
    fetchTrending();
  }, []);

  return (
    <div className="max-w-7xl mx-auto px-4 py-10"> 
      {/* Hero */}
      <div className="mb-12 text-center">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-5"
          style={{ background: 'rgba(139,92,246,0.12)', border: '1px solid rgba(139,92,246,0.25)' }}>
          <Sparkles className="w-3.5 h-3.5 text-violet-400 animate-pulse" /> 
          <span className="text-violet-300 text-sm font-medium">Stream anything, anywhere</span>
        </div>
        <h1 className="text-5xl font-black tracking-tight mb-3"
          style={{ background: 'linear-gradient(135deg, #f8fafc 30%, #a78bfa)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          MovieMX
        </h1>
        <p className="text-gray-400 text-lg max-w-md mx-auto">
          Discover, stream, and watch together with friends in real time.
        </p>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-10 h-10 rounded-full border-2 border-violet-500 border-t-transparent animate-spin" />
        </div>
      ) : (
        <>
          <Section icon={<TrendingUp className="w-5 h-5 text-violet-400" />} title="Trending Movies">
            <MediaGrid items={trendingMovies} type="movie" />
          </Section>

          <Section icon={<Tv className="w-5 h-5 text-cyan-400" />} title="Trending TV Shows">
            <MediaGrid items={trendingTVShows} type="tv" />
          </Section>
        </>
      )}
    </div>
  );
}

function Section({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <section className="mb-14">
      <div className="flex items-center gap-2.5 mb-5">
        {icon}
        <h2 className="text-xl font-bold text-white">{title}</h2>
        <div className="flex-1 h-px ml-2" style={{ background: 'linear-gradient(90deg, rgba(139,92,246,0.3), transparent)' }} />
      </div>
      {children}
    </section>
  );
}