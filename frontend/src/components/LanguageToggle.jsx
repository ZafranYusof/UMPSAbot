import { motion } from 'framer-motion';
import { Languages } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';

function LanguageToggle() {
  const { language, toggleLanguage } = useLanguage();
  const { isDark } = useTheme();

  return (
    <motion.button
      whileTap={{ scale: 0.9 }}
      onClick={toggleLanguage}
      className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
        isDark
          ? 'hover:bg-navy-700 text-gray-400 hover:text-accent'
          : 'hover:bg-gray-100 text-gray-500 hover:text-accent'
      }`}
      aria-label="Toggle language"
      title={language === 'en' ? 'Switch to Bahasa Melayu' : 'Switch to English'}
    >
      <Languages size={16} />
      <span className="uppercase">{language === 'en' ? 'EN' : 'BM'}</span>
    </motion.button>
  );
}

export default LanguageToggle;
