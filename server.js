const WebSocket = require("ws");
const crypto = require("crypto");
const url = require("url");

const wss = new WebSocket.Server({ port: 8080 });

let rooms = new Map();

wss.on("connection", (ws, req) => {
    ws.on("message", (message, isBinary) => {
        const messageString = isBinary ? message : message.toString();
        const received = JSON.parse(messageString);

        if (received.type == "initId") {
            if (activePlayers.has(received.id)) {
                const oldWs = activePlayers.get(received.id);
                
                oldWs.terminate(); 
                activePlayers.delete(received.id);
            }
        
            ws.id = received.id;
            
        } else if (received.type == "createRoom") {
            ws.roomId = crypto.randomUUID();
            rooms.set(ws.roomId, new Map());
            rooms.get(ws.roomId).set(ws.id, ws);

            wss.clients.forEach((client) => {
              if (client != ws && client.readyState == WebSocket.OPEN) {
                client.send(JSON.stringify({
                    type: "roomCreated",
                    roomId: ws.roomId
                }));
              }
            });
            
        } else if (received.type == "connectRoom") {
            ws.roomId = received.roomId;
            rooms.get(ws.roomId).set(ws.id, ws);
            
            rooms.get(ws.roomId).forEach((client, clientId) => {
                if (clientId !== ws.id && client.readyState == WebSocket.OPEN) {
                    ws.send(JSON.stringify({
                        type: "role",
                        role: "initiator",
                        remoteId: clientId
                    }));

                    client.send(JSON.stringify({
                        type: "role",
                        role: "answerer",
                        remoteId: ws.id
                    }));
                }
            });
            
        } else if (received.type == "peerMessage") {
            const targetClient = activePlayers.get(received.targetId);
    
            if (targetClient && targetClient.readyState === WebSocket.OPEN) {
                targetClient.send(messageString);
            }
        }
    });

    ws.on("close", () => {
        if (rooms.get(ws.roomId).get(ws.id) === ws) {
            rooms.get(ws.roomId).delete(ws.id);
        }
    });

    ws.on("error", (err) => {
        if (rooms.get(ws.roomId).get(ws.id) === ws) {
            rooms.get(ws.roomId).delete(ws.id);
        }
    });
});
