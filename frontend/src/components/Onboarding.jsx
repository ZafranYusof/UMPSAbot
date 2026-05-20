import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLanguage } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';

function Onboarding({ onComplete }) {
  const [step, setStep] = useState(0);
  const { t } = useLanguage();
  const { isDark } = useTheme();

  const steps = [
    {
      icon: '🎓',
      title: t.onboarding.step1Title,
      description: t.onboarding.step1Desc
    },
    {
      icon: '💬',
      title: t.onboarding.step2Title,
      description: t.onboarding.step2Desc
    },
    {
      icon: '🚀',
      title: t.onboarding.step3Title,
      description: t.onboarding.step3Desc
    }
  ];

  const handleNext = () => {
    if (step < steps.length - 1) {
      setStep(step + 1);
    } else {
      localStorage.setItem('umpsa-onboarded', 'true');
      onComplete();
    }
  };

  const handleBack = () => {
    if (step > 0) setStep(step - 1);
  };

  const handleSkip = () => {
    localStorage.setItem('umpsa-onboarded', 'true');
    onComplete();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className={`absolute inset-0 ${isDark ? 'bg-navy-900/95' : 'bg-black/50'} backdrop-blur-sm`}
        onClick={handleSkip}
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className={`relative z-10 w-full max-w-md rounded-2xl p-8 ${
          isDark
            ? 'bg-navy-800 border border-navy-700'
            : 'bg-white border border-gray-200 shadow-xl'
        }`}
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
            className="text-center"
          >
            <div className="text-5xl mb-4">{steps[step].icon}</div>
            <h2 className={`text-xl font-bold mb-3 ${isDark ? 'text-white' : 'text-gray-900'}`}>
              {steps[step].title}
            </h2>
            <p className={`text-sm leading-relaxed ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
              {steps[step].description}
            </p>
          </motion.div>
        </AnimatePresence>

        {/* Progress dots */}
        <div className="flex justify-center gap-2 mt-6 mb-6">
          {steps.map((_, i) => (
            <div
              key={i}
              className={`w-2 h-2 rounded-full transition-all duration-300 ${
                i === step
                  ? 'bg-accent w-6'
                  : isDark ? 'bg-navy-600' : 'bg-gray-300'
              }`}
            />
          ))}
        </div>

        {/* Buttons */}
        <div className="flex items-center justify-between">
          <button
            onClick={handleBack}
            className={`px-4 py-2 text-sm rounded-lg transition-colors ${
              step === 0
                ? 'opacity-0 pointer-events-none'
                : isDark
                  ? 'text-gray-400 hover:text-white hover:bg-navy-700'
                  : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100'
            }`}
          >
            {t.onboarding.back}
          </button>
          <button
            onClick={handleNext}
            className="px-6 py-2.5 text-sm font-medium rounded-lg bg-accent hover:bg-accent-dark text-white transition-colors"
          >
            {step === steps.length - 1 ? t.onboarding.getStarted : t.onboarding.next}
          </button>
        </div>

        {/* Skip */}
        <button
          onClick={handleSkip}
          className={`absolute top-4 right-4 text-xs ${
            isDark ? 'text-gray-500 hover:text-gray-300' : 'text-gray-400 hover:text-gray-600'
          } transition-colors`}
        >
          Skip
        </button>
      </motion.div>
    </div>
  );
}

export default Onboarding;
