import { motion } from 'framer-motion';
import { useTheme } from '../context/ThemeContext';

function SuggestedChips({ suggestions, onSelect }) {
  const { isDark } = useTheme();

  if (!suggestions || suggestions.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.2 }}
      className="flex flex-wrap gap-2 mt-2 ml-8"
    >
      {suggestions.map((suggestion, i) => (
        <motion.button
          key={i}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 * i }}
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          onClick={() => onSelect(suggestion)}
          className={`text-xs px-3 py-1.5 rounded-full border transition-all duration-200 ${
            isDark
              ? 'bg-navy-700/80 border-navy-600 text-gray-300 hover:border-accent hover:text-accent hover:bg-accent/10'
              : 'bg-gray-100 border-gray-200 text-gray-600 hover:border-accent hover:text-accent hover:bg-accent/5'
          }`}
        >
          {suggestion}
        </motion.button>
      ))}
    </motion.div>
  );
}

export default SuggestedChips;
