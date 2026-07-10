const WebSocket = require('ws');
const http = require('http');
const crypto = require('crypto');

const PORT = process.env.PORT || 8080;
const server = http.createServer();
const wss = new WebSocket.Server({ server });

wss.on('connection', (ws) => {
  // Assign a unique immutable ID to this connection instance
  ws.id = crypto.randomUUID();
  console.log(`✨ New client connected: ${ws.id}`);

  // 1. Instantly introduce this newcomer to everyone else already online
  wss.clients.forEach((client) => {
    if (client !== ws && client.readyState === WebSocket.OPEN) {
      // Tell the newcomer to initiate a connection with the existing peer
      ws.send(JSON.stringify({
        type: 'role',
        message: 'initiator',
        targetPeerId: client.id
      }));

      // Tell the existing peer to get ready to answer this newcomer
      client.send(JSON.stringify({
        type: 'role',
        message: 'answerer',
        targetPeerId: ws.id
      }));
    }
  });

  // 2. Handle incoming WebRTC signaling traffic
  ws.on('message', (message, isBinary) => {
    try {
      const messageString = isBinary ? message : message.toString();
      const received = JSON.parse(messageString);

      // We need a designated target recipient to route targeted signals
      if (!received.targetPeerId) return;

      // Scan for the explicit peer requested by targetPeerId
      wss.clients.forEach((client) => {
        if (client.id === received.targetPeerId && client.readyState === WebSocket.OPEN) {
          
          // CRITICAL: Overwrite targetPeerId to ws.id before sending.
          // This tells the receiver's client script WHO sent the packet.
          client.send(JSON.stringify({
            type: received.type,
            message: received.message,
            targetPeerId: ws.id 
          }));
        }
      });

    } catch (error) {
      console.error('Error handling signal message:', error);
    }
  });

  // 3. Clean up the mesh when a user drops off
  ws.on('close', () => {
    console.log(`🛑 Client disconnected: ${ws.id}`);

    wss.clients.forEach((client) => {
      if (client !== ws && client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify({
          type: 'peerLeft',
          targetPeerId: ws.id
        }));
      }
    });
  });
});

server.listen(PORT, () => {
  console.log(`🚀 Mesh Signaling Server listening on port ${PORT}`);
});
