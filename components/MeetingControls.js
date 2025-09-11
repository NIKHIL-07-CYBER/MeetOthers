import { Mic, MicOff, Video, VideoOff, Share2, LogOut } from 'lucide-react';
import classNames from 'classnames'; // Already in your dependencies

function MeetingControls({ isMuted, isVideoOff, onToggleMute, onToggleVideo, onShareScreen, onLeave }) {
  return (
    <div className="fixed bottom-0 left-0 right-0 bg-secondary p-4 flex justify-center space-x-6 shadow-lg">
      <button
        onClick={onToggleMute}
        className={classNames(
          'p-3 rounded-full text-white',
          isMuted ? 'bg-buttonPrimary' : 'bg-prime hover:bg-buttonPrimary'
        )}
      >
        {isMuted ? <MicOff size={24} /> : <Mic size={24} />}
      </button>
      <button
        onClick={onToggleVideo}
        className={classNames(
          'p-3 rounded-full text-white',
          isVideoOff ? 'bg-buttonPrimary' : 'bg-prime hover:bg-buttonPrimary'
        )}
      >
        {isVideoOff ? <VideoOff size={24} /> : <Video size={24} />}
      </button>
      <button onClick={onShareScreen} className="p-3 rounded-full bg-prime text-white hover:bg-buttonPrimary">
        <Share2 size={24} />
      </button>
      <button onClick={onLeave} className="p-3 rounded-full bg-buttonPrimary text-white hover:bg-red-700">
        <LogOut size={24} />
      </button>
    </div>
  );
}

export default MeetingControls;