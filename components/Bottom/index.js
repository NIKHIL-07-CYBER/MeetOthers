import cx from "classnames";
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  PhoneOff,
  Settings,
  MoreVertical,
} from "lucide-react";
import { motion } from "framer-motion";
import styles from "@/components/Bottom/index.module.css";

const Bottom = ({ muted, playing, toggleAudio, toggleVideo }) => {
  const handleEndCall = () => {
    // Navigate back to home or show confirmation
    window.location.href = '/';
  };

  return (
    <motion.div 
      className={styles.bottomMenu}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.8 }}
    >
      {/* Audio */}
      <motion.div
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
      >
        {muted ? (
          <MicOff
            size={24}
            className={cx(styles.icon, styles.danger)}
            onClick={toggleAudio}
          />
        ) : (
          <Mic
            size={24}
            className={cx(styles.icon, styles.success)}
            onClick={toggleAudio}
          />
        )}
      </motion.div>

      {/* Video */}
      <motion.div
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
      >
        {playing ? (
          <Video
            size={24}
            className={cx(styles.icon, styles.success)}
            onClick={toggleVideo}
          />
        ) : (
          <VideoOff
            size={24}
            className={cx(styles.icon, styles.danger)}
            onClick={toggleVideo}
          />
        )}
      </motion.div>

      {/* Settings */}
      <motion.div
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
      >
        <Settings
          size={24}
          className={cx(styles.icon, styles.neutral)}
        />
      </motion.div>

      {/* More options */}
      <motion.div
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
      >
        <MoreVertical
          size={24}
          className={cx(styles.icon, styles.neutral)}
        />
      </motion.div>

      {/* Hang up */}
      <motion.div
        whileHover={{ scale: 1.15 }}
        whileTap={{ scale: 0.9 }}
      >
        <PhoneOff 
          size={24} 
          className={cx(styles.icon, styles.hangup)} 
          onClick={handleEndCall}
        />
      </motion.div>
    </motion.div>
  );
};

export default Bottom;
