function SuggestedChips({ suggestions, onSelect }) {
  if (!suggestions || suggestions.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2 mt-3 ml-1">
      {suggestions.map((suggestion, i) => (
        <button
          key={i}
          onClick={() => onSelect(suggestion)}
          className="text-xs px-3 py-1.5 rounded-lg border border-border text-accent hover:bg-accent/10 hover:border-accent/30 transition-colors"
        >
          {suggestion}
        </button>
      ))}
    </div>
  );
}

export default SuggestedChips;
