import { useState } from 'react';
import { motion } from 'framer-motion';
import { ThumbsUp, ThumbsDown } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { chatAPI } from '../utils/api';

function MessageReactions({ messageId, conversationId }) {
  const [reaction, setReaction] = useState(null); // 'up' | 'down' | null
  const { isDark } = useTheme();
  const { t } = useLanguage();

  const handleReaction = async (type) => {
    const newReaction = reaction === type ? null : type;
    setReaction(newReaction);

    try {
      await chatAPI.sendFeedback({
        messageId,
        conversationId,
        feedback: newReaction
      });
    } catch (err) {
      // Silently fail - feedback is non-critical
    }
  };

  return (
    <div className="flex items-center gap-1 mt-1.5 ml-8">
      <motion.button
        whileTap={{ scale: 0.8 }}
        onClick={() => handleReaction('up')}
        className={`p-1 rounded transition-all duration-200 ${
          reaction === 'up'
            ? 'text-green-400 bg-green-400/10'
            : isDark
              ? 'text-gray-500 hover:text-green-400 hover:bg-green-400/10'
              : 'text-gray-400 hover:text-green-500 hover:bg-green-50'
        }`}
        aria-label={t.helpful}
      >
        <ThumbsUp size={13} />
      </motion.button>
      <motion.button
        whileTap={{ scale: 0.8 }}
        onClick={() => handleReaction('down')}
        className={`p-1 rounded transition-all duration-200 ${
          reaction === 'down'
            ? 'text-red-400 bg-red-400/10'
            : isDark
              ? 'text-gray-500 hover:text-red-400 hover:bg-red-400/10'
              : 'text-gray-400 hover:text-red-500 hover:bg-red-50'
        }`}
        aria-label={t.notHelpful}
      >
        <ThumbsDown size={13} />
      </motion.button>
    </div>
  );
}

export default MessageReactions;
