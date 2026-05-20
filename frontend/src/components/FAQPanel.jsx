import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { HelpCircle, X } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';

const faqQuestions = {
  en: [
    'How do I register for courses?',
    'What is the grading system at UMPSA?',
    'How to apply for hostel?',
    'What are the FYP requirements?',
    'How to check exam results?',
    'What facilities are available on campus?',
    'How to apply for scholarship?',
    'What is the academic calendar?',
    'How to contact student affairs?',
    'What clubs and societies can I join?'
  ],
  bm: [
    'Macam mana nak daftar kursus?',
    'Apakah sistem gred di UMPSA?',
    'Macam mana nak apply hostel?',
    'Apakah syarat FYP?',
    'Macam mana nak check keputusan peperiksaan?',
    'Apakah kemudahan yang ada di kampus?',
    'Macam mana nak apply biasiswa?',
    'Apakah kalendar akademik?',
    'Macam mana nak hubungi hal ehwal pelajar?',
    'Apakah kelab dan persatuan yang boleh disertai?'
  ]
};

function FAQPanel({ onSelectQuestion }) {
  const [isOpen, setIsOpen] = useState(false);
  const { isDark } = useTheme();
  const { t, language } = useLanguage();

  const questions = faqQuestions[language] || faqQuestions.en;

  const handleSelect = (question) => {
    onSelectQuestion(question);
    setIsOpen(false);
  };

  return (
    <>
      {/* Floating FAQ Button */}
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen(true)}
        className={`fixed bottom-24 right-4 z-50 w-12 h-12 rounded-full shadow-lg flex items-center justify-center transition-colors ${
          isDark
            ? 'bg-accent hover:bg-accent-dark text-white shadow-accent/20'
            : 'bg-accent hover:bg-accent-dark text-white shadow-accent/30'
        }`}
        aria-label={t.faq}
      >
        <HelpCircle size={22} />
      </motion.button>

      {/* FAQ Panel */}
      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm"
              onClick={() => setIsOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, y: 50, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 50, scale: 0.95 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className={`fixed bottom-4 right-4 left-4 md:left-auto md:w-96 z-50 max-h-[70vh] rounded-2xl overflow-hidden flex flex-col ${
                isDark
                  ? 'bg-navy-800 border border-navy-700'
                  : 'bg-white border border-gray-200 shadow-2xl'
              }`}
            >
              {/* Header */}
              <div className={`flex items-center justify-between p-4 border-b ${
                isDark ? 'border-navy-700' : 'border-gray-200'
              }`}>
                <h3 className={`font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  {t.faq}
                </h3>
                <button
                  onClick={() => setIsOpen(false)}
                  className={`p-1.5 rounded-lg transition-colors ${
                    isDark ? 'hover:bg-navy-700 text-gray-400' : 'hover:bg-gray-100 text-gray-500'
                  }`}
                  aria-label="Close FAQ"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Questions List */}
              <div className="flex-1 overflow-y-auto p-3 space-y-1.5">
                {questions.map((question, i) => (
                  <motion.button
                    key={i}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                    onClick={() => handleSelect(question)}
                    className={`w-full text-left text-sm px-3 py-2.5 rounded-lg transition-all duration-200 ${
                      isDark
                        ? 'text-gray-300 hover:bg-navy-700 hover:text-accent'
                        : 'text-gray-700 hover:bg-gray-50 hover:text-accent'
                    }`}
                  >
                    <span className="text-accent mr-2">•</span>
                    {question}
                  </motion.button>
                ))}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}

export default FAQPanel;
