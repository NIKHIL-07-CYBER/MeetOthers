import { Server } from "socket.io"

const socketHandler = (req,res)=>{
    if (!res.socket.server.io){
        const io = new Server(res.socket.server, {
            cors: {
                origin: "*",
                methods: ["GET", "POST"]
            }
        })
        res.socket.server.io = io
    
        io.on('connection',(socket)=>{
            console.log("server is connected")
        })
    } else {
        console.log("server already running")
    }
    res.end()
}
export default socketHandler;