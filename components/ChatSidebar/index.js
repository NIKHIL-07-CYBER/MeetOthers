import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Send,
  Paperclip,
  X,
  Download,
  File,
  Image as ImageIcon,
  Smile
} from 'lucide-react';

const Message = ({ message, isOwn }) => {
  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex ${isOwn ? 'justify-end' : 'justify-start'} mb-4`}
    >
      <div className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${isOwn
        ? 'bg-blue-500 text-white'
        : 'bg-white/10 dark:bg-gray-800 text-white'
        }`}>
        {!isOwn && (
          <div className="text-xs text-gray-300 mb-1 font-medium">
            {message.sender}
          </div>
        )}

        {message.type === 'text' && (
          <div className="text-sm">{message.content}</div>
        )}

        {message.type === 'file' && (
          <div className="flex items-center space-x-2">
            <File className="w-4 h-4" />
            <div className="flex-1 min-w-0">
              <div className="text-sm truncate">{message.fileName}</div>
              <div className="text-xs opacity-75">{message.fileSize}</div>
            </div>
            <button className="p-1 hover:bg-white/10 rounded">
              <Download className="w-4 h-4" />
            </button>
          </div>
        )}

        {message.type === 'image' && (
          <div>
            <img
              src={message.imageUrl}
              alt="Shared image"
              className="max-w-full rounded mb-2"
            />
            {message.content && (
              <div className="text-sm">{message.content}</div>
            )}
          </div>
        )}

        <div className="text-xs opacity-75 mt-1">
          {formatTime(message.timestamp)}
        </div>
      </div>
    </motion.div>
  );
};

const ChatSidebar = ({ isOpen, onClose, roomId, messages = [], onSendMessage, currentUserId }) => {
  const [newMessage, setNewMessage] = useState('');
  const messagesEndRef = useRef(null);
  const [isTyping, setIsTyping] = useState(false);
  const fileInputRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const sendMessage = () => {
    if (!newMessage.trim()) return;
    onSendMessage(newMessage);
    setNewMessage('');
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

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
            <h3 className="text-lg font-semibold text-white">Chat</h3>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-gray-300" />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-2">
            {messages.map((message, index) => {
              const isOwn = message.userId === currentUserId;
              return (
                <Message
                  key={message.id || index}
                  message={{
                    ...message,
                    sender: isOwn ? 'You' : (message.userName || `User ${message.userId?.slice(0, 4)}`),
                    content: message.text
                  }}
                  isOwn={isOwn}
                />
              );
            })}
            {isTyping && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex justify-start"
              >
                <div className="bg-white/10 dark:bg-gray-800 rounded-lg px-4 py-2">
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                  </div>
                </div>
              </motion.div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="p-4 border-t border-white/20">
            <div className="flex items-end space-x-2">
              <div className="flex-1">
                <textarea
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Type a message..."
                  className="w-full bg-white/10 dark:bg-gray-800 text-white placeholder-gray-400 rounded-lg px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={1}
                />
              </div>

              <button
                onClick={() => fileInputRef.current?.click()}
                className="p-2 hover:bg-white/10 rounded-lg transition-colors"
              >
                <Paperclip className="w-5 h-5 text-gray-300" />
              </button>

              <motion.button
                onClick={sendMessage}
                disabled={!newMessage.trim()}
                className="p-2 bg-blue-500 hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Send className="w-5 h-5 text-white" />
              </motion.button>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              onChange={handleFileUpload}
              className="hidden"
              accept="*/*"
            />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default ChatSidebar;
