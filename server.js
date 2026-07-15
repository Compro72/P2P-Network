let WebSocket = require("ws");
let crypto = require("crypto");
let url = require("url");

let wss = new WebSocket.Server({ port: 8080 });

let rooms = new Map();

function removeFromRoom(ws) {
    const roomId = ws.roomId;
    const peerId = ws.id;

    if (roomId && rooms.has(roomId)) {
        let roomMap = rooms.get(roomId);
        roomMap.delete(peerId);

        if (roomMap.size === 0) {
            rooms.delete(roomId);

            wss.clients.forEach((client) => {
                if (client.readyState === WebSocket.OPEN) {
                    client.send(JSON.stringify({
                        type: "roomClosed",
                        roomId: roomId
                    }));
                }
            });
        }
    }
}

wss.on("connection", (ws, req) => {
    rooms.forEach((roomMap, roomId) => {
        ws.send(JSON.stringify({
            type: "roomCreated",
            roomId: roomId
        }));
    });

    ws.on("message", (message, isBinary) => {
        let messageString = isBinary ? message : message.toString();
        
        let received;
        try {
            received = JSON.parse(messageString);
        } catch (e) {
            return;
        }

        if (received.type == "initId") {
            rooms.forEach((roomMap, roomId) => {
                if (roomMap.has(received.id)) {
                    let oldWs = roomMap.get(received.id);

                    oldWs.terminate();
                    roomMap.delete(received.id);
                    if (roomMap.size == 0) {
                        rooms.delete(roomId);

                        wss.clients.forEach((client) => {
                            if (client.readyState == WebSocket.OPEN) {
                                client.send(JSON.stringify({
                                    type: "roomClosed",
                                    roomId: roomId,
                                    hello: "hello"
                                }));
                            }
                        });
                    }
                }
            });

            ws.id = received.id;

        } else if (received.type == "createRoom") {
            if (!ws.id) return; 

            if (!ws.roomId) {
                ws.roomId = crypto.randomUUID();
                rooms.set(ws.roomId, new Map());
                rooms.get(ws.roomId).set(ws.id, ws);

                let joinTimestamp = Date.now();
    
                ws.send(JSON.stringify({
                    type: "roomJoined",
                    roomId: ws.roomId,
                    timestamp: joinTimestamp
                }));
    
                wss.clients.forEach((client) => {
                    if (client.readyState == WebSocket.OPEN) {
                        client.send(JSON.stringify({
                            type: "roomCreated",
                            roomId: ws.roomId
                        }));
                    }
                });
            }

        } else if (received.type == "connectRoom") {
            if (!ws.id || !rooms.has(received.roomId)) return;

            if (!ws.roomId) {
                ws.roomId = received.roomId;
                rooms.get(ws.roomId).set(ws.id, ws);

                let joinTimestamp = Date.now();
                
                ws.send(JSON.stringify({
                    type: "roomJoined",
                    roomId: ws.roomId,
                    timestamp: joinTimestamp
                }));
    
                rooms.get(ws.roomId).forEach((client, clientId) => {
                    if (clientId !== ws.id && client.readyState == WebSocket.OPEN) {
                        ws.send(JSON.stringify({
                            type: "peerMessage",
                            peerMessageType: "role",
                            role: "initiator",
                            remoteId: clientId
                        }));
    
                        client.send(JSON.stringify({
                            type: "peerMessage",
                            peerMessageType: "role",
                            role: "answerer",
                            remoteId: ws.id
                        }));
                    }
                });
            }

        } else if (received.type == "disconnectRoom") {
            if (!ws.id) return;

            if (ws.roomId && rooms.has(ws.roomId)) {
                removeFromRoom(ws);
                delete ws.roomId;
            }

        } else if (received.type == "peerMessage") {
            if (ws.roomId && rooms.has(ws.roomId)) {
                let targetClient = rooms.get(ws.roomId).get(received.targetId);

                if (targetClient && targetClient.readyState === WebSocket.OPEN) {
                    targetClient.send(messageString);
                }
            }
        }
    });

    ws.on("close", () => {
        removeFromRoom(ws);
    });

    ws.on("error", (err) => {
        removeFromRoom(ws);
    });
});
