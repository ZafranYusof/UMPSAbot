import 'dart:convert';
import 'package:shared_preferences/shared_preferences.dart';

class CachedEntry {
  final String query;
  final String answer;
  final String language;
  final int timestamp;

  CachedEntry({
    required this.query,
    required this.answer,
    required this.language,
    required this.timestamp,
  });

  Map<String, dynamic> toJson() => {
        'query': query,
        'answer': answer,
        'language': language,
        'timestamp': timestamp,
      };

  factory CachedEntry.fromJson(Map<String, dynamic> json) => CachedEntry(
        query: json['query'] as String,
        answer: json['answer'] as String,
        language: json['language'] as String,
        timestamp: json['timestamp'] as int,
      );
}

class OfflineCacheService {
  static const String _cacheKey = 'offline_qa_cache';
  static const int _maxEntries = 50;

  SharedPreferences? _prefs;

  Future<void> init() async {
    _prefs ??= await SharedPreferences.getInstance();
  }

  Future<SharedPreferences> get _preferences async {
    if (_prefs == null) {
      await init();
    }
    return _prefs!;
  }

  Future<List<CachedEntry>> _getEntries() async {
    final prefs = await _preferences;
    final raw = prefs.getString(_cacheKey);
    if (raw == null || raw.isEmpty) return [];
    try {
      final list = json.decode(raw) as List<dynamic>;
      return list
          .map((e) => CachedEntry.fromJson(e as Map<String, dynamic>))
          .toList();
    } catch (_) {
      return [];
    }
  }

  Future<void> _saveEntries(List<CachedEntry> entries) async {
    final prefs = await _preferences;
    final raw = json.encode(entries.map((e) => e.toJson()).toList());
    await prefs.setString(_cacheKey, raw);
  }

  /// Cache a successful API response. Uses LRU eviction when max entries reached.
  Future<void> cacheAnswer(String query, String answer, String language) async {
    final entries = await _getEntries();

    // Remove existing entry for same query (case-insensitive) to avoid duplicates
    entries.removeWhere(
        (e) => e.query.toLowerCase() == query.toLowerCase());

    // Add new entry at the end (most recent)
    entries.add(CachedEntry(
      query: query,
      answer: answer,
      language: language,
      timestamp: DateTime.now().millisecondsSinceEpoch,
    ));

    // LRU eviction: remove oldest entries if over max
    while (entries.length > _maxEntries) {
      entries.removeAt(0);
    }

    await _saveEntries(entries);
  }

  /// Get a cached answer using fuzzy matching (contains + similarity).
  /// Returns the answer string or null if no match found.
  Future<String?> getCachedAnswer(String query) async {
    final entries = await _getEntries();
    if (entries.isEmpty) return null;

    final queryLower = query.toLowerCase().trim();

    // 1. Exact match (case-insensitive)
    for (final entry in entries) {
      if (entry.query.toLowerCase().trim() == queryLower) {
        return entry.answer;
      }
    }

    // 2. Contains match — query contains cached or cached contains query
    for (final entry in entries) {
      final entryLower = entry.query.toLowerCase().trim();
      if (queryLower.contains(entryLower) || entryLower.contains(queryLower)) {
        if (_minLength(queryLower, entryLower) > 3) {
          return entry.answer;
        }
      }
    }

    // 3. Word overlap similarity
    final queryWords = _extractWords(queryLower);
    CachedEntry? bestMatch;
    double bestScore = 0;

    for (final entry in entries) {
      final entryWords = _extractWords(entry.query.toLowerCase().trim());
      final score = _wordOverlapScore(queryWords, entryWords);
      if (score > bestScore) {
        bestScore = score;
        bestMatch = entry;
      }
    }

    // Threshold: at least 60% word overlap
    if (bestScore >= 0.6 && bestMatch != null) {
      return bestMatch.answer;
    }

    return null;
  }

  /// Clear all cached entries.
  Future<void> clearCache() async {
    final prefs = await _preferences;
    await prefs.remove(_cacheKey);
  }

  int _minLength(String a, String b) => a.length < b.length ? a.length : b.length;

  Set<String> _extractWords(String text) {
    return text
        .replaceAll(RegExp(r'[^\w\s]'), '')
        .split(RegExp(r'\s+'))
        .where((w) => w.length > 2)
        .toSet();
  }

  double _wordOverlapScore(Set<String> a, Set<String> b) {
    if (a.isEmpty || b.isEmpty) return 0;
    final intersection = a.intersection(b).length;
    final union = a.union(b).length;
    return intersection / union; // Jaccard similarity
  }
}
