import { v4 as uuidv4 } from "uuid";
import { useRouter } from "next/router";
import styles from "@/styles/home.module.css";
import { useState } from "react";
import { Video, Users, Plus, LogIn } from "lucide-react";
import { LazyMotion, domMax, m } from "framer-motion";
import ParticleBackground from "@/components/ParticleBackground";

export default function Home() {
  const Router = useRouter();
  const [roomId, setRoomId] = useState("");
  const [userName, setUserName] = useState("");

  const createAndJoin = () => {
    if (!userName.trim()) {
      alert("Please enter your name first");
      return;
    }
    const roomId = uuidv4();
    Router.push(`/${roomId}?name=${encodeURIComponent(userName.trim())}`);
  };

  const joinRoom = () => {
    if (!userName.trim()) {
      alert("Please enter your name first");
      return;
    }
    if (roomId.trim()) {
      Router.push(`/${roomId}?name=${encodeURIComponent(userName.trim())}`);
    } else {
      alert("Please enter a valid room ID");
    }
  };

  return (
    <LazyMotion features={domMax}>
      <ParticleBackground />
      <div className={styles.container}>
        <m.div
          className={styles.homeContainer}
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          <m.div
            className={styles.header}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3, duration: 0.6 }}
          >
            <Video className={styles.logo} size={48} />
            <h1 className={styles.title}>MeetOthers</h1>
            <p className={styles.subtitle}>Connect with anyone, anywhere</p>
          </m.div>

          <m.div
            className={styles.actionContainer}
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.6 }}
          >
            <div className={styles.enterRoom}>
              <div className={styles.inputWrapper}>
                <input
                  className={styles.roomInput}
                  placeholder="Your Display Name"
                  value={userName}
                  onChange={(e) => setUserName(e?.target?.value)}
                  suppressHydrationWarning
                />
                <input
                  className={styles.roomInput}
                  placeholder="Enter room ID"
                  value={roomId}
                  onChange={(e) => setRoomId(e?.target?.value)}
                  onKeyPress={(e) => e.key === 'Enter' && joinRoom()}
                  suppressHydrationWarning
                />
                <m.button
                  className={styles.joinButton}
                  onClick={joinRoom}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <LogIn size={20} />
                  Join Room
                </m.button>
              </div>
            </div>

            <div className={styles.separator}>
              <span className={styles.separatorLine}></span>
              <span className={styles.separatorText}>OR</span>
              <span className={styles.separatorLine}></span>
            </div>

            <m.button
              className={styles.createButton}
              onClick={createAndJoin}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Plus size={20} />
              Create New Room
            </m.button>
          </m.div>

          <m.div
            className={styles.features}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.7, duration: 0.6 }}
          >
            <div className={styles.feature}>
              <Video size={24} />
              <span>HD Video Calls</span>
            </div>
            <div className={styles.feature}>
              <Users size={24} />
              <span>Multiple Participants</span>
            </div>
          </m.div>
        </m.div>
      </div>
    </LazyMotion>
  );
}
