import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../config/theme.dart';
import '../l10n/app_strings.dart';
import '../providers/chat_provider.dart';

class AdminScreen extends StatelessWidget {
  const AdminScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final lang = context.read<ChatProvider>().language;

    return Scaffold(
      appBar: AppBar(
        title: Text(AppStrings.get('admin_panel', lang)),
      ),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          // Header
          Container(
            padding: const EdgeInsets.all(20),
            decoration: BoxDecoration(
              color: AppColors.surface,
              borderRadius: BorderRadius.circular(14),
              border: Border.all(color: AppColors.border),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.all(10),
                      decoration: BoxDecoration(
                        color: AppColors.primary.withOpacity(0.1),
                        borderRadius: BorderRadius.circular(10),
                      ),
                      child: const Icon(
                        Icons.admin_panel_settings,
                        color: AppColors.primary,
                        size: 28,
                      ),
                    ),
                    const SizedBox(width: 14),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            AppStrings.get('admin_panel', lang),
                            style: AppTheme.heading(fontSize: 20),
                          ),
                          const SizedBox(height: 4),
                          Text(
                            AppStrings.get('admin_subtitle', lang),
                            style: AppTheme.body(
                              fontSize: 13,
                              color: AppColors.textSecondary,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
          const SizedBox(height: 20),

          // Admin options
          _buildAdminOption(
            context,
            icon: Icons.upload_file,
            title: AppStrings.get('admin_upload_catalog', lang),
            subtitle: AppStrings.get('admin_upload_catalog_desc', lang),
            onTap: () {
              ScaffoldMessenger.of(context).showSnackBar(
                SnackBar(
                  content: Text(AppStrings.get('admin_coming_soon', lang)),
                ),
              );
            },
          ),
          const SizedBox(height: 12),

          _buildAdminOption(
            context,
            icon: Icons.bar_chart,
            title: AppStrings.get('admin_view_stats', lang),
            subtitle: AppStrings.get('admin_view_stats_desc', lang),
            onTap: () {
              ScaffoldMessenger.of(context).showSnackBar(
                SnackBar(
                  content: Text(AppStrings.get('admin_coming_soon', lang)),
                ),
              );
            },
          ),
          const SizedBox(height: 12),

          _buildAdminOption(
            context,
            icon: Icons.people_outline,
            title: AppStrings.get('admin_manage_users', lang),
            subtitle: AppStrings.get('admin_manage_users_desc', lang),
            onTap: () {
              ScaffoldMessenger.of(context).showSnackBar(
                SnackBar(
                  content: Text(AppStrings.get('admin_coming_soon', lang)),
                ),
              );
            },
          ),
          const SizedBox(height: 12),

          _buildAdminOption(
            context,
            icon: Icons.dataset_outlined,
            title: AppStrings.get('admin_manage_data', lang),
            subtitle: AppStrings.get('admin_manage_data_desc', lang),
            onTap: () {
              ScaffoldMessenger.of(context).showSnackBar(
                SnackBar(
                  content: Text(AppStrings.get('admin_coming_soon', lang)),
                ),
              );
            },
          ),
        ],
      ),
    );
  }

  Widget _buildAdminOption(
    BuildContext context, {
    required IconData icon,
    required String title,
    required String subtitle,
    required VoidCallback onTap,
  }) {
    return Material(
      color: AppColors.surface,
      borderRadius: BorderRadius.circular(14),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(14),
        child: Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(14),
            border: Border.all(color: AppColors.border),
          ),
          child: Row(
            children: [
              Container(
                padding: const EdgeInsets.all(10),
                decoration: BoxDecoration(
                  color: AppColors.primary.withOpacity(0.1),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Icon(icon, color: AppColors.primary, size: 24),
              ),
              const SizedBox(width: 14),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      title,
                      style: AppTheme.body(
                        fontSize: 15,
                        fontWeight: FontWeight.w600,
                        color: AppColors.textPrimary,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      subtitle,
                      style: AppTheme.body(
                        fontSize: 13,
                        color: AppColors.textMuted,
                      ),
                    ),
                  ],
                ),
              ),
              const Icon(
                Icons.chevron_right,
                color: AppColors.textMuted,
                size: 20,
              ),
            ],
          ),
        ),
      ),
    );
  }
}
