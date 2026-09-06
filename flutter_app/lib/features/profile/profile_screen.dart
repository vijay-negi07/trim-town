// flutter_app/lib/features/profile/profile_screen.dart
import 'package:flutter/material.dart';
import '../../core/api/api_service.dart';
import '../../core/constants/app_constants.dart';
import '../auth/auth_screen.dart';

class ProfileScreen extends StatefulWidget {
  const ProfileScreen({super.key});

  @override
  State<ProfileScreen> createState() => _ProfileScreenState();
}

class _ProfileScreenState extends State<ProfileScreen> {
  final _api = ApiService();
  Map<String, dynamic>? _user;
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _loadProfile();
  }

  Future<void> _loadProfile() async {
    try {
      // In production call GET /api/auth/me
      // For now use mock data
      await Future.delayed(const Duration(milliseconds: 400));
      setState(() {
        _user = {
          'name': 'Rahul Sharma',
          'phone': '+919800000001',
          'role': 'CUSTOMER',
        };
        _loading = false;
      });
    } catch (_) {
      setState(() => _loading = false);
    }
  }

  Future<void> _logout() async {
    final confirm = await showDialog<bool>(
      context: context,
      builder: (_) => AlertDialog(
        title: const Text('Sign out?'),
        content: const Text('You will need to verify your phone number again to log back in.'),
        actions: [
          TextButton(
              onPressed: () => Navigator.pop(context, false),
              child: const Text('Cancel')),
          TextButton(
              onPressed: () => Navigator.pop(context, true),
              style: TextButton.styleFrom(foregroundColor: Colors.red),
              child: const Text('Sign out')),
        ],
      ),
    );

    if (confirm != true) return;
    await _api.logout();
    if (mounted) {
      Navigator.pushAndRemoveUntil(
        context,
        MaterialPageRoute(builder: (_) => const AuthScreen()),
        (_) => false,
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        backgroundColor: AppColors.dark,
        title: const Text('Profile'),
        automaticallyImplyLeading: false,
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : SingleChildScrollView(
              child: Column(
                children: [
                  // ── Avatar hero ─────────────────────────────────────────
                  Container(
                    width: double.infinity,
                    color: AppColors.dark,
                    padding: const EdgeInsets.fromLTRB(20, 20, 20, 32),
                    child: Column(children: [
                      Container(
                        width: 72,
                        height: 72,
                        decoration: BoxDecoration(
                          color: AppColors.primary,
                          shape: BoxShape.circle,
                        ),
                        child: Center(
                          child: Text(
                            (_user?['name'] ?? 'U')[0].toUpperCase(),
                            style: const TextStyle(
                                fontSize: 30,
                                fontWeight: FontWeight.w700,
                                color: Colors.white),
                          ),
                        ),
                      ),
                      const SizedBox(height: 12),
                      Text(
                        _user?['name'] ?? 'User',
                        style: const TextStyle(
                            fontSize: 18,
                            fontWeight: FontWeight.w600,
                            color: Colors.white),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        _user?['phone'] ?? '',
                        style: const TextStyle(
                            fontSize: 13, color: Colors.white54),
                      ),
                    ]),
                  ),

                  const SizedBox(height: 16),

                  // ── Stats row ───────────────────────────────────────────
                  Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 16),
                    child: Row(children: [
                      _statCard('Bookings', '8'),
                      const SizedBox(width: 12),
                      _statCard('Reviews', '3'),
                      const SizedBox(width: 12),
                      _statCard('Favourites', '2'),
                    ]),
                  ),

                  const SizedBox(height: 16),

                  // ── Menu sections ───────────────────────────────────────
                  _menuSection('Account', [
                    _menuItem(Icons.person_outline, 'Edit profile', onTap: () {}),
                    _menuItem(Icons.notifications_outlined, 'Notifications', onTap: () {}),
                    _menuItem(Icons.favorite_border, 'Favourite salons', onTap: () {}),
                  ]),

                  const SizedBox(height: 12),

                  _menuSection('Support', [
                    _menuItem(Icons.help_outline, 'Help & FAQ', onTap: () {}),
                    _menuItem(Icons.chat_bubble_outline, 'Contact support', onTap: () {}),
                    _menuItem(Icons.star_border, 'Rate the app', onTap: () {}),
                  ]),

                  const SizedBox(height: 12),

                  _menuSection('Legal', [
                    _menuItem(Icons.privacy_tip_outlined, 'Privacy policy', onTap: () {}),
                    _menuItem(Icons.description_outlined, 'Terms of service', onTap: () {}),
                  ]),

                  const SizedBox(height: 12),

                  // ── Logout ──────────────────────────────────────────────
                  Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 16),
                    child: SizedBox(
                      width: double.infinity,
                      child: OutlinedButton.icon(
                        onPressed: _logout,
                        icon: const Icon(Icons.logout, size: 18),
                        label: const Text('Sign out'),
                        style: OutlinedButton.styleFrom(
                          foregroundColor: Colors.red,
                          side: const BorderSide(color: Colors.red),
                          padding: const EdgeInsets.symmetric(vertical: 14),
                          shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(12)),
                        ),
                      ),
                    ),
                  ),

                  const SizedBox(height: 24),
                  const Text(
                    'TrimTown v1.0.0 · Haldwani',
                    style: TextStyle(fontSize: 11, color: AppColors.textLight),
                  ),
                  const SizedBox(height: 32),
                ],
              ),
            ),
    );
  }

  Widget _statCard(String label, String value) {
    return Expanded(
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 14),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: AppColors.border),
        ),
        child: Column(children: [
          Text(value,
              style: const TextStyle(
                  fontSize: 20,
                  fontWeight: FontWeight.w700,
                  color: AppColors.primary)),
          const SizedBox(height: 2),
          Text(label,
              style:
                  const TextStyle(fontSize: 11, color: AppColors.textMuted)),
        ]),
      ),
    );
  }

  Widget _menuSection(String title, List<Widget> items) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Padding(
            padding: const EdgeInsets.only(left: 4, bottom: 8),
            child: Text(
              title.toUpperCase(),
              style: const TextStyle(
                  fontSize: 11,
                  fontWeight: FontWeight.w600,
                  color: AppColors.textLight,
                  letterSpacing: 0.5),
            ),
          ),
          Container(
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(14),
              border: Border.all(color: AppColors.border),
            ),
            child: Column(children: items),
          ),
        ],
      ),
    );
  }

  Widget _menuItem(IconData icon, String label,
      {required VoidCallback onTap, bool danger = false}) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(14),
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 13),
        child: Row(children: [
          Icon(icon,
              size: 20,
              color: danger ? Colors.red : AppColors.textMuted),
          const SizedBox(width: 12),
          Expanded(
            child: Text(
              label,
              style: TextStyle(
                  fontSize: 14,
                  color: danger ? Colors.red : AppColors.text),
            ),
          ),
          Icon(Icons.chevron_right,
              size: 18,
              color: danger ? Colors.red.withOpacity(0.5) : AppColors.textLight),
        ]),
      ),
    );
  }
}
