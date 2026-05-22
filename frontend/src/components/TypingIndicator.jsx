function TypingIndicator() {
  return (
    <div className="flex justify-start animate-fade-in-up">
      <div className="px-4 py-3">
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-accent/60 animate-typing-bounce" />
          <span className="w-2 h-2 rounded-full bg-accent/60 animate-typing-bounce [animation-delay:0.2s]" />
          <span className="w-2 h-2 rounded-full bg-accent/60 animate-typing-bounce [animation-delay:0.4s]" />
        </div>
      </div>
    </div>
  );
}

export default TypingIndicator;
