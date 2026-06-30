const WebSocket = require('ws');
const http = require('http');

const PORT = process.env.PORT || 8080;

const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('WebSocket server is running!');
});

const wss = new WebSocket.Server({ server });

wss.on('connection', (ws) => {
  console.log('🔗 Client connected');
  ws.send('Welcome! Connected securely to Render.');

  ws.on('message', (message) => {
    console.log(`Received: ${message}`);
    ws.send(`Server echoed: ${message}`);
  });

  ws.on('close', () => {
    console.log('❌ Client disconnected');
  });
});

server.listen(PORT, () => {
  console.log(`🚀 Server is listening on port ${PORT}`);
});
