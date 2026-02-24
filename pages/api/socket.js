import { Server } from "socket.io"

const allowedOrigins = [
    "http://localhost:3000",           // local dev
    "https://meetothers.onrender.com", // production (single Render service)
];

const socketHandler = (req, res) => {
    if (!res.socket.server.io) {
        const io = new Server(res.socket.server, {
            cors: {
                origin: allowedOrigins,
                methods: ["GET", "POST"],
                credentials: true,          // ✅ FIX: Allow credentials from cross-origin frontend
            },
            transports: ["websocket", "polling"],
            path: "/api/socket/",           // ✅ FIX: Trailing slash — must match client path exactly
            pingTimeout: 20000,   // ✅ FIX: Fail fast — detect dead connections in 20s
            pingInterval: 15000,  // ✅ FIX: Ping every 15s — well within Render's 55s idle limit
        })
        res.socket.server.io = io

        // Room creation and joining logic
        io.on('connection', (socket) => {
            console.log(`User connected: ${socket.id}`)

            // Legacy PeerJS join-room event — emitted by usePeer.js on peer open
            socket.on('join-room', (roomId, userId) => {
                const rooms = io.sockets.adapter.rooms;
                if (rooms.has(roomId)) {
                    socket.join(roomId);
                    socket.roomId = roomId;
                    socket.userId = userId;
                    socket.to(roomId).emit('user-connected', { userId });
                    console.log(`[PeerJS] User ${userId} joined room ${roomId}`);
                } else {
                    // Room doesn't exist yet — create it
                    socket.join(roomId);
                    socket.roomId = roomId;
                    socket.userId = userId;
                    console.log(`[PeerJS] Room ${roomId} created by ${userId}`);
                }
            });

            // Create Room
            socket.on('createRoom', ({ roomId, userId, userInfo }) => {
                const rooms = io.sockets.adapter.rooms;
                if (rooms.has(roomId)) {
                    socket.emit('roomExists', { roomId });
                } else {
                    socket.join(roomId);
                    socket.roomId = roomId;
                    socket.userId = userId;
                    socket.userInfo = userInfo;
                    socket.emit('roomCreated', { roomId });
                    console.log(`Room created: ${roomId} by user ${userId}`);
                }
            });

            // Join Room
            socket.on('joinRoom', ({ roomId, userId, userInfo }) => {
                const rooms = io.sockets.adapter.rooms;
                if (!rooms.has(roomId)) {
                    socket.emit('noSuchRoom', { roomId });
                } else {
                    socket.join(roomId);
                    socket.roomId = roomId;
                    socket.userId = userId;
                    socket.userInfo = userInfo;
                    socket.emit('roomJoined', { roomId });
                    // Notify existing peers about the new user joining (for UI placeholder)
                    socket.broadcast.to(roomId).emit('newUserJoined', { userId, userInfo });
                    // CRITICAL: Also emit user-connected so existing peers initiate PeerJS calls
                    socket.broadcast.to(roomId).emit('user-connected', { userId });
                    console.log(`User ${userId} joined room ${roomId}`);
                }
            });

            socket.on('user-toggled-audio', (userId, roomId, isAudioEnabled) => {
                // ✅ FIX LM-4: Removed socket.join(roomId) — user is already in the room
                socket.broadcast.to(roomId).emit('user-toggled-audio', {
                    userId,
                    isAudioEnabled
                })
            })

            socket.on('user-toggled-video', (userId, roomId, isVideoEnabled) => {
                // ✅ FIX LM-4: Removed socket.join(roomId)
                socket.broadcast.to(roomId).emit('user-toggled-video', {
                    userId,
                    isVideoEnabled
                })
            })

            socket.on('user-screen-share', (userId, roomId, isScreenSharing) => {
                // ✅ FIX LM-4: Removed socket.join(roomId)
                socket.broadcast.to(roomId).emit('user-screen-share', {
                    userId,
                    isScreenSharing
                })
            })

            socket.on('user-hand-raise', (userId, roomId, isHandRaised) => {
                console.log(`User ${userId} ${isHandRaised ? 'raised' : 'lowered'} hand in room ${roomId}`);
                // ✅ FIX LM-4: Removed socket.join(roomId)
                io.to(roomId).emit('user-hand-raise', {
                    userId,
                    isHandRaised,
                    timestamp: new Date().toISOString()
                })
            })

            socket.on('chatMessage', ({ roomId, message }) => {
                // Broadcast to all in the room (including sender for group chat)
                io.to(roomId).emit('chatMessage', message)
            })

            // Handle user leaving the room
            socket.on('leave-room', (roomId, userId) => {
                socket.leave(roomId);
                socket.broadcast.to(roomId).emit('user-disconnected', {
                    userId
                });
                console.log(`User ${userId} left room ${roomId}`);
            });

            socket.on('user-speaking', (userId, roomId, isSpeaking) => {
                socket.broadcast.to(roomId).emit('user-speaking', {
                    userId,
                    isSpeaking
                })
            })

            socket.on('disconnect', () => {
                console.log(`User disconnected: ${socket.id}`)
                if (socket.roomId && socket.userId) {
                    socket.broadcast.to(socket.roomId).emit('user-disconnected', {
                        userId: socket.userId
                    })
                }
            })
        })
    } else {
        console.log("Socket server already running")
    }
    res.end()
}
export default socketHandler;