const WebSocket = require('ws');
const crypto = require('crypto');
const url = require('url');

const wss = new WebSocket.Server({ port: 8080 });

const activePlayers = new Map(); 

wss.on('connection', (ws, req) => {
    const parameters = url.parse(req.url, true).query;
    const sessionId = parameters.sessionId;

    if (!sessionId) {
        ws.close(4000, "Session ID required");
        return;
    }

    if (activePlayers.has(sessionId)) {
        const oldWs = activePlayers.get(sessionId);
        
        oldWs.terminate(); 
        activePlayers.delete(sessionId);
    }

    ws.id = sessionId;
    activePlayers.set(ws.id, ws);

    ws.send(JSON.stringify({     
        type: "id",
        message: ws.id
    }));

    ws.on('message', (message, isBinary) => {
        const messageString = isBinary ? message : message.toString();
        const received = JSON.parse(messageString);

        if (received.type === "connectAll") {                
            activePlayers.forEach((client, clientId) => {
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
            return;
        }

        if (!received.remoteId) return;
        const targetClient = activePlayers.get(received.remoteId);

        if (targetClient && targetClient.readyState === WebSocket.OPEN) {
            targetClient.send(JSON.stringify({
                type: received.type,
                message: received.message,
                remoteId: ws.id
            }));
        }
    });

    ws.on('close', () => {
        if (activePlayers.get(ws.id) === ws) {
            activePlayers.delete(ws.id);
        }
    });

    ws.on('error', (err) => {
        if (activePlayers.get(ws.id) === ws) {
            activePlayers.delete(ws.id);
        }
    });
});
