let WebSocket = require("ws");
let crypto = require("crypto");
let url = require("url");

let wss = new WebSocket.Server({ port: 8080 });

let rooms = new Map();

wss.on("connection", (ws, req) => {
    ws.on("message", (message, isBinary) => {
        let messageString = isBinary ? message : message.toString();
        let received = JSON.parse(messageString);

        if (received.type == "initId") {
            rooms.forEach((roomMap, roomId) => {
                if (roomMap.has(received.id)) {
                    let oldWs = roomMap.get(received.id);
                    
                    oldWs.terminate(); 
                    roomMap.delete(received.id);
                    if(roomMap.size == 0) {
                        rooms.delete(roomId);
                    }
                }
            });
        
            ws.id = received.id;
            
        } else if (received.type == "createRoom") {
            ws.roomId = crypto.randomUUID();
            rooms.set(ws.roomId, new Map());
            rooms.get(ws.roomId).set(ws.id, ws);

            wss.clients.forEach((client) => {
              if (client.readyState == WebSocket.OPEN) {
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
            
        } else if (received.type == "peerMessage") {
            if(ws.roomId && rooms.has(ws.roomId)) {
                let targetClient = rooms.get(ws.roomId).get(received.targetId);
        
                if (targetClient && targetClient.readyState === WebSocket.OPEN) {
                    targetClient.send(messageString);
                }
            }
        }
    });

    ws.on("close", () => {
        if (ws.roomId && rooms.has(ws.roomId)) {
            rooms.get(ws.roomId).delete(ws.id);
            if(rooms.get(ws.roomId).size == 0) {
                rooms.delete(ws.roomId);
            }
        }
    });

    ws.on("error", (err) => {
        if (ws.roomId && rooms.has(ws.roomId)) {
            rooms.get(ws.roomId).delete(ws.id);
            if(rooms.get(ws.roomId).size == 0) {
                rooms.delete(ws.roomId);
            }
        }
    });
});
