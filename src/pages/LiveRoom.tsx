import React, { useEffect, useRef, useState } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import io from 'socket.io-client';

let socket;

const initializeSocket = () => {
  if (!socket || socket.disconnected) {
    socket = io('https://live-backend-1i4u.onrender.com', {
      transports: ['websocket', 'polling'],
      timeout: 20000,
      forceNew: true,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });
  }
  return socket;
};

// TMDB API configuration
const TMDB_API_KEY = '51d91894475b90ea5449bb71c1cd0a65';
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';

// Video sources configuration
const SOURCES = [
  {
    name: 'VidSrc.cc',
    getUrl: (type, id, season, episode) =>
      type === 'tv' && season && episode
        ? `https://vidsrc.cc/v2/embed/${type}/${id}/${season}/${episode}`
        : `https://vidsrc.cc/v2/embed/${type}/${id}`,
  },
  {
    name: 'VidSrc.icu',
    getUrl: (type, id, season, episode) => 
      type === 'tv' && season && episode
        ? `https://vidsrc.icu/embed/${type}/${id}/${season}/${episode}`
        : `https://vidsrc.icu/embed/${type}/${id}`
  },
  {
    name: '2Embed.cc',
    getUrl: (type, id, season, episode) => {
      if (type === 'tv' && season && episode) {
        return `https://www.2embed.cc/embedtv/${id}&s=${season}&e=${episode}`;
      } else {
        return `https://www.2embed.cc/embed/${id}`;
      }
    },
  },
  {
    name: '2Embed.skin',
    getUrl: (type, id, season, episode) => {
      if (type === 'tv' && season && episode) {
        return `https://www.2embed.skin/embedtv/${id}&s=${season}&e=${episode}`;
      } else {
        return `https://www.2embed.skin/embed/${id}`;
      }
    },
  },
];

