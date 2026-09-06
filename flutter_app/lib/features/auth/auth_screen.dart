// flutter_app/lib/features/auth/auth_screen.dart
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../../core/api/api_service.dart';
import '../../core/constants/app_constants.dart';
import '../home/home_screen.dart';

class AuthScreen extends StatefulWidget {
  final String userRole;
  const AuthScreen({super.key, this.userRole = 'CUSTOMER'});

  @override
  State<AuthScreen> createState() => _AuthScreenState();
}

class _AuthScreenState extends State<AuthScreen> {
  final _api = ApiService();
  final _phoneController = TextEditingController();
  final _nameController = TextEditingController();
  final _otpControllers = List.generate(6, (_) => TextEditingController());
  final _otpFocusNodes = List.generate(6, (_) => FocusNode());

  String _step = 'phone'; // 'phone' | 'otp'
  bool _loading = false;
  String? _devOtp;
  String? _error;
  bool _isNewUser = false;

  @override
  void dispose() {
    _phoneController.dispose();
    _nameController.dispose();
    for (final c in _otpControllers) c.dispose();
    for (final f in _otpFocusNodes) f.dispose();
    super.dispose();
  }

  String get _otp => _otpControllers.map((c) => c.text).join();

  Future<void> _sendOtp() async {
    final phone = _phoneController.text.trim();
    if (phone.isEmpty) return;
    setState(() { _loading = true; _error = null; });
    try {
      final formatted = phone.startsWith('+') ? phone : '+91$phone';
      final res = await _api.sendOtp(formatted);
      setState(() {
        _devOtp = res['devOtp'];
        _step = 'otp';
        _loading = false;
      });
      Future.delayed(const Duration(milliseconds: 100), () {
        _otpFocusNodes[0].requestFocus();
      });
    } catch (e) {
      setState(() { _loading = false; _error = 'Failed to send OTP. Try again.'; });
    }
  }

  Future<void> _verifyOtp() async {
  if (_otp.length < 6) return;
  final phone = _phoneController.text.trim();
  final formatted = phone.startsWith('+') ? phone : '+91$phone';

  setState(() { _loading = true; _error = null; });
  try {
    await _api.verifyOtp(
      formatted, 
      _otp,
      name: _isNewUser ? _nameController.text.trim() : null,
      role: widget.userRole, // <-- Pass the role dynamically here
    );
    if (mounted) {
      Navigator.pushReplacement(
        context,
        MaterialPageRoute(
          builder: (_) => HomeScreen(userRole: widget.userRole),
        ),
      );
    }
  } catch (e) {
    setState(() { _loading = false; _error = 'Invalid OTP. Try again.'; });
    for (final c in _otpControllers) c.clear();
    _otpFocusNodes[0].requestFocus();
  }
}

  void _onOtpDigit(int index, String value) {
    if (value.isNotEmpty && index < 5) {
      _otpFocusNodes[index + 1].requestFocus();
    }
    if (value.isEmpty && index > 0) {
      _otpFocusNodes[index - 1].requestFocus();
    }
    if (_otp.length == 6) _verifyOtp();
  }

