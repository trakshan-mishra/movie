import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Film, Tv, Search, Sparkles, Radio, Sun, Moon } from 'lucide-react';

export default function Navbar() {
  const [isDark, setIsDark] = useState(true);
  const location = useLocation();

  useEffect(() => {
    document.documentElement.classList.add('dark');
    setIsDark(true);
  }, []);

  const toggleDark = () => {
    const on = document.documentElement.classList.toggle('dark');
    setIsDark(on);
    document.body.style.background = on ? '' : '#f5f5f5';
  };

  const links = [
    { to: '/all/movie', icon: <Film size={15} />, label: 'Movies' },
    { to: '/all/tv', icon: <Tv size={15} />, label: 'TV Shows' },
    { to: '/assistant', icon: <Sparkles size={15} />, label: 'AI' },
    { to: '/search', icon: <Search size={15} />, label: 'Search' },
    { to: '/live', icon: <Radio size={15} />, label: 'Live', live: true },
  ];

  return (
    <nav className="navbar">
      <div style={{ maxWidth: 1280, margin: '0 auto', padding: '0 20px', width: '100%', display: 'flex', alignItems: 'center', gap: 8 }}>
        {/* Logo */}
        <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: 8, marginRight: 8, textDecoration: 'none', flexShrink: 0 }}>
          <div style={{
            width: 28, height: 28, borderRadius: 8,
            background: 'linear-gradient(135deg, #0a84ff, #5e5ce6)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
          }}>
            <Film size={14} color="white" strokeWidth={2.5} />
          </div>
          <span style={{ fontWeight: 700, fontSize: 16, letterSpacing: '-0.03em', color: '#f5f5f7' }}>
            MovieMX
          </span>
        </Link>

        {/* Links */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 2, flex: 1, justifyContent: 'center' }}>
          {links.map(({ to, icon, label, live }) => {
            const active = location.pathname === to || (to !== '/' && location.pathname.startsWith(to));
            return (
              <Link
                key={to}
                to={to}
                style={{
                  display: 'flex', alignItems: 'center', gap: 5,
                  padding: '6px 12px', borderRadius: 8,
                  fontSize: 13, fontWeight: 500, letterSpacing: '-0.01em',
                  textDecoration: 'none',
                  color: active ? '#f5f5f7' : 'rgba(245,245,247,0.5)',
                  background: active ? 'rgba(255,255,255,0.1)' : 'transparent',
                  transition: 'all 0.15s ease',
                  whiteSpace: 'nowrap',
                }}
                onMouseEnter={e => {
                  if (!active) (e.currentTarget as HTMLElement).style.color = 'rgba(245,245,247,0.8)';
                }}
                onMouseLeave={e => {
                  if (!active) (e.currentTarget as HTMLElement).style.color = 'rgba(245,245,247,0.5)';
                }}
              >
                {live ? (
                  <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <span className="live-dot" />
                    <span className="hidden sm:inline" style={{ color: 'inherit' }}>{label}</span>
                  </span>
                ) : (
                  <>
                    <span style={{ opacity: active ? 1 : 0.7 }}>{icon}</span>
                    <span className="hidden sm:inline">{label}</span>
                  </>
                )}
              </Link>
            );
          })}
        </div>

        {/* Dark toggle */}
        <button
          onClick={toggleDark}
          style={{
            width: 32, height: 32, borderRadius: 8, border: 'none',
            background: 'rgba(255,255,255,0.08)', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0, transition: 'background 0.15s ease',
          }}
          onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.14)')}
          onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.08)')}
        >
          {isDark
            ? <Sun size={14} color="rgba(245,245,247,0.6)" />
            : <Moon size={14} color="rgba(245,245,247,0.6)" />}
        </button>
      </div>
    </nav>
  );
}