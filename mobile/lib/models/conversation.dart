import 'message.dart';

class Conversation {
  final String id;
  final String sessionId;
  final String title;
  final DateTime createdAt;
  final DateTime updatedAt;
  final List<Message> messages;

  Conversation({
    required this.id,
    required this.sessionId,
    required this.title,
    required this.createdAt,
    required this.updatedAt,
    required this.messages,
  });

  Map<String, dynamic> toJson() => {
        'id': id,
        'sessionId': sessionId,
        'title': title,
        'createdAt': createdAt.toIso8601String(),
        'updatedAt': updatedAt.toIso8601String(),
        'messages': messages.map((m) => m.toJson()).toList(),
      };

  factory Conversation.fromJson(Map<String, dynamic> json) => Conversation(
        id: json['id'] as String,
        sessionId: json['sessionId'] as String,
        title: json['title'] as String,
        createdAt: DateTime.parse(json['createdAt'] as String),
        updatedAt: DateTime.parse(json['updatedAt'] as String),
        messages: (json['messages'] as List<dynamic>)
            .map((m) => Message.fromJson(m as Map<String, dynamic>))
            .toList(),
      );
}
