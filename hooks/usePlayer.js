import { useState, useMemo } from "react";

const usePlayer = (myId, roomId) => {
  const [players, setPlayers] = useState({});

  // ✅ FIX LM-2: Replace cloneDeep (runs every render, strips MediaStream) with useMemo.
  // ✅ FIX LM-2: Attach userId to playerHighlighted so [roomId].js can read playerHighlighted.userId.
  const { playerHighlighted, nonHighlighted } = useMemo(() => {
    const nonHighlighted = { ...players };
    const playerData = nonHighlighted[myId];
    delete nonHighlighted[myId];

    // Attach userId so consumers can reference it without knowing the key
    const playerHighlighted = playerData
      ? { ...playerData, userId: myId }
      : null;

    return { playerHighlighted, nonHighlighted };
  }, [players, myId]);

  return {
    players,
    setPlayers,
    playerHighlighted,
    nonHighlighted,
  };
};

export default usePlayer;
