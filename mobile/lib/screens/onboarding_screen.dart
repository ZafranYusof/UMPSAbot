import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';
import '../config/theme.dart';
import '../services/storage_service.dart';
import '../providers/chat_provider.dart';
import '../l10n/app_strings.dart';

class OnboardingScreen extends StatefulWidget {
  const OnboardingScreen({super.key});

  @override
  State<OnboardingScreen> createState() => _OnboardingScreenState();
}

class _OnboardingScreenState extends State<OnboardingScreen>
    with TickerProviderStateMixin {
  final PageController _pageController = PageController();
  int _currentPage = 0;

  String? _selectedFaculty;
  int? _selectedYear;
  String _selectedLanguage = 'en';

  late AnimationController _fadeController;
  late Animation<double> _fadeAnimation;
  late AnimationController _slideController;
  late Animation<Offset> _slideAnimation;

  static const List<String> _faculties = [
    'FKOM',
    'FKEE',
    'FKM',
    'FKKSA',
    'FIM',
    'FPEP',
    'FKMP',
    'FTKA',
    'FIST',
  ];

  static const Map<String, String> _facultyNames = {
    'FKOM': 'Fakulti Komputeran',
    'FKEE': 'Fakulti Kejuruteraan Elektrik & Elektronik',
    'FKM': 'Fakulti Kejuruteraan Mekanikal',
    'FKKSA': 'Fakulti Kejuruteraan Kimia & Sumber Asli',
    'FIM': 'Fakulti Pengurusan Industri',
    'FPEP': 'Fakulti Perniagaan & Ekonomi Pekan',
    'FKMP': 'Fakulti Kejuruteraan Pembuatan & Mekatronik',
    'FTKA': 'Fakulti Teknologi Kejuruteraan Awam',
    'FIST': 'Fakulti Sains & Teknologi Industri',
  };

  @override
  void initState() {
    super.initState();
    _fadeController = AnimationController(
      duration: const Duration(milliseconds: 600),
      vsync: this,
    );
    _fadeAnimation = Tween<double>(begin: 0.0, end: 1.0).animate(
      CurvedAnimation(parent: _fadeController, curve: Curves.easeInOut),
    );

    _slideController = AnimationController(
      duration: const Duration(milliseconds: 500),
      vsync: this,
    );
    _slideAnimation = Tween<Offset>(
      begin: const Offset(0, 0.1),
      end: Offset.zero,
    ).animate(
      CurvedAnimation(parent: _slideController, curve: Curves.easeOut),
    );

    _fadeController.forward();
    _slideController.forward();
  }

  @override
  void dispose() {
    _pageController.dispose();
    _fadeController.dispose();
    _slideController.dispose();
    super.dispose();
  }

  void _goToPage(int page) {
    _pageController.animateToPage(
      page,
      duration: const Duration(milliseconds: 400),
      curve: Curves.easeInOut,
    );
  }

  void _onNext() {
    if (_currentPage == 0) {
      _goToPage(1);
    } else if (_currentPage == 1 && _selectedFaculty != null) {
      _goToPage(2);
    } else if (_currentPage == 2 && _selectedYear != null) {
      _goToPage(3);
    } else if (_currentPage == 3) {
      _completeOnboarding();
    }
  }

  bool get _canProceed {
    switch (_currentPage) {
      case 0:
        return true;
      case 1:
        return _selectedFaculty != null;
      case 2:
        return _selectedYear != null;
      case 3:
        return true;
      default:
        return false;
    }
  }

  Future<void> _completeOnboarding() async {
    final storage = Provider.of<StorageService>(context, listen: false);
    await storage.setOnboardingComplete();
    if (_selectedFaculty != null) {
      await storage.setFaculty(_selectedFaculty!);
    }
    if (_selectedYear != null) {
      await storage.setYear(_selectedYear!);
    }
    await storage.setLanguage(_selectedLanguage);

    // Update chat provider language
    if (mounted) {
      final chatProvider = Provider.of<ChatProvider>(context, listen: false);
      chatProvider.setLanguage(_selectedLanguage);
      Navigator.of(context).pushReplacementNamed('/home');
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      body: SafeArea(
        child: FadeTransition(
          opacity: _fadeAnimation,
          child: SlideTransition(
            position: _slideAnimation,
            child: Column(
              children: [
                // Top bar with skip
                Padding(
                  padding: const EdgeInsets.symmetric(
                      horizontal: 20, vertical: 12),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      // Back button (hidden on first page)
                      if (_currentPage > 0)
                        IconButton(
                          onPressed: () => _goToPage(_currentPage - 1),
                          icon: const Icon(
                            Icons.arrow_back_ios_new,
                            color: AppColors.textSecondary,
                            size: 20,
                          ),
                        )
                      else
                        const SizedBox(width: 48),
                      // Step indicator
                      Text(
                        '${_currentPage + 1}/4',
                        style: AppTheme.body(
                          fontSize: 14,
                          color: AppColors.textMuted,
                        ),
                      ),
                      // Skip button
                      TextButton(
                        onPressed: _completeOnboarding,
                        child: Text(
                          AppStrings.get('skip', _selectedLanguage),
                          style: AppTheme.body(
                            fontSize: 14,
                            color: AppColors.primary,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
                // Page content
                Expanded(
                  child: PageView(
                    controller: _pageController,
                    physics: const NeverScrollableScrollPhysics(),
                    onPageChanged: (index) {
                      setState(() => _currentPage = index);
                    },
                    children: [
                      _buildWelcomePage(),
                      _buildFacultyPage(),
                      _buildYearPage(),
                      _buildLanguagePage(),
                    ],
                  ),
                ),
                // Dot indicators
                Padding(
                  padding: const EdgeInsets.only(bottom: 16),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: List.generate(4, (index) {
                      return AnimatedContainer(
                        duration: const Duration(milliseconds: 300),
                        margin: const EdgeInsets.symmetric(horizontal: 4),
                        width: _currentPage == index ? 24 : 8,
                        height: 8,
                        decoration: BoxDecoration(
                          color: _currentPage == index
                              ? AppColors.primary
                              : AppColors.textMuted.withOpacity(0.3),
                          borderRadius: BorderRadius.circular(4),
                        ),
                      );
                    }),
                  ),
                ),
                // Next button
                Padding(
                  padding: const EdgeInsets.fromLTRB(24, 0, 24, 32),
                  child: SizedBox(
                    width: double.infinity,
                    height: 54,
                    child: ElevatedButton(
                      onPressed: _canProceed ? _onNext : null,
                      style: ElevatedButton.styleFrom(
                        backgroundColor: _canProceed
                            ? AppColors.primary
                            : AppColors.surfaceLight,
                        foregroundColor: _canProceed
                            ? AppColors.background
                            : AppColors.textMuted,
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(12),
                        ),
                        elevation: 0,
                      ),
                      child: Text(
                        _currentPage == 3
                            ? AppStrings.get('get_started', _selectedLanguage)
                            : AppStrings.get('next', _selectedLanguage),
                        style: AppTheme.body(
                          fontSize: 16,
                          fontWeight: FontWeight.w600,
                          color: _canProceed
                              ? AppColors.background
                              : AppColors.textMuted,
                        ),
                      ),
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildWelcomePage() {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 32),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          // Logo circle
          Container(
            width: 120,
            height: 120,
            decoration: BoxDecoration(
              color: AppColors.surface,
              shape: BoxShape.circle,
              border: Border.all(
                color: AppColors.primary.withOpacity(0.4),
                width: 2,
              ),
              boxShadow: [
                BoxShadow(
                  color: AppColors.primary.withOpacity(0.1),
                  blurRadius: 24,
                  spreadRadius: 4,
                ),
              ],
            ),
            child: ClipOval(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Image.asset(
                  'assets/images/umpsa-logo.png',
                  fit: BoxFit.contain,
                ),
              ),
            ),
          ),
          const SizedBox(height: 40),
          Text(
            AppStrings.get('onboarding_welcome_title', _selectedLanguage),
            textAlign: TextAlign.center,
            style: AppTheme.heading(
              fontSize: 26,
              color: AppColors.textPrimary,
            ),
          ),
          const SizedBox(height: 16),
          Text(
            AppStrings.get('onboarding_welcome_desc', _selectedLanguage),
            textAlign: TextAlign.center,
            style: AppTheme.body(
              fontSize: 15,
              color: AppColors.textSecondary,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildFacultyPage() {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 24),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const SizedBox(height: 24),
          Center(
            child: Text(
              AppStrings.get('onboarding_faculty_title', _selectedLanguage),
              style: AppTheme.heading(
                fontSize: 22,
                color: AppColors.textPrimary,
              ),
            ),
          ),
          const SizedBox(height: 8),
          Center(
            child: Text(
              AppStrings.get('onboarding_faculty_desc', _selectedLanguage),
              textAlign: TextAlign.center,
              style: AppTheme.body(
                fontSize: 14,
                color: AppColors.textSecondary,
              ),
            ),
          ),
          const SizedBox(height: 24),
          Expanded(
            child: ListView.builder(
              itemCount: _faculties.length,
              itemBuilder: (context, index) {
                final faculty = _faculties[index];
                final isSelected = _selectedFaculty == faculty;
                return Padding(
                  padding: const EdgeInsets.only(bottom: 10),
                  child: Material(
                    color: Colors.transparent,
                    child: InkWell(
                      onTap: () {
                        setState(() => _selectedFaculty = faculty);
                      },
                      borderRadius: BorderRadius.circular(12),
                      child: AnimatedContainer(
                        duration: const Duration(milliseconds: 200),
                        padding: const EdgeInsets.symmetric(
                            horizontal: 16, vertical: 14),
                        decoration: BoxDecoration(
                          color: isSelected
                              ? AppColors.primary.withOpacity(0.1)
                              : AppColors.surface,
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(
                            color: isSelected
                                ? AppColors.primary
                                : AppColors.border,
                            width: isSelected ? 1.5 : 1,
                          ),
                        ),
                        child: Row(
                          children: [
                            AnimatedContainer(
                              duration: const Duration(milliseconds: 200),
                              width: 24,
                              height: 24,
                              decoration: BoxDecoration(
                                shape: BoxShape.circle,
                                color: isSelected
                                    ? AppColors.primary
                                    : Colors.transparent,
                                border: Border.all(
                                  color: isSelected
                                      ? AppColors.primary
                                      : AppColors.textMuted,
                                  width: 2,
                                ),
                              ),
                              child: isSelected
                                  ? const Icon(
                                      Icons.check,
                                      size: 14,
                                      color: AppColors.background,
                                    )
                                  : null,
                            ),
                            const SizedBox(width: 14),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    faculty,
                                    style: AppTheme.body(
                                      fontSize: 15,
                                      fontWeight: FontWeight.w600,
                                      color: isSelected
                                          ? AppColors.primary
                                          : AppColors.textPrimary,
                                    ),
                                  ),
                                  const SizedBox(height: 2),
                                  Text(
                                    _facultyNames[faculty] ?? '',
                                    style: AppTheme.body(
                                      fontSize: 12,
                                      color: AppColors.textMuted,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ),
                );
              },
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildYearPage() {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 32),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Text(
            AppStrings.get('onboarding_year_title', _selectedLanguage),
            style: AppTheme.heading(
              fontSize: 22,
              color: AppColors.textPrimary,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            AppStrings.get('onboarding_year_desc', _selectedLanguage),
            textAlign: TextAlign.center,
            style: AppTheme.body(
              fontSize: 14,
              color: AppColors.textSecondary,
            ),
          ),
          const SizedBox(height: 40),
          Wrap(
            spacing: 16,
            runSpacing: 16,
            alignment: WrapAlignment.center,
            children: [1, 2, 3, 4].map((year) {
              final isSelected = _selectedYear == year;
              return GestureDetector(
                onTap: () {
                  setState(() => _selectedYear = year);
                },
                child: AnimatedContainer(
                  duration: const Duration(milliseconds: 200),
                  width: 80,
                  height: 80,
                  decoration: BoxDecoration(
                    color: isSelected
                        ? AppColors.primary.withOpacity(0.15)
                        : AppColors.surface,
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(
                      color: isSelected
                          ? AppColors.primary
                          : AppColors.border,
                      width: isSelected ? 2 : 1,
                    ),
                    boxShadow: isSelected
                        ? [
                            BoxShadow(
                              color: AppColors.primary.withOpacity(0.2),
                              blurRadius: 12,
                              spreadRadius: 1,
                            ),
                          ]
                        : null,
                  ),
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Text(
                        '$year',
                        style: AppTheme.heading(
                          fontSize: 28,
                          color: isSelected
                              ? AppColors.primary
                              : AppColors.textPrimary,
                        ),
                      ),
                      Text(
                        AppStrings.get('onboarding_year_label', _selectedLanguage),
                        style: AppTheme.body(
                          fontSize: 11,
                          color: AppColors.textMuted,
                        ),
                      ),
                    ],
                  ),
                ),
              );
            }).toList(),
          ),
        ],
      ),
    );
  }

  Widget _buildLanguagePage() {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 32),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Text(
            AppStrings.get('onboarding_lang_title', _selectedLanguage),
            style: AppTheme.heading(
              fontSize: 22,
              color: AppColors.textPrimary,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            AppStrings.get('onboarding_lang_desc', _selectedLanguage),
            textAlign: TextAlign.center,
            style: AppTheme.body(
              fontSize: 14,
              color: AppColors.textSecondary,
            ),
          ),
          const SizedBox(height: 40),
          _buildLanguageOption(
            code: 'en',
            label: 'English',
            flag: '🇬🇧',
          ),
          const SizedBox(height: 14),
          _buildLanguageOption(
            code: 'ms',
            label: 'Bahasa Melayu',
            flag: '🇲🇾',
          ),
        ],
      ),
    );
  }

  Widget _buildLanguageOption({
    required String code,
    required String label,
    required String flag,
  }) {
    final isSelected = _selectedLanguage == code;
    return GestureDetector(
      onTap: () {
        setState(() => _selectedLanguage = code);
      },
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 18),
        decoration: BoxDecoration(
          color: isSelected
              ? AppColors.primary.withOpacity(0.1)
              : AppColors.surface,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(
            color: isSelected ? AppColors.primary : AppColors.border,
            width: isSelected ? 1.5 : 1,
          ),
        ),
        child: Row(
          children: [
            Text(
              flag,
              style: const TextStyle(fontSize: 28),
            ),
            const SizedBox(width: 16),
            Expanded(
              child: Text(
                label,
                style: AppTheme.body(
                  fontSize: 16,
                  fontWeight: FontWeight.w500,
                  color: isSelected
                      ? AppColors.primary
                      : AppColors.textPrimary,
                ),
              ),
            ),
            AnimatedContainer(
              duration: const Duration(milliseconds: 200),
              width: 24,
              height: 24,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: isSelected ? AppColors.primary : Colors.transparent,
                border: Border.all(
                  color: isSelected ? AppColors.primary : AppColors.textMuted,
                  width: 2,
                ),
              ),
              child: isSelected
                  ? const Icon(
                      Icons.check,
                      size: 14,
                      color: AppColors.background,
                    )
                  : null,
            ),
          ],
        ),
      ),
    );
  }
}