  @override
  Widget build(BuildContext context) {
    final isBarber = widget.userRole == 'BARBER';
    final accentColor = isBarber ? Colors.orange : AppColors.primary;

    return Scaffold(
      backgroundColor: AppColors.dark,
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(24),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const SizedBox(height: 40),

              // Logo & Role Badge
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Container(
                    width: 60,
                    height: 60,
                    decoration: BoxDecoration(
                      color: accentColor,
                      borderRadius: BorderRadius.circular(16),
                      boxShadow: [
                        BoxShadow(
                          color: accentColor.withOpacity(0.4),
                          blurRadius: 16,
                          offset: const Offset(0, 4),
                        ),
                      ],
                    ),
                    child: Center(
                      child: Text(
                        isBarber ? '💈' : '✂️',
                        style: const TextStyle(fontSize: 28),
                      ),
                    ),
                  ),
                  if (isBarber)
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                      decoration: BoxDecoration(
                        color: Colors.orange.withOpacity(0.2),
                        borderRadius: BorderRadius.circular(20),
                        border: Border.all(color: Colors.orange.withOpacity(0.5)),
                      ),
                      child: const Text(
                        'PARTNER APP',
                        style: TextStyle(
                          color: Colors.orange,
                          fontWeight: FontWeight.bold,
                          fontSize: 12,
                          letterSpacing: 0.8,
                        ),
                      ),
                    ),
                ],
              ),
              const SizedBox(height: 24),
              Text(
                isBarber ? 'TrimTown Partner' : 'TrimTown',
                style: const TextStyle(fontSize: 28, fontWeight: FontWeight.w700, color: Colors.white),
              ),
              const SizedBox(height: 6),
              Text(
                isBarber 
                    ? 'Manage your salon. Grow your business.' 
                    : 'Your barber. Ready when you are.',
                style: const TextStyle(fontSize: 15, color: Colors.white60),
              ),
              const SizedBox(height: 48),

              // Auth Card
              Container(
                padding: const EdgeInsets.all(22),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(20),
                ),
                child: _step == 'phone' ? _buildPhoneStep(accentColor) : _buildOtpStep(accentColor),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildPhoneStep(Color accentColor) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          widget.userRole == 'BARBER' ? 'Partner Sign In' : 'Sign in', 
          style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w600),
        ),
        const SizedBox(height: 4),
        const Text(
          'Enter your mobile number to continue',
          style: TextStyle(fontSize: 13, color: AppColors.textMuted),
        ),
        const SizedBox(height: 20),

        // New user toggle
        Row(
          children: [
            const Text('New user?', style: TextStyle(fontSize: 13, color: AppColors.textMuted)),
            const SizedBox(width: 8),
            Switch(
              value: _isNewUser,
              onChanged: (v) => setState(() => _isNewUser = v),
              activeColor: accentColor,
              materialTapTargetSize: MaterialTapTargetSize.shrinkWrap,
            ),
          ],
        ),
        const SizedBox(height: 12),

        if (_isNewUser) ...[
          TextFormField(
            controller: _nameController,
            textCapitalization: TextCapitalization.words,
            decoration: const InputDecoration(
              hintText: 'Your full name',
              prefixIcon: Icon(Icons.person_outline, size: 20),
            ),
          ),
          const SizedBox(height: 12),
        ],

        TextFormField(
          controller: _phoneController,
          keyboardType: TextInputType.phone,
          inputFormatters: [FilteringTextInputFormatter.digitsOnly],
          maxLength: 10,
          decoration: const InputDecoration(
            hintText: '10-digit mobile number',
            prefixText: '+91  ',
            prefixStyle: TextStyle(fontWeight: FontWeight.w500),
            prefixIcon: Icon(Icons.phone_outlined, size: 20),
            counterText: '',
          ),
          onFieldSubmitted: (_) => _sendOtp(),
        ),

        if (_error != null) ...[
          const SizedBox(height: 10),
          Text(_error!, style: const TextStyle(color: Colors.red, fontSize: 12)),
        ],

        const SizedBox(height: 20),
        SizedBox(
          width: double.infinity,
          child: ElevatedButton(
            style: ElevatedButton.styleFrom(
              backgroundColor: accentColor,
            ),
            onPressed: _loading ? null : _sendOtp,
            child: _loading
              ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
              : const Text('Send OTP'),
          ),
        ),
      ],
    );
  }

  Widget _buildOtpStep(Color accentColor) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            GestureDetector(
              onTap: () => setState(() { _step = 'phone'; _error = null; }),
              child: const Icon(Icons.arrow_back_ios, size: 18, color: AppColors.textMuted),
            ),
            const SizedBox(width: 8),
            const Text('Enter OTP', style: TextStyle(fontSize: 20, fontWeight: FontWeight.w600)),
          ],
        ),
        const SizedBox(height: 4),
        Text(
          'Sent to +91 ${_phoneController.text}',
          style: const TextStyle(fontSize: 13, color: AppColors.textMuted),
        ),

        if (_devOtp != null) ...[
          const SizedBox(height: 8),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
            decoration: BoxDecoration(
              color: const Color(0xFFFFFBEB),
              borderRadius: BorderRadius.circular(8),
              border: Border.all(color: const Color(0xFFFDE68A)),
            ),
            child: Text(
              'Dev OTP: $_devOtp',
              style: const TextStyle(
                fontFamily: 'monospace',
                fontSize: 13,
                fontWeight: FontWeight.w600,
                color: Color(0xFF92400E),
              ),
            ),
          ),
        ],

        const SizedBox(height: 24),

        // OTP boxes
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: List.generate(6, (i) => SizedBox(
            width: 44,
            height: 52,
            child: TextFormField(
              controller: _otpControllers[i],
              focusNode: _otpFocusNodes[i],
              textAlign: TextAlign.center,
              keyboardType: TextInputType.number,
              maxLength: 1,
              inputFormatters: [FilteringTextInputFormatter.digitsOnly],
              style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w600),
              decoration: InputDecoration(
                counterText: '',
                contentPadding: EdgeInsets.zero,
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(10),
                  borderSide: const BorderSide(color: AppColors.border),
                ),
                focusedBorder: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(10),
                  borderSide: BorderSide(color: accentColor, width: 2),
                ),
              ),
              onChanged: (v) => _onOtpDigit(i, v),
            ),
          )),
        ),

        if (_error != null) ...[
          const SizedBox(height: 12),
          Text(_error!, style: const TextStyle(color: Colors.red, fontSize: 12)),
        ],

        const SizedBox(height: 20),
        SizedBox(
          width: double.infinity,
          child: ElevatedButton(
            style: ElevatedButton.styleFrom(
              backgroundColor: accentColor,
            ),
            onPressed: (_loading || _otp.length < 6) ? null : _verifyOtp,
            child: _loading
              ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
              : const Text('Verify & Continue'),
          ),
        ),
        const SizedBox(height: 12),
        Center(
          child: TextButton(
            onPressed: _loading ? null : _sendOtp,
            child: const Text('Resend OTP', style: TextStyle(color: AppColors.textMuted, fontSize: 13)),
          ),
        ),
      ],
    );
  }
}