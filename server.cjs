// server.cjs
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();

// ✅ Allow both local dev and deployed frontend
app.use(cors({ origin: ['http://localhost:5173', 'https://moviemx.netlify.app'] }));

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: ['http://localhost:5173', 'https://moviemx.netlify.app'],
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

const rooms = {};

io.on('connection', (socket) => {
  console.log('New client connected:', socket.id);

  socket.on('join_room', ({ roomId, username, isPublic, mediaInfo }, callback) => {
    if (!rooms[roomId]) {
      rooms[roomId] = {
        host: socket.id,
        users: {},
        isPublic: !!isPublic,
        mediaInfo,
      };
    }

    rooms[roomId].users[socket.id] = username;
    socket.join(roomId);

    io.to(roomId).emit('room_users', Object.values(rooms[roomId].users));

    // ✅ Send current media info to the joining user
    if (rooms[roomId].mediaInfo) {
      io.to(socket.id).emit('media_changed', rooms[roomId].mediaInfo);
    }

    callback({ host: rooms[roomId].host === socket.id });
  });

  socket.on('check_room', ({ roomId }, callback) => {
    const room = rooms[roomId];
    if (room) {
      callback({ exists: true, isPublic: room.isPublic });
    } else {
      callback({ exists: false });
    }
  });

  socket.on('get_public_rooms', () => {
    const publicRooms = Object.entries(rooms)
      .filter(([_, room]) => room.isPublic)
      .map(([id, room]) => ({
        id,
        mediaInfo: room.mediaInfo,
        users: Object.values(room.users),
      }));
    socket.emit('public_rooms', publicRooms);
  });

  socket.on('send_message', ({ roomId, message, username }) => {
    io.to(roomId).emit('receive_message', { message, username });
  });

  socket.on('typing', ({ roomId, username }) => {
    socket.to(roomId).emit('user_typing', username);
  });

  socket.on('sync_action', ({ roomId, action }) => {
    socket.to(roomId).emit('sync_action', action);
  });

  socket.on('change_media', ({ roomId, mediaInfo }) => {
    if (rooms[roomId]) {
      rooms[roomId].mediaInfo = mediaInfo;
      io.to(roomId).emit('media_changed', mediaInfo);
    }
  });

  socket.on('update_room_visibility', ({ roomId, isPublic }) => {
    if (rooms[roomId]) {
      rooms[roomId].isPublic = isPublic;
    }
  });

  socket.on('kick_user', ({ roomId, username }) => {
    const room = rooms[roomId];
    if (room) {
      const targetId = Object.keys(room.users).find(
        (id) => room.users[id] === username
      );
      if (targetId) {
        io.to(targetId).emit('kicked');
        io.sockets.sockets.get(targetId)?.leave(roomId);
        delete room.users[targetId];
        io.to(roomId).emit('room_users', Object.values(room.users));
      }
    }
  });

  socket.on('disconnect', () => {
    for (const roomId in rooms) {
      const room = rooms[roomId];
      if (room.users[socket.id]) {
        delete room.users[socket.id];

        if (room.host === socket.id) {
          const [newHost] = Object.keys(room.users);
          room.host = newHost || null;
        }

        io.to(roomId).emit('room_users', Object.values(room.users));

        // Delete room if empty
        if (Object.keys(room.users).length === 0) {
          delete rooms[roomId];
        }
      }
    }
    console.log('Client disconnected:', socket.id);
  });
});

// ✅ Use dynamic port for Render or default to 4000
const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
  console.log(`Socket.IO server running on port ${PORT}`);
});
