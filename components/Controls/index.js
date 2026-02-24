import { useSocket } from "@/context/socket";
import { useRouter } from "next/router";
import { motion, AnimatePresence } from "framer-motion";
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  Phone,
  PhoneOff,
  Monitor,
  MonitorX,
  Zap as Hand,
  MessageCircle,
  Users,
  Settings,
  MoreHorizontal,
  Circle,
  Square
} from "lucide-react";
import { useEffect, useState } from "react";

const Tooltip = ({ children, text, position = 'top' }) => {
  const [isVisible, setIsVisible] = useState(false);

  return (
    <div
      className="relative"
      onMouseEnter={() => setIsVisible(true)}
      onMouseLeave={() => setIsVisible(false)}
    >
      {children}
      <AnimatePresence>
        {isVisible && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: position === 'top' ? 10 : -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: position === 'top' ? 10 : -10 }}
            className={`absolute ${position === 'top' ? 'bottom-full mb-2' : 'top-full mt-2'} left-1/2 transform -translate-x-1/2 
                       bg-gray-900 dark:bg-gray-800 text-white text-xs px-2 py-1 rounded whitespace-nowrap z-50`}
          >
            {text}
            <div className={`absolute left-1/2 transform -translate-x-1/2 w-2 h-2 bg-gray-900 dark:bg-gray-800 rotate-45 
                           ${position === 'top' ? 'top-full -mt-1' : 'bottom-full -mb-1'}`} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const ControlButton = ({
  Icon,
  onClick,
  isActive = false,
  variant = 'default',
  tooltip = '',
  isDisabled = false,
  className = '',
  ariaLabel,
  keyboardShortcut,
  ...props
}) => {
  const getVariantStyles = () => {
    switch (variant) {
      case 'danger':
        return isActive
          ? 'bg-red-500 hover:bg-red-600 text-white'
          : 'bg-white/10 hover:bg-white/20 text-gray-300 hover:text-white';
      case 'success':
        return isActive
          ? 'bg-green-500 hover:bg-green-600 text-white'
          : 'bg-white/10 hover:bg-white/20 text-gray-300 hover:text-white';
      case 'warning':
        return isActive
          ? 'bg-yellow-500 hover:bg-yellow-600 text-white'
          : 'bg-white/10 hover:bg-white/20 text-gray-300 hover:text-white';
      default:
        return isActive
          ? 'bg-blue-500 hover:bg-blue-600 text-white'
          : 'bg-white/10 hover:bg-white/20 text-gray-300 hover:text-white';
    }
  };

  const fullTooltip = keyboardShortcut ? `${tooltip} (${keyboardShortcut})` : tooltip;

  return (
    <Tooltip text={fullTooltip}>
      <motion.button
        onClick={onClick}
        disabled={isDisabled}
        aria-label={ariaLabel || tooltip}
        aria-pressed={isActive}
        role="button"
        tabIndex={0}
        className={`
          relative p-4 rounded-full transition-all duration-200 
          ${getVariantStyles()}
          ${isDisabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
          focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 focus:ring-offset-transparent
          ${className}
        `}
        whileHover={!isDisabled ? { scale: 1.05 } : {}}
        whileTap={!isDisabled ? { scale: 0.95 } : {}}
        {...props}
      >
        <Icon size={20} />
        {isActive && variant !== 'danger' && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute -top-1 -right-1 w-3 h-3 bg-green-400 rounded-full border-2 border-white"
            aria-hidden="true"
          />
        )}
      </motion.button>
    </Tooltip>
  );
};

