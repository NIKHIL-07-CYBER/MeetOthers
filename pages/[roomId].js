import { useSocket } from "../context/socket";
import { useEffect, useState, useRef } from "react";
import usePeer from "../hooks/usePeer";
import useMediaStream from "@/hooks/useMediaStream";
import usePlayer from "@/hooks/usePlayer";
import Player from "@/components/Player";
import styles from "@/styles/room.module.css";
import Controls from "@/components/Controls";
import Navbar from "@/components/Navbar";
import ChatSidebar from "@/components/ChatSidebar";
import ParticipantList from "@/components/ParticipantList";
import { cloneDeep } from "lodash";
import { useRouter } from "next/router";
import { LazyMotion, domMax, m } from "framer-motion";
import ParticleBackground from "@/components/ParticleBackground";

const VideoSkeleton = ({ isActive }) => (
  <div className={`${styles.videoFrame} ${isActive ? 'h-full w-full' : 'h-48 w-full'} flex items-center justify-center bg-gray-900/50 animate-pulse`}>
    <div className="flex flex-col items-center gap-4">
      <div className={`${isActive ? 'w-24 h-24' : 'w-12 h-12'} bg-gray-700/50 rounded-full`}></div>
      <div className={`${isActive ? 'w-48 h-6' : 'w-24 h-3'} bg-gray-700/50 rounded-lg`}></div>
    </div>
  </div>
);

