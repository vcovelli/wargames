// server.js
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const axios = require('axios');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Serve static files from /public
app.use(express.static(path.join(__dirname, 'public')));
// Serve front-end modules
app.use('/comps', express.static(path.join(__dirname, 'comps')));

// In-memory store of connected users
// { [socketId]: { codename, ip, lat, lon, city, country } }
const users = {};

async function lookupGeo(ip) {
  try {
    if (!ip) throw new Error('No IP');

    // Strip IPv6 prefix, e.g. ::ffff:192.168.1.42
    if (ip.startsWith('::ffff:')) {
      ip = ip.slice(7);
    }

    // If it's a private / local IP, just return a fake "dev" location
    const isPrivate =
      ip.startsWith('10.') ||
      ip.startsWith('192.168.') ||
      ip.startsWith('172.16.') || ip.startsWith('172.17.') ||
      ip.startsWith('172.18.') || ip.startsWith('172.19.') ||
      ip.startsWith('172.2') ||  // catches 172.20–29
      ip.startsWith('172.30.') || ip.startsWith('172.31.') ||
      ip === '127.0.0.1' ||
      ip === '::1';

    if (isPrivate) {
      // Pick any coords you want as your "home base"
      return {
        lat: 40.0,
        lon: -80.0,
        city: 'LOCAL NET',
        country: 'DEV ENV'
      };
    }

    // Public IP: ask ipapi
    const res = await axios.get(`https://ipapi.co/${ip}/json/`);

    return {
      lat: res.data.latitude,
      lon: res.data.longitude,
      city: res.data.city,
      country: res.data.country_name,
    };
  } catch (err) {
    console.error('Geo lookup failed for IP', ip, err.message);
    // Fallback somewhere neutral so we still see a marker
    return {
      lat: 0,
      lon: 0,
      city: 'UNKNOWN',
      country: 'UNKNOWN'
    };
  }
}

function broadcastUsers() {
  // Send an array of users to everyone
  io.emit('user-list', Object.values(users));
}

io.on('connection', async (socket) => {
  const idShort = socket.id.slice(0, 4).toUpperCase();
  const codename = `USER-${idShort}`;
  socket.data.codename = codename;

  // Try to get IP
  let ip =
    socket.handshake.headers['x-forwarded-for'] ||
    socket.handshake.address;

  console.log(`${codename} connected from IP: ${ip}`);

  const geo = await lookupGeo(ip);

  users[socket.id] = {
    codename,
    ip,
    ...geo,
  };

  console.log('Geo for', codename, geo);

  io.emit('system-message', `${codename} LINK ESTABLISHED`);

  // send updated user list to all clients
  broadcastUsers();

  socket.on('chat-message', (text) => {
    const message = {
      codename,
      text,
      timestamp: new Date().toISOString(),
    };
    io.emit('chat-message', message);
  });

  socket.on('disconnect', () => {
    console.log(`${codename} disconnected`);
    io.emit('system-message', `${codename} LINK TERMINATED`);
    delete users[socket.id];
    broadcastUsers();
  });
});

const PORT = 4000;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`WarGames chat server online at http://0.0.0.0:${PORT}`);
});
