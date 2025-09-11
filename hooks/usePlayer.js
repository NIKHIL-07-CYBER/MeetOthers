import { cloneDeep } from "lodash";
import { useState } from "react";
import { useSocket } from "@/context/socket";

const usePlayer = (myId, roomId) => {
  const socket = useSocket();
  const [players, setPlayers] = useState({});
  const playersCopy = cloneDeep(players);

  // Pick my own stream separately (highlighted), rest are "nonHighlighted"
  const playerHighlighted = playersCopy[myId];
  delete playersCopy[myId];
  const nonHighlighted = playersCopy;

  const toggleAudio = () => {
    console.log(`user ${myId} toggled the Audio`);
    setPlayers((prev) => {
      const current = prev[myId];
      if (!current) return prev;

      const newMuted = !current.muted;

      // 🔑 Toggle actual audio tracks
      const audioTracks = current.url?.getAudioTracks?.();
      if (audioTracks && audioTracks.length > 0) {
        audioTracks.forEach((track) => {
          track.enabled = !newMuted;
        });
      }

      return {
        ...prev,
        [myId]: {
          ...current,
          muted: newMuted,
        },
      };
    });

    // notify others
    socket.emit("user-toggled-audio", myId, roomId);
  };

  const toggleVideo = async (newStream) => {
    console.log(`user ${myId} toggled the Video`);
    
    let newPlaying;
    setPlayers((prev) => {
      const current = prev[myId];
      if (!current) return prev;

      newPlaying = !current.playing;

      return {
        ...prev,
        [myId]: {
          ...current,
          playing: newPlaying,
          url: newStream || current.url, // Update with new stream if provided
        },
      };
    });
    
    // Return the new playing state for peer connection updates
    return newPlaying;
  };

  return {
    players,
    setPlayers,
    playerHighlighted,
    nonHighlighted,
    toggleAudio,
    toggleVideo,
  };
};

export default usePlayer;
