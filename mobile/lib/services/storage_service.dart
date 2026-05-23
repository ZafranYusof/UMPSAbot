import 'dart:convert';
import 'package:shared_preferences/shared_preferences.dart';
import '../models/conversation.dart';
import '../models/message.dart';

class StorageService {
  static const String _conversationsKey = 'conversations';
  static const String _onboardingKey = 'onboarding_complete';
  static const String _themeKey = 'theme_mode';
  static const String _languageKey = 'language';
  static const String _sessionIdKey = 'session_id';
  static const String _bookmarksKey = 'bookmarked_messages';
  static const String _cachedConversationsKey = 'cached_conversations';
  static const String _facultyKey = 'user_faculty';
  static const String _yearKey = 'user_year';
  static const String _authTokenKey = 'auth_token';
  static const String _userRoleKey = 'user_role';
  static const String _userNameKey = 'user_name';
  static const String _userEmailKey = 'user_email';

  late SharedPreferences _prefs;

  Future<void> init() async {
    _prefs = await SharedPreferences.getInstance();
  }

  // Onboarding
  bool get isOnboardingComplete => _prefs.getBool(_onboardingKey) ?? false;

  Future<void> setOnboardingComplete() async {
    await _prefs.setBool(_onboardingKey, true);
  }

  // Auth Token
  String? get authToken => _prefs.getString(_authTokenKey);

  Future<void> setAuthToken(String token) async {
    await _prefs.setString(_authTokenKey, token);
  }

  Future<void> clearAuthToken() async {
    await _prefs.remove(_authTokenKey);
  }

  // User Role
  String? get userRole => _prefs.getString(_userRoleKey);

  Future<void> setUserRole(String role) async {
    await _prefs.setString(_userRoleKey, role);
  }

  // User Name
  String? get userName => _prefs.getString(_userNameKey);

  Future<void> setUserName(String name) async {
    await _prefs.setString(_userNameKey, name);
  }

  // User Email
  String? get userEmail => _prefs.getString(_userEmailKey);

  Future<void> setUserEmail(String email) async {
    await _prefs.setString(_userEmailKey, email);
  }

  // Faculty
  String? get faculty => _prefs.getString(_facultyKey);

  Future<void> setFaculty(String faculty) async {
    await _prefs.setString(_facultyKey, faculty);
  }

  // Year
  int? get year {
    final val = _prefs.getInt(_yearKey);
    return val;
  }

  Future<void> setYear(int year) async {
    await _prefs.setInt(_yearKey, year);
  }

  // Theme
  String get themeMode => _prefs.getString(_themeKey) ?? 'dark';

  Future<void> setThemeMode(String mode) async {
    await _prefs.setString(_themeKey, mode);
  }

  // Language
  String get language => _prefs.getString(_languageKey) ?? 'en';

  Future<void> setLanguage(String lang) async {
    await _prefs.setString(_languageKey, lang);
  }

  // Session ID
  String? get sessionId => _prefs.getString(_sessionIdKey);

  Future<void> setSessionId(String id) async {
    await _prefs.setString(_sessionIdKey, id);
  }

  // Conversations
  Future<List<Conversation>> getConversations() async {
    final jsonStr = _prefs.getString(_conversationsKey);
    if (jsonStr == null) return [];

    final List<dynamic> jsonList = json.decode(jsonStr) as List<dynamic>;
    return jsonList
        .map((j) => Conversation.fromJson(j as Map<String, dynamic>))
        .toList();
  }

  Future<void> saveConversation(Conversation conversation) async {
    final conversations = await getConversations();
    final index = conversations.indexWhere((c) => c.id == conversation.id);

    if (index >= 0) {
      conversations[index] = conversation;
    } else {
      conversations.insert(0, conversation);
    }

    final jsonStr =
        json.encode(conversations.map((c) => c.toJson()).toList());
    await _prefs.setString(_conversationsKey, jsonStr);
  }

  Future<void> deleteConversation(String id) async {
    final conversations = await getConversations();
    conversations.removeWhere((c) => c.id == id);
    final jsonStr =
        json.encode(conversations.map((c) => c.toJson()).toList());
    await _prefs.setString(_conversationsKey, jsonStr);
  }

  Future<void> clearAllConversations() async {
    await _prefs.remove(_conversationsKey);
  }

  // Bookmarks
  Future<List<Message>> getBookmarks() async {
    final jsonStr = _prefs.getString(_bookmarksKey);
    if (jsonStr == null) return [];

    final List<dynamic> jsonList = json.decode(jsonStr) as List<dynamic>;
    return jsonList
        .map((j) => Message.fromJson(j as Map<String, dynamic>))
        .toList();
  }

  Future<void> addBookmark(Message message) async {
    final bookmarks = await getBookmarks();
    if (bookmarks.any((b) => b.id == message.id)) return;
    bookmarks.insert(0, message.copyWith(isBookmarked: true));
    final jsonStr = json.encode(bookmarks.map((m) => m.toJson()).toList());
    await _prefs.setString(_bookmarksKey, jsonStr);
  }

  Future<void> removeBookmark(String messageId) async {
    final bookmarks = await getBookmarks();
    bookmarks.removeWhere((b) => b.id == messageId);
    final jsonStr = json.encode(bookmarks.map((m) => m.toJson()).toList());
    await _prefs.setString(_bookmarksKey, jsonStr);
  }

  Future<bool> isBookmarked(String messageId) async {
    final bookmarks = await getBookmarks();
    return bookmarks.any((b) => b.id == messageId);
  }

  // Offline cache - last 5 conversations
  Future<void> cacheRecentConversations() async {
    final conversations = await getConversations();
    final toCache = conversations.take(5).toList();
    final jsonStr = json.encode(toCache.map((c) => c.toJson()).toList());
    await _prefs.setString(_cachedConversationsKey, jsonStr);
  }

  Future<List<Conversation>> getCachedConversations() async {
    final jsonStr = _prefs.getString(_cachedConversationsKey);
    if (jsonStr == null) return [];

    final List<dynamic> jsonList = json.decode(jsonStr) as List<dynamic>;
    return jsonList
        .map((j) => Conversation.fromJson(j as Map<String, dynamic>))
        .toList();
  }

  Future<void> clearAll() async {
    await _prefs.clear();
  }
}
