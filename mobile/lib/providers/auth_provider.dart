import 'dart:convert';
import 'package:flutter/material.dart';
import '../services/api_service.dart';
import '../services/storage_service.dart';

class AuthProvider extends ChangeNotifier {
  final ApiService _apiService;
  final StorageService _storageService;

  bool _isLoading = false;
  bool _isAuthenticated = false;
  String? _error;
  String _userRole = 'student';
  String? _userName;
  String? _userEmail;
  String? _faculty;
  String? _matricNo;
  String _languagePreference = 'mixed';

  AuthProvider(this._apiService, this._storageService) {
    _checkExistingToken();
  }

  bool get isLoading => _isLoading;
  bool get isAuthenticated => _isAuthenticated;
  String? get error => _error;
  String get userRole => _userRole;
  bool get isAdmin => _userRole == 'admin';
  String? get userName => _userName;
  String? get userEmail => _userEmail;
  String? get faculty => _faculty;
  String? get matricNo => _matricNo;
  String get languagePreference => _languagePreference;

  void _checkExistingToken() {
    final token = _storageService.authToken;
    if (token != null && token.isNotEmpty) {
      _isAuthenticated = true;
      _apiService.setAuthToken(token);
      _userRole = _storageService.userRole ?? 'student';
      _userName = _storageService.userName;
      _userEmail = _storageService.userEmail;
      _faculty = _storageService.faculty;
      _matricNo = _storageService.matricNo;
    }
  }

  /// Check if user has a valid saved token
  bool get hasToken {
    final token = _storageService.authToken;
    return token != null && token.isNotEmpty;
  }

  /// Decode JWT payload to extract user info
  Map<String, dynamic>? _decodeJwt(String token) {
    try {
      final parts = token.split('.');
      if (parts.length != 3) return null;

      String payload = parts[1];
      // Add padding if needed
      switch (payload.length % 4) {
        case 2:
          payload += '==';
          break;
        case 3:
          payload += '=';
          break;
      }

      final decoded = utf8.decode(base64Url.decode(payload));
      return json.decode(decoded) as Map<String, dynamic>;
    } catch (_) {
      return null;
    }
  }

  /// Extract user role and info from JWT token
  void _extractUserInfo(String token) {
    final payload = _decodeJwt(token);
    if (payload != null) {
      _userRole = payload['role'] as String? ?? 'student';
      _userName = payload['name'] as String? ?? payload['username'] as String?;
      _userEmail = payload['email'] as String?;
    }
  }

  Future<bool> login({
    required String email,
    required String password,
  }) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      final token = await _apiService.login(
        email: email,
        password: password,
      );

      // Save token
      await _storageService.setAuthToken(token);

      // Extract user info from JWT
      _extractUserInfo(token);
      await _storageService.setUserRole(_userRole);
      if (_userName != null) await _storageService.setUserName(_userName!);
      if (_userEmail != null) await _storageService.setUserEmail(_userEmail!);

      _isAuthenticated = true;
      _isLoading = false;
      notifyListeners();
      return true;
    } on ApiException catch (e) {
      _error = e.message;
      _isLoading = false;
      notifyListeners();
      return false;
    } catch (e) {
      _error = 'Something went wrong. Please try again.';
      _isLoading = false;
      notifyListeners();
      return false;
    }
  }

  Future<bool> register({
    required String name,
    required String email,
    required String password,
  }) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      final token = await _apiService.register(
        name: name,
        email: email,
        password: password,
      );

      // Save token
      await _storageService.setAuthToken(token);

      // Extract user info from JWT
      _extractUserInfo(token);
      _userName ??= name;
      _userEmail ??= email;
      await _storageService.setUserRole(_userRole);
      await _storageService.setUserName(_userName!);
      await _storageService.setUserEmail(_userEmail!);

      _isAuthenticated = true;
      _isLoading = false;
      notifyListeners();
      return true;
    } on ApiException catch (e) {
      _error = e.message;
      _isLoading = false;
      notifyListeners();
      return false;
    } catch (e) {
      _error = 'Something went wrong. Please try again.';
      _isLoading = false;
      notifyListeners();
      return false;
    }
  }

  /// Fetch profile from server and sync local state
  Future<void> fetchProfile() async {
    if (!_isAuthenticated) return;
    try {
      final userData = await _apiService.getProfile();
      _userName = userData['username'] as String? ?? _userName;
      _userEmail = userData['email'] as String? ?? _userEmail;
      _userRole = userData['role'] as String? ?? _userRole;
      _faculty = userData['faculty'] as String? ?? '';
      _matricNo = userData['matricNo'] as String? ?? '';
      final prefs = userData['preferences'] as Map<String, dynamic>?;
      if (prefs != null) {
        _languagePreference = prefs['language'] as String? ?? 'mixed';
      }

      // Persist locally
      if (_userName != null) await _storageService.setUserName(_userName!);
      if (_userEmail != null) await _storageService.setUserEmail(_userEmail!);
      await _storageService.setUserRole(_userRole);
      if (_faculty != null && _faculty!.isNotEmpty) {
        await _storageService.setFaculty(_faculty!);
      }

      notifyListeners();
    } catch (_) {
      // Silently fail - use cached data
    }
  }

  /// Update profile on server and sync local state
  Future<bool> updateProfile({
    String? name,
    String? faculty,
    String? matricNo,
    String? language,
  }) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      final userData = await _apiService.updateProfile(
        name: name,
        faculty: faculty,
        matricNo: matricNo,
        language: language,
      );

      _userName = userData['username'] as String? ?? _userName;
      _faculty = userData['faculty'] as String? ?? _faculty;
      _matricNo = userData['matricNo'] as String? ?? _matricNo;
      final prefs = userData['preferences'] as Map<String, dynamic>?;
      if (prefs != null) {
        _languagePreference = prefs['language'] as String? ?? _languagePreference;
      }

      // Persist locally
      if (_userName != null) await _storageService.setUserName(_userName!);
      if (_faculty != null && _faculty!.isNotEmpty) {
        await _storageService.setFaculty(_faculty!);
      }

      _isLoading = false;
      notifyListeners();
      return true;
    } on ApiException catch (e) {
      _error = e.message;
      _isLoading = false;
      notifyListeners();
      return false;
    } catch (e) {
      _error = 'Failed to update profile.';
      _isLoading = false;
      notifyListeners();
      return false;
    }
  }

  Future<void> logout() async {
    _apiService.clearAuthToken();
    await _storageService.clearAuthToken();
    _isAuthenticated = false;
    _userRole = 'student';
    _userName = null;
    _userEmail = null;
    _faculty = null;
    _matricNo = null;
    _languagePreference = 'mixed';
    notifyListeners();
  }

  void clearError() {
    _error = null;
    notifyListeners();
  }
}
