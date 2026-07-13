const WebSocket = require('ws');
const crypto = require('crypto');
const url = require('url'); // Built-in Node module to parse query params

const wss = new WebSocket.Server({ port: 8080 });

// We map sessionId -> WebSocket instance
const activePlayers = new Map(); 

wss.on('connection', (ws, req) => {
    const parameters = url.parse(req.url, true).query;
    const sessionId = parameters.sessionId;

    if (!sessionId) {
        console.warn("Connection rejected: No sessionId provided.");
        ws.close(4000, "Session ID required");
        return;
    }

    if (activePlayers.has(sessionId)) {
        console.log(`Ghost connection detected for session ${sessionId}. Terminating old socket...`);
        const oldWs = activePlayers.get(sessionId);
        
        oldWs.terminate(); 
        activePlayers.delete(sessionId);
    }

    ws.id = sessionId;
    activePlayers.set(ws.id, ws);
    console.log(`Player connected: ${ws.id}`);

    ws.send(JSON.stringify({     
        type: "id",
        message: ws.id
    }));

    ws.on('message', (message, isBinary) => {
        try {
            const messageString = isBinary ? message : message.toString();
            const received = JSON.parse(messageString);

            if (received.type === "connectAll") {
                console.log(`Player ${ws.id} requested matchmaking.`);
                
                activePlayers.forEach((client, clientId) => {
                    if (clientId !== ws.id && client.readyState === WebSocket.OPEN) {
                        console.log(`Pairing new player ${ws.id} with existing player ${clientId}`);
                        
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

        } catch (error) {
            console.error("Error routing signaling message:", error);
        }
    });

    ws.on('close', () => {
        if (activePlayers.get(ws.id) === ws) {
            console.log(`Player disconnected natively: ${ws.id}`);
            activePlayers.delete(ws.id);
        }
    });

    ws.on('error', (err) => {
        console.error(`Socket error on player ${ws.id}:`, err);
        if (activePlayers.get(ws.id) === ws) {
            activePlayers.delete(ws.id);
        }
    });
});
