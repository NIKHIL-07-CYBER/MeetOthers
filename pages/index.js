import { useSocket } from "../context/socket"
import { useEffect } from "react"

export default function Home() {
  const socket = useSocket()

  useEffect(()=>{
    socket?.on("connect",()=>{
      console.log("server connected") // Log '1' on connect
      console.log(socket.id)
    });
    // Clean up listener
    return () => {
      socket?.off("connect")
    }
  },[socket])

  return (
    <main>
      <h1>Welcome to the  App</h1>
      {/* Show socket id if connected */}
      {socket?.connected && <p>Socket ID: {socket.id}</p>}
      {!socket?.connected && <p>Socket not connected</p>}
    </main>
  )
}
