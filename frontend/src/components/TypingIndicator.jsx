import { motion } from 'framer-motion';
import { useTheme } from '../context/ThemeContext';

function TypingIndicator() {
  const { isDark } = useTheme();

  return (
    <div className="flex justify-start">
      <div className="max-w-[85%] md:max-w-[70%]">
        <div className="flex items-center gap-2 mb-1.5 ml-1">
          <div className="w-6 h-6 rounded-full bg-accent/15 border border-accent/25 flex items-center justify-center">
            <span className="text-[10px] font-bold text-accent">U</span>
          </div>
          <span className={`text-xs font-medium ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
            UMPSABot
          </span>
        </div>
        <div className={`inline-flex items-center gap-2 px-5 py-3.5 rounded-2xl rounded-bl-sm border ${
          isDark
            ? 'bg-navy-700/60 border-navy-600/40'
            : 'bg-white border-gray-200 shadow-sm'
        }`}>
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              className={`w-2 h-2 rounded-full ${isDark ? 'bg-accent/70' : 'bg-accent/60'}`}
              animate={{
                y: [0, -6, 0],
                opacity: [0.4, 1, 0.4]
              }}
              transition={{
                duration: 1.2,
                repeat: Infinity,
                ease: 'easeInOut',
                delay: i * 0.15
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

export default TypingIndicator;