export default function LiveRoom() {
  const { roomId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  
  // Room and media state
  const type = searchParams.get('type') || '';
  const tmdbId = searchParams.get('tmdbId') || '';
  const title = searchParams.get('title') || 'Stream';
  const [isPublic, setIsPublic] = useState(false);
  const [roomType, setRoomType] = useState('public'); // 'public' or 'private'
  
  // Video source state
  const [currentSource, setCurrentSource] = useState(0);
  const [season, setSeason] = useState(1);
  const [episode, setEpisode] = useState(1);
  
  // User state
  const [username, setUsername] = useState('');
  const [joined, setJoined] = useState(false);
  const [isHost, setIsHost] = useState(false);
  const [users, setUsers] = useState([]);
  
  // Video state
  const videoRef = useRef(null);
  const [playerReady, setPlayerReady] = useState(false);
  
  // Chat state
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [typingUsers, setTypingUsers] = useState([]);
  const messagesEndRef = useRef(null);
  const chatContainerRef = useRef(null);
  
  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searchType, setSearchType] = useState('movie');
  const [isSearching, setIsSearching] = useState(false);
  const [selectedMedia, setSelectedMedia] = useState(null);
  
  // Error handling state
  const [error, setError] = useState(null);

  // Public rooms state
  const [publicRooms, setPublicRooms] = useState([]);
  const [loadingRooms, setLoadingRooms] = useState(false);

  // Get current video URL based on selected source
  const getCurrentVideoUrl = () => {
    if (!tmdbId || !type) return '';
    return SOURCES[currentSource].getUrl(type, tmdbId, season, episode);
  };

  // Initialize socket connection
  useEffect(() => {
    socket = initializeSocket();
    
    const handleConnect = () => {
      console.log('Connected to server');
      setError(null);
    };
  
    const handleConnectError = (err) => {
      console.error('Socket connection error:', err);
      setError('Failed to connect to server. Please check your internet connection.');
    };
  
    const handleDisconnect = (reason) => {
      console.log('Disconnected:', reason);
      if (reason === 'io server disconnect') {
        socket.connect();
      }
    };
  
    socket.on('connect', handleConnect);
    socket.on('connect_error', handleConnectError);
    socket.on('disconnect', handleDisconnect);
    
    socket.on('room_users', (users) => {
      setUsers(users);
    });
    
    socket.on('receive_message', (msg) => {
      setMessages((prevMessages) => [...prevMessages, msg]);
    });
    
    socket.on('user_typing', (username) => {
      setTypingUsers((prevTypers) => {
        if (!prevTypers.includes(username)) {
          return [...prevTypers, username];
        }
        return prevTypers;
      });
      
      setTimeout(() => {
        setTypingUsers((prevTypers) => prevTypers.filter(user => user !== username));
      }, 2000);
    });
    
    socket.on('sync_action', (action) => handleSync(action));
    
    socket.on('kicked', () => {
      alert('You were kicked from the room.');
      navigate('/');
    });
  
    socket.on('public_rooms', (rooms) => {
      console.log('Received public rooms:', rooms); // Debug log
      rooms.forEach(room => {
        console.log(`Room ${room.id}:`, room.mediaInfo); // Debug each room's media info
      });
      setPublicRooms(rooms);
      setLoadingRooms(false);
    });
    socket.on('media_changed', (mediaInfo) => {
      const newUrl = `/live/${roomId}?type=${mediaInfo.type}&tmdbId=${mediaInfo.tmdbId}&title=${encodeURIComponent(mediaInfo.title)}`;
      navigate(newUrl, { replace: true });
      // ✅ Let React rerender instead of hard reload
    });
    

    // Listen for source changes
    socket.on('source_changed', (data) => {
      setCurrentSource(data.sourceIndex);
      if (data.season) setSeason(data.season);
      if (data.episode) setEpisode(data.episode);
    });
  
    return () => {
      if (socket) {
        socket.off('connect', handleConnect);
        socket.off('connect_error', handleConnectError);
        socket.off('disconnect', handleDisconnect);
        socket.off('room_users');
        socket.off('receive_message');
        socket.off('user_typing');
        socket.off('sync_action');
        socket.off('kicked');
        socket.off('public_rooms');
        socket.off('media_changed');
        socket.off('source_changed');
      }
    };
  }, [navigate, roomId]);
  

  // Setup message listener for iframe communication
  useEffect(() => {
    // Add event listener for messages from iframe
    const handleMessage = (event) => {
      if (event.data && event.data.event === 'playerReady') {
        setPlayerReady(true);
        console.log('Player is ready for commands');
      }
    };

    window.addEventListener('message', handleMessage);
    
    return () => {
      window.removeEventListener('message', handleMessage);
    };
  }, []);

  // Auto scroll to bottom of chat
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  useEffect(() => {
    // Only redirect if current URL expects a roomId but doesn't have it
    if (window.location.pathname.startsWith('/live/') && !roomId) {
      navigate('/', { replace: true });
    }
  }, [roomId, navigate]);

  if (window.location.pathname.startsWith('/live/') && (!roomId || roomId === ':roomId')) {
    return (
      <div className="max-w-6xl mx-auto p-4 text-center">
        <div className="bg-white/10 backdrop-blur-lg p-6 rounded-xl shadow-md text-white">
          <h2 className="text-2xl font-semibold mb-4">Invalid Room</h2>
          <p className="mb-4">No room ID provided.</p>
          <button
            onClick={() => navigate('/')}
            className="bg-cyan-500 hover:bg-cyan-600 px-4 py-2 rounded-md text-white font-medium"
          >
            Go to Home
          </button>
        </div>
      </div>
    );
  }
  
  // Check if room exists when component mounts
  useEffect(() => {
    if (roomId && !joined) {
      socket.emit('check_room', { roomId }, (response) => {
        if (response.exists) {
          setIsPublic(response.isPublic);
        } else if (tmdbId) {
          // If direct navigation to a non-existent room with content, create it
          setIsHost(true);
        } else {
          // Room doesn't exist and no content specified
          setError(`Room ${roomId} doesn't exist`);
        }
      });
    }
  }, [roomId, joined, tmdbId]);

  // Fetch public rooms
  useEffect(() => {
    if (roomType === 'public' && !joined) {
      setLoadingRooms(true);
      socket.emit('get_public_rooms');
      
      const interval = setInterval(() => {
        socket.emit('get_public_rooms');
      }, 10000);
      
      return () => clearInterval(interval);
    }
  }, [roomType, joined]);

  // Error boundary for API failures
  useEffect(() => {
    const handleGlobalError = (event) => {
      console.error('Unhandled error:', event.error);
      setError('An unexpected error occurred. Please refresh the page.');
      event.preventDefault();
    };

    window.addEventListener('error', handleGlobalError);
    
    return () => {
      window.removeEventListener('error', handleGlobalError);
    };
  }, []);

  const handleJoin = () => {
    if (!username.trim()) return;
    setError(null);
    
    try {
      if (!socket || socket.disconnected) {
        socket = initializeSocket();
      }
  
      // Wait for connection before joining
      if (socket.connected) {
        joinRoom();
      } else {
        socket.on('connect', () => {
          socket.off('connect', joinRoom); // Remove listener after use
          joinRoom();
        });
      }
  
      function joinRoom() {
        socket.emit('join_room', { 
          roomId, 
          username,
          isPublic,
          mediaInfo: tmdbId ? { type, tmdbId, title } : null
        }, (response) => {
          if (response?.error) {
            setError(response.error);
            return;
          }
          
          setIsHost(response?.host || false);
          setJoined(true);
        });
      }
    } catch (err) {
      console.error('Join room error:', err);
      setError('Failed to join room. Please try again.');
    }
  };

  const handleSync = (action) => {
    try {
      if (!videoRef.current || !videoRef.current.contentWindow) {
        console.warn('Video player reference not available');
        return;
      }
      
      console.log('Sending action to player:', action);
      
      if (action.type === 'play') {
        videoRef.current.contentWindow.postMessage({ action: 'play' }, '*');
      } else if (action.type === 'pause') {
        videoRef.current.contentWindow.postMessage({ action: 'pause' }, '*');
      } else if (action.type === 'seek') {
        videoRef.current.contentWindow.postMessage({ action: 'seek', time: action.time }, '*');
      }
    } catch (err) {
      console.error('Sync error:', err);
      setError('Failed to control video player. Please refresh the page.');
    }
  };

  const sendSync = async (type, time) => {
    try {
      await ensureSocketConnection();
      
      // First, apply the action locally
      handleSync({ type, time });
      
      // Then, broadcast to other users
      socket.emit('sync_action', { roomId, action: { type, time } });
    } catch (err) {
      console.error('Sync error:', err);
      setError('Failed to sync. Please check your connection.');
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim()) return;
    
    try {
      await ensureSocketConnection();
      socket.emit('send_message', { roomId, username, message: newMessage });
      setNewMessage('');
    } catch (err) {
      console.error('Send message error:', err);
      setError('Failed to send message. Please check your connection.');
    }
  };

  const handleTyping = () => {
    socket.emit('typing', { roomId, username });
  };

  const handleJoinExistingRoom = () => {
    const userRoomId = prompt('Enter Room ID to Join:');
    if (userRoomId && userRoomId.trim()) {
      const cleanRoomId = userRoomId.trim().toUpperCase();
      navigate(`/live/${cleanRoomId}`);
    }
  };

  const handleCreateRoom = () => {
    if (!selectedMedia) return;
    
    // Generate a random room ID (6 characters)
    const newRoomId = Math.random().toString(36).substring(2, 8).toUpperCase();
    
    const mediaType = selectedMedia.type || searchType;
    const mediaTitle = selectedMedia.title || selectedMedia.name;
    
    // Navigate to the new room
    navigate(`/live/${newRoomId}?type=${mediaType}&tmdbId=${selectedMedia.id}&title=${encodeURIComponent(mediaTitle)}`);
  };

  const searchTMDB = async () => {
    if (!searchQuery.trim()) return;
    
    setIsSearching(true);
    setError(null);
    
    try {
      const response = await fetch(
        `${TMDB_BASE_URL}/search/${searchType}?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(searchQuery)}`
      );
      
      if (!response.ok) {
        throw new Error(`TMDB API error: ${response.status}`);
      }
      
      const data = await response.json();
      setSearchResults(data.results || []);
    } catch (error) {
      console.error('Error searching TMDB:', error);
      setError('Failed to search movies/TV shows. Please try again.');
    } finally {
      setIsSearching(false);
    }
  };

  const handleMediaSelect = (media) => {
    setSelectedMedia({
      ...media,
      type: searchType,
      title: media.title || media.name
    });
  };

  const copyRoomLink = () => {
    const url = window.location.href;
    navigator.clipboard.writeText(url);
    alert('Room link copied to clipboard!');
  };

  const kickUser = (userToKick) => {
    if (!isHost) return;
    socket.emit('kick_user', { roomId, username: userToKick });
  };

  // Toggle between public and private room browsing
  const toggleRoomType = (type) => {
    setRoomType(type);
    if (type === 'public') {
      socket.emit('get_public_rooms');
    }
  };

  // Handle source change
  const handleSourceChange = (sourceIndex) => {
    setCurrentSource(sourceIndex);
    if (isHost) {
      socket.emit('change_source', { 
        roomId, 
        sourceIndex, 
        season: type === 'tv' ? season : undefined,
        episode: type === 'tv' ? episode : undefined
      });
    }
  };

  // Handle season/episode change for TV shows
  const handleEpisodeChange = (newSeason, newEpisode) => {
    setSeason(newSeason);
    setEpisode(newEpisode);
    if (isHost) {
      socket.emit('change_source', { 
        roomId, 
        sourceIndex: currentSource, 
        season: newSeason,
        episode: newEpisode
      });
    }
  };

  // Add logging to iframe onload
  const handleIframeLoad = () => {
    console.log('Video iframe loaded');
    setPlayerReady(false);
    // Wait a short time to ensure the iframe content is fully loaded
    setTimeout(() => {
      if (videoRef.current && videoRef.current.contentWindow) {
        // Send an initial message to establish communication
        videoRef.current.contentWindow.postMessage({ action: 'init' }, '*');
        setPlayerReady(true);
      }
    }, 2000);
  };

  // Render the search and create room section
  const renderSearchSection = () => (
    <div className="bg-white/10 backdrop-blur-lg p-6 rounded-xl shadow-md text-white mb-6">
      <h2 className="text-2xl font-semibold mb-4">Create Private Room</h2>
      
      <div className="flex gap-2 mb-4">
        <button 
          onClick={() => setSearchType('movie')}
          className={`btn ${searchType === 'movie' ? 'bg-cyan-500' : 'bg-gray-600'}`}
        >
          Movies
        </button>
        <button 
          onClick={() => setSearchType('tv')}
          className={`btn ${searchType === 'tv' ? 'bg-cyan-500' : 'bg-gray-600'}`}
        >
          TV Shows
        </button>
      </div>
      
      <div className="flex gap-2 mb-4">
        <input
          type="text"
          placeholder={`Search for ${searchType === 'movie' ? 'movies' : 'TV shows'}`}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && searchTMDB()}
          className="flex-1 p-3 rounded-md bg-white/20 text-white"
        />
        <button 
          onClick={searchTMDB}
          className="bg-cyan-500 hover:bg-cyan-600 px-4 py-2 rounded-md text-white font-medium"
          disabled={isSearching}
        >
          {isSearching ? 'Searching...' : 'Search'}
        </button>
      </div>
      
      {error && (
        <div className="mb-4 p-3 bg-red-500/20 border border-red-500 rounded-md text-white">
          {error}
        </div>
      )}
      
      {searchResults.length > 0 && (
        <div className="mb-4">
          <h3 className="text-lg font-semibold mb-2">Results</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-96 overflow-y-auto">
            {searchResults.map((media) => (
              <div 
                key={media.id}
                onClick={() => handleMediaSelect(media)}
                className={`cursor-pointer p-2 rounded-md ${
                  selectedMedia?.id === media.id ? 'bg-cyan-500/50' : 'bg-white/20'
                } hover:bg-white/30`}
              >
                <p className="font-medium">{media.title || media.name}</p>
                <p className="text-sm text-gray-300">
                  {media.release_date || media.first_air_date || 'Unknown date'}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
      
      {selectedMedia && (
        <div className="mb-4">
          <h3 className="text-lg font-semibold mb-2">Selected Media</h3>
          <div className="bg-white/20 p-3 rounded-md">
            <p className="font-medium">{selectedMedia.title}</p>
            <p className="text-sm text-gray-300">
              {selectedMedia.release_date || selectedMedia.first_air_date || 'Unknown date'}
            </p>
          </div>
        </div>
      )}
      
      <div className="flex items-center gap-2 mb-4">
        <input
          type="checkbox"
          id="isPublic"
          checked={isPublic}
          onChange={() => setIsPublic(!isPublic)}
          className="w-4 h-4"
        />
        <label htmlFor="isPublic" className="text-white">Make room public</label>
      </div>
      
      <div className="flex gap-2">
        <button
          onClick={handleCreateRoom}
          disabled={!selectedMedia}
          className="bg-cyan-500 hover:bg-cyan-600 px-4 py-2 rounded-md text-white font-medium disabled:opacity-50"
        >
          Create Room
        </button>
        <button
          onClick={handleJoinExistingRoom}
          className="bg-teal-500 hover:bg-teal-600 px-4 py-2 rounded-md text-white font-medium"
        >
          🔗 Join Existing Room
        </button>
      </div>
    </div>
  );

  // Render the join room section
  const renderJoinSection = () => (
    <div className="bg-white/10 backdrop-blur-lg p-6 rounded-xl shadow-md text-white">
      <h2 className="text-2xl font-semibold mb-4">Join Room: {roomId}</h2>
      
      {error && (
        <div className="mb-4 p-3 bg-red-500/20 border border-red-500 rounded-md text-white">
          {error}
        </div>
      )}
      
      <div className="mb-4 p-3 bg-blue-500/20 rounded-md">
        <p className="text-sm">Room ID: <span className="font-mono font-bold">{roomId}</span></p>
      </div>
      
      <input
        type="text"
        placeholder="Enter your name"
        value={username}
        onChange={(e) => setUsername(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && handleJoin()}
        className="w-full p-3 rounded-md bg-white/20 mb-4 text-white placeholder-gray-300"
      />
      <button
        onClick={handleJoin}
        disabled={!username.trim()}
        className="bg-cyan-500 hover:bg-cyan-600 px-4 py-2 rounded-md text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed"
      >
        Join Room
      </button>
      <button
        onClick={() => navigate('/')}
        className="ml-4 bg-teal-500 hover:bg-teal-600 px-4 py-2 rounded-md text-white font-medium"
      >
        Back to Home
      </button>
    </div>
  );
  // Render the room content
  const renderRoomContent = () => (
    <>
      <div className="flex justify-between items-center mb-4">
        <div>
          <h2 className="text-xl font-bold text-white">Room: {roomId}</h2>
          <p className="text-white text-sm">
            {isPublic ? '🌐 Public Room' : '🔒 Private Room'}
          </p>
          <p className="text-gray-300 text-xs font-mono">ID: {roomId}</p>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={copyRoomLink}
            className="bg-teal-500 hover:bg-teal-600 px-3 py-1 rounded-md text-white text-sm"
          >
            📋 Copy Link
          </button>
          {isHost && (
            <button 
              className="bg-cyan-500 hover:bg-cyan-600 px-3 py-1 rounded-md text-white text-sm"
              onClick={() => {
                setIsPublic(!isPublic);
                socket.emit('update_room_visibility', { roomId, isPublic: !isPublic });
              }}
            >
              Make {isPublic ? 'Private' : 'Public'}
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Video player */}
        <div className="lg:col-span-2">
          <div className="aspect-video w-full mb-4">
            <iframe
              ref={videoRef}
              src={`https://vidsrc.cc/v2/embed/${type}/${tmdbId}`}
              title={title}
              className="w-full h-full rounded-md border border-white/20"
              allowFullScreen
              onLoad={handleIframeLoad}
            />
          </div>
          <div className="flex flex-wrap gap-2 mb-4">
            <button 
              onClick={() => sendSync('play')}
              className="bg-cyan-500 hover:bg-cyan-600 px-3 py-1 rounded-md text-white text-sm"
            >
              ▶ Play
            </button>
            <button 
              onClick={() => sendSync('pause')}
              className="bg-cyan-500 hover:bg-cyan-600 px-3 py-1 rounded-md text-white text-sm"
            >
              ⏸ Pause
            </button>
            <button 
              onClick={() => sendSync('seek', 0)} 
              className="bg-cyan-500 hover:bg-cyan-600 px-3 py-1 rounded-md text-white text-sm"
            >
              ⏮ Start
            </button>
            <button 
              onClick={() => sendSync('seek', 60)}
              className="bg-cyan-500 hover:bg-cyan-600 px-3 py-1 rounded-md text-white text-sm"
            >
              ⏩ Skip 1:00
            </button>
          </div>
          
          {/* Debug information */}
          <div className="mb-4 p-2 bg-black/30 rounded text-gray-300 text-xs">
            <p>Player Status: {playerReady ? 'Ready' : 'Loading...'}</p>
            <p>Video Type: {type || 'Not specified'}</p>
            <p>Video ID: {tmdbId || 'Not specified'}</p>
          </div>
          
          {/* Search for new media (Only for host) */}
          {isHost && (
            <div className="mt-6 p-4 bg-white/10 backdrop-blur-md rounded-lg">
              <h3 className="text-lg font-semibold mb-2 text-white">Change Media</h3>
              <div className="flex gap-2 mb-4">
                <button 
                  onClick={() => setSearchType('movie')}
                  className={`btn ${searchType === 'movie' ? 'bg-cyan-500' : 'bg-gray-600'} px-3 py-1 rounded-md text-white text-sm`}
                >
                  Movies
                </button>
                <button 
                  onClick={() => setSearchType('tv')}
                  className={`btn ${searchType === 'tv' ? 'bg-cyan-500' : 'bg-gray-600'} px-3 py-1 rounded-md text-white text-sm`}
                >
                  TV Shows
                </button>
              </div>
              
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder={`Search for ${searchType === 'movie' ? 'movies' : 'TV shows'}`}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && searchTMDB()}
                  className="flex-1 p-2 rounded-md bg-white/20 text-white"
                />
                <button 
                  onClick={searchTMDB}
                  className="bg-cyan-500 hover:bg-cyan-600 px-3 py-1 rounded-md text-white text-sm"
                  disabled={isSearching}
                >
                  {isSearching ? '...' : 'Search'}
                </button>
              </div>
              
              {searchResults.length > 0 && (
                <div className="mt-2 max-h-32 overflow-y-auto">
                  {searchResults.slice(0, 5).map((media) => (
                    <div 
                      key={media.id}
                      onClick={() => {
                        const newTitle = media.title || media.name;
                        const newType = searchType;
                        const newId = media.id;
                        
                        // Update URL without reloading
                        navigate(`/live/${roomId}?type=${newType}&tmdbId=${newId}&title=${encodeURIComponent(newTitle)}`, { replace: true });
                        
                        // Inform others
                        socket.emit('change_media', { 
                          roomId, 
                          mediaInfo: { 
                            type: newType, 
                            tmdbId: newId, 
                            title: newTitle 
                          } 
                        });
                        
                        // Clear search
                        setSearchResults([]);
                        setSearchQuery('');
                      }}
                      className="cursor-pointer p-2 rounded-md bg-white/20 hover:bg-white/30 mb-1"
                    >
                      <p className="font-medium text-sm">{media.title || media.name}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Chat and users */}
        <div className="flex flex-col h-full">
          <div className="bg-white/10 backdrop-blur-md p-4 rounded-lg shadow-md mb-4">
            <h3 className="text-lg font-semibold mb-2 text-white">Viewers ({users.length})</h3>
            <div className="max-h-32 overflow-y-auto p-2 bg-black/30 rounded">
              {users.map((user, idx) => (
                <div key={idx} className="flex justify-between items-center text-white mb-1">
                  <span>{user}{user === username ? ' (You)' : ''}</span>
                  {isHost && user !== username && (
                    <button 
                      onClick={() => kickUser(user)}
                      className="text-red-500 hover:text-red-300 text-xs"
                    >
                      Kick
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white/10 backdrop-blur-md p-4 rounded-lg shadow-md flex-1 flex flex-col max-h-96">
            <h3 className="text-lg font-semibold mb-2 text-white">Chat</h3>
            <div 
              ref={chatContainerRef}
              className="flex-1 overflow-y-auto p-2 mb-2 bg-black/30 rounded"
              style={{
                height: "calc(100% - 100px)", // Fixed height for chat container
                display: "flex",
                flexDirection: "column"
              }}
            >
              <div style={{ flex: "1 1 auto" }}>
                {messages.map((msg, idx) => (
                  <p key={idx} className={`text-white mb-1 ${msg.username === username ? 'text-cyan-300' : ''}`}>
                    <strong>{msg.username}</strong>: {msg.message}
                  </p>
                ))}
                {typingUsers.length > 0 && (
                  <p className="text-gray-400 italic">
                    {typingUsers.join(', ')} {typingUsers.length === 1 ? 'is' : 'are'} typing...
                  </p>
                )}
                <div ref={messagesEndRef} />
              </div>
            </div>
            <div className="flex gap-2 mt-auto">
              <input
                type="text"
                placeholder="Type a message"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyDown={(e) => {
                  handleTyping();
                  if (e.key === 'Enter') sendMessage();
                }}
                className="flex-1 p-2 rounded-md bg-white/20 text-white"
              />
              <button 
                onClick={sendMessage}
                className="bg-cyan-500 hover:bg-cyan-600 px-3 py-1 rounded-md text-white"
              >
                Send
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );

  // Render public rooms section
  const renderPublicRooms = () => (
    <div className="bg-white/10 backdrop-blur-lg p-6 rounded-xl shadow-md text-white mb-6">
      <h2 className="text-2xl font-semibold mb-4">Public Rooms</h2>
      
      {loadingRooms ? (
        <div className="flex justify-center items-center p-6">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-white"></div>
        </div>
      ) : publicRooms.length === 0 ? (
        <p className="text-gray-300">No public rooms available</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {publicRooms.map((room) => (
            <div 
              key={room.id}
              className="bg-white/20 p-3 rounded-md cursor-pointer hover:bg-white/30"
              onClick={() => {
                // Include media information in the navigation URL
                if (room.mediaInfo) {
                  const { type, tmdbId, title } = room.mediaInfo;
                  navigate(`/live/${room.id}?type=${type}&tmdbId=${tmdbId}&title=${encodeURIComponent(title)}`);
                } else {
                  // Fallback if no media info
                  navigate(`/live/${room.id}`);
                }
              }}
            >
              <p className="font-medium">{room.mediaInfo?.title || 'Untitled Room'}</p>
              <p className="text-sm text-gray-300">
                {room.mediaInfo?.type === 'movie' ? '🎬 Movie' : '📺 TV Show'} • {room.users.length} viewers
              </p>
              <p className="text-xs text-gray-400 mt-1">Room ID: {room.id}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
  // Room type toggle section
  const renderRoomTypeToggle = () => (
    <div className="flex justify-center mb-6">
      <div className="bg-white/10 backdrop-blur-lg rounded-full p-1 inline-flex">
        <button
          onClick={() => toggleRoomType('public')}
          className={`px-4 py-2 rounded-full transition ${
            roomType === 'public' ? 'bg-cyan-500 text-white' : 'text-gray-300 hover:text-white'
          }`}
        >
          Public Rooms
        </button>
        <button
          onClick={() => toggleRoomType('private')}
          className={`px-4 py-2 rounded-full transition ${
            roomType === 'private' ? 'bg-cyan-500 text-white' : 'text-gray-300 hover:text-white'
          }`}
        >
          Create Private Room
        </button>
      </div>
    </div>
  );

  // Error boundary component
  const renderErrorMessage = () => {
    if (!error) return null;
    
    return (
      <div className="max-w-md mx-auto my-6 bg-red-500/20 border border-red-500 p-4 rounded-lg text-white">
        <h3 className="font-bold mb-2">Error</h3>
        <p>{error}</p>
        <button 
          onClick={() => setError(null)}
          className="mt-2 px-3 py-1 bg-white/20 hover:bg-white/30 rounded-md"
        >
          Dismiss
        </button>
      </div>
    );
  };
  const ensureSocketConnection = () => {
    return new Promise((resolve, reject) => {
      if (!socket) {
        socket = initializeSocket();
      }
      
      if (socket.connected) {
        resolve(socket);
      } else {
        const timeout = setTimeout(() => {
          reject(new Error('Connection timeout'));
        }, 10000);
        
        socket.on('connect', () => {
          clearTimeout(timeout);
          resolve(socket);
        });
        
        socket.on('connect_error', (err) => {
          clearTimeout(timeout);
          reject(err);
        });
      }
    });
  };
  
  // Main render logic
  return (
    <div className="max-w-6xl mx-auto p-4">
      {renderErrorMessage()}
      
      {/* Show room content based on state */}
      {!joined && !roomId && renderRoomTypeToggle()}
      {!joined && !roomId && roomType === 'public' && renderPublicRooms()}
      {!joined && !roomId && roomType === 'private' && renderSearchSection()}
      {!joined && roomId && renderJoinSection()}
      {joined && renderRoomContent()}
    </div>
  );

}
