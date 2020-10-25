const http = require('http');
const express = require('express');
const socketio = require('socket.io');
const cors = require('cors');

const app = express();
const server = http.createServer(app);
const io = socketio(server);

// Middleware
app.use(cors());
app.use(express.json());

// Utilities
let rooms = [];
let players = [];

const getPlayersInRoom = roomName => players.filter(p => p.room === roomName);

class Room {
  constructor(name) {
    this.name = name;
    this.blue = 0;
    this.red = 0;
    this.buzzed = '';
    this.locked = false;
  }
}

const findRoom = roomName => rooms.findIndex(r => r.name === roomName);

// Sockets
io.on('connection', socket => {
  socket.on('player joined', player => {
    player = { ...player, id: socket.id };
    players.push(player);

    socket.join(player.room);
    io.to(player.room).emit('room data', getPlayersInRoom(player.room));
    io.to(player.room).emit('room info', rooms[findRoom(player.room)]);
  });

  socket.on('create room', roomName => {
    let room = new Room(roomName);
    rooms.push(room);
  });

  socket.on('host joined', roomName => {
    socket.join(roomName);
    io.to(roomName).emit('room info', rooms[findRoom(roomName)]);
  });

  socket.on('exit room', player => {
    players = players.filter(
      p => p.name !== player.name && p.room !== player.room
    );
    io.to(player.room).emit('room data', getPlayersInRoom(player.room));
  });

  socket.on('remove room', roomName => {
    rooms = rooms.filter(r => r.name !== roomName);
    io.to(roomName).emit('redirect players');
  });

  socket.on('buzz', player => {
    let roomIndex = findRoom(player.room);
    if (rooms[roomIndex] && !rooms[roomIndex].buzzed) {
      rooms[roomIndex].buzzed = player;
      rooms[roomIndex].locked = true;
      io.to(player.room).emit('buzzer sound');
      io.to(player.room).emit('room info', rooms[roomIndex]);
    }
  });

  socket.on('lock', roomName => {
    let roomIndex = findRoom(roomName);
    if (rooms[roomIndex]) {
      rooms[roomIndex].locked = true;
    }
    io.to(roomName).emit('room info', rooms[roomIndex]);
  });

  socket.on('unlock', roomName => {
    let roomIndex = findRoom(roomName);
    if (rooms[roomIndex]) {
      rooms[roomIndex].locked = false;
      rooms[roomIndex].buzzed = '';
    }
    io.to(roomName).emit('room info', rooms[roomIndex]);
  });

  socket.on('clear', roomName => {
    let roomIndex = findRoom(roomName);
    if (rooms[roomIndex]) {
      rooms[roomIndex].buzzed = '';
    }
    io.to(roomName).emit('room info', rooms[roomIndex]);
  });

  // Teams
  socket.on('add blue', roomName => {
    let roomIndex = findRoom(roomName);
    if (rooms[roomIndex]) {
      rooms[roomIndex].blue += 1;
    }
    io.to(roomName).emit('room info', rooms[roomIndex]);
  });

  socket.on('minus blue', roomName => {
    let roomIndex = findRoom(roomName);
    if (rooms[roomIndex]) {
      rooms[roomIndex].blue -= 1;
    }
    io.to(roomName).emit('room info', rooms[roomIndex]);
  });

  socket.on('add red', roomName => {
    let roomIndex = findRoom(roomName);
    if (rooms[roomIndex]) {
      rooms[roomIndex].red += 1;
    }
    io.to(roomName).emit('room info', rooms[roomIndex]);
  });

  socket.on('minus red', roomName => {
    let roomIndex = findRoom(roomName);
    if (rooms[roomIndex]) {
      rooms[roomIndex].red -= 1;
    }
    io.to(roomName).emit('room info', rooms[roomIndex]);
  });

  socket.on('disconnect', () => {
    let player = players.find(p => p.id === socket.id);
    if (player !== undefined) {
      console.log(player.name + ' has disconnected');
      players = players.filter(p => p.id !== socket.id);
      io.to(player.room).emit('room data', getPlayersInRoom(player.room));
    }
  });
});

// Routes
app.post('/create', (req, res) => {
  const roomName = req.body.room;
  const existingRoom = rooms.find(r => r.name === roomName);
  if (existingRoom) return res.status(400).send('Room already exists');
  res.send();
});

app.post('/join', (req, res) => {
  const player = req.body.player;
  const existingRoom = rooms.find(r => r.name === player.room);
  const existingPlayer = players.find(p => p.name === player.name);
  if (!existingRoom) return res.status(400).send('Room does not exists');
  if (existingPlayer) return res.status(400).send('Player already exists');
  res.send();
});

server.listen(process.env.PORT || 5000, () => console.log('Server is running'));
