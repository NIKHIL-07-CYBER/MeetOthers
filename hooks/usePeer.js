import { useSocket } from "@/context/socket"
import { useRouter } from "next/router"
import { useState,useEffect,useRef } from "react"

const usePeer = () =>{
    const socket = useSocket();
    const roomId = useRouter().query.roomId;
    const [peer,setPeer] = useState(null)
    const [myId,setMyId] = useState('')
    const isPeerSet = useRef(false)

    useEffect(()=>{
        if (isPeerSet.current || !roomId || !socket)return;
        else isPeerSet.current=true;
        (async function initPeer(){
            const myPeer = new (await import('peerjs')).default()
            setPeer(myPeer)

            myPeer.on("open",(id)=>{
                setMyId(id)
                socket?.emit('join-room',roomId,id)
                console.log("your peer id is : ",id," and you roomId is : ",roomId)
            })
        })()
    },[roomId,socket])
    
    return { peer, myId };
}

export default usePeer