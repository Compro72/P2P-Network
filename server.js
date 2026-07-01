const WebSocket = require('ws');
const http = require('http');

const PORT = process.env.PORT || 8080;

let globalRes;

const server = http.createServer((req, res) => {
  globalRes = res;
  globalRes.writeHead(200, { 'Content-Type': 'text/plain' });
  globalRes.end('WebSocket server is running!');
});

const wss = new WebSocket.Server({ server });

wss.on('connection', (ws) => {
  ws.send('Welcome! Connected securely to Render.');

  ws.on('message', (message, isBinary) => {
    const messageString = isBinary ? message : message.toString();
    
    console.log(`Received: ${messageString}`);

    wss.clients.forEach((client) => {
      // Check if the client connection is open before sending
      if (client.readyState === WebSocket.OPEN) {
        client.send(`Server echoed: ${messageString}`);
      }
    });
  });

  ws.on('close', () => {
    console.log('Client disconnected');
  });
});

server.listen(PORT, () => {
  console.log(`🚀 Server is listening on port ${PORT}`);
});



