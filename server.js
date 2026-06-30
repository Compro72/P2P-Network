const WebSocket = require('ws');
const http = require('http');

// 1. Render assigns a dynamic port via process.env.PORT. Fallback to 8080 for local testing.
const PORT = process.env.PORT || 8080;

// 2. Create a standard HTTP server. Render requires an HTTP server to pass its health checks.
const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('WebSocket server is running!');
});

// 3. Mount the WebSocket server onto the HTTP server
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

// 4. Start listening on the port provided by Render
server.listen(PORT, () => {
  console.log(`🚀 Server is listening on port ${PORT}`);
});
