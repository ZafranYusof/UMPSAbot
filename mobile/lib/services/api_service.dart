import 'dart:async';
import 'dart:convert';
import 'package:dio/dio.dart';
import '../models/message.dart';
import 'offline_cache.dart';
import 'storage_service.dart';

class ApiService {
  static const String _prodBaseUrl = 'http://103.40.204.158/api';
  static const String _devBaseUrl = 'http://localhost:5005/api';

  late final Dio _dio;
  bool _useProduction = true;
  final OfflineCacheService _offlineCache = OfflineCacheService();

  StorageService? _storageService;

  ApiService({StorageService? storageService}) {
    _storageService = storageService;
    _dio = Dio(BaseOptions(
      baseUrl: _prodBaseUrl,
      connectTimeout: const Duration(seconds: 30),
      receiveTimeout: const Duration(seconds: 60),
      headers: {
        'Content-Type': 'application/json',
      },
    ));

    // Inject user preference headers on every request
    _dio.interceptors.add(InterceptorsWrapper(
      onRequest: (options, handler) {
        if (_storageService != null) {
          final faculty = _storageService!.faculty;
          final year = _storageService!.year;
          if (faculty != null) {
            options.headers['X-User-Faculty'] = faculty;
          }
          if (year != null) {
            options.headers['X-User-Year'] = year.toString();
          }
        }
        handler.next(options);
      },
    ));
  }

  String get baseUrl => _useProduction ? _prodBaseUrl : _devBaseUrl;

  void setEnvironment({required bool production}) {
    _useProduction = production;
    _dio.options.baseUrl = baseUrl;
  }

  void setAuthToken(String token) {
    _dio.options.headers['Authorization'] = 'Bearer $token';
  }

  void clearAuthToken() {
    _dio.options.headers.remove('Authorization');
  }

  /// Stream chat response using SSE endpoint
  Stream<StreamEvent> streamMessage({
    required String message,
    required String sessionId,
    String language = 'en',
  }) async* {
    try {
      final response = await _dio.post(
        '/chat/stream',
        data: {
          'message': message,
          'conversationId': sessionId,
          'language': language,
        },
        options: Options(
          responseType: ResponseType.stream,
          headers: {'Accept': 'text/event-stream'},
        ),
      );

      final stream = response.data.stream as Stream<List<int>>;
      String buffer = '';

      await for (final chunk in stream) {
        buffer += utf8.decode(chunk);
        final lines = buffer.split('\n');
        buffer = lines.last;

        for (int i = 0; i < lines.length - 1; i++) {
          final line = lines[i].trim();
          if (line.startsWith('data: ')) {
            final jsonStr = line.substring(6);
            if (jsonStr.isEmpty || jsonStr == '[DONE]') continue;
            try {
              final data = json.decode(jsonStr) as Map<String, dynamic>;
              final type = data['type'] as String? ?? 'chunk';
              if (type == 'chunk') {
                yield StreamEvent.chunk(data['content'] as String? ?? '');
              } else if (type == 'done') {
                yield StreamEvent.done(
                  sources: (data['sources'] as List<dynamic>?)
                      ?.map((s) => s is Map ? (s['title'] as String? ?? '') : s.toString())
                      .toList(),
                  suggestions: (data['suggestions'] as List<dynamic>?)?.cast<String>(),
                  confidence: (data['confidence'] as num?)?.toDouble(),
                  intent: data['intent'] as String?,
                );
              }
            } catch (_) {
              // Skip malformed JSON
            }
          }
        }
      }

      // Process remaining buffer
      if (buffer.trim().startsWith('data: ')) {
        final jsonStr = buffer.trim().substring(6);
        if (jsonStr.isNotEmpty && jsonStr != '[DONE]') {
          try {
            final data = json.decode(jsonStr) as Map<String, dynamic>;
            final type = data['type'] as String? ?? 'chunk';
            if (type == 'chunk') {
              yield StreamEvent.chunk(data['content'] as String? ?? '');
            } else if (type == 'done') {
              yield StreamEvent.done(
                sources: (data['sources'] as List<dynamic>?)
                    ?.map((s) => s is Map ? (s['title'] as String? ?? '') : s.toString())
                    .toList(),
                suggestions: (data['suggestions'] as List<dynamic>?)?.cast<String>(),
                confidence: (data['confidence'] as num?)?.toDouble(),
                intent: data['intent'] as String?,
              );
            }
          } catch (_) {}
        }
      }
    } on DioException catch (e) {
      throw ApiException(
        message: _getErrorMessage(e),
        statusCode: e.response?.statusCode,
      );
    }
  }

  /// Initialize the offline cache (call once at app startup)
  Future<void> initOfflineCache() async {
    await _offlineCache.init();
  }

