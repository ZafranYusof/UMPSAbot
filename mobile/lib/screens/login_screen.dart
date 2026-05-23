import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';
import '../config/theme.dart';
import '../l10n/app_strings.dart';
import '../providers/auth_provider.dart';
import '../providers/chat_provider.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final _formKey = GlobalKey<FormState>();
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();
  bool _obscurePassword = true;

  @override
  void dispose() {
    _emailController.dispose();
    _passwordController.dispose();
    super.dispose();
  }

  Future<void> _handleLogin() async {
    if (!_formKey.currentState!.validate()) return;

    final authProvider = context.read<AuthProvider>();
    final success = await authProvider.login(
      email: _emailController.text.trim(),
      password: _passwordController.text,
    );

    if (success && mounted) {
      Navigator.of(context).pushReplacementNamed('/home');
    }
  }

  @override
  Widget build(BuildContext context) {
    final lang = context.read<ChatProvider>().language;

    return Scaffold(
      backgroundColor: AppColors.background,
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.symmetric(horizontal: 24),
            child: Form(
              key: _formKey,
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  // UMPSA Logo
                  Container(
                    width: 100,
                    height: 100,
                    decoration: BoxDecoration(
                      color: AppColors.surface,
                      shape: BoxShape.circle,
                      border: Border.all(
                        color: AppColors.primary.withOpacity(0.3),
                        width: 2,
                      ),
                    ),
                    child: ClipOval(
                      child: Padding(
                        padding: const EdgeInsets.all(14),
                        child: Image.asset(
                          'assets/images/umpsa-logo.png',
                          fit: BoxFit.contain,
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(height: 24),

                  // Title
                  Text(
                    'UMPSABot',
                    style: GoogleFonts.fraunces(
                      color: AppColors.primary,
                      fontSize: 28,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    AppStrings.get('login_subtitle', lang),
                    style: AppTheme.body(
                      fontSize: 14,
                      color: AppColors.textSecondary,
                    ),
                  ),
                  const SizedBox(height: 40),

                  // Error message
                  Consumer<AuthProvider>(
                    builder: (context, auth, _) {
                      if (auth.error == null) return const SizedBox.shrink();
                      return Container(
                        width: double.infinity,
                        margin: const EdgeInsets.only(bottom: 16),
                        padding: const EdgeInsets.all(12),
                        decoration: BoxDecoration(
                          color: AppColors.error.withOpacity(0.1),
                          borderRadius: BorderRadius.circular(10),
                          border: Border.all(
                            color: AppColors.error.withOpacity(0.3),
                          ),
                        ),
                        child: Row(
                          children: [
                            const Icon(
                              Icons.error_outline,
                              color: AppColors.error,
                              size: 20,
                            ),
                            const SizedBox(width: 8),
                            Expanded(
                              child: Text(
                                auth.error!,
                                style: AppTheme.body(
                                  fontSize: 13,
                                  color: AppColors.error,
                                ),
                              ),
                            ),
                          ],
                        ),
                      );
                    },
                  ),

                  // Email field
                  TextFormField(
                    controller: _emailController,
                    keyboardType: TextInputType.emailAddress,
                    style: AppTheme.body(color: AppColors.textPrimary),
                    decoration: InputDecoration(
                      hintText: AppStrings.get('email_hint', lang),
                      prefixIcon: const Icon(
                        Icons.email_outlined,
                        color: AppColors.textMuted,
                      ),
                    ),
                    validator: (value) {
                      if (value == null || value.trim().isEmpty) {
                        return AppStrings.get('email_required', lang);
                      }
                      if (!RegExp(r'^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$')
                          .hasMatch(value.trim())) {
                        return AppStrings.get('email_invalid', lang);
                      }
                      return null;
                    },
                  ),
                  const SizedBox(height: 16),

                  // Password field
                  TextFormField(
                    controller: _passwordController,
                    obscureText: _obscurePassword,
                    style: AppTheme.body(color: AppColors.textPrimary),
                    decoration: InputDecoration(
                      hintText: AppStrings.get('password_hint', lang),
                      prefixIcon: const Icon(
                        Icons.lock_outline,
                        color: AppColors.textMuted,
                      ),
                      suffixIcon: IconButton(
                        icon: Icon(
                          _obscurePassword
                              ? Icons.visibility_off_outlined
                              : Icons.visibility_outlined,
                          color: AppColors.textMuted,
                        ),
                        onPressed: () {
                          setState(() => _obscurePassword = !_obscurePassword);
                        },
                      ),
                    ),
                    validator: (value) {
                      if (value == null || value.isEmpty) {
                        return AppStrings.get('password_required', lang);
                      }
                      return null;
                    },
                  ),
                  const SizedBox(height: 24),

                  // Login button
                  Consumer<AuthProvider>(
                    builder: (context, auth, _) {
                      return SizedBox(
                        width: double.infinity,
                        height: 50,
                        child: ElevatedButton(
                          onPressed: auth.isLoading ? null : _handleLogin,
                          child: auth.isLoading
                              ? const SizedBox(
                                  width: 22,
                                  height: 22,
                                  child: CircularProgressIndicator(
                                    strokeWidth: 2.5,
                                    color: AppColors.background,
                                  ),
                                )
                              : Text(
                                  AppStrings.get('login', lang),
                                  style: AppTheme.body(
                                    fontSize: 16,
                                    fontWeight: FontWeight.w600,
                                    color: AppColors.background,
                                  ),
                                ),
                        ),
                      );
                    },
                  ),
                  const SizedBox(height: 20),

                  // Register link
                  Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Text(
                        AppStrings.get('no_account', lang),
                        style: AppTheme.body(
                          fontSize: 14,
                          color: AppColors.textSecondary,
                        ),
                      ),
                      TextButton(
                        onPressed: () {
                          context.read<AuthProvider>().clearError();
                          Navigator.of(context).pushReplacementNamed('/register');
                        },
                        child: Text(
                          AppStrings.get('register', lang),
                          style: AppTheme.body(
                            fontSize: 14,
                            fontWeight: FontWeight.w600,
                            color: AppColors.primary,
                          ),
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}
