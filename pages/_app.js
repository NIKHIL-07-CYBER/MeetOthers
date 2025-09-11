import { SocketProvider } from "@/context/socket";
import { ThemeProvider } from "@/context/theme";
import "@/styles/globals.css";
import { useEffect } from 'react';

export default function App({ Component, pageProps }) {
  useEffect(() => {
    fetch("/api/socket"); // ensures socket.io server is initialized
  }, []);
  return (
    <ThemeProvider>
      <SocketProvider>
        <Component {...pageProps} />
      </SocketProvider>
    </ThemeProvider>
  );
}
