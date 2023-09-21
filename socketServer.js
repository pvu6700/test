const express = require('express');
const http = require('http');
const config = require('./config');
const Redis = require('ioredis');
const socketIO = require('socket.io');
const path = require('path');
const app = express();
const server = http.createServer(app);
const io = socketIO(server);

// Create an ioredis client and configure it.
const redisClient = new Redis({
  host: config.databases.redis.host,
  port: config.databases.redis.port,
});
app.get('/realsync/socket', (req, res) => {
  res.sendFile(__dirname + '/index.html');
});
app.get('/realsync/health/check', (req, res) => {
  res.send('Server is Up')
});

// Define the keys you want to monitor
const keysToMonitor = ['data', 'master', 'key3'];

// Initialize an object to store the current state of the Redis data for each key
const currentData = {};
const jsonErrorFlags = {};

// Function to emit Redis key changes to connected clients
const emitChanges = (key, newData) => {
  if (currentData[key] !== newData) {
    io.emit(`dataUpdate_${key}`, newData);
    currentData[key] = newData;
  }
};

io.on('connection', (socket) => {
  console.log('Client connected');

  socket.on('disconnect', () => {
    console.log('Client disconnected');
  });

  // When a client connects, send the current Redis data for each key
  for (const key of keysToMonitor) {
    redisClient.get(key, async (err, data) => {
      if (!err && data !== null) {
        socket.emit(`dataUpdate_${key}`, data);
        currentData[key] = data;
      }
    });
  }
});

server.listen(3000, () => {
  console.log(`Server listening on port ${config.server.port}`);
});

//check for changes in Redis keys and send updates to connected clients
setInterval(() => {
  for (const key of keysToMonitor) {
    redisClient.get(key, async (err, newData) => {
      if (!err && newData !== null) {
        try {
          // Parsing as Json data. 
          JSON.parse(newData);
          emitChanges(key, newData);
          jsonErrorFlags[key] = false; 
        } catch (error) {
          // Handle invalid JSON data
          if (jsonErrorFlags[key] !== true) {
            console.error(`Invalid JSON data for key '${key}':`, newData);
            jsonErrorFlags[key] = true;
          }
        }
      }
    });
  }
}, 1000); // Adjust the interval as needed
