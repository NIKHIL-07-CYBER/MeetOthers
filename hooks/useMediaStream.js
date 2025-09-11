import { useState, useEffect, useRef, useCallback } from "react";

const useMediaStream = () => {
  const [stream, setStream] = useState(null);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [error, setError] = useState(null);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const isStreamSet = useRef(false);
  const currentStream = useRef(null);

  const initStream = useCallback(async (constraints = { audio: true, video: true }) => {
    try {
      setError(null);
      const newStream = await navigator.mediaDevices.getUserMedia(constraints);
      
      // Stop previous stream if exists
      if (currentStream.current) {
        currentStream.current.getTracks().forEach(track => track.stop());
      }
      
      currentStream.current = newStream;
      setStream(newStream);
      setIsVideoEnabled(constraints.video);
      setIsAudioEnabled(constraints.audio);
      
      return newStream;
    } catch (error) {
      console.error("Error accessing media devices:", error);
      setError(error.message);
      return null;
    }
  }, []);

  const toggleVideo = useCallback(async () => {
    if (!currentStream.current) return;

    const videoTrack = currentStream.current.getVideoTracks()[0];
    
    if (videoTrack) {
      if (isVideoEnabled) {
        // Disable video
        videoTrack.stop();
        setIsVideoEnabled(false);
        
        // Remove video track from stream but keep audio
        const audioTrack = currentStream.current.getAudioTracks()[0];
        const newStream = new MediaStream();
        if (audioTrack) newStream.addTrack(audioTrack);
        
        currentStream.current = newStream;
        setStream(newStream);
      } else {
        // Re-enable video by getting new stream
        try {
          const newVideoStream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: false // Only get video, keep existing audio
          });
          
          const newVideoTrack = newVideoStream.getVideoTracks()[0];
          const audioTrack = currentStream.current.getAudioTracks()[0];
          
          // Create new stream with existing audio and new video
          const combinedStream = new MediaStream();
          if (audioTrack) combinedStream.addTrack(audioTrack);
          if (newVideoTrack) combinedStream.addTrack(newVideoTrack);
          
          currentStream.current = combinedStream;
          setStream(combinedStream);
          setIsVideoEnabled(true);
          
          // Return the new stream for peer connection updates
          return combinedStream;
        } catch (error) {
          console.error("Error re-enabling video:", error);
          setError("Failed to re-enable video");
        }
      }
    }
  }, [isVideoEnabled, isAudioEnabled]);

  const toggleAudio = useCallback(() => {
    if (!currentStream.current) return;

    const audioTrack = currentStream.current.getAudioTracks()[0];
    if (audioTrack) {
      audioTrack.enabled = !audioTrack.enabled;
      setIsAudioEnabled(audioTrack.enabled);
    }
  }, []);

  const stopScreenShare = useCallback(async () => {
    try {
      // Stop screen sharing and return to camera
      if (currentStream.current) {
        currentStream.current.getVideoTracks().forEach(track => track.stop());
      }
      setIsScreenSharing(false);
      // Restart camera
      const newStream = await initStream({ video: true, audio: isAudioEnabled });
      return newStream;
    } catch (error) {
      console.error("Error stopping screen share:", error);
      setError("Failed to stop screen sharing");
      return null;
    }
  }, [initStream, isAudioEnabled]);

  const startScreenShare = useCallback(async () => {
    try {
      setError(null);
      const screenStream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: true
      });
      
      // Keep audio from current stream if available
      const audioTrack = currentStream.current?.getAudioTracks()[0];
      
      // Create combined stream with screen video and current audio
      const combinedStream = new MediaStream();
      screenStream.getVideoTracks().forEach(track => combinedStream.addTrack(track));
      if (audioTrack && isAudioEnabled) {
        combinedStream.addTrack(audioTrack);
      }
      
      // Stop previous video tracks only
      if (currentStream.current) {
        currentStream.current.getVideoTracks().forEach(track => track.stop());
      }
      
      currentStream.current = combinedStream;
      setStream(combinedStream);
      setIsScreenSharing(true);
      setIsVideoEnabled(true); // Screen sharing counts as video enabled
      
      // Listen for screen share end (user clicks "Stop sharing" in browser)
      screenStream.getVideoTracks()[0].onended = () => {
        stopScreenShare();
      };
      
      return combinedStream;
    } catch (error) {
      console.error("Error starting screen share:", error);
      setError("Failed to start screen sharing");
      return null;
    }
  }, [isAudioEnabled, stopScreenShare]);

  const cleanup = useCallback(() => {
    if (currentStream.current) {
      currentStream.current.getTracks().forEach(track => track.stop());
      currentStream.current = null;
      setStream(null);
    }
  }, []);

  useEffect(() => {
    if (isStreamSet.current) return;
    isStreamSet.current = true;
    initStream();

    return cleanup;
  }, [initStream, cleanup]);

  return {
    stream,
    isVideoEnabled,
    isAudioEnabled,
    isScreenSharing,
    error,
    toggleVideo,
    toggleAudio,
    startScreenShare,
    stopScreenShare,
    initStream,
    cleanup
  };
};

export default useMediaStream;
