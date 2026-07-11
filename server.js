const WebSocket = require("ws");
const http = require("http");
const crypto = require("crypto");

const PORT = process.env.PORT || 8080;
const server = http.createServer();
const wss = new WebSocket.Server({ server });

wss.on("connection", (ws) => {
  ws.on("message", (message, isBinary) => {
    try {
      const messageString = isBinary ? message : message.toString();

      wss.clients.forEach((client) => {
        if (client !== ws && client.readyState === WebSocket.OPEN) {
          client.send(messageString);
        }
      });

    } catch (error) {
      console.error("Error handling signal message:", error);
    }
  });

  ws.on("close", () => {
    wss.clients.forEach((client) => {
      if (client !== ws && client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify({
          type: "peerLeft",
          targetPeerId: ws.id
        }));
      }
    });
  });
});

server.listen(PORT, () => {
  console.log(`🚀 Mesh Signaling Server listening on port ${PORT}`);
});
