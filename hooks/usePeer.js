import { useRouter } from "next/router"
import { useState, useEffect, useRef } from "react"

const usePeer = () => {
    const roomId = useRouter().query.roomId
    const [peer, setPeer] = useState(null)
    const [myId, setMyId] = useState('')
    const isPeerSet = useRef(false)

    useEffect(() => {
        // ✅ FIX CV-2: Removed socket dependency entirely.
        // usePeer now ONLY creates the Peer object and exposes myId.
        // The join-room socket emit belongs in [roomId].js, triggered by myId becoming available.
        if (isPeerSet.current || !roomId) return;
        isPeerSet.current = true;

        (async function initPeer() {
            const iceServers = [
                { urls: 'stun:stun.l.google.com:19302' },
                { urls: 'stun:stun1.l.google.com:19302' },
            ];

            if (process.env.NEXT_PUBLIC_TURN_URL) {
                iceServers.push({
                    urls: process.env.NEXT_PUBLIC_TURN_URL,
                    username: process.env.NEXT_PUBLIC_TURN_USER || '',
                    credential: process.env.NEXT_PUBLIC_TURN_CRED || '',
                });
            }

            const myPeer = new (await import('peerjs')).default(undefined, {
                config: { iceServers },
                pingInterval: 3000,
                debug: process.env.NODE_ENV === 'development' ? 2 : 0,
            });

            setPeer(myPeer)

            myPeer.on("open", (id) => {
                console.log("[PeerJS] Peer open, id:", id)
                setMyId(id)
            })

            myPeer.on("error", (err) => {
                console.error("[PeerJS] Peer error:", err.type, err)
            })

            // Store for cleanup closure
            const peerToCleanup = myPeer;

            return () => {
                console.log("[PeerJS] Destroying peer instance");
                peerToCleanup.destroy();
                setPeer(null);
                setMyId('');
            };
        })()
    }, [roomId])

    return { peer, myId };
}

export default usePeer