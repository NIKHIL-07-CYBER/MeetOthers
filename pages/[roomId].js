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
    return () => peer.off("call", handleCall);
  }, [peer, setPlayers]);

  // Room creation/join logic
  useEffect(() => {
    if (!socket || !myId || !roomId) return;
    socket.emit("createRoom", { roomId, userId: myId, userInfo: { name: `User ${myId.slice(0, 6)}` } });

    const handleRoomExists = () => {
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
  }, [socket, myId, roomId, setPlayers]);

  // Keep streamRef in sync with stream state
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
        muted: !isAudioEnabled,
        playing: isVideoEnabled,
        isHandRaised: false,
      },
    }));
  }, [myId, setPlayers, stream, isVideoEnabled, isAudioEnabled]);

  // Control handlers
  const handleToggleVideo = async () => {
    const newStream = await mediaToggleVideo();
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

    socket?.emit("user-toggled-video", myId, roomId, nowEnabled);

    const newVideoTrack = newStream?.getVideoTracks()[0] ?? null;
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
            console.warn("[replaceTrack] video:", e);
          }
        }
      })
    );
  };

  const handleToggleAudio = () => {
    mediaToggleAudio();
  };

  useEffect(() => {
    if (!myId || !roomId) return;
    setPlayers((prev) => ({
      ...prev,
      [myId]: {
        ...(prev[myId] || {}),
        muted: !isAudioEnabled,
        url: streamRef.current,
      },
    }));
    socket?.emit("user-toggled-audio", myId, roomId, isAudioEnabled);
  }, [isAudioEnabled, myId, roomId, socket]);

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
    socket?.emit("user-hand-raise", myId, roomId, !isHandRaised);
  };

  const handleToggleScreenShare = async () => {
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
      <div className="flex flex-col h-screen bg-black overflow-hidden pt-16 relative">
        {/* Main Workspace Area (Videos + Sidebars Overlay) */}
        <div className="flex flex-1 relative overflow-hidden">

          {/* Video Content Area */}
          <div className={`flex-1 flex flex-col lg:flex-row transition-all duration-300 p-4 gap-4 overflow-hidden ${(isChatOpen || isParticipantsOpen) ? 'lg:mr-80' : ''
            }`}>

            {/* Primary/Highlighted Player Container */}
            <m.div
              className="flex-1 min-h-[50%] lg:min-h-0 relative rounded-2xl overflow-hidden bg-gray-900 shadow-2xl"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
            >
              {playerHighlighted ? (
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
              ) : (
                <VideoSkeleton isActive={true} />
              )}
            </m.div>

            {/* Secondary Players Grid/Scroll */}
            <m.div
              className={`
                flex gap-4 overflow-x-auto lg:overflow-y-auto lg:flex-col
                ${Object.keys(nonHighlighted).length > 0 ? 'h-1/3 lg:h-auto lg:w-80 min-h-[140px]' : 'h-0 lg:w-0'}
                transition-all duration-300 scrollbar-hide lg:scrollbar-default
              `}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
            >
              {Object.keys(nonHighlighted).map((playerId, index) => (
                <m.div
                  key={playerId}
                  className="relative flex-shrink-0 w-48 lg:w-full aspect-video rounded-xl overflow-hidden bg-gray-800 shadow-lg"
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
              ))}
            </m.div>
          </div>

          {/* Sidebar Overlays (Mobile: Full-screen, Desktop: Side-panel) */}
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
        </div>

        {/* Controls Toolbar Overlay */}
        <div className="absolute bottom-6 left-0 right-0 flex justify-center px-4 pointer-events-none">
          <div className={`pointer-events-auto transition-all duration-300 ${(isChatOpen || isParticipantsOpen) ? 'lg:mr-80' : ''}`}>
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
        </div>
      </div>
    </LazyMotion>
  );
};

export default Room;
