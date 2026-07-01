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

  // Change this part in server.js:
  ws.on('message', (message, isBinary) => {
    // Convert the Buffer to a readable string if it's text
    const messageString = isBinary ? message : message.toString();
    
    log(`Received: ${messageString}`);
    ws.send(`Server echoed: ${messageString.split("").reverse().join("")}`);
  });

  ws.on('close', () => {
    console.log('❌ Client disconnected');
  });
});

server.listen(PORT, () => {
  console.log(`🚀 Server is listening on port ${PORT}`);
});
