import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../config/theme.dart';
import '../providers/auth_provider.dart';
import '../providers/chat_provider.dart';
import '../l10n/app_strings.dart';

class ProfileScreen extends StatefulWidget {
  const ProfileScreen({super.key});

  @override
  State<ProfileScreen> createState() => _ProfileScreenState();
}

class _ProfileScreenState extends State<ProfileScreen> {
  final _formKey = GlobalKey<FormState>();
  late TextEditingController _nameController;
  late TextEditingController _facultyController;
  late TextEditingController _matricNoController;
  String _selectedLanguage = 'mixed';
  bool _isLoading = false;

  @override
  void initState() {
    super.initState();
    final auth = context.read<AuthProvider>();
    _nameController = TextEditingController(text: auth.userName ?? '');
    _facultyController = TextEditingController(text: auth.faculty ?? '');
    _matricNoController = TextEditingController(text: auth.matricNo ?? '');
    _selectedLanguage = auth.languagePreference;
  }

  @override
  void dispose() {
    _nameController.dispose();
    _facultyController.dispose();
    _matricNoController.dispose();
    super.dispose();
  }

  Future<void> _saveProfile() async {
    if (!_formKey.currentState!.validate()) return;

    setState(() => _isLoading = true);

    final auth = context.read<AuthProvider>();
    final success = await auth.updateProfile(
      name: _nameController.text.trim(),
      faculty: _facultyController.text.trim(),
      matricNo: _matricNoController.text.trim(),
      language: _selectedLanguage,
    );

    setState(() => _isLoading = false);

    if (!mounted) return;

    final lang = context.read<ChatProvider>().language;
    if (success) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(AppStrings.get('profile_updated', lang)),
          backgroundColor: AppColors.success,
        ),
      );
    } else {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(auth.error ?? AppStrings.get('profile_update_failed', lang)),
          backgroundColor: AppColors.error,
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return Consumer2<AuthProvider, ChatProvider>(
      builder: (context, auth, chat, _) {
        final lang = chat.language;
        final initials = _getInitials(auth.userName ?? 'U');

        return Scaffold(
          appBar: AppBar(
            title: Text(AppStrings.get('profile', lang)),
          ),
          body: SingleChildScrollView(
            padding: const EdgeInsets.all(16),
            child: Form(
              key: _formKey,
              child: Column(
                children: [
                  const SizedBox(height: 16),
                  // Avatar
                  CircleAvatar(
                    radius: 48,
                    backgroundColor: AppColors.primary.withValues(alpha: 0.2),
                    child: Text(
                      initials,
                      style: AppTheme.heading(
                        fontSize: 32,
                        color: AppColors.primary,
                      ),
                    ),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    auth.userEmail ?? '',
                    style: AppTheme.body(
                      fontSize: 14,
                      color: AppColors.textMuted,
                    ),
                  ),
                  const SizedBox(height: 32),

                  // Name field
                  _buildTextField(
                    controller: _nameController,
                    label: AppStrings.get('profile_name', lang),
                    icon: Icons.person_outline,
                    validator: (value) {
                      if (value == null || value.trim().isEmpty) {
                        return AppStrings.get('name_required', lang);
                      }
                      return null;
                    },
                  ),
                  const SizedBox(height: 16),

                  // Email field (read-only)
                  _buildTextField(
                    controller: TextEditingController(text: auth.userEmail ?? ''),
                    label: AppStrings.get('profile_email', lang),
                    icon: Icons.email_outlined,
                    readOnly: true,
                  ),
                  const SizedBox(height: 16),

                  // Faculty field
                  _buildTextField(
                    controller: _facultyController,
                    label: AppStrings.get('profile_faculty', lang),
                    icon: Icons.school_outlined,
                  ),
                  const SizedBox(height: 16),

                  // Matric No field
                  _buildTextField(
                    controller: _matricNoController,
                    label: AppStrings.get('profile_matric', lang),
                    icon: Icons.badge_outlined,
                  ),
                  const SizedBox(height: 16),

                  // Language preference dropdown
                  _buildLanguageDropdown(lang),
                  const SizedBox(height: 32),

                  // Save button
                  SizedBox(
                    width: double.infinity,
                    child: ElevatedButton(
                      onPressed: _isLoading ? null : _saveProfile,
                      child: _isLoading
                          ? const SizedBox(
                              height: 20,
                              width: 20,
                              child: CircularProgressIndicator(
                                strokeWidth: 2,
                                color: AppColors.background,
                              ),
                            )
                          : Text(AppStrings.get('profile_save', lang)),
                    ),
                  ),
                ],
              ),
            ),
          ),
        );
      },
    );
  }

  Widget _buildTextField({
    required TextEditingController controller,
    required String label,
    required IconData icon,
    bool readOnly = false,
    String? Function(String?)? validator,
  }) {
    return TextFormField(
      controller: controller,
      readOnly: readOnly,
      validator: validator,
      style: AppTheme.body(color: readOnly ? AppColors.textMuted : AppColors.textPrimary),
      decoration: InputDecoration(
        labelText: label,
        labelStyle: AppTheme.body(fontSize: 14, color: AppColors.textSecondary),
        prefixIcon: Icon(icon, color: AppColors.primary, size: 20),
        filled: true,
        fillColor: readOnly ? AppColors.surface.withValues(alpha: 0.5) : AppColors.surface,
      ),
    );
  }

  Widget _buildLanguageDropdown(String lang) {
    return Container(
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: AppColors.border),
      ),
      child: ListTile(
        leading: const Icon(Icons.language, color: AppColors.primary, size: 20),
        title: Text(
          AppStrings.get('profile_language', lang),
          style: AppTheme.body(fontSize: 14, color: AppColors.textSecondary),
        ),
        subtitle: Text(
          _getLanguageLabel(_selectedLanguage, lang),
          style: AppTheme.body(color: AppColors.textPrimary),
        ),
        trailing: const Icon(Icons.chevron_right, color: AppColors.textMuted, size: 20),
        onTap: () => _showLanguagePicker(lang),
      ),
    );
  }

  String _getLanguageLabel(String code, String lang) {
    switch (code) {
      case 'en':
        return AppStrings.get('english', lang);
      case 'ms':
        return AppStrings.get('bahasa_melayu', lang);
      case 'mixed':
        return AppStrings.get('profile_lang_mixed', lang);
      default:
        return code;
    }
  }

  void _showLanguagePicker(String lang) {
    showModalBottomSheet(
      context: context,
      backgroundColor: AppColors.surface,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(16)),
      ),
      builder: (ctx) => SafeArea(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const SizedBox(height: 12),
            Container(
              width: 40,
              height: 4,
              decoration: BoxDecoration(
                color: AppColors.textMuted,
                borderRadius: BorderRadius.circular(2),
              ),
            ),
            const SizedBox(height: 16),
            Text(
              AppStrings.get('profile_language', lang),
              style: AppTheme.heading(fontSize: 18),
            ),
            const SizedBox(height: 8),
            _buildLanguageOption('en', lang),
            _buildLanguageOption('ms', lang),
            _buildLanguageOption('mixed', lang),
            const SizedBox(height: 16),
          ],
        ),
      ),
    );
  }

  Widget _buildLanguageOption(String code, String lang) {
    final isSelected = _selectedLanguage == code;
    return ListTile(
      title: Text(
        _getLanguageLabel(code, lang),
        style: AppTheme.body(
          color: isSelected ? AppColors.primary : AppColors.textPrimary,
          fontWeight: isSelected ? FontWeight.w600 : FontWeight.w400,
        ),
      ),
      trailing: isSelected
          ? const Icon(Icons.check_circle, color: AppColors.primary, size: 20)
          : null,
      onTap: () {
        setState(() => _selectedLanguage = code);
        Navigator.pop(context);
      },
    );
  }

  String _getInitials(String name) {
    final parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return '${parts[0][0]}${parts[1][0]}'.toUpperCase();
    }
    return name.isNotEmpty ? name[0].toUpperCase() : 'U';
  }
}
