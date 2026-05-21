import { ArrowRight } from 'lucide-react';

function Landing() {
  return (
    <div className="min-h-screen bg-primary flex flex-col items-center justify-center px-6">
      <div className="text-center max-w-lg">
        {/* Title */}
        <h1 className="text-4xl sm:text-5xl font-bold text-text-primary mb-2 tracking-tight">
          UMPSABot
        </h1>
        <p className="text-text-secondary text-base mb-10">
          AI assistant for UMPSA students
        </p>

        {/* Start Chat Button */}
        <a
          href="/chat"
          className="btn-primary inline-flex items-center gap-2 text-base px-8 py-3"
        >
          Start Chat <ArrowRight size={16} />
        </a>

        {/* Feature lines */}
        <div className="mt-12 space-y-2 text-sm text-text-secondary">
          <p>Ask in BM or English — we understand both</p>
          <p>Answers grounded in 96 official UMPSA documents</p>
          <p>Source citations so you can verify</p>
        </div>
      </div>

      {/* Footer */}
      <footer className="absolute bottom-6 text-xs text-text-secondary">
        Built for FinTech Forward 2026
      </footer>
    </div>
  );
}

export default Landing;
