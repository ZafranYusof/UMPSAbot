import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:connectivity_plus/connectivity_plus.dart';
import 'providers/chat_provider.dart';
import 'providers/settings_provider.dart';
import 'services/api_service.dart';
import 'services/storage_service.dart';
import 'app.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();

  final storageService = StorageService();
  await storageService.init();

  final apiService = ApiService(storageService: storageService);
  await apiService.initOfflineCache();

  runApp(
    MultiProvider(
      providers: [
        Provider<StorageService>.value(value: storageService),
        Provider<ApiService>.value(value: apiService),
        ChangeNotifierProvider(
          create: (_) => SettingsProvider(storageService),
        ),
        ChangeNotifierProvider(
          create: (_) => ChatProvider(apiService, storageService),
        ),
      ],
      child: const ConnectivityWrapper(),
    ),
  );
}

class ConnectivityWrapper extends StatefulWidget {
  const ConnectivityWrapper({super.key});

  @override
  State<ConnectivityWrapper> createState() => _ConnectivityWrapperState();
}

class _ConnectivityWrapperState extends State<ConnectivityWrapper> {
  @override
  void initState() {
    super.initState();
    // Check initial connectivity
    Connectivity().checkConnectivity().then((ConnectivityResult result) {
      if (mounted) {
        final isOnline = result != ConnectivityResult.none;
        context.read<ChatProvider>().setOnlineStatus(isOnline);
      }
    });

    // Listen for changes
    Connectivity().onConnectivityChanged.listen((ConnectivityResult result) {
      final isOnline = result != ConnectivityResult.none;
      if (mounted) {
        context.read<ChatProvider>().setOnlineStatus(isOnline);
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    return const UmpsaChatbotApp();
  }
}
