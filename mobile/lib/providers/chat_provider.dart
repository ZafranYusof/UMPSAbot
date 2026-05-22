import 'dart:async';
import 'package:flutter/material.dart';
import 'package:uuid/uuid.dart';
import '../models/message.dart';
import '../models/conversation.dart';
import '../services/api_service.dart';
import '../services/storage_service.dart';

class ChatProvider extends ChangeNotifier {
  final ApiService _api;
  final StorageService _storage;

  List<Message> _messages = [];
  List<Conversation> _conversations = [];
  List<Message> _bookmarks = [];
  bool _isTyping = false;
  bool _isOnline = true;
  bool _isLoadingHistory = false;
  String _sessionId = '';
  String _language = 'en';
  StreamSubscription? _streamSubscription;

  ChatProvider(this._api, this._storage) {
    _initSession();
    _language = _storage.language; // Load saved language preference
    _loadConversations();
    _loadBookmarks();
  }

  List<Message> get messages => _messages;
  List<Conversation> get conversations => _conversations;
  List<Message> get bookmarks => _bookmarks;
  bool get isTyping => _isTyping;
  bool get isOnline => _isOnline;
  bool get isLoadingHistory => _isLoadingHistory;
  String get sessionId => _sessionId;
  String get language => _language;

  void _initSession() {
    final stored = _storage.sessionId;
    if (stored != null && stored.isNotEmpty) {
      _sessionId = stored;
    } else {
      _sessionId = const Uuid().v4();
      _storage.setSessionId(_sessionId);
    }
  }

  Future<void> _loadConversations() async {
    _conversations = await _storage.getConversations();
    notifyListeners();
  }

  Future<void> _loadBookmarks() async {
    _bookmarks = await _storage.getBookmarks();
    notifyListeners();
  }

  Future<void> refreshConversations() async {
    _isLoadingHistory = true;
    notifyListeners();
    await Future.delayed(const Duration(milliseconds: 500));
    _conversations = await _storage.getConversations();
    _isLoadingHistory = false;
    notifyListeners();
  }

  void setOnlineStatus(bool online) {
    _isOnline = online;
    notifyListeners();
  }

  void setLanguage(String lang) {
    _language = lang;
  }

  Future<void> sendMessage(String text) async {
    if (text.trim().isEmpty) return;

    final userMessage = Message(
      id: const Uuid().v4(),
      content: text.trim(),
      isUser: true,
      timestamp: DateTime.now(),
    );

    _messages.add(userMessage);
    _isTyping = true;
    notifyListeners();

    if (!_isOnline) {
      _messages.add(Message(
        id: const Uuid().v4(),
        content: 'No internet connection. Please check your network and try again.',
        isUser: false,
        timestamp: DateTime.now(),
        isError: true,
      ));
      _isTyping = false;
      notifyListeners();
      return;
    }

    // Try streaming first, fallback to regular send
    try {
      await _sendWithStreaming(text.trim());
    } catch (_) {
      // Fallback to regular send
      try {
        final botMessage = await _api.sendMessage(
          message: text.trim(),
          sessionId: _sessionId,
          language: _language,
        );
        _messages.add(botMessage);
      } on ApiException catch (e) {
        _messages.add(Message(
          id: const Uuid().v4(),
          content: e.message,
          isUser: false,
          timestamp: DateTime.now(),
          isError: true,
        ));
      } catch (e) {
        _messages.add(Message(
          id: const Uuid().v4(),
          content: 'Something went wrong. Please try again.',
          isUser: false,
          timestamp: DateTime.now(),
          isError: true,
        ));
      }
    } finally {
      _isTyping = false;
      notifyListeners();
      await _saveCurrentConversation();
      await _storage.cacheRecentConversations();
    }
  }

