import 'package:flutter/material.dart';
import '../services/storage_service.dart';

class SettingsProvider extends ChangeNotifier {
  final StorageService _storage;

  late ThemeMode _themeMode;
  late String _language;

  SettingsProvider(this._storage) {
    _themeMode =
        _storage.themeMode == 'light' ? ThemeMode.light : ThemeMode.dark;
    _language = _storage.language;
  }

  ThemeMode get themeMode => _themeMode;
  String get language => _language;
  bool get isDarkMode => _themeMode == ThemeMode.dark;

  Future<void> toggleTheme() async {
    _themeMode =
        _themeMode == ThemeMode.dark ? ThemeMode.light : ThemeMode.dark;
    await _storage.setThemeMode(_themeMode == ThemeMode.dark ? 'dark' : 'light');
    notifyListeners();
  }

  Future<void> setLanguage(String lang) async {
    _language = lang;
    await _storage.setLanguage(lang);
    notifyListeners();
  }
}
