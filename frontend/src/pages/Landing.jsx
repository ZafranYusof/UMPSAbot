import { motion } from 'framer-motion';
import { MessageSquare, BookOpen, Globe, Shield, ArrowRight } from 'lucide-react';

function Landing() {
  const features = [
    {
      icon: <MessageSquare className="text-accent" size={24} />,
      title: 'Smart Chat',
      description: 'Ask questions in BM or English. Get accurate answers about UMPSA instantly.'
    },
    {
      icon: <BookOpen className="text-accent" size={24} />,
      title: 'Knowledge-Powered',
      description: 'Answers grounded in official UMPSA documents with source citations.'
    },
    {
      icon: <Globe className="text-accent" size={24} />,
      title: 'Bilingual',
      description: 'Fully supports Bahasa Melayu and English. Mix both — we understand.'
    },
    {
      icon: <Shield className="text-accent" size={24} />,
      title: 'Reliable',
      description: 'Tells you when it\'s unsure. No hallucinated answers — just honest help.'
    }
  ];

  return (
    <div className="min-h-screen bg-navy-900 flex flex-col">
      {/* Nav */}
      <nav className="px-6 py-4 flex items-center justify-between max-w-6xl mx-auto w-full">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-accent/20 flex items-center justify-center">
            <span className="text-sm">🤖</span>
          </div>
          <span className="font-semibold text-white">UMPSABot</span>
        </div>
        <div className="flex items-center gap-4">
          <a href="/admin" className="text-sm text-gray-400 hover:text-white transition-colors">
            Admin
          </a>
          <a href="/chat" className="btn-primary text-sm flex items-center gap-1">
            Start Chat <ArrowRight size={14} />
          </a>
        </div>
      </nav>

      {/* Hero */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 py-16">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center max-w-2xl"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
            className="w-20 h-20 rounded-full bg-accent/20 flex items-center justify-center mx-auto mb-6"
          >
            <span className="text-4xl">🤖</span>
          </motion.div>

          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
            Your AI Guide to{' '}
            <span className="text-accent">UMPSA</span>
          </h1>
          <p className="text-lg text-gray-400 mb-8 max-w-lg mx-auto">
            Get instant answers about academics, registration, facilities, and student life. 
            Powered by AI, grounded in official UMPSA documents.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <a
              href="/chat"
              className="btn-primary text-base px-6 py-3 flex items-center justify-center gap-2"
            >
              <MessageSquare size={18} />
              Start Chatting
            </a>
            <a
              href="/admin"
              className="btn-secondary text-base px-6 py-3 flex items-center justify-center gap-2"
            >
              <BookOpen size={18} />
              Manage Knowledge Base
            </a>
          </div>
        </motion.div>

        {/* Features */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.6 }}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-20 max-w-5xl w-full"
        >
          {features.map((feature, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 + i * 0.1 }}
              className="glass-card p-5 text-center"
            >
              <div className="w-12 h-12 rounded-lg bg-accent/10 flex items-center justify-center mx-auto mb-3">
                {feature.icon}
              </div>
              <h3 className="text-sm font-semibold text-white mb-1">{feature.title}</h3>
              <p className="text-xs text-gray-400">{feature.description}</p>
            </motion.div>
          ))}
        </motion.div>

        {/* Hackathon Badge */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
          className="mt-16 text-center"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-navy-800 border border-navy-700 text-xs text-gray-400">
            <span className="w-2 h-2 rounded-full bg-accent animate-pulse-slow" />
            Built for FinTech Forward 2026 · Track 2: AI For Good
          </div>
        </motion.div>
      </main>

      {/* Footer */}
      <footer className="px-6 py-4 border-t border-navy-800 text-center">
        <p className="text-xs text-gray-500">
          © 2026 UMPSABot · Universiti Malaysia Pahang Al-Sultan Abdullah
        </p>
      </footer>
    </div>
  );
}

export default Landing;
