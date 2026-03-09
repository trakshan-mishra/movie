import React, { useEffect } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import AllMediaPage from './pages/AllMediaPage';
import MediaDetail from './pages/MediaDetail';
import Search from './pages/Search';
import AiAssistant from './components/AiAssistant';
import LiveRoom from './pages/LiveRoom';

function App() {
  useEffect(() => {
    document.documentElement.classList.add('dark');
  }, []);

  return (
    <HashRouter>
      <div style={{ minHeight: '100vh' }}>
        <Navbar />
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/all/:type" element={<AllMediaPage />} />
          <Route path="/assistant" element={<AiAssistant />} />
          <Route path="/search" element={<Search />} />
          <Route path="/live" element={<LiveRoom />} />
          <Route path="/live/:roomId" element={<LiveRoom />} />
          {/* /:type/:id — handles both movie and tv */}
          <Route path="/:type/:id" element={<MediaDetail />} />
          {/* Catch-all */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </HashRouter>
  );
}

export default App;