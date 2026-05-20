import { motion } from 'framer-motion';
import { useTheme } from '../context/ThemeContext';

function TypingIndicator() {
  const { isDark } = useTheme();

  return (
    <div className="flex justify-start">
      <div className="max-w-[85%] md:max-w-[70%]">
        <div className="flex items-center gap-2 mb-1 ml-1">
          <div className="w-6 h-6 rounded-full bg-accent/30 flex items-center justify-center">
            <span className="text-xs">🎓</span>
          </div>
          <span className={`text-xs font-medium ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
            UMPSABot
          </span>
        </div>
        <div className={`inline-flex items-center gap-1.5 px-4 py-3 rounded-2xl rounded-bl-md border ${
          isDark
            ? 'bg-navy-700/80 border-navy-600/50'
            : 'bg-white border-gray-200 shadow-sm'
        }`}>
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              className="w-2 h-2 rounded-full bg-accent"
              animate={{
                scale: [0.6, 1, 0.6],
                opacity: [0.4, 1, 0.4]
              }}
              transition={{
                duration: 1.4,
                repeat: Infinity,
                ease: 'easeInOut',
                delay: i * 0.2
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

export default TypingIndicator;