  /// Get the offline cache service instance
  OfflineCacheService get offlineCache => _offlineCache;

  Future<Message> sendMessage({
    required String message,
    required String sessionId,
    String language = 'en',
  }) async {
    try {
      final response = await _dio.post('/chat/send', data: {
        'message': message,
        'conversationId': sessionId,
        'language': language,
      });

      final data = response.data;
      final content = data['message'] as String? ?? data['content'] as String? ?? 'No response received.';

      // Cache successful response
      await _offlineCache.cacheAnswer(message, content, language);

      return Message(
        id: DateTime.now().millisecondsSinceEpoch.toString(),
        content: content,
        isUser: false,
        timestamp: DateTime.now(),
        sources: (data['sources'] as List<dynamic>?)?.map((s) => s is Map ? (s['title'] as String? ?? '') : s.toString()).toList(),
        suggestions: (data['suggestions'] as List<dynamic>?)?.cast<String>(),
        confidence: (data['confidence'] as num?)?.toDouble(),
        intent: data['intent'] as String?,
      );
    } on DioException catch (e) {
      // On connection failure, try offline cache
      final cachedAnswer = await _offlineCache.getCachedAnswer(message);
      if (cachedAnswer != null) {
        return Message(
          id: DateTime.now().millisecondsSinceEpoch.toString(),
          content: cachedAnswer,
          isUser: false,
          timestamp: DateTime.now(),
          isCached: true,
        );
      }
      throw ApiException(
        message: _getErrorMessage(e),
        statusCode: e.response?.statusCode,
      );
    }
  }

  Future<Map<String, dynamic>> planTimetable({
    required List<String> courses,
    required String semester,
  }) async {
    try {
      final response = await _dio.post('/timetable/plan', data: {
        'courses': courses,
        'semester': semester,
      });
      return response.data as Map<String, dynamic>;
    } on DioException catch (e) {
      throw ApiException(
        message: _getErrorMessage(e),
        statusCode: e.response?.statusCode,
      );
    }
  }

  Future<String> login({
    required String email,
    required String password,
  }) async {
    try {
      final response = await _dio.post('/auth/login', data: {
        'email': email,
        'password': password,
      });
      final token = response.data['token'] as String;
      setAuthToken(token);
      return token;
    } on DioException catch (e) {
      throw ApiException(
        message: _getErrorMessage(e),
        statusCode: e.response?.statusCode,
      );
    }
  }

  Future<String> register({
    required String name,
    required String email,
    required String password,
  }) async {
    try {
      final response = await _dio.post('/auth/register', data: {
        'name': name,
        'email': email,
        'password': password,
      });
      final token = response.data['token'] as String;
      setAuthToken(token);
      return token;
    } on DioException catch (e) {
      throw ApiException(
        message: _getErrorMessage(e),
        statusCode: e.response?.statusCode,
      );
    }
  }

  String _getErrorMessage(DioException e) {
    switch (e.type) {
      case DioExceptionType.connectionTimeout:
      case DioExceptionType.sendTimeout:
      case DioExceptionType.receiveTimeout:
        return 'Connection timed out. Please try again.';
      case DioExceptionType.connectionError:
        return 'No internet connection.';
      case DioExceptionType.badResponse:
        final statusCode = e.response?.statusCode;
        if (statusCode == 503 || statusCode == 429) {
          return 'Server is busy, try again later.';
        }
        final data = e.response?.data;
        if (data is Map && data.containsKey('message')) {
          return data['message'] as String;
        }
        return 'Server error ($statusCode)';
      default:
        return 'Something went wrong. Please try again.';
    }
  }
}

class StreamEvent {
  final String type; // 'chunk' or 'done'
  final String? content;
  final List<String>? sources;
  final List<String>? suggestions;
  final double? confidence;
  final String? intent;

  StreamEvent._({
    required this.type,
    this.content,
    this.sources,
    this.suggestions,
    this.confidence,
    this.intent,
  });

  factory StreamEvent.chunk(String content) => StreamEvent._(
        type: 'chunk',
        content: content,
      );

  factory StreamEvent.done({
    List<String>? sources,
    List<String>? suggestions,
    double? confidence,
    String? intent,
  }) =>
      StreamEvent._(
        type: 'done',
        sources: sources,
        suggestions: suggestions,
        confidence: confidence,
        intent: intent,
      );
}

class ApiException implements Exception {
  final String message;
  final int? statusCode;

  ApiException({required this.message, this.statusCode});

  bool get isConnectionError =>
      message.contains('No internet') || message.contains('timed out');

  bool get isServerBusy => message.contains('Server is busy');

  @override
  String toString() => message;
}