  Future<void> _sendWithStreaming(String text) async {
    final messageId = const Uuid().v4();
    String accumulatedContent = '';
    List<String>? sources;
    List<String>? suggestions;
    double? confidence;
    String? intent;

    // Add placeholder streaming message
    _messages.add(Message(
      id: messageId,
      content: '',
      isUser: false,
      timestamp: DateTime.now(),
      isStreaming: true,
    ));
    _isTyping = false;
    notifyListeners();

    final completer = Completer<void>();

    _streamSubscription = _api
        .streamMessage(
      message: text,
      sessionId: _sessionId,
      language: _language,
    )
        .listen(
      (event) {
        if (event.type == 'chunk') {
          accumulatedContent += event.content ?? '';
          final idx = _messages.indexWhere((m) => m.id == messageId);
          if (idx >= 0) {
            _messages[idx] = _messages[idx].copyWith(
              content: accumulatedContent,
            );
            notifyListeners();
          }
        } else if (event.type == 'done') {
          sources = event.sources;
          suggestions = event.suggestions;
          confidence = event.confidence;
          intent = event.intent;
        }
      },
      onDone: () {
        final idx = _messages.indexWhere((m) => m.id == messageId);
        if (idx >= 0) {
          _messages[idx] = _messages[idx].copyWith(
            content: accumulatedContent.isNotEmpty
                ? accumulatedContent
                : 'No response received.',
            isStreaming: false,
            sources: sources,
            suggestions: suggestions,
            confidence: confidence,
            intent: intent,
          );
          notifyListeners();
        }
        _streamSubscription = null;
        if (!completer.isCompleted) completer.complete();
      },
      onError: (error) {
        _streamSubscription = null;
        // Remove the streaming placeholder
        _messages.removeWhere((m) => m.id == messageId);
        notifyListeners();
        if (!completer.isCompleted) completer.completeError(error);
      },
      cancelOnError: true,
    );

    return completer.future;
  }

  Future<void> retryLastMessage() async {
    if (_messages.length < 2) return;

    // Remove the error message
    final lastMsg = _messages.last;
    if (!lastMsg.isUser && lastMsg.isError) {
      _messages.removeLast();
      // Get the last user message
      final lastUserMsg = _messages.lastWhere((m) => m.isUser, orElse: () => _messages.last);
      notifyListeners();
      await sendMessage(lastUserMsg.content);
    }
  }

  Future<void> _saveCurrentConversation() async {
    if (_messages.isEmpty) return;

    final title = _messages.first.content.length > 40
        ? '${_messages.first.content.substring(0, 40)}...'
        : _messages.first.content;

    final conversation = Conversation(
      id: _sessionId,
      sessionId: _sessionId,
      title: title,
      createdAt: _messages.first.timestamp,
      updatedAt: DateTime.now(),
      messages: List.from(_messages),
    );

    await _storage.saveConversation(conversation);
    await _loadConversations();
  }

  void loadConversation(Conversation conversation) {
    _messages = List.from(conversation.messages);
    _sessionId = conversation.sessionId;
    _storage.setSessionId(_sessionId);
    notifyListeners();
  }

  void startNewChat() {
    _messages = [];
    _sessionId = const Uuid().v4();
    _storage.setSessionId(_sessionId);
    notifyListeners();
  }

  Future<void> deleteConversation(String id) async {
    await _storage.deleteConversation(id);
    await _loadConversations();
  }

  Future<void> clearAllHistory() async {
    await _storage.clearAllConversations();
    _conversations = [];
    notifyListeners();
  }

  // Bookmarks
  Future<void> toggleBookmark(Message message) async {
    final isCurrentlyBookmarked = _bookmarks.any((b) => b.id == message.id);
    if (isCurrentlyBookmarked) {
      await _storage.removeBookmark(message.id);
    } else {
      await _storage.addBookmark(message);
    }
    await _loadBookmarks();

    // Update message in current list
    final idx = _messages.indexWhere((m) => m.id == message.id);
    if (idx >= 0) {
      _messages[idx] = _messages[idx].copyWith(
        isBookmarked: !isCurrentlyBookmarked,
      );
      notifyListeners();
    }
  }

  bool isMessageBookmarked(String messageId) {
    return _bookmarks.any((b) => b.id == messageId);
  }

  // Offline mode
  Future<List<Conversation>> getCachedConversations() async {
    return _storage.getCachedConversations();
  }

  @override
  void dispose() {
    _streamSubscription?.cancel();
    super.dispose();
  }
}
