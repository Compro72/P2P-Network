const WebSocket = require("ws");
const http = require("http");
const crypto = require("crypto");

const PORT = process.env.PORT || 8080;
const server = http.createServer();
const wss = new WebSocket.Server({ server });

wss.on("connection", (ws) => {
  ws.id = crypto.randomUUID();

  wss.clients.forEach((client) => {
    if (client !== ws && client.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({
        type: "role",
        message: "initiator",
        targetPeerId: client.id
      }));

      client.send(JSON.stringify({
        type: "role",
        message: "answerer",
        targetPeerId: ws.id
      }));
    }
  });

  ws.on("message", (message, isBinary) => {
    try {
      const messageString = isBinary ? message : message.toString();
      const received = JSON.parse(messageString);

      if (!received.targetPeerId) return;

      wss.clients.forEach((client) => {
        if (client.id === received.targetPeerId && client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify({
            type: received.type,
            message: received.message,
            targetPeerId: ws.id
          }));
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
