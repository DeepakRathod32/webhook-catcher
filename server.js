import express from 'express';
import http from 'http';
import {Server} from 'socket.io';
import cors from 'cors';
import {nanoid} from 'nanoid';
import path from 'path';
import db from './database.js';

const app = express();
const server = http.createServer(app);
const io = new Server(server, {cors:{origin: "*"}});
const __dirname = path.resolve();

app.use(cors());

app.use(express.json({limit: '1mb'}));
app.use(express.urlencoded({extended: true}));
app.use(express.text({ type: '*/*'}));

const requestBins = new Map();

// 1. Create a new bin
app.post('/api/bins', (req, res) => {
    const binId  = nanoid(8);
    const stmt = db.prepare('INSERT INTO bins (bin_id) VALUES (?)');
    stmt.run(binId);
    res.json({ binId, url: `/hook/${binId}`} );
//     requestBins.set(binId, []);
// res.status(201).json({binId, url: `/hook/${binId}`});
});

// 2. Get all requests for a specific bin
app.get('/api/bins/:binId', (req, res) => {
  const { binId } = req.params;
  const stmt = db.prepare('SELECT * FROM requests WHERE bin_id = ? ORDER BY created_at DESC');
  const requests = stmt.all(binId).map(req => ({
    ...req,
    headers: JSON.parse(req.headers),
    body: JSON.parse(req.body || '{}'),
    query_params: JSON.parse(req.query_params || '{}')
  }));
  res.json({ requests });
});

// 3. Catch-all route for webhooks (Handles ANY method: GET, POST, PUT, etc.)
app.all(/(.*)/, (req, res, next) => {
  const match = req.path.match(/^\/hook\/([a-zA-Z0-9_-]+)$/);
  if (!match) return next(); // If it's not a webhook route, pass it down to static files/other APIs

  const binId = match[1];
  
  // Check if bin exists, if not, create it automatically
  const checkBin = db.prepare('SELECT * FROM bins WHERE bin_id = ?').get(binId);
  if (!checkBin) {
    db.prepare('INSERT INTO bins (bin_id) VALUES (?)').run(binId);
  }

  const requestId = nanoid(6);
  const newRequest = {
    id: requestId,
    bin_id: binId,
    method: req.method,
    headers: JSON.stringify(req.headers),
    body: JSON.stringify(req.body),
    query_params: JSON.stringify(req.query)
  };

  // Save to SQLite
  const insert = db.prepare(`
    INSERT INTO requests (id, bin_id, method, headers, body, query_params)
    VALUES (@id, @bin_id, @method, @headers, @body, @query_params)
  `);
  insert.run(newRequest);

  // Format payload for frontend UI & WebSocket broadcast
  const clientPayload = {
    ...newRequest,
    headers: req.headers,
    body: req.body,
    query_params: req.query,
    created_at: new Date().toISOString()
  };

  // Broadcast live to anyone viewing this bin via WebSockets
  io.to(binId).emit('new_request', clientPayload);

  res.status(200).json({ success: true, requestId });
});

// app.all('/hook/:binId', (req, res) => {
//     const {binId} = req.params;

//     if(!requestBins.has(binId)){
//         requestBins.set(binId, []);
//     }

//     const incomingRequest = {
//         id : nanoid(6),
//         timeStamp: new Date().toISOString(),
//         method: req.method,
//         headers: req.headers,
//         query: req.query,
//         ip: req.ip
//     }

//     const binRequests = requestBins.get(binId);
//     binRequests.unshift(incomingRequest);

//     io.to(binId).emit('new_request', incomingRequest);

//     res.status(200).json({status: 'received', requestId: incomingRequest.id});
// });

io.on('connection', (socket) => {
    socket.on('join_bin', (binId) => {
        socket.join(binId);

        // const existing = requestBins.get(binId) || [];
        // socket.emit('initial_requests', existing);
    });
});

app.use(express.static(path.join(__dirname, 'client/dist')));

app.get(/(.*)/, (req, res) => {
    res.sendFile(path.join(__dirname, 'client/dist', 'index.html'));
})

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Webhook Catcher running on http://localhost:${PORT}`);
})