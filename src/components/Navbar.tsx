import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Film, Tv, Search, Moon, Sun, Sparkles, Radio, Clapperboard } from 'lucide-react';

export default function Navbar() {
  const [isDark,     setIsDark]     = useState(true);
  const [isScrolled, setIsScrolled] = useState(false);
  const location = useLocation();

  useEffect(() => {
    /* Always start dark — site is designed for dark */
    document.documentElement.classList.add('dark');
    document.body.style.background = 'linear-gradient(135deg,#0f0c29 0%,#1a1a2e 50%,#16213e 100%)';
    document.body.style.minHeight   = '100vh';
    setIsDark(true);

    const onScroll = () => setIsScrolled(window.scrollY > 10);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const toggleDark = () => {
    const on = document.documentElement.classList.toggle('dark');
    setIsDark(on);
    document.body.style.background = on
      ? 'linear-gradient(135deg,#0f0c29 0%,#1a1a2e 50%,#16213e 100%)'
      : 'linear-gradient(135deg,#e8e0ff 0%,#f0f4ff 50%,#e0f0ff 100%)';
  };

  const navStyle: React.CSSProperties = {
    background: isScrolled ? 'rgba(10,8,30,0.92)' : 'rgba(10,8,30,0.75)',
    backdropFilter: 'blur(24px)',
    WebkitBackdropFilter: 'blur(24px)',
    borderBottom: '1px solid rgba(255,255,255,0.08)',
    boxShadow: isScrolled ? '0 4px 30px rgba(0,0,0,0.4)' : 'none',
  };

  const links = [
    { to: '/all/movie',  icon: <Film className="w-4 h-4"/>,        label: 'Movies'   },
    { to: '/all/tv',     icon: <Tv className="w-4 h-4"/>,          label: 'TV Shows' },
    { to: '/assistant',  icon: <Sparkles className="w-4 h-4"/>,    label: 'AI'       },
    { to: '/search',     icon: <Search className="w-4 h-4"/>,      label: 'Search'   },
    { to: '/live',       icon: <Radio className="w-4 h-4"/>,       label: 'Live',    accent: true },
  ];

  return (
    <nav className="sticky top-0 z-50 transition-all duration-300" style={navStyle}>
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2.5 group">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center shadow-lg transition-transform group-hover:scale-110"
              style={{ background: 'linear-gradient(135deg,#7c3aed,#4f46e5)' }}>
              <Clapperboard className="w-4.5 h-4.5 text-slate-900 dark:text-white"/>
            </div>
            <span className="font-black text-xl tracking-tight"
              style={{ background: 'linear-gradient(90deg,#e2e8f0,#a78bfa)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent' }}>
              
            </span>
          </Link>

          {/* Links */}
          <div className="flex items-center gap-1">
            {links.map(({ to, icon, label, accent }) => {
              const active = to === '/live'
                ? location.pathname.startsWith('/live')
                : location.pathname === to;

              return (
                <Link key={to} to={to}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold transition-all duration-200 whitespace-nowrap"
                  style={{
                    background: active
                      ? accent ? 'rgba(139,92,246,0.25)' : 'rgba(255,255,255,0.1)'
                      : 'transparent',
                    color: active
                      ? accent ? '#c4b5fd' : '#f1f5f9'
                      : '#94a3b8',
                    border: active
                      ? `1px solid ${accent ? 'rgba(139,92,246,0.5)' : 'rgba(255,255,255,0.15)'}`
                      : '1px solid transparent',
                  }}>
                  <span className={active && accent ? 'animate-pulse text-violet-400' : ''}>{icon}</span>
                  <span className="hidden sm:inline">{label}</span>
                </Link>
              );
            })}

            {/* Dark toggle */}
            <button onClick={toggleDark}
              className="w-10 h-10 rounded-xl flex items-center justify-center ml-1 transition-all active:scale-90"
              style={{ background:'rgba(255,255,255,0.08)', border:'1px solid rgba(255,255,255,0.12)' }}>
              {isDark
                ? <Sun className="w-4 h-4 text-amber-400"/>
                : <Moon className="w-4 h-4 text-slate-300"/>}
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}