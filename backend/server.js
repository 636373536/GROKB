const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const path = require('path');
const cors = require('cors');
const fs = require('fs');
require('dotenv').config();
const db = require('./database');
const app = express();
const server = http.createServer(app);

// WebSocket servers
const wss = new WebSocket.Server({ noServer: true });
const adminWss = new WebSocket.Server({ noServer: true });

// Middleware
app.use(cors({
  origin: ['http://localhost:3000', 'http://127.0.0.1:3000'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'frontend')));

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/teams', require('./routes/teams'));
app.use('/api/bookings', require('./routes/bookings'));
app.use('/api/payments', require('./routes/payments'));
app.use('/api/reports', require('./routes/reports'));
app.use('/api/messages', require('./routes/messages'));

// Serve HTML files
const serveHtml = (fileName) => (req, res) => {
  const filePath = path.join(__dirname, '..', 'frontend', fileName);
  fs.access(filePath, fs.constants.F_OK, (err) => {
    if (err) {
      res.status(404).send(`${fileName} not found`);
    } else {
      res.sendFile(filePath);
    }
  });
};

app.get('/', serveHtml('trial.html'));
app.get('/admin', serveHtml('admin.html'));
app.get('/report', serveHtml('Report.html'));
app.get('/chats', serveHtml('chats.html'));

// WebSocket connections
const activeConnections = {};
const adminConnections = [];

// User WebSocket
wss.on('connection', (ws, req) => {
  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);
      
      if (data.type === 'identify') {
        activeConnections[data.userId] = ws;
        ws.userId = data.userId;
        
        notifyAdmins('user-connected', {
          userId: data.userId,
          count: Object.keys(activeConnections).length
        });
      } 
      else if (data.type === 'message') {
        handleUserMessage(data);
      }
      else if (data.type === 'typing') {
        handleTypingIndicator(data);
      }
      else if (data.type === 'call') {
        handleCall(data);
      }
    } catch (err) {
      console.error('WebSocket message error:', err);
    }
  });

  ws.on('close', () => {
    if (ws.userId) {
      delete activeConnections[ws.userId];
      notifyAdmins('user-disconnected', {
        userId: ws.userId,
        count: Object.keys(activeConnections).length
      });
    }
  });
});

// Admin WebSocket
adminWss.on('connection', (ws) => {
  adminConnections.push(ws);
  
  ws.send(JSON.stringify({
    type: 'init-data',
    activeUsers: Object.keys(activeConnections).length,
    revenue: calculateRevenue(),
    bookings: db.bookings.length
  }));

  ws.on('close', () => {
    const index = adminConnections.indexOf(ws);
    if (index !== -1) {
      adminConnections.splice(index, 1);
    }
  });

  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);
      if (data.type === 'message') {
        handleAdminMessage(data);
      }
    } catch (err) {
      console.error('Admin WebSocket error:', err);
    }
  });
});

// Handle upgrade for WebSocket
server.on('upgrade', (request, socket, head) => {
  const pathname = request.url;

  // Prevent double handling
  if (socket.wsHandled) {
    socket.destroy();
    return;
  }
  socket.wsHandled = true;

  if (pathname === '/admin') {
    adminWss.handleUpgrade(request, socket, head, (ws) => {
      adminWss.emit('connection', ws, request);
    });
  } else {
    wss.handleUpgrade(request, socket, head, (ws) => {
      wss.emit('connection', ws, request);
    });
  }
});

// Helper functions
function notifyAdmins(type, data) {
  const message = JSON.stringify({ type, ...data });
  adminConnections.forEach(adminWs => {
    adminWs.send(message);
  });
}

function handleUserMessage(data) {
  const message = {
    ...data,
    timestamp: new Date().toISOString()
  };

  db.messages.push({
    id: db.getNextId('messages'),
    userId: data.userId,
    content: data.content,
    to: data.to,
    sender: 'user',
    timestamp: message.timestamp,
    status: 'delivered'
  });

  if (data.to === 'admin') {
    notifyAdmins('new-message', message);
  } 
  else if (activeConnections[data.to]) {
    activeConnections[data.to].send(JSON.stringify(message));
  }
}

function handleAdminMessage(data) {
  const message = {
    ...data,
    sender: 'admin',
    timestamp: new Date().toISOString()
  };

  db.messages.push({
    id: db.getNextId('messages'),
    userId: data.userId,
    content: data.content,
    to: data.to,
    sender: 'admin',
    timestamp: message.timestamp,
    status: 'delivered'
  });

  if (activeConnections[data.to]) {
    activeConnections[data.to].send(JSON.stringify(message));
  }
}

function calculateRevenue() {
  const now = new Date();
  const thisMonth = now.getMonth();
  const thisYear = now.getFullYear();
  
  return db.bookings
    .filter(b => {
      const d = new Date(b.date);
      return d.getMonth() === thisMonth && d.getFullYear() === thisYear;
    })
    .reduce((sum, b) => sum + (b.amount || 0), 0);
}

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});