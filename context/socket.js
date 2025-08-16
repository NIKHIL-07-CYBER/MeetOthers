import { useEffect,useState,createContext,useContext } from "react"
import { io }  from "socket.io-client"

const socketContext = createContext(null)

export const useSocket = () =>{
    const socket = useContext(socketContext)
    return socket
}

export const SocketProvider = (props)=>{
    const {children} = props
    const [socket,setSocket] = useState(null)

    useEffect(()=>{
        // Connect to the default path
        const connection = io()
        setSocket(connection)

        connection.on("connect_error",async (err)=>{
            console.log("error on connecting error",err)
            // Optionally trigger the API route to ensure server is started
            await fetch('/api/socket')
        })

        return () => {
            connection.off("connect_error")
            connection.disconnect()
        }
    },[])

    return (
        <socketContext.Provider value={socket}>
            {children}
        </socketContext.Provider>
    )
}