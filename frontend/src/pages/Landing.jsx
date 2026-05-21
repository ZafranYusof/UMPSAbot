import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Send, GraduationCap } from 'lucide-react';

function Landing() {
  const [query, setQuery] = useState('');
  const navigate = useNavigate();

  const handleSubmit = (e) => {
    e.preventDefault();
    if (query.trim()) {
      navigate('/chat', { state: { initialMessage: query.trim() } });
    } else {
      navigate('/chat');
    }
  };

  const suggestions = [
    'Macam mana nak daftar kursus?',
    'Berapa yuran semester sains komputer?',
    'How to apply for hostel?',
    'Plan timetable BCS2313 BCS3133',
  ];

  return (
    <div className="min-h-screen bg-primary flex flex-col">
      {/* Main content - centered */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 sm:px-6">
        {/* Logo + Title */}
        <div className="mb-8 text-center">
          <div className="w-16 h-16 rounded-2xl bg-secondary border border-border flex items-center justify-center mx-auto mb-4">
            <GraduationCap size={32} className="text-accent" />
          </div>
          <h1 className="text-3xl sm:text-4xl font-semibold text-text-primary tracking-tight">
            UMPSABot
          </h1>
          <p className="text-text-secondary text-sm mt-2">
            What can I help you with today?
          </p>
        </div>

        {/* Search/Chat Input - DeepSeek style */}
        <form onSubmit={handleSubmit} className="w-full max-w-2xl">
          <div className="relative bg-secondary border border-border rounded-2xl overflow-hidden transition-all focus-within:border-accent/50">
            <textarea
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit(e);
                }
              }}
              placeholder="Ask about UMPSA..."
              rows={3}
              className="w-full bg-transparent text-text-primary placeholder-text-secondary px-5 py-4 pr-14 resize-none focus:outline-none text-base"
            />
            <button
              type="submit"
              className={`absolute right-3 bottom-3 p-2 rounded-lg transition-all ${
                query.trim()
                  ? 'bg-accent text-primary-dark hover:bg-accent-dark'
                  : 'text-text-secondary cursor-default'
              }`}
            >
              <Send size={18} />
            </button>
          </div>
        </form>

        {/* Suggestion chips */}
        <div className="mt-6 flex flex-wrap justify-center gap-2 max-w-2xl">
          {suggestions.map((s, i) => (
            <button
              key={i}
              onClick={() => {
                setQuery(s);
                navigate('/chat', { state: { initialMessage: s } });
              }}
              className="px-4 py-2 text-sm text-text-secondary bg-secondary border border-border rounded-full hover:border-accent/50 hover:text-text-primary transition-all"
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Footer */}
      <footer className="py-4 text-center text-xs text-text-secondary border-t border-border">
        <span>UMPSABot</span>
        <span className="mx-2">·</span>
        <span>Built for FinTech Forward 2026</span>
        <span className="mx-2">·</span>
        <a href="https://github.com/ZafranYusof/umpsa-chatbot" className="hover:text-accent transition-colors">GitHub</a>
      </footer>
    </div>
  );
}

export default Landing;
