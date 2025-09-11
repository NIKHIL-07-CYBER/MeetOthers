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
import { clone, cloneDeep } from "lodash";
import { useRouter } from "next/router";
import { motion } from "framer-motion";
import ParticleBackground from "@/components/ParticleBackground";

const Room = () => {
  const socket = useSocket();
  const { roomId } = useRouter().query;
  const { peer, myId } = usePeer();
  const { 
    stream, 
    isVideoEnabled, 
    isAudioEnabled, 
    isScreenSharing, 
    toggleVideo, 
    toggleAudio, 
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

  // Handle when a new user connects
  useEffect(() => {
    if (!socket) return;

    const handleUserConnected = (data) => {
      const newUser = data.userId || data;
      console.log("user connected:", newUser, data);

      // Add user to players list immediately
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

      // Delay peer connection to ensure both sides are ready
      setTimeout(() => {
        if (peer && stream) {
          console.log("Initiating call to:", newUser);
          const call = peer.call(newUser, stream);
          
          // Store the call for track replacement
          peerConnections.current[newUser] = call;

          call.on("stream", (remoteStream) => {
            console.log("Received stream from user:", newUser, remoteStream);
            setPlayers((prev) => ({
              ...prev,
              [newUser]: {
                ...prev[newUser],
                url: remoteStream,
                playing: true,
              },
            }));
          });

          call.on("close", () => {
            console.log("Call closed with:", newUser);
            delete peerConnections.current[newUser];
          });

          call.on("error", (error) => {
            console.error("Call error with:", newUser, error);
          });
        }
      }, 1000);
    };

    socket.on("user-connected", handleUserConnected);
    return () => socket.off("user-connected", handleUserConnected);
  }, [peer, socket, stream, setPlayers]);

  // Handle incoming calls
  useEffect(() => {
    if (!peer) return;

    peer.on("call", (call) => {
      const { peer: callerId } = call;
      console.log("Incoming call from:", callerId);
      call.answer(stream);
      
      // Store the call for track replacement
      peerConnections.current[callerId] = call;

      call.on("stream", (incomingStream) => {
        console.log("incoming stream from:", callerId, incomingStream);
        setPlayers((prev) => ({
          ...prev,
          [callerId]: {
            ...prev[callerId],
            url: incomingStream,
            muted: false,
            playing: true,
            isHandRaised: false,
          },
        }));
      });

      call.on("close", () => {
        delete peerConnections.current[callerId];
      });
    });
  }, [peer, stream, setPlayers]);

  // Join room on component mount
  useEffect(() => {
    if (!socket || !peer || !myId || !roomId) return;
    
    console.log("joining room:", roomId, "with peer:", myId);
    socket.emit("join-room", roomId, myId, {
      name: `User ${myId.slice(0, 6)}`,
      isVideoOn: isVideoEnabled,
      isAudioOn: isAudioEnabled
    });

    // Listen for room participants update
    const handleRoomParticipants = (participants) => {
      console.log("Received room participants:", participants);
      participants.forEach(participant => {
        if (participant.userId !== myId) {
          setPlayers((prev) => ({
            ...prev,
            [participant.userId]: {
              url: null,
              muted: false,
              playing: false,
              isHandRaised: false,
              name: participant.userInfo?.name || `User ${participant.userId.slice(0, 6)}`,
            },
          }));
        }
      });
    };

    socket.on("room-participants", handleRoomParticipants);
    
    return () => {
      socket.off("room-participants", handleRoomParticipants);
    };
  }, [socket, peer, myId, roomId, isVideoEnabled, isAudioEnabled, setPlayers]);

  // Set my own local stream
  useEffect(() => {
    if (!stream || !myId) return;
    console.log("setting my stream:", myId);
    setPlayers((prev) => ({
      ...prev,
      [myId]: {
        url: stream,
        muted: true, // mute our own video
        playing: isVideoEnabled,
        isHandRaised: false,
      },
    }));
  }, [myId, setPlayers, stream, isVideoEnabled]);

  // Store peer connections for track replacement
  const peerConnections = useRef({});

  // Control handlers
  const handleToggleVideo = async () => {
    console.log("Toggle video clicked, current state:", isVideoEnabled);
    
    // Call the media stream toggle function
    const newStream = await toggleVideo();
    
    // Emit socket event for real-time sync
    socket?.emit("user-toggled-video", myId, roomId, !isVideoEnabled);
    
    if (newStream && !isVideoEnabled) {
      // Update all peer connections with new video track when enabling video
      Object.values(peerConnections.current).forEach(async (call) => {
        if (call && call.peerConnection) {
          const sender = call.peerConnection.getSenders().find(s => 
            s.track && s.track.kind === 'video'
          );
          const newVideoTrack = newStream.getVideoTracks()[0];
          if (sender && newVideoTrack) {
            await sender.replaceTrack(newVideoTrack);
          }
        }
      });
    }
  };

  const handleToggleAudio = () => {
    toggleAudio();
    // Emit socket event for real-time sync
    socket?.emit("user-toggled-audio", myId, roomId, isAudioEnabled);
  };

  const handleToggleHandRaise = () => {
    setIsHandRaised(!isHandRaised);
    // Emit socket event for real-time sync
    socket?.emit("user-hand-raise", myId, roomId, !isHandRaised);
  };

  const handleToggleScreenShare = () => {
    if (isScreenSharing) {
      stopScreenShare();
    } else {
      startScreenShare();
    }
  };

  const handleEndCall = () => {
    window.location.href = '/';
  };

  const handleSettings = () => {
    console.log('Opening settings...');
  };

  return (
    <>
      <ParticleBackground />
      
      <Navbar 
        roomId={roomId}
        participantCount={participants.length}
        meetingDuration={meetingDuration}
      />

      {/* Main video area */}
      <div className={`pt-16 pb-32 px-4 transition-all duration-300 ${isChatOpen || isParticipantsOpen ? 'mr-80' : ''}`}>
        {/* Big active player */}
        <motion.div 
          className={styles.activePlayerContainer}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          {playerHighlighted && (
            <div className={styles.videoFrame}>
                <Player
                  stream={playerHighlighted.url}
                  muted={playerHighlighted.muted}
                  playing={playerHighlighted.playing}
                  isLocal={playerHighlighted.userId === myId}
                  userId={playerHighlighted.userId}
                  userName={`User ${playerHighlighted.userId?.slice(0, 6) || 'Unknown'}`}
                  connectionQuality="good"
                  isSpeaking={false}
                  isHandRaised={playerHighlighted.isHandRaised || (playerHighlighted.userId === myId && isHandRaised)}
                  isActive={true}
                />
            </div>
          )}
        </motion.div>

        {/* Small inactive players */}
        <motion.div 
          className={`${styles.inActivePlayerContainer} ${isChatOpen || isParticipantsOpen ? 'right-96' : ''}`}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          {Object.keys(nonHighlighted).map((playerId, index) => {
            const { url, muted, playing, name } = nonHighlighted[playerId];
            return (
              <motion.div 
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
                  userName={`User ${playerId.slice(0, 6)}`}
                  userId={playerId}
                  connectionQuality="good"
                  isSpeaking={false}
                  isHandRaised={nonHighlighted[playerId].isHandRaised || (playerId === myId && isHandRaised)}
                />
              </motion.div>
            );
          })}
        </motion.div>
      </div>

      <div className={`fixed bottom-0 left-0 z-50 transition-all duration-300 ${isChatOpen || isParticipantsOpen ? 'right-80' : 'right-0'}`}>
        <Controls
          muted={!isAudioEnabled}
          playing={isVideoEnabled}
          toggleAudio={handleToggleAudio}
          toggleVideo={handleToggleVideo}
          leaveCall={handleEndCall}
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
      />

      <ParticipantList
        isOpen={isParticipantsOpen}
        onClose={() => setIsParticipantsOpen(false)}
        participants={participants}
        currentUserId={myId}
        isHost={true}
      />
    </>
  );
};

export default Room;
