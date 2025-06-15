const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();

// ✅ Fixed: Remove trailing slash from origin
const allowedOrigins = [
  'https://moviemx.netlify.app',
  'http://localhost:3000', 
  'http://localhost:5173',
  'http://localhost:5174',
  'https://localhost:3000'
];

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (mobile apps, etc.)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    
    console.log('Blocked origin:', origin);
    callback(new Error('Not allowed by CORS'));
  },
  methods: ['GET', 'POST', 'OPTIONS'],
  credentials: true,
  optionsSuccessStatus: 200
}));
app.options('*', cors());

// Replace the Socket.IO CORS config:
const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ['GET', 'POST'],
    credentials: true
  },
  transports: ['websocket', 'polling'],
  allowEIO3: true, // Support older clients
  pingTimeout: 60000,
  pingInterval: 25000
});


// ✅ Test route for browser confirmation
app.get('/', (req, res) => {
  res.json({ 
    message: '✅ Live Room Backend is working!',
    timestamp: new Date().toISOString(),
    activeRooms: Object.keys(rooms).length
  });
});

// ✅ Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'OK', uptime: process.uptime() });
});

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: [allowedOrigin, 'http://localhost:3000', 'http://localhost:5173'],
    methods: ['GET', 'POST'],
  },
  transports: ['websocket', 'polling'], // Allow both transports for better compatibility
});

// ✅ Dynamic port for Render
const PORT = process.env.PORT || 4000;

const rooms = {};

// ✅ Add connection logging
io.on('connection', (socket) => {
  console.log(`New client connected: ${socket.id} at ${new Date().toISOString()}`);

  socket.on('join_room', ({ roomId, username, isPublic, mediaInfo }, callback) => {
    try {
      if (!roomId || !username) {
        callback({ error: 'Room ID and username are required' });
        return;
      }

      if (!rooms[roomId]) {
        rooms[roomId] = {
          host: socket.id,
          users: {},
          isPublic: !!isPublic,
          mediaInfo: mediaInfo || null,
          createdAt: new Date().toISOString()
        };
        console.log(`Room created: ${roomId} by ${socket.id}`);
      }

      rooms[roomId].users[socket.id] = username;
      socket.join(roomId);

      console.log(`User ${username} joined room ${roomId}`);
      
      io.to(roomId).emit('room_users', Object.values(rooms[roomId].users));
      callback({ 
        host: rooms[roomId].host === socket.id,
        roomInfo: {
          mediaInfo: rooms[roomId].mediaInfo,
          isPublic: rooms[roomId].isPublic
        }
      });
    } catch (error) {
      console.error('Join room error:', error);
      callback({ error: 'Failed to join room' });
    }
  });

  socket.on('check_room', ({ roomId }, callback) => {
    try {
      const room = rooms[roomId];
      if (room) {
        callback({ 
          exists: true, 
          isPublic: room.isPublic,
          mediaInfo: room.mediaInfo,
          userCount: Object.keys(room.users).length
        });
      } else {
        callback({ exists: false });
      }
    } catch (error) {
      console.error('Check room error:', error);
      callback({ exists: false, error: 'Failed to check room' });
    }
  });

  socket.on('get_public_rooms', () => {
    try {
      const publicRooms = Object.entries(rooms)
        .filter(([_, room]) => room.isPublic && Object.keys(room.users).length > 0)
        .map(([id, room]) => ({
          id,
          mediaInfo: room.mediaInfo,
          users: Object.values(room.users),
          userCount: Object.keys(room.users).length,
          createdAt: room.createdAt
        }))
        .sort((a, b) => b.userCount - a.userCount); // Sort by user count
      
      socket.emit('public_rooms', publicRooms);
    } catch (error) {
      console.error('Get public rooms error:', error);
      socket.emit('public_rooms', []);
    }
  });

  socket.on('send_message', ({ roomId, message, username }) => {
    try {
      if (rooms[roomId] && rooms[roomId].users[socket.id]) {
        io.to(roomId).emit('receive_message', { 
          message, 
          username,
          timestamp: new Date().toISOString()
        });
      }
    } catch (error) {
      console.error('Send message error:', error);
    }
  });

  socket.on('typing', ({ roomId, username }) => {
    try {
      if (rooms[roomId] && rooms[roomId].users[socket.id]) {
        socket.to(roomId).emit('user_typing', username);
      }
    } catch (error) {
      console.error('Typing error:', error);
    }
  });

  socket.on('sync_action', ({ roomId, action }) => {
    try {
      if (rooms[roomId] && rooms[roomId].users[socket.id]) {
        socket.to(roomId).emit('sync_action', action);
        console.log(`Sync action in room ${roomId}:`, action);
      }
    } catch (error) {
      console.error('Sync action error:', error);
    }
  });

  socket.on('change_media', ({ roomId, mediaInfo }) => {
    try {
      if (rooms[roomId] && rooms[roomId].host === socket.id) {
        rooms[roomId].mediaInfo = mediaInfo;
        io.to(roomId).emit('media_changed', mediaInfo);
        console.log(`Media changed in room ${roomId}:`, mediaInfo);
      }
    } catch (error) {
      console.error('Change media error:', error);
    }
  });

  socket.on('update_room_visibility', ({ roomId, isPublic }) => {
    try {
      if (rooms[roomId] && rooms[roomId].host === socket.id) {
        rooms[roomId].isPublic = isPublic;
        console.log(`Room ${roomId} visibility changed to ${isPublic ? 'public' : 'private'}`);
      }
    } catch (error) {
      console.error('Update room visibility error:', error);
    }
  });

  socket.on('kick_user', ({ roomId, username }) => {
    try {
      const room = rooms[roomId];
      if (room && room.host === socket.id) {
        const targetId = Object.keys(room.users).find(
          (id) => room.users[id] === username
        );
        if (targetId) {
          io.to(targetId).emit('kicked');
          const targetSocket = io.sockets.sockets.get(targetId);
          if (targetSocket) {
            targetSocket.leave(roomId);
          }
          delete room.users[targetId];
          io.to(roomId).emit('room_users', Object.values(room.users));
          console.log(`User ${username} kicked from room ${roomId}`);
        }
      }
    } catch (error) {
      console.error('Kick user error:', error);
    }
  });

  socket.on('disconnect', () => {
    try {
      console.log(`Client disconnected: ${socket.id} at ${new Date().toISOString()}`);
      
      for (const roomId in rooms) {
        const room = rooms[roomId];
        if (room.users[socket.id]) {
          delete room.users[socket.id];

          // Transfer host if current host left
          if (room.host === socket.id) {
            const [newHost] = Object.keys(room.users);
            room.host = newHost || null;
            if (newHost) {
              io.to(newHost).emit('host_transferred');
              console.log(`Host transferred in room ${roomId} to ${newHost}`);
            }
          }

          io.to(roomId).emit('room_users', Object.values(room.users));

          // Clean up empty rooms
          if (Object.keys(room.users).length === 0) {
            delete rooms[roomId];
            console.log(`Room ${roomId} deleted (empty)`);
          }
        }
      }
    } catch (error) {
      console.error('Disconnect error:', error);
    }
  });

  // ✅ Add error handling for socket
  socket.on('error', (error) => {
    console.error(`Socket error for ${socket.id}:`, error);
  });
});

// ✅ Add graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

// ✅ Start the server with error handling
server.listen(PORT, '0.0.0.0', () => {
  console.log(`Socket.IO server running on port ${PORT} at ${new Date().toISOString()}`);
  console.log(`Allowed origins: ${allowedOrigin}`);
}).on('error', (err) => {
  console.error('Server failed to start:', err);
  process.exit(1);
});
