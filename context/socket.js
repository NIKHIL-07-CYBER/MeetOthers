import { useEffect, useState, createContext, useContext } from "react";
import { io } from "socket.io-client";

const socketContext = createContext(null);

export const useSocket = () => useContext(socketContext);

export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);

  useEffect(() => {
    // Dynamically set backend URL
    const isProd = typeof window !== "undefined" && window.location.hostname !== "localhost";
    const backendUrl = isProd
      ? "https://meshmeet.onrender.com/" // Render backend URL
      : "http://localhost:3000"; // Local Next.js dev server

    const connection = io(backendUrl, {
      path: "/api/socket", // Next.js API route
      transports: ["websocket"], // Force WebSocket
      withCredentials: true,
    });

    setSocket(connection);

    connection.on("connect_error", async (err) => {
      console.log("error on connecting error", err);
      await fetch("/api/socket");
    });

    return () => {
      connection.off("connect_error");
      connection.disconnect();
    };
  }, []);

  return <socketContext.Provider value={socket}>{children}</socketContext.Provider>;
};