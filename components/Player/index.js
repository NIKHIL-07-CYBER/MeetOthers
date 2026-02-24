import { useEffect, useRef, useState } from "react";
import cx from "classnames";
import styles from "@/components/Player/index.module.css";
import { Mic, MicOff, Video, VideoOff, Zap } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const Player = ({
  stream,
  muted,
  playing,
  isLocal = false,
  userId,
  userName,
  connectionQuality = "good",
  isSpeaking = false,
  isLoading = false,
  isHandRaised = false,
  isActive = false
}) => {
  const videoRef = useRef(null);
  const [hasVideoError, setHasVideoError] = useState(false);
  const [isVideoLoaded, setIsVideoLoaded] = useState(false);

  // ✅ FIX BUG-1: Always attach the stream to the video element when stream is present.
  // Previously, srcObject was only set when `playing` was true — this caused a race
  // where the stream arrived after the first render (playing=true → stream=null → srcObject never set).
  // Now we ALWAYS set srcObject = stream so the video element is always live.
  // The `playing` prop only controls whether we SHOW the video or the avatar placeholder.
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (stream) {
      // Always attach the stream so the video element is primed and ready.
      if (video.srcObject !== stream) {
        video.srcObject = stream;
        setHasVideoError(false);
        setIsVideoLoaded(false);
      }
      // Attempt to play; autoplay policy may block it on some browsers.
      video.play().catch((e) => {
        console.warn("[Player] play() rejected:", e.name);
        // Still mark as loaded so opacity-0 doesn't permanently hide the frame.
        setIsVideoLoaded(true);
      });
    } else {
      video.srcObject = null;
      setIsVideoLoaded(false);
    }
  }, [stream]);

  const handleVideoLoad = () => {
    setIsVideoLoaded(true);
    setHasVideoError(false);
  };

  const handleVideoError = () => {
    setHasVideoError(true);
    setIsVideoLoaded(false);
  };

  const getInitials = (name) => {
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getConnectionColor = () => {
    switch (connectionQuality) {
      case 'excellent': return 'bg-green-500';
      case 'good': return 'bg-green-400';
      case 'fair': return 'bg-yellow-400';
      case 'poor': return 'bg-red-400';
      default: return 'bg-gray-400';
    }
  };

  // Whether the live video frame should be visually shown.
  // We hide it (not remove it) when !playing so the stream stays attached.
  const showVideo = playing && stream && !hasVideoError;

  return (
    <motion.div
      className={cx(styles.playerContainer, {
        [styles.notActive]: !isActive,
        [styles.active]: isActive,
      })}
      layout
      transition={{ duration: 0.3, ease: "easeInOut" }}
    >
      {/* Video or Placeholder */}
      <div className="relative w-full h-full rounded-lg overflow-hidden bg-gradient-to-br from-slate-800 to-slate-900">
        {/* ✅ FIX BUG-1: video element is ALWAYS in the DOM when stream exists.
            We use CSS visibility/opacity to hide it when video is off.
            This prevents the srcObject never-set race condition. */}
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted={isLocal ? true : muted}
          controls={false}
          onCanPlay={handleVideoLoad}
          onLoadedMetadata={handleVideoLoad}
          onError={handleVideoError}
          style={{ display: showVideo ? 'block' : 'none' }}
          className={cx(
            "w-full h-full object-cover transition-opacity duration-300",
            isVideoLoaded ? "opacity-100" : "opacity-0"
          )}
        />

        {/* Avatar placeholder — shown when video is off or stream not ready */}
        <AnimatePresence>
          {!showVideo && (
            <motion.div
              key="placeholder"
              className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-blue-900/20 to-purple-900/20"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.3 }}
            >
              {/* User Avatar */}
              <motion.div
                className={cx(
                  "rounded-full flex items-center justify-center text-white font-semibold mb-2",
                  "bg-gradient-to-br from-blue-500 to-purple-600 shadow-lg",
                  isActive ? "w-24 h-24 text-2xl" : "w-16 h-16 text-lg"
                )}
                whileHover={{ scale: 1.05 }}
                transition={{ duration: 0.2 }}
              >
                {getInitials(userName || 'U')}
              </motion.div>

              {/* User Name */}
              <motion.p
                className={cx(
                  "text-white font-medium text-center px-2",
                  isActive ? "text-lg" : "text-sm"
                )}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
              >
                {userName}
              </motion.p>

              {/* Video Off Icon */}
              {!playing && (
                <motion.div
                  className="mt-2 p-2 rounded-full bg-red-500/20"
                  initial={{ opacity: 0, scale: 0 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.2 }}
                >
                  <VideoOff
                    size={isActive ? 24 : 16}
                    className="text-red-400"
                  />
                </motion.div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Status Indicators Overlay */}
        <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between pointer-events-none">
          {/* User Name Overlay — Bottom Left */}
          <div className="px-3 py-1 rounded-md bg-black/70 backdrop-blur-md border border-white/20 shadow-xl pointer-events-auto">
            <p className="text-[11px] text-white font-bold tracking-wide truncate">
              {userName || (userId ? `User ${userId.slice(0, 4)}` : 'Unknown')}
            </p>
          </div>

          <div className="flex items-center space-x-2">
            {/* Audio Status */}
            <motion.div
              className={cx(
                "p-1 rounded-full backdrop-blur-sm shadow-lg",
                muted ? "bg-red-500/90" : "bg-green-500/90"
              )}
              whileHover={{ scale: 1.1 }}
              transition={{ duration: 0.2 }}
            >
              {muted ? (
                <MicOff size={10} className="text-white" />
              ) : (
                <Mic size={10} className="text-white" />
              )}
            </motion.div>

            {/* Connection Quality / Speaking */}
            <motion.div
              className={cx(
                "w-2 h-2 rounded-full",
                getConnectionColor()
              )}
              animate={isSpeaking ? { scale: [1, 1.4, 1] } : {}}
              transition={{ duration: 0.5, repeat: isSpeaking ? Infinity : 0 }}
            />
          </div>
        </div>

        {/* Hand Raise Indicator */}
        <AnimatePresence>
          {isHandRaised && (
            <motion.div
              className="absolute top-2 right-2 p-2 rounded-full bg-yellow-500/90 backdrop-blur-sm"
              initial={{ opacity: 0, scale: 0, rotate: -180 }}
              animate={{ opacity: 1, scale: 1, rotate: 0 }}
              exit={{ opacity: 0, scale: 0, rotate: 180 }}
              transition={{ duration: 0.3, type: "spring" }}
              whileHover={{ scale: 1.1 }}
            >
              <Zap size={16} className="text-white" />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Speaking Indicator */}
        <AnimatePresence>
          {isSpeaking && (
            <motion.div
              className="absolute inset-0 border-2 border-green-400 rounded-lg"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
            />
          )}
        </AnimatePresence>

        {/* Loading State — only shown while playing but video not yet decoded */}
        <AnimatePresence>
          {showVideo && !isVideoLoaded && !hasVideoError && (
            <motion.div
              className="absolute inset-0 flex items-center justify-center bg-slate-800/50 backdrop-blur-sm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <motion.div
                className="w-8 h-8 border-2 border-blue-400 border-t-transparent rounded-full"
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
};

export default Player;
