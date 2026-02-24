import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Users, 
  X, 
  Mic, 
  MicOff, 
  Video, 
  VideoOff, 
  Hand, 
  Crown, 
  UserX, 
  Volume2, 
  VolumeX,
  Wifi,
  WifiOff,
  MoreVertical
} from 'lucide-react';

const ConnectionQuality = ({ quality }) => {
  const getQualityColor = () => {
    switch (quality) {
      case 'excellent': return 'text-green-400';
      case 'good': return 'text-yellow-400';
      case 'poor': return 'text-red-400';
      default: return 'text-gray-400';
    }
  };

  const getQualityBars = () => {
    switch (quality) {
      case 'excellent': return 4;
      case 'good': return 3;
      case 'poor': return 1;
      default: return 0;
    }
  };

  return (
    <div className="flex items-center space-x-1">
      {[1, 2, 3, 4].map((bar) => (
        <div
          key={bar}
          className={`w-1 h-3 rounded-sm ${
            bar <= getQualityBars() 
              ? getQualityColor().replace('text-', 'bg-')
              : 'bg-gray-600'
          }`}
        />
      ))}
    </div>
  );
};

const ParticipantItem = ({ 
  participant, 
  isHost, 
  currentUserId, 
  onMuteParticipant, 
  onRemoveParticipant,
  onMakeHost 
}) => {
  const [showActions, setShowActions] = useState(false);
  const isCurrentUser = participant.id === currentUserId;
  const canControlParticipant = isHost && !isCurrentUser;

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="flex items-center justify-between p-3 rounded-lg hover:bg-white/5 transition-colors group"
    >
      <div className="flex items-center space-x-3 flex-1 min-w-0">
        {/* Avatar */}
        <div className="relative">
          <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-sm font-medium">
            {participant.name?.slice(0, 2).toUpperCase() || 'U'}
          </div>
          {participant.isHandRaised && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="absolute -top-1 -right-1 w-4 h-4 bg-yellow-500 rounded-full flex items-center justify-center"
            >
              <Hand className="w-2 h-2 text-white" />
            </motion.div>
          )}
        </div>

        {/* Name and status */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center space-x-2">
            <span className="text-white font-medium truncate">
              {participant.name || `Participant ${participant.id.slice(0, 6)}`}
            </span>
            {participant.isHost && (
              <Crown className="w-4 h-4 text-yellow-500" />
            )}
            {isCurrentUser && (
              <span className="text-xs text-gray-400">(You)</span>
            )}
          </div>
          <div className="flex items-center space-x-2 mt-1">
            <ConnectionQuality quality={participant.connectionQuality} />
            <span className="text-xs text-gray-400">
              {participant.connectionQuality || 'unknown'}
            </span>
          </div>
        </div>

        {/* Status indicators */}
        <div className="flex items-center space-x-1">
          {participant.isMuted ? (
            <MicOff className="w-4 h-4 text-red-400" />
          ) : (
            <Mic className="w-4 h-4 text-green-400" />
          )}
          
          {participant.isVideoOn ? (
            <Video className="w-4 h-4 text-green-400" />
          ) : (
            <VideoOff className="w-4 h-4 text-red-400" />
          )}

          {participant.isSpeaking && (
            <motion.div
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 0.5, repeat: Infinity }}
              className="w-2 h-2 bg-green-400 rounded-full"
            />
          )}
        </div>

        {/* Host controls */}
        {canControlParticipant && (
          <div className="relative">
            <button
              onClick={() => setShowActions(!showActions)}
              className="p-1 rounded hover:bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <MoreVertical className="w-4 h-4 text-gray-400" />
            </button>

            <AnimatePresence>
              {showActions && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.8, y: -10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.8, y: -10 }}
                  className="absolute right-0 top-full mt-1 bg-gray-800 rounded-lg shadow-lg border border-gray-700 py-1 z-50 min-w-[150px]"
                >
                  <button
                    onClick={() => onMuteParticipant(participant.id)}
                    className="flex items-center space-x-2 w-full px-3 py-2 text-sm text-white hover:bg-gray-700 transition-colors"
                  >
                    {participant.isMuted ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
                    <span>{participant.isMuted ? 'Unmute' : 'Mute'}</span>
                  </button>
                  
                  <button
                    onClick={() => onMakeHost(participant.id)}
                    className="flex items-center space-x-2 w-full px-3 py-2 text-sm text-white hover:bg-gray-700 transition-colors"
                  >
                    <Crown className="w-4 h-4" />
                    <span>Make Host</span>
                  </button>
                  
                  <button
                    onClick={() => onRemoveParticipant(participant.id)}
                    className="flex items-center space-x-2 w-full px-3 py-2 text-sm text-red-400 hover:bg-gray-700 transition-colors"
                  >
                    <UserX className="w-4 h-4" />
                    <span>Remove</span>
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </div>
    </motion.div>
  );
};

const ParticipantList = ({ 
  isOpen, 
  onClose, 
  participants = [], 
  currentUserId,
  isHost = false 
}) => {
  const handleMuteParticipant = (participantId) => {
    // In real implementation, this would send a signal to mute the participant
    console.log('Muting participant:', participantId);
  };

  const handleRemoveParticipant = (participantId) => {
    // In real implementation, this would remove the participant from the call
    console.log('Removing participant:', participantId);
  };

  const handleMakeHost = (participantId) => {
    // In real implementation, this would transfer host privileges
    console.log('Making host:', participantId);
  };

  const sortedParticipants = [...participants].sort((a, b) => {
    // Sort by: host first, then current user, then by name
    if (a.isHost && !b.isHost) return -1;
    if (!a.isHost && b.isHost) return 1;
    if (a.id === currentUserId && b.id !== currentUserId) return -1;
    if (a.id !== currentUserId && b.id === currentUserId) return 1;
    return (a.name || '').localeCompare(b.name || '');
  });

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          className="fixed right-0 top-16 bottom-0 w-80 bg-white/10 dark:bg-black/30 backdrop-blur-md border-l border-white/20 z-30 flex flex-col"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-white/20">
            <div className="flex items-center space-x-2">
              <Users className="w-5 h-5 text-white" />
              <h3 className="text-lg font-semibold text-white">
                Participants ({participants.length})
              </h3>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-gray-300" />
            </button>
          </div>

          {/* Participants list */}
          <div className="flex-1 overflow-y-auto">
            <div className="p-2">
              <AnimatePresence>
                {sortedParticipants.map((participant) => (
                  <ParticipantItem
                    key={participant.id}
                    participant={participant}
                    isHost={isHost}
                    currentUserId={currentUserId}
                    onMuteParticipant={handleMuteParticipant}
                    onRemoveParticipant={handleRemoveParticipant}
                    onMakeHost={handleMakeHost}
                  />
                ))}
              </AnimatePresence>
            </div>
          </div>

          {/* Footer with host controls */}
          {isHost && (
            <div className="p-4 border-t border-white/20">
              <div className="space-y-2">
                <button className="w-full flex items-center justify-center space-x-2 p-2 bg-red-500/20 hover:bg-red-500/30 rounded-lg text-red-400 transition-colors">
                  <UserX className="w-4 h-4" />
                  <span className="text-sm">Remove All</span>
                </button>
                
                <button className="w-full flex items-center justify-center space-x-2 p-2 bg-yellow-500/20 hover:bg-yellow-500/30 rounded-lg text-yellow-400 transition-colors">
                  <MicOff className="w-4 h-4" />
                  <span className="text-sm">Mute All</span>
                </button>
              </div>
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default ParticipantList;
