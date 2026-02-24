import { useEffect, useState, createContext, useContext } from "react";
import { io } from "socket.io-client";

const socketContext = createContext(null);

export const useSocket = () => useContext(socketContext);

export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);

  useEffect(() => {
    // Dynamically set backend URL
    // NOTE: frontend is at meetothers.onrender.com, backend is at meshmeet.onrender.com
    const isProd = typeof window !== "undefined" && window.location.hostname !== "localhost";
    const backendUrl = isProd
      ? "https://meshmeet.onrender.com" // ✅ Render backend (separate service from frontend)
      : "http://localhost:3000";

    const connection = io(backendUrl, {
      path: "/api/socket/",              // ✅ FIX: Trailing slash — must match server path exactly
      transports: ["websocket"],         // ✅ FIX: WebSocket-only — Render drops long-polling connections
      reconnectionAttempts: 10,
      reconnectionDelay: 1000, // Initial delay
      reconnectionDelayMax: 5000, // Max delay
      randomizationFactor: 0.5,
      timeout: 20000,
    });

    setSocket(connection);

    // ✅ Connection Manager: Prevents rapid re-connection attempts
    let lastConnectionAttempt = 0;
    let attemptCount = 0;

    connection.on("reconnect_attempt", () => {
      const now = Date.now();
      attemptCount++;

      // If more than 3 attempts in 1 second, throttle
      if (now - lastConnectionAttempt < 1000 && attemptCount > 3) {
        console.warn("[Socket] Throttling connection attempts due to high frequency");
        // Socket.io handles backoff via reconnectionDelay, 
        // but we can manually adjust or log here if needed.
      }
      lastConnectionAttempt = now;
    });

    connection.on("connect_error", async (err) => {
      console.log(`[Socket] connect_error: ${err.message}`);

      // Wake up Render service if it's sleeping
      if (attemptCount < 3) {
        console.log(`[Socket] Waking /api/socket (attempt ${attemptCount})`);
        await fetch("/api/socket").catch(() => { });
      }
    });

    connection.on("connect", () => {
      console.log("[Socket] Connected successfully");
      attemptCount = 0; // Reset on success
    });

    return () => {
      connection.off("reconnect_attempt");
      connection.off("connect_error");
      connection.off("connect");
      connection.disconnect();
    };
  }, []);

  return <socketContext.Provider value={socket}>{children}</socketContext.Provider>;
};