import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Film, Tv, Search, Moon, Sun, Sparkles } from 'lucide-react';

export default function Navbar() {
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    // Check system preference for dark mode
    if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
      document.documentElement.classList.add('dark');
      setIsDarkMode(true);
    }

    // Add scroll listener
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const toggleDarkMode = () => {
    document.documentElement.classList.toggle('dark');
    setIsDarkMode(!isDarkMode);
  };

  return (
    <nav className={`glass-card backdrop-saturate-150 sticky top-0 z-50 transition-all duration-300 ${
      isScrolled ? 'shadow-lg' : 'shadow-md'
    }`}>
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <Link to="/" className="flex items-center space-x-2 group">
            <div className="relative">
              <Film className="w-6 h-6 transition-transform duration-500 group-hover:scale-0" />
              <Sparkles className="w-6 h-6 text-cyan-400 absolute top-0 left-0 transition-transform duration-500 scale-0 group-hover:scale-100 group-hover:animate-pulse" />
            </div>
            <span className="font-bold text-xl bg-clip-text text-transparent bg-gradient-to-r from-white to-cyan-300 transition-all duration-300 group-hover:from-cyan-400 group-hover:to-purple-500">
              MovieDB
            </span>
          </Link>
          
          <div className="flex items-center space-x-6">
            <NavLink to="/movies" icon={<Film className="w-4 h-4" />} label="Movies" />
            <NavLink to="/tv" icon={<Tv className="w-4 h-4" />} label="TV Shows" />
            <NavLink to="/assistant" icon={<Sparkles className="w-4 h-4" />} label="Assistant" />
            <NavLink to="/search" icon={<Search className="w-4 h-4" />} label="Search" />
            
            <button
              onClick={toggleDarkMode}
              className="relative w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 p-2 transition-all duration-300 overflow-hidden"
            >
              <Sun className={`w-5 h-5 absolute transition-all duration-500 ${isDarkMode ? 'rotate-90 opacity-0 scale-0' : 'rotate-0 opacity-100 scale-100'}`} />
              <Moon className={`w-5 h-5 absolute transition-all duration-500 ${isDarkMode ? 'rotate-0 opacity-100 scale-100' : 'rotate-90 opacity-0 scale-0'}`} />
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}

function NavLink({ to, icon, label }) {
  return (
    <Link 
      to={to} 
      className="group relative flex items-center space-x-1 hover:text-gray-300"
    >
      <span className="transition-transform duration-300 group-hover:scale-110">{icon}</span>
      <span className="hidden sm:inline transition-all duration-300 group-hover:text-cyan-300">{label}</span>
      <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-gradient-to-r from-cyan-400 to-purple-500 transition-all duration-300 group-hover:w-full"></span>
    </Link>
  );
}