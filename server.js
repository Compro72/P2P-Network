const WebSocket = require('ws');
const http = require('http');

const PORT = process.env.PORT || 8080;

const server = http.createServer();

const wss = new WebSocket.Server({ server });

wss.on('connection', (ws) => {
  ws.send('Welcome! Connected securely to Render.');

  ws.on('message', (message, isBinary) => {
    const messageString = isBinary ? message : message.toString();
    
    console.log(`Received: ${messageString}`);

    wss.clients.forEach((client) => {
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