const Controls = ({
  muted,
  playing,
  isScreenSharing,
  isRecording,
  isHandRaised,
  isChatOpen,
  isParticipantsOpen,
  toggleAudio,
  toggleVideo,
  toggleScreenShare,
  toggleRecording,
  toggleHandRaise,
  toggleChat,
  toggleParticipants,
  onEndCall,
  onSettings
}) => {
  const [showMoreControls, setShowMoreControls] = useState(false);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

      switch (e.key.toLowerCase()) {
        case 'm':
          e.preventDefault();
          toggleAudio();
          break;
        case 'v':
          e.preventDefault();
          toggleVideo();
          break;
        case 'c':
          e.preventDefault();
          toggleChat();
          break;
        case 's':
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            toggleScreenShare();
          }
          break;
        case 'h':
          e.preventDefault();
          toggleHandRaise();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [toggleAudio, toggleVideo, toggleChat, toggleScreenShare, toggleHandRaise]);

  const handleAudioToggle = () => {
    toggleAudio();
  };

  const handleVideoToggle = () => {
    toggleVideo();
  };

  return (
    <motion.div
      className="z-50"
      initial={{ y: 100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5, delay: 0.2 }}
      role="toolbar"
      aria-label="Video call controls"
    >
      <div className="flex items-center space-x-3 bg-black/20 backdrop-blur-md rounded-2xl px-6 py-4 border border-white/10">
        {/* Audio Toggle */}
        <ControlButton
          Icon={muted ? MicOff : Mic}
          onClick={handleAudioToggle}
          isActive={!muted}
          variant={muted ? 'danger' : 'success'}
          tooltip={muted ? 'Unmute microphone' : 'Mute microphone'}
          ariaLabel={muted ? 'Unmute microphone' : 'Mute microphone'}
          keyboardShortcut="Space"
        />

        {/* Video Toggle */}
        <ControlButton
          Icon={playing ? Video : VideoOff}
          onClick={handleVideoToggle}
          isActive={playing}
          variant={!playing ? 'danger' : 'success'}
          tooltip={playing ? 'Turn off camera' : 'Turn on camera'}
          ariaLabel={playing ? 'Turn off camera' : 'Turn on camera'}
          keyboardShortcut="V"
        />

        {/* Screen Share */}
        <ControlButton
          Icon={isScreenSharing ? MonitorX : Monitor}
          onClick={toggleScreenShare}
          isActive={isScreenSharing}
          variant={isScreenSharing ? 'warning' : 'default'}
          tooltip={isScreenSharing ? 'Stop screen sharing' : 'Share your screen'}
          ariaLabel={isScreenSharing ? 'Stop screen sharing' : 'Share your screen'}
          keyboardShortcut="S"
        />

        {/* Raise Hand */}
        <ControlButton
          Icon={Hand}
          onClick={toggleHandRaise}
          isActive={isHandRaised}
          variant={isHandRaised ? 'warning' : 'default'}
          tooltip={isHandRaised ? 'Lower hand' : 'Raise hand'}
          ariaLabel={isHandRaised ? 'Lower hand' : 'Raise hand'}
          keyboardShortcut="H"
        />

        {/* Chat */}
        <ControlButton
          Icon={MessageCircle}
          onClick={toggleChat}
          isActive={isChatOpen}
          tooltip="Open chat panel"
          ariaLabel="Toggle chat panel"
          keyboardShortcut="C"
        />

        {/* Participants */}
        <ControlButton
          Icon={Users}
          onClick={toggleParticipants}
          isActive={isParticipantsOpen}
          tooltip="View participants"
          ariaLabel="Toggle participants panel"
          keyboardShortcut="P"
        />

        {/* Recording */}
        <ControlButton
          Icon={isRecording ? Square : Circle}
          onClick={toggleRecording}
          isActive={isRecording}
          variant={isRecording ? 'danger' : 'default'}
          tooltip={isRecording ? 'Stop recording meeting' : 'Start recording meeting'}
          ariaLabel={isRecording ? 'Stop recording meeting' : 'Start recording meeting'}
          keyboardShortcut="R"
        />

        {/* Settings */}
        <ControlButton
          Icon={Settings}
          onClick={onSettings}
          tooltip="Open settings"
          ariaLabel="Open meeting settings"
        />

        {/* More Options */}
        <ControlButton
          Icon={MoreHorizontal}
          onClick={() => console.log('More options')}
          tooltip="More options"
          ariaLabel="Show more options"
        />

        {/* End Call */}
        <ControlButton
          Icon={PhoneOff}
          onClick={onEndCall}
          variant="danger"
          tooltip="End call"
          ariaLabel="End the meeting call"
          keyboardShortcut="Ctrl+D"
          className="ml-2"
        />
      </div>
    </motion.div>
  );
};

export default Controls;
