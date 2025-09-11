import { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Video, 
  Sun, 
  Moon, 
  Settings, 
  Users, 
  Clock,
  Shield,
  Copy,
  Check
} from 'lucide-react';
import { useTheme } from '@/context/theme';

const Navbar = ({ roomId, participantCount = 0, meetingDuration = "00:00" }) => {
  const { isDark, toggleTheme } = useTheme();
  const [copied, setCopied] = useState(false);

  const copyRoomId = async () => {
    if (roomId) {
      await navigator.clipboard.writeText(roomId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const copyMeetingLink = async () => {
    if (roomId) {
      const link = `${window.location.origin}/${roomId}`;
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <motion.nav 
      className="fixed top-0 left-0 right-0 z-50 bg-white/10 dark:bg-black/20 backdrop-blur-md border-b border-white/20 dark:border-gray-700/30"
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo and Brand */}
          <div className="flex items-center space-x-3">
            <motion.div 
              className="flex items-center justify-center w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg"
              whileHover={{ scale: 1.05 }}
            >
              <Video className="w-6 h-6 text-white" />
            </motion.div>
            <div>
              <h1 className="text-xl font-bold text-white">MeetOthers</h1>
              <p className="text-xs text-gray-300 dark:text-gray-400">Professional Video Calling</p>
            </div>
          </div>

          {/* Meeting Info */}
          {roomId && (
            <div className="hidden md:flex items-center space-x-6">
              <div className="flex items-center space-x-2 bg-white/10 dark:bg-black/20 rounded-lg px-3 py-2">
                <Shield className="w-4 h-4 text-green-400" />
                <span className="text-sm text-white">Secure Meeting</span>
              </div>
              
              <div className="flex items-center space-x-2 bg-white/10 dark:bg-black/20 rounded-lg px-3 py-2">
                <Clock className="w-4 h-4 text-blue-400" />
                <span className="text-sm text-white font-mono">{meetingDuration}</span>
              </div>

              <div className="flex items-center space-x-2 bg-white/10 dark:bg-black/20 rounded-lg px-3 py-2">
                <Users className="w-4 h-4 text-purple-400" />
                <span className="text-sm text-white">{participantCount} participant{participantCount !== 1 ? 's' : ''}</span>
              </div>

              <motion.button
                onClick={copyMeetingLink}
                className="flex items-center space-x-2 bg-white/10 dark:bg-black/20 hover:bg-white/20 dark:hover:bg-black/30 rounded-lg px-3 py-2 transition-colors"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                {copied ? (
                  <>
                    <Check className="w-4 h-4 text-green-400" />
                    <span className="text-sm text-green-400">Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4 text-gray-300" />
                    <span className="text-sm text-white">Share Link</span>
                  </>
                )}
              </motion.button>
            </div>
          )}

          {/* Controls */}
          <div className="flex items-center space-x-3">
            <motion.button
              onClick={toggleTheme}
              className="p-2 rounded-lg bg-white/10 dark:bg-black/20 hover:bg-white/20 dark:hover:bg-black/30 transition-colors"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              {isDark ? (
                <Sun className="w-5 h-5 text-yellow-400" />
              ) : (
                <Moon className="w-5 h-5 text-blue-300" />
              )}
            </motion.button>

            <motion.button
              className="p-2 rounded-lg bg-white/10 dark:bg-black/20 hover:bg-white/20 dark:hover:bg-black/30 transition-colors"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Settings className="w-5 h-5 text-gray-300" />
            </motion.button>
          </div>
        </div>
      </div>
    </motion.nav>
  );
};

export default Navbar;
