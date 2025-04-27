import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import MediaBrowse from './pages/MediaBrowse';
import MediaDetail from './pages/MediaDetail';
import Search from './pages/Search';
import AllMediaPage from './pages/AllMediaPage';
import AiAssistant from './components/AiAssistant';

function App() {
  useEffect(() => {
    // Check system preference for dark mode
    if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
      document.documentElement.classList.add('dark');
    }
  }, []);

  return (
    <BrowserRouter>
    <div className="min-h-screen bg-gradient-to-br from-slate-100 to-blue-100 dark:from-slate-900 dark:via-purple-900 dark:to-slate-900 dark:text-white transition-all duration-300">

        <Navbar />
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/all/:type" element={<AllMediaPage />} />

            <Route path="/assistant" element={<AiAssistant />} />

          
          <Route path="/search" element={<Search />} />
          <Route path="/:type/:id" element={<MediaDetail />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}

export default App
