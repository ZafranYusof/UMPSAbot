function SuggestedChips({ suggestions, onSelect }) {
  if (!suggestions || suggestions.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2 mt-3 ml-1">
      {suggestions.map((suggestion, i) => (
        <button
          key={i}
          onClick={() => onSelect(suggestion)}
          className="animate-chip-fade-in text-xs px-4 py-2 rounded-full border border-border text-accent hover:bg-accent/10 hover:border-accent/40 hover:shadow-[0_0_8px_rgba(212,175,55,0.15)] transition-all duration-200"
          style={{ animationDelay: `${i * 0.08}s` }}
        >
          {suggestion}
        </button>
      ))}
    </div>
  );
}

export default SuggestedChips;
