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
            let roomId = crypto.randomUUID();
            rooms.set(roomId, new Map());
            rooms.get(roomId).set(ws.id, ws);

            // TODO
            
        } else if (received.type == "connectRoom") {
            rooms.get(received.roomId).forEach((client, clientId) => {
                if (clientId !== ws.id && client.readyState === WebSocket.OPEN) {
                    ws.send(JSON.stringify({
                        type: "role",
                        message: "initiator",
                        remoteId: clientId
                    }));

                    client.send(JSON.stringify({
                        type: "role",
                        message: "answerer",
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
        if (activePlayers.get(ws.id) === ws) {
            activePlayers.delete(ws.id);
        }
    });

    ws.on("error", (err) => {
        if (activePlayers.get(ws.id) === ws) {
            activePlayers.delete(ws.id);
        }
    });
});
