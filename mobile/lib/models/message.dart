class Message {
  final String id;
  final String content;
  final bool isUser;
  final DateTime timestamp;
  final List<String>? sources;
  final List<String>? suggestions;
  final double? confidence;
  final String? intent;
  final bool isBookmarked;
  final bool isStreaming;
  final bool isError;

  Message({
    required this.id,
    required this.content,
    required this.isUser,
    required this.timestamp,
    this.sources,
    this.suggestions,
    this.confidence,
    this.intent,
    this.isBookmarked = false,
    this.isStreaming = false,
    this.isError = false,
  });

  Message copyWith({
    String? id,
    String? content,
    bool? isUser,
    DateTime? timestamp,
    List<String>? sources,
    List<String>? suggestions,
    double? confidence,
    String? intent,
    bool? isBookmarked,
    bool? isStreaming,
    bool? isError,
  }) {
    return Message(
      id: id ?? this.id,
      content: content ?? this.content,
      isUser: isUser ?? this.isUser,
      timestamp: timestamp ?? this.timestamp,
      sources: sources ?? this.sources,
      suggestions: suggestions ?? this.suggestions,
      confidence: confidence ?? this.confidence,
      intent: intent ?? this.intent,
      isBookmarked: isBookmarked ?? this.isBookmarked,
      isStreaming: isStreaming ?? this.isStreaming,
      isError: isError ?? this.isError,
    );
  }

  Map<String, dynamic> toJson() => {
        'id': id,
        'content': content,
        'isUser': isUser,
        'timestamp': timestamp.toIso8601String(),
        'sources': sources,
        'suggestions': suggestions,
        'confidence': confidence,
        'intent': intent,
        'isBookmarked': isBookmarked,
      };

  factory Message.fromJson(Map<String, dynamic> json) => Message(
        id: json['id'] as String,
        content: json['content'] as String,
        isUser: json['isUser'] as bool,
        timestamp: DateTime.parse(json['timestamp'] as String),
        sources: (json['sources'] as List<dynamic>?)?.cast<String>(),
        suggestions: (json['suggestions'] as List<dynamic>?)?.cast<String>(),
        confidence: (json['confidence'] as num?)?.toDouble(),
        intent: json['intent'] as String?,
        isBookmarked: json['isBookmarked'] as bool? ?? false,
      );
}
