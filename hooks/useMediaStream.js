import { useState, useEffect, useRef, useCallback } from "react";

const useMediaStream = () => {
  const [stream, setStream] = useState(null);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [error, setError] = useState(null);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const isStreamSet = useRef(false);
  const currentStream = useRef(null);

  const initStream = useCallback(async (constraints = null) => {
    try {
      setError(null);

      // ✅ FIX: Check for navigator.mediaDevices (Insecure Context Check)
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        const errorMsg = "Media devices not available. Ensure you are on HTTPS or localhost.";
        console.error(errorMsg);
        setError(errorMsg);
        return null;
      }

      // ✅ FIX: Probe available hardware BEFORE calling getUserMedia.
      // On machines with no camera (VM, headless, some laptops) requesting video:true
      // throws NotFoundError and kills the entire stream. enumerateDevices() is safe —
      // it never prompts for permission and never throws.
      if (!constraints) {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const hasCamera = devices.some((d) => d.kind === "videoinput");
        const hasMic = devices.some((d) => d.kind === "audioinput");

        if (!hasCamera && !hasMic) {
          const errorMsg = "No camera or microphone found on this device.";
          console.warn("[useMediaStream]", errorMsg);
          setError(errorMsg);
          setIsVideoEnabled(false);
          setIsAudioEnabled(false);
          return null;
        }

        constraints = { video: hasCamera, audio: hasMic };
        if (!hasCamera) {
          console.warn("[useMediaStream] No camera found — requesting audio-only stream.");
        }
      }

      const newStream = await navigator.mediaDevices.getUserMedia(constraints);

      // Stop previous stream if exists
      if (currentStream.current) {
        currentStream.current.getTracks().forEach(track => track.stop());
      }

      currentStream.current = newStream;
      setStream(newStream);
      setIsVideoEnabled(!!constraints.video);
      setIsAudioEnabled(!!constraints.audio);

      return newStream;
    } catch (error) {
      console.error("Error accessing media devices:", error);

      // Robust error handling UI messages
      if (error.name === "NotAllowedError") {
        setError("Permission denied. Please allow access to camera/microphone.");
      } else if (error.name === "NotFoundError" || error.name === "DevicesNotFoundError") {
        // ✅ FIX: Retry with audio-only if combined request fails at OS level
        if (constraints?.video && constraints?.audio) {
          console.warn("[useMediaStream] Combined getUserMedia failed — retrying audio-only.");
          return initStream({ video: false, audio: true });
        }
        setError("No camera or microphone found.");
      } else if (error.name === "NotReadableError" || error.name === "TrackStartError") {
        setError("Camera/microphone is already in use by another application.");
      } else {
        setError(`Media error: ${error.message}`);
      }
      return null;
    }
  }, []);


  const toggleVideo = useCallback(async () => {
    if (!currentStream.current) return null;

    const videoTrack = currentStream.current.getVideoTracks()[0];

    if (videoTrack && isVideoEnabled) {
      // ✅ FIX LM-5 + LM-1: Use track.enabled=false instead of stop().
      // Stopping the track destroys the RTCRtpSender's source, making replaceTrack fail.
      // Disabling keeps the sender alive and sends a black frame to peers.
      videoTrack.enabled = false;
      setIsVideoEnabled(false);
      // ✅ FIX LM-5: Always return the stream (consistent return value)
      return currentStream.current;
    }

    if (!isVideoEnabled) {
      // Re-enable: try to activate existing disabled track first
      if (videoTrack) {
        videoTrack.enabled = true;
        setIsVideoEnabled(true);
        return currentStream.current; // ✅ Consistent return
      }

      // Track was stopped — need a fresh getUserMedia
      try {
        const newVideoStream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: false,
        });
        const newVideoTrack = newVideoStream.getVideoTracks()[0];
        const audioTrack = currentStream.current.getAudioTracks()[0];

        const combinedStream = new MediaStream();
        if (audioTrack) combinedStream.addTrack(audioTrack);
        if (newVideoTrack) combinedStream.addTrack(newVideoTrack);

        currentStream.current = combinedStream;
        setStream(combinedStream);
        setIsVideoEnabled(true);
        return combinedStream; // ✅ Consistent return
      } catch (error) {
        console.error("Error re-enabling video:", error);
        setError("Failed to re-enable video");
        return null; // ✅ Explicit null on error
      }
    }

    return null;
  }, [isVideoEnabled]);

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