const Room = () => {
  const socket = useSocket();
  const { roomId } = useRouter().query;
  const { peer, myId } = usePeer();
  const {
    stream,
    isVideoEnabled,
    isAudioEnabled,
    isScreenSharing,
    toggleVideo: mediaToggleVideo,
    toggleAudio: mediaToggleAudio,
    startScreenShare,
    stopScreenShare
  } = useMediaStream();
  const {
    players,
    setPlayers,
    playerHighlighted,
    nonHighlighted,
  } = usePlayer(myId, roomId);

  // UI State
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isParticipantsOpen, setIsParticipantsOpen] = useState(false);
  const [isHandRaised, setIsHandRaised] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [meetingDuration, setMeetingDuration] = useState("00:00");
  const [meetingStartTime] = useState(Date.now());
  const [chatMessages, setChatMessages] = useState([]);

  // ✅ FIX CV-1: peerConnections MUST be declared before any useEffect that references it.
  const peerConnections = useRef({});

  // ✅ FIX BUG-2: streamRef always holds the latest stream so the peer.on("call")
  // handler — which is registered once on peer open — can answer with the current
  // stream even if it was null at the time the handler was first created.
  const streamRef = useRef(null);

  // Meeting timer
  useEffect(() => {
    const timer = setInterval(() => {
      const elapsed = Date.now() - meetingStartTime;
      const minutes = Math.floor(elapsed / 60000);
      const seconds = Math.floor((elapsed % 60000) / 1000);
      setMeetingDuration(`${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`);
    }, 1000);

    return () => clearInterval(timer);
  }, [meetingStartTime]);

  // Convert players to participant format
  const participants = Object.keys(players).map(playerId => ({
    id: playerId,
    name: players[playerId].name || `User ${playerId.slice(0, 6)}`,
    isMuted: players[playerId].muted,
    isVideoOn: players[playerId].playing,
    isHost: playerId === myId, // For demo, current user is host
    connectionQuality: 'good',
    isSpeaking: players[playerId].isSpeaking,
    isHandRaised: players[playerId].isHandRaised
  }));

  useEffect(() => {
    if (!socket) return;

    const handleUserToggleAudio = ({ userId, isAudioEnabled }) => {
      setPlayers((prev) => ({
        ...prev,
        [userId]: {
          ...prev[userId],
          muted: !isAudioEnabled,
        },
      }));
    };

    const handleUserToggleVideo = ({ userId, isVideoEnabled }) => {
      setPlayers((prev) => ({
        ...prev,
        [userId]: {
          ...prev[userId],
          playing: isVideoEnabled,
        },
      }));
    };

    const handleUserHandRaise = ({ userId, isHandRaised }) => {
      setPlayers((prev) => ({
        ...prev,
        [userId]: {
          ...prev[userId],
          isHandRaised: isHandRaised,
        },
      }));
    };

    const handleUserDisconnected = ({ userId }) => {
      setPlayers((prev) => {
        const newPlayers = { ...prev };
        delete newPlayers[userId];
        return newPlayers;
      });
      delete peerConnections.current[userId];
    };

    socket.on("user-toggled-audio", handleUserToggleAudio);
    socket.on("user-toggled-video", handleUserToggleVideo);
    socket.on("user-hand-raise", handleUserHandRaise);
    socket.on("user-disconnected", handleUserDisconnected);

    return () => {
      socket.off("user-toggled-audio", handleUserToggleAudio);
      socket.off("user-toggled-video", handleUserToggleVideo);
      socket.off("user-hand-raise", handleUserHandRaise);
      socket.off("user-disconnected", handleUserDisconnected);
    };
  }, [socket, setPlayers]);

  // Handle when a new user connects (existing user calls the newcomer)
  useEffect(() => {
    if (!socket || !peer || !stream) return;

    const handleUserConnected = (data) => {
      const newUser = data.userId || data;
      // ✅ FIX CV-2: Removed setTimeout hack. Call immediately.
      // The race condition is solved at the source: usePeer no longer emits join-room,
      // so the only join signal is joinRoom → newUserJoined → user-connected, which
      // fires AFTER [roomId].js's room join useEffect has already set up all listeners.
      const call = peer.call(newUser, stream);
      if (!call) return;
      peerConnections.current[newUser] = call;

      call.on("stream", (remoteStream) => {
        setPlayers((prev) => ({
          ...prev,
          [newUser]: {
            ...(prev[newUser] || {}),
            url: remoteStream,
            playing: remoteStream.getVideoTracks().length > 0 &&
              (remoteStream.getVideoTracks()[0]?.enabled ?? true),
            muted: false,
          },
        }));
      });

      call.on("close", () => { delete peerConnections.current[newUser]; });
      call.on("error", (error) => console.error("[PeerJS] Call error with:", newUser, error));
    };

    socket.on("user-connected", handleUserConnected);
    return () => socket.off("user-connected", handleUserConnected);
  }, [peer, socket, stream, setPlayers]);

  // Handle incoming calls
  useEffect(() => {
    if (!peer) return;

    // ✅ FIX BUG-2: Use streamRef.current (not the closed-over `stream` value) so
    // this handler — registered once when `peer` is ready — always answers with the
    // latest stream even if getUserMedia resolved after peer.on("call") was registered.
    const handleCall = (call) => {
      const { peer: callerId } = call;
      call.answer(streamRef.current);  // always latest, never stale null
      peerConnections.current[callerId] = call;

      call.on("stream", (incomingStream) => {
        setPlayers((prev) => ({
          ...prev,
          [callerId]: {
            ...(prev[callerId] || {}),
            url: incomingStream,
            playing: incomingStream.getVideoTracks().length > 0,
            muted: false,
            isHandRaised: false,
          },
        }));
      });

      call.on("close", () => {
        delete peerConnections.current[callerId];
      });
    };

    peer.on("call", handleCall);
    // ✅ FIX BUG-2: `stream` removed from deps — streamRef.current provides live value.
    // Only re-register when `peer` itself changes (e.g. reconnect).
    return () => peer.off("call", handleCall);
  }, [peer, setPlayers]);

  // Room creation/join logic
  // ✅ FIX CV-2: Triggered by myId (PeerJS open event), NOT peer object.
  // usePeer no longer emits join-room, so this is now the single authoritative join flow.
  useEffect(() => {
    if (!socket || !myId || !roomId) return;
    // Try to create room first
    socket.emit("createRoom", { roomId, userId: myId, userInfo: { name: `User ${myId.slice(0, 6)}` } });

    const handleRoomExists = () => {
      // Room exists, so join it
      socket.emit("joinRoom", { roomId, userId: myId, userInfo: { name: `User ${myId.slice(0, 6)}` } });
    };
    const handleNoSuchRoom = () => alert("Room does not exist.");
    const handleNewUserJoined = (data) => {
      const newUser = data.userId;
      setPlayers((prev) => ({
        ...prev,
        [newUser]: {
          url: null,
          muted: false,
          playing: false,
          isHandRaised: false,
          name: data.userInfo?.name || `User ${newUser.slice(0, 6)}`,
        },
      }));
    };

    socket.on("roomExists", handleRoomExists);
    socket.on("roomCreated", () => { });
    socket.on("roomJoined", () => { });
    socket.on("noSuchRoom", handleNoSuchRoom);
    socket.on("newUserJoined", handleNewUserJoined);

    return () => {
      socket.off("roomExists", handleRoomExists);
      socket.off("roomCreated");
      socket.off("roomJoined");
      socket.off("noSuchRoom", handleNoSuchRoom);
      socket.off("newUserJoined", handleNewUserJoined);
    };
    // ✅ FIX CV-2: `peer` removed from deps — myId only becomes truthy after PeerJS open
  }, [socket, myId, roomId, setPlayers]);

  // Keep streamRef in sync with stream state so peer.on("call") always has the latest.
  useEffect(() => {
    streamRef.current = stream;
  }, [stream]);

  // Set my own local stream
  useEffect(() => {
    if (!stream || !myId) return;
    setPlayers((prev) => ({
      ...prev,
      [myId]: {
        ...(prev[myId] || {}),
        url: stream,
        muted: !isAudioEnabled, // reflects actual mic state
        playing: isVideoEnabled,
        isHandRaised: false,
      },
    }));
  }, [myId, setPlayers, stream, isVideoEnabled, isAudioEnabled]);

  // (peerConnections ref is declared at the top of the component — see line ~42)

  // Control handlers
  const handleToggleVideo = async () => {
    const newStream = await mediaToggleVideo();

    // ✅ FIX CV-3: Derive truth from the returned stream, NOT the stale isVideoEnabled closure.
    // isVideoEnabled is the value from the last render, not the new value after the async toggle.
    const nowEnabled = newStream
      ? newStream.getVideoTracks().length > 0 &&
      (newStream.getVideoTracks()[0]?.enabled ?? false)
      : false;

    setPlayers((prev) => ({
      ...prev,
      [myId]: {
        ...(prev[myId] || {}),
        url: newStream || stream,
        playing: nowEnabled,
        muted: !isAudioEnabled,
      },
    }));

    // ✅ FIX CV-3: Emit derived truth, not stale !isVideoEnabled
    socket?.emit("user-toggled-video", myId, roomId, nowEnabled);

    // ✅ FIX LM-1: Replace track in all peer connections using the new stream
    const newVideoTrack = newStream?.getVideoTracks()[0] ?? null;
    await Promise.all(
      Object.values(peerConnections.current).map(async (call) => {
        if (!call?.peerConnection) return;
        const sender = call.peerConnection
          .getSenders()
          .find((s) => s.track?.kind === "video");
        if (sender) {
          try {
            // replaceTrack(null when disabled) = sends black frame, keeps sender alive
            await sender.replaceTrack(newVideoTrack);
          } catch (e) {
            console.warn("[replaceTrack] video:", e);
          }
        }
      })
    );
  };

  const handleToggleAudio = () => {
    mediaToggleAudio();
  };

  // ✅ FIX: Consolidate Mic Toggle Sync & Emission
  // instead of manual updates in the handler, we react to the hook's state
  useEffect(() => {
    if (!myId || !roomId) return;

    // Sync local players state (for icons/list)
    setPlayers((prev) => ({
      ...prev,
      [myId]: {
        ...(prev[myId] || {}),
        muted: !isAudioEnabled,
        url: streamRef.current,
      },
    }));

    // Emit to others only if socket is alive
    socket?.emit("user-toggled-audio", myId, roomId, isAudioEnabled);

    console.log(`[Audio Event] Mic is now: ${isAudioEnabled ? "ON" : "OFF"}`);
  }, [isAudioEnabled, myId, roomId, socket]);

  // Sync video state similarly for consistency
  useEffect(() => {
    if (!myId || !roomId) return;
    setPlayers((prev) => ({
      ...prev,
      [myId]: {
        ...(prev[myId] || {}),
        playing: isVideoEnabled,
        url: streamRef.current,
      },
    }));
    socket?.emit("user-toggled-video", myId, roomId, isVideoEnabled);
  }, [isVideoEnabled, myId, roomId, socket]);

  // Chat logic
  const handleSendMessage = (msg) => {
    if (!msg.trim()) return;
    socket.emit("chatMessage", {
      roomId,
      message: {
        userId: myId,
        userName: players[myId]?.name || `User ${myId.slice(0, 6)}`,
        text: msg,
        type: 'text',
        timestamp: new Date().toISOString()
      }
    });
  };

  useEffect(() => {
    if (!socket) return;
    const onChatMessage = (message) => {
      setChatMessages((prev) => [...prev, message]);
    };
    socket.on("chatMessage", onChatMessage);
    return () => socket.off("chatMessage", onChatMessage);
  }, [socket]);

  const handleToggleHandRaise = () => {
    setIsHandRaised(!isHandRaised);
    // Emit socket event for real-time sync
    socket?.emit("user-hand-raise", myId, roomId, !isHandRaised);
  };

  const handleToggleScreenShare = async () => {
    // ✅ FIX CV-5: Screen share now replaces the video track in ALL peer connections.
    const newStream = isScreenSharing
      ? await stopScreenShare()
      : await startScreenShare();

    if (!newStream) return;

    const newVideoTrack = newStream.getVideoTracks()[0] ?? null;
    await Promise.all(
      Object.values(peerConnections.current).map(async (call) => {
        if (!call?.peerConnection) return;
        const sender = call.peerConnection
          .getSenders()
          .find((s) => s.track?.kind === "video");
        if (sender) {
          try {
            await sender.replaceTrack(newVideoTrack);
          } catch (e) {
            console.warn("[replaceTrack] screen:", e);
          }
        }
      })
    );
    socket?.emit("user-screen-share", myId, roomId, !isScreenSharing);
  };

  const handleEndCall = () => {
    window.location.href = '/';
  };

  const handleSettings = () => {
    console.log('Opening settings...');
  };

  return (
    <LazyMotion features={domMax}>
      <ParticleBackground />
      <Navbar
        roomId={roomId}
        participantCount={participants.length}
        meetingDuration={meetingDuration}
      />
      <div className={`pt-16 pb-32 px-4 transition-all duration-300 ${isChatOpen || isParticipantsOpen ? 'mr-80' : ''}`} id="main-content">
        {/* Big active player */}
        <m.div
          className={styles.activePlayerContainer}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          {playerHighlighted ? (
            <div className={styles.videoFrame}>
              <Player
                stream={playerHighlighted.url}
                muted={playerHighlighted.muted}
                playing={playerHighlighted.playing}
                isLocal={playerHighlighted.userId === myId}
                userId={playerHighlighted.userId}
                userName={players[playerHighlighted.userId]?.name || `User ${playerHighlighted.userId?.slice(0, 6) || 'Unknown'}`}
                connectionQuality="good"
                isSpeaking={false}
                isHandRaised={playerHighlighted.isHandRaised || (playerHighlighted.userId === myId && isHandRaised)}
                isActive={true}
              />
            </div>
          ) : (
            <VideoSkeleton isActive={true} />
          )}
        </m.div>

        {/* Small inactive players */}
        <m.div
          className={`${styles.inActivePlayerContainer} ${isChatOpen || isParticipantsOpen ? 'right-96' : ''}`}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          {Object.keys(nonHighlighted).length > 0 ? (
            Object.keys(nonHighlighted).map((playerId, index) => {
              const { url, muted, playing, name } = nonHighlighted[playerId];
              return (
                <m.div
                  key={playerId}
                  className={styles.videoFrame}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 + index * 0.1 }}
                  layout
                >
                  <Player
                    stream={nonHighlighted[playerId].url}
                    muted={nonHighlighted[playerId].muted}
                    playing={nonHighlighted[playerId].playing}
                    isActive={false}
                    userName={nonHighlighted[playerId].name || `User ${playerId.slice(0, 6)}`}
                    userId={playerId}
                    connectionQuality="good"
                    isSpeaking={false}
                    isHandRaised={nonHighlighted[playerId].isHandRaised || (playerId === myId && isHandRaised)}
                  />
                </m.div>
              );
            })
          ) : (
            // ✅ FIX BUG-4: No skeleton fallback here — nonHighlighted being empty just
            // means you're alone. Showing skeletons would mask real connected users
            // who have url:null while their stream is still loading.
            <div className="flex items-center justify-center h-48 text-gray-500 text-sm">
              Waiting for others to join...
            </div>
          )}
        </m.div>
      </div>
      {/* Controls bar — shifts its right boundary so the pill stays centered in the available space */}
      <div
        className={`fixed bottom-0 left-0 z-50 flex justify-center items-end pb-6 transition-all duration-300 ${isChatOpen || isParticipantsOpen ? 'right-80' : 'right-0'}`}
      >
        <Controls
          muted={!isAudioEnabled}
          playing={isVideoEnabled}
          toggleAudio={handleToggleAudio}
          toggleVideo={handleToggleVideo}
          onEndCall={handleEndCall}
          toggleScreenShare={handleToggleScreenShare}
          isScreenSharing={isScreenSharing}
          isHandRaised={isHandRaised}
          toggleHandRaise={handleToggleHandRaise}
          toggleChat={() => setIsChatOpen(!isChatOpen)}
          toggleParticipants={() => setIsParticipantsOpen(!isParticipantsOpen)}
          isChatOpen={isChatOpen}
          isParticipantsOpen={isParticipantsOpen}
          isRecording={isRecording}
          toggleRecording={() => setIsRecording(!isRecording)}
          onSettings={handleSettings}
        />
      </div>
      <ChatSidebar
        isOpen={isChatOpen}
        onClose={() => setIsChatOpen(false)}
        roomId={roomId}
        messages={chatMessages}
        onSendMessage={handleSendMessage}
        currentUserId={myId}
      />
      <ParticipantList
        isOpen={isParticipantsOpen}
        onClose={() => setIsParticipantsOpen(false)}
        participants={participants}
        currentUserId={myId}
        isHost={true}
      />
    </LazyMotion>
  );
};

export default Room;
