import { Server } from "socket.io"

const allowedOrigins = [
  "http://localhost:3000", // local dev
  "https://meetothers.onrender.com", // production frontend
];

const socketHandler = (req,res)=>{
    if (!res.socket.server.io){
        const io = new Server(res.socket.server, {
            cors: {
                origin: allowedOrigins,
                methods: ["GET", "POST"]
            },
            transports: ["websocket", "polling"],
            path: "/api/socket" // Explicitly set socket.io path for Next.js API route
        })
        res.socket.server.io = io
    
        io.on('connection',(socket)=>{
            console.log(`User connected: ${socket.id}`)
            
            socket.on('join-room',(roomId,userId,userInfo)=>{
                console.log(`User ${userId} joined room ${roomId}`)
                socket.join(roomId)
                socket.userId = userId
                socket.roomId = roomId
                
                // Get current room participants before broadcasting
                const roomSockets = io.sockets.adapter.rooms.get(roomId)
                const existingParticipants = []
                
                if (roomSockets) {
                    roomSockets.forEach(socketId => {
                        const participantSocket = io.sockets.sockets.get(socketId)
                        if (participantSocket?.userId && participantSocket.userId !== userId) {
                            existingParticipants.push({
                                userId: participantSocket.userId,
                                userInfo: { name: `User ${participantSocket.userId.slice(0, 6)}` }
                            })
                        }
                    })
                }
                
                // Broadcast new user to existing participants
                socket.broadcast.to(roomId).emit('user-connected', {
                    userId,
                    userInfo: userInfo || { name: `User ${userId.slice(0, 6)}` }
                })
                
                // Send existing participants to new user
                existingParticipants.forEach(participant => {
                    socket.emit('user-connected', participant)
                })
                
                console.log(`Room ${roomId} now has ${(roomSockets?.size || 0)} participants`)
            })
            
            socket.on('user-toggled-audio',(userId,roomId,isAudioEnabled)=>{
                socket.join(roomId)
                socket.broadcast.to(roomId).emit('user-toggled-audio', {
                    userId,
                    isAudioEnabled
                })
            })
            
            socket.on('user-toggled-video',(userId,roomId,isVideoEnabled)=>{
                socket.join(roomId)
                socket.broadcast.to(roomId).emit('user-toggled-video', {
                    userId,
                    isVideoEnabled
                })
            })
            
            socket.on('user-screen-share',(userId,roomId,isScreenSharing)=>{
                socket.join(roomId)
                socket.broadcast.to(roomId).emit('user-screen-share', {
                    userId,
                    isScreenSharing
                })
            })
            
            socket.on('user-hand-raise',(userId,roomId,isHandRaised)=>{
                console.log(`User ${userId} ${isHandRaised ? 'raised' : 'lowered'} hand in room ${roomId}`);
                socket.join(roomId)
                // Broadcast to all in the room (including sender for UI update)
                io.to(roomId).emit('user-hand-raise', {
                    userId,
                    isHandRaised,
                    timestamp: new Date().toISOString()
                })
            })
            
            socket.on('chat-message',(roomId,message)=>{
                // Broadcast to all in the room (including sender for group chat)
                io.to(roomId).emit('chat-message', message)
            })

            // Handle user leaving the room
            socket.on('leave-room', (roomId, userId) => {
                socket.leave(roomId);
                socket.broadcast.to(roomId).emit('user-disconnected', {
                    userId
                });
                console.log(`User ${userId} left room ${roomId}`);
            });
            
            socket.on('user-speaking',(userId,roomId,isSpeaking)=>{
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