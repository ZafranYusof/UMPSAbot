import { Languages } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

function LanguageToggle() {
  const { language, toggleLanguage } = useLanguage();

  return (
    <button
      onClick={toggleLanguage}
      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-text-secondary hover:text-text-primary hover:bg-secondary transition-colors"
      aria-label="Toggle language"
      title={language === 'en' ? 'Switch to Bahasa Melayu' : 'Switch to English'}
    >
      <Languages size={16} />
      <span className="uppercase">{language === 'en' ? 'EN' : 'BM'}</span>
    </button>
  );
}

export default LanguageToggle;
