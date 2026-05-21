import { motion } from 'framer-motion';
import { MessageSquare, BookOpen, Globe, Shield, ArrowRight, Calendar, Search, Zap, Github } from 'lucide-react';

function Landing() {
  const features = [
    {
      icon: <MessageSquare className="text-accent" size={22} />,
      title: 'Smart Chat',
      description: 'Ask questions in BM or English. Get accurate answers about UMPSA instantly.'
    },
    {
      icon: <BookOpen className="text-accent" size={22} />,
      title: 'Knowledge-Powered',
      description: 'Answers grounded in official UMPSA documents with source citations.'
    },
    {
      icon: <Globe className="text-accent" size={22} />,
      title: 'Bilingual',
      description: 'Fully supports Bahasa Melayu and English. Mix both — we understand.'
    },
    {
      icon: <Shield className="text-accent" size={22} />,
      title: 'Reliable',
      description: 'Tells you when it\'s unsure. No hallucinated answers — just honest help.'
    }
  ];

  const steps = [
    { icon: <MessageSquare size={28} />, label: 'Ask', desc: 'Type your question in BM or English' },
    { icon: <Search size={28} />, label: 'Search', desc: 'AI searches through 96 official documents' },
    { icon: <Zap size={28} />, label: 'Answer', desc: 'Get accurate answers with source citations' }
  ];

  const stats = [
    { value: '96', label: 'Documents Indexed' },
    { value: 'BM & EN', label: 'Bilingual Support' },
    { value: '< 3s', label: 'Response Time' }
  ];

  return (
    <div className="min-h-screen bg-navy-900 flex flex-col relative overflow-hidden">
      {/* Noise overlay */}
      <div className="noise-overlay" />

      {/* Background gradient orbs */}
      <div className="gradient-orb gradient-orb-cyan w-[500px] h-[500px] -top-48 -right-48 animate-float" />
      <div className="gradient-orb gradient-orb-gold w-[300px] h-[300px] top-1/3 -left-32 animate-float-delayed" />
      <div className="gradient-orb gradient-orb-blue w-[400px] h-[400px] bottom-0 right-1/4 animate-float-slow" />

      {/* Grid pattern */}
      <div className="absolute inset-0 grid-pattern" />

      {/* Nav */}
      <nav className="relative z-10 px-6 py-5 flex items-center justify-between max-w-6xl mx-auto w-full">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-accent/15 border border-accent/20 flex items-center justify-center">
            <span className="text-base font-bold text-accent">U</span>
          </div>
          <div>
            <span className="font-bold text-white text-sm tracking-tight">UMPSA</span>
            <span className="font-bold text-accent text-sm">Bot</span>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <a href="/planner" className="text-sm text-gray-400 hover:text-white transition-colors hidden sm:block">
            Planner
          </a>
          <a href="/admin" className="text-sm text-gray-400 hover:text-white transition-colors hidden sm:block">
            Admin
          </a>
          <a href="/chat" className="btn-primary text-sm flex items-center gap-1.5">
            Start Chat <ArrowRight size={14} />
          </a>
        </div>
      </nav>

      {/* Hero */}
      <main className="relative z-10 flex-1 flex flex-col items-center px-6">
        <section className="flex flex-col items-center justify-center py-16 md:py-24">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
            className="text-center max-w-3xl"
          >
            {/* Badge */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.1 }}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-navy-800/80 border border-navy-700/60 text-xs text-gray-400 mb-8"
            >
              <span className="w-2 h-2 rounded-full bg-accent animate-pulse-slow" />
              FinTech Forward 2026 · AI For Good
            </motion.div>

            <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold text-white mb-6 leading-tight tracking-tight">
              Your Guide to{' '}
              <span className="gradient-text">UMPSA</span>
            </h1>
            <p className="text-base sm:text-lg text-gray-400 mb-10 max-w-xl mx-auto leading-relaxed">
              Get instant answers about academics, registration, facilities, and student life. 
              Grounded in official UMPSA documents.
            </p>

            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <motion.a
                href="/chat"
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                className="btn-primary text-base px-8 py-3.5 flex items-center justify-center gap-2 shadow-lg shadow-accent/20"
              >
                <MessageSquare size={18} />
                Start Chatting
              </motion.a>
              <motion.a
                href="/planner"
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                className="btn-secondary text-base px-8 py-3.5 flex items-center justify-center gap-2"
              >
                <Calendar size={18} />
                Timetable Planner
              </motion.a>
            </div>
          </motion.div>
        </section>

        {/* Stats */}
        <motion.section
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.6 }}
          className="w-full max-w-3xl mb-20"
        >
          <div className="grid grid-cols-3 gap-3 sm:gap-6">
            {stats.map((stat, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 + i * 0.1 }}
                className="text-center py-4 sm:py-6 px-2 glass-card"
              >
                <div className="text-xl sm:text-3xl font-bold text-white mb-1">{stat.value}</div>
                <div className="text-[10px] sm:text-xs text-gray-400 uppercase tracking-wider">{stat.label}</div>
              </motion.div>
            ))}
          </div>
        </motion.section>

        {/* How it works */}
        <motion.section
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.6 }}
          className="w-full max-w-4xl mb-20"
        >
          <h2 className="text-center text-sm uppercase tracking-widest text-gray-500 mb-2">How it works</h2>
          <p className="text-center text-xl sm:text-2xl font-semibold text-white mb-10">Three simple steps</p>
          
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6 relative">
            {/* Connector line (desktop only) */}
            <div className="hidden sm:block absolute top-12 left-[20%] right-[20%] h-px bg-gradient-to-r from-transparent via-accent/30 to-transparent" />
            
            {steps.map((step, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 + i * 0.15 }}
                className="glass-card p-6 text-center relative"
              >
                <div className="w-14 h-14 rounded-full bg-accent/10 border border-accent/20 flex items-center justify-center mx-auto mb-4 text-accent">
                  {step.icon}
                </div>
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-6 h-6 rounded-full bg-navy-900 border border-accent/40 flex items-center justify-center">
                  <span className="text-[10px] font-bold text-accent">{i + 1}</span>
                </div>
                <h3 className="text-base font-semibold text-white mb-1">{step.label}</h3>
                <p className="text-xs text-gray-400">{step.desc}</p>
              </motion.div>
            ))}
          </div>
        </motion.section>

        {/* Features */}
        <motion.section
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7, duration: 0.6 }}
          className="w-full max-w-5xl mb-20"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {features.map((feature, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.8 + i * 0.1 }}
                className="glass-card-hover p-5 text-center group"
              >
                <div className="w-12 h-12 rounded-lg bg-accent/10 border border-accent/20 flex items-center justify-center mx-auto mb-3 group-hover:border-accent/40 transition-colors">
                  {feature.icon}
                </div>
                <h3 className="text-sm font-semibold text-white mb-1">{feature.title}</h3>
                <p className="text-xs text-gray-400 leading-relaxed">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </motion.section>
      </main>

      {/* Footer */}
      <footer className="relative z-10 px-6 py-6 border-t border-navy-800/60">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs text-gray-500">
            © 2026 UMPSABot · Universiti Malaysia Pahang Al-Sultan Abdullah
          </p>
          <div className="flex items-center gap-4">
            <a
              href="https://github.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-500 hover:text-gray-300 transition-colors"
              aria-label="GitHub"
            >
              <Github size={16} />
            </a>
            <span className="text-[10px] text-gray-600">Built for FinTech Forward 2026</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default Landing;
