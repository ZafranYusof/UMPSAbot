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
    { number: '1', label: 'Ask', desc: 'Type your question in BM or English' },
    { number: '2', label: 'Search', desc: 'AI searches through 96 official documents' },
    { number: '3', label: 'Answer', desc: 'Get accurate answers with source citations' }
  ];

  const stats = [
    { value: '96', label: 'Documents Indexed' },
    { value: '3', label: 'Languages Supported' },
    { value: '< 3s', label: 'Response Time' }
  ];

  return (
    <div className="min-h-screen bg-navy-900 flex flex-col">
      {/* Nav */}
      <nav className="px-6 py-5 flex items-center justify-between max-w-6xl mx-auto w-full">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-accent/15 border border-accent/30 flex items-center justify-center">
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
      <main className="flex-1 flex flex-col items-center px-6">
        <section className="flex flex-col items-center justify-center py-16 md:py-24">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
            className="text-center max-w-3xl"
          >
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-navy-800 border border-navy-700 text-xs text-gray-400 mb-8">
              <span className="w-2 h-2 rounded-full bg-accent" />
              FinTech Forward 2026 · AI For Good
            </div>

            <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold text-white mb-6 leading-tight tracking-tight">
              Your Smart{' '}
              <span className="text-accent">Campus Assistant</span>
            </h1>
            <p className="text-base sm:text-lg text-gray-400 mb-10 max-w-xl mx-auto leading-relaxed">
              Helping UMPSA students get instant answers about academics, registration, facilities, and student life — grounded in official documents.
            </p>

            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <a
                href="/chat"
                className="btn-primary text-base px-8 py-3.5 flex items-center justify-center gap-2"
              >
                <MessageSquare size={18} />
                Start Chatting
              </a>
              <a
                href="/planner"
                className="btn-secondary text-base px-8 py-3.5 flex items-center justify-center gap-2"
              >
                <Calendar size={18} />
                Timetable Planner
              </a>
            </div>
          </motion.div>
        </section>

        {/* Stats */}
        <section className="w-full max-w-3xl mb-20">
          <div className="grid grid-cols-3 gap-3 sm:gap-6">
            {stats.map((stat, i) => (
              <div
                key={i}
                className="text-center py-5 sm:py-6 px-2 glass-card"
              >
                <div className="text-xl sm:text-3xl font-bold text-accent mb-1">{stat.value}</div>
                <div className="text-[10px] sm:text-xs text-gray-400 uppercase tracking-wider">{stat.label}</div>
              </div>
            ))}
          </div>
        </section>

        {/* How it works */}
        <section className="w-full max-w-4xl mb-20">
          <h2 className="text-center text-sm uppercase tracking-widest text-gray-500 mb-2">How it works</h2>
          <p className="text-center text-xl sm:text-2xl font-semibold text-white mb-10">Three simple steps</p>
          
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
            {steps.map((step, i) => (
              <div
                key={i}
                className="glass-card p-6 text-center relative"
              >
                <div className="w-12 h-12 rounded-full bg-accent/15 border border-accent/30 flex items-center justify-center mx-auto mb-4">
                  <span className="text-lg font-bold text-accent">{step.number}</span>
                </div>
                <h3 className="text-base font-semibold text-white mb-1">{step.label}</h3>
                <p className="text-xs text-gray-400">{step.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Features */}
        <section className="w-full max-w-5xl mb-20">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {features.map((feature, i) => (
              <div
                key={i}
                className="glass-card p-5 text-center"
              >
                <div className="w-12 h-12 rounded-lg bg-accent/10 border border-accent/25 flex items-center justify-center mx-auto mb-3">
                  {feature.icon}
                </div>
                <h3 className="text-sm font-semibold text-white mb-1">{feature.title}</h3>
                <p className="text-xs text-gray-400 leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="px-6 py-6 border-t border-navy-800">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs text-gray-500">
            © 2026 UMPSABot · Universiti Malaysia Pahang Al-Sultan Abdullah
          </p>
          <div className="flex items-center gap-4">
            <a
              href="https://github.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-500 hover:text-accent transition-colors"
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
