function TypingIndicator() {
  return (
    <div className="flex justify-start">
      <div className="px-4 py-3">
        <div className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-text-secondary animate-pulse" />
          <span className="w-1.5 h-1.5 rounded-full bg-text-secondary animate-pulse [animation-delay:0.2s]" />
          <span className="w-1.5 h-1.5 rounded-full bg-text-secondary animate-pulse [animation-delay:0.4s]" />
        </div>
      </div>
    </div>
  );
}

export default TypingIndicator;
