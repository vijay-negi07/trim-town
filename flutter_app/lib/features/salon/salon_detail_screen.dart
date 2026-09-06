// flutter_app/lib/features/queue/barber_queue_screen.dart
import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../../core/api/api_service.dart';
import '../../core/api/socket_service.dart';
import '../../core/constants/app_constants.dart';
import '../../core/models/models.dart';
import '../home/widgets/salon_card.dart';
import '../home/widgets/status_chip.dart';

class SalonDetailScreen extends StatefulWidget {
  final Salon salon;
  const SalonDetailScreen({super.key, required this.salon});

  @override
  State<SalonDetailScreen> createState() => _SalonDetailScreenState();
}

class _SalonDetailScreenState extends State<SalonDetailScreen> with SingleTickerProviderStateMixin {
  late TabController _tabs;
  final _api = ApiService();
  final _socket = SocketService();

  final Set<String> _selectedServiceIds = {};
  String? _selectedSlot;
  List<String> _slots = [];
  bool _bookingLoading = false;

  Salon get salon => widget.salon;
  Barber? get barber => salon.barbers.isNotEmpty ? salon.barbers.first : null;

  double get _totalPrice {
    if (barber == null) return 0;
    return barber!.services
      .where((s) => _selectedServiceIds.contains(s.id))
      .fold(0, (sum, s) => sum + s.price);
  }

  @override
  void initState() {
    super.initState();
    _tabs = TabController(length: 3, vsync: this);
    _socket.joinSalon(salon.id);
    _loadSlots();
  }

  @override
  void dispose() {
    _socket.leaveSalon(salon.id);
    _tabs.dispose();
    super.dispose();
  }

  Future<void> _loadSlots() async {
    if (barber == null) return;
    try {
      final slots = await _api.getAvailableSlots(barber!.id, DateTime.now());
      setState(() => _slots = slots.take(12).toList());
    } catch (_) {
      // Use mock slots in dev
      setState(() {
        _slots = List.generate(8, (i) {
          final t = DateTime.now().add(Duration(minutes: 30 * (i + 1)));
          return t.toIso8601String();
        });
      });
    }
  }

  Future<void> _book() async {
    if (_selectedServiceIds.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Please select a service')));
      return;
    }
    if (_selectedSlot == null) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Please select a time slot')));
      return;
    }

    setState(() => _bookingLoading = true);
    try {
      await _api.createAppointment(
        barberId: barber!.id,
        serviceIds: _selectedServiceIds.toList(),
        slotTime: DateTime.parse(_selectedSlot!),
      );
      if (mounted) {
        _showConfirmation();
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.toString())));
      }
    } finally {
      if (mounted) setState(() => _bookingLoading = false);
    }
  }

  void _showConfirmation() {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(24))),
      builder: (_) => Container(
        padding: const EdgeInsets.all(28),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(Icons.check_circle, color: Color(0xFF22C55E), size: 56),
            const SizedBox(height: 16),
            const Text('Booking confirmed!', style: TextStyle(fontSize: 20, fontWeight: FontWeight.w600)),
            const SizedBox(height: 8),
            Text('Your slot at ${salon.name} is reserved.', textAlign: TextAlign.center, style: const TextStyle(color: AppColors.textMuted)),
            const SizedBox(height: 20),
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(color: AppColors.background, borderRadius: BorderRadius.circular(12)),
              child: Column(
                children: [
                  _detailRow('Salon', salon.name),
                  _detailRow('Barber', barber?.name ?? '—'),
                  _detailRow('Slot', _selectedSlot != null ? DateFormat('h:mm a').format(DateTime.parse(_selectedSlot!)) : '—'),
                  _detailRow('Total', '₹${_totalPrice.toStringAsFixed(0)}'),
                  _detailRow('Payment', 'Pay at salon'),
                ],
              ),
            ),
            const SizedBox(height: 20),
            SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                onPressed: () { Navigator.pop(context); Navigator.pop(context); },
                child: const Text('Back to home'),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _detailRow(String label, String value) => Padding(
    padding: const EdgeInsets.symmetric(vertical: 4),
    child: Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(label, style: const TextStyle(fontSize: 13, color: AppColors.textMuted)),
        Text(value, style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w500)),
      ],
    ),
  );

  @override
  Widget build(BuildContext context) {
    final status = salon.overallStatus;
    return Scaffold(
      backgroundColor: AppColors.background,
      body: CustomScrollView(
        slivers: [
          SliverAppBar(
            expandedHeight: 120,
            pinned: true,
            backgroundColor: AppColors.dark,
            leading: IconButton(
              icon: const Icon(Icons.arrow_back_ios_new, color: Colors.white, size: 18),
              onPressed: () => Navigator.pop(context),
            ),
            flexibleSpace: FlexibleSpaceBar(
              background: Container(
                color: AppColors.dark,
                padding: const EdgeInsets.fromLTRB(70, 60, 20, 16),
                child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  Text(salon.name, style: const TextStyle(color: Colors.white, fontSize: 18, fontWeight: FontWeight.w600)),
                  const SizedBox(height: 4),
                  Text(salon.address, style: const TextStyle(color: Colors.white60, fontSize: 12)),
                  const SizedBox(height: 8),
                  Row(children: [
                    StatusChip(status: status, queueCount: salon.totalQueueCount),
                    if (salon.averageRating != null) ...[
                      const SizedBox(width: 10),
                      Text('⭐ ${salon.averageRating!.toStringAsFixed(1)} · ${salon.reviewCount} reviews',
                        style: const TextStyle(color: Colors.white60, fontSize: 12)),
                    ],
                  ]),
                ]),
              ),
            ),
            bottom: TabBar(
              controller: _tabs,
              labelColor: Colors.white,
              unselectedLabelColor: Colors.white38,
              indicatorColor: AppColors.primary,
              tabs: const [Tab(text: 'Book'), Tab(text: 'About'), Tab(text: 'Reviews')],
            ),
          ),

          SliverFillRemaining(
            child: TabBarView(
              controller: _tabs,
              children: [
                _buildBookTab(),
                _buildAboutTab(),
                _buildReviewsTab(),
              ],
            ),
          ),
        ],
      ),

      bottomNavigationBar: _totalPrice > 0
        ? Container(
            padding: const EdgeInsets.fromLTRB(16, 12, 16, 24),
            decoration: const BoxDecoration(
              color: Colors.white,
              border: Border(top: BorderSide(color: AppColors.border)),
            ),
            child: Row(
              children: [
                Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  const Text('Total', style: TextStyle(fontSize: 12, color: AppColors.textMuted)),
                  Text('₹${_totalPrice.toStringAsFixed(0)}', style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w600)),
                ]),
                const SizedBox(width: 16),
                Expanded(
                  child: ElevatedButton(
                    onPressed: _bookingLoading ? null : _book,
                    child: _bookingLoading
                      ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                      : const Text('Confirm booking'),
                  ),
                ),
              ],
            ),
          )
        : null,
    );
  }

  Widget _buildBookTab() {
    if (barber == null) return const Center(child: Text('No barbers available'));
    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        _sectionLabel('Select services'),
        const SizedBox(height: 8),
        Container(
          decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(14), border: Border.all(color: AppColors.border)),
          child: Column(
            children: barber!.services.map((s) {
              final selected = _selectedServiceIds.contains(s.id);
              return GestureDetector(
                onTap: () => setState(() {
                  if (selected) _selectedServiceIds.remove(s.id);
                  else _selectedServiceIds.add(s.id);
                }),
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                  decoration: BoxDecoration(
                    border: Border(bottom: BorderSide(color: AppColors.border, width: s == barber!.services.last ? 0 : 1)),
                  ),
                  child: Row(
                    children: [
                      Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                        Text(s.name, style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w500)),
                        Text('${s.durationMins} min', style: const TextStyle(fontSize: 12, color: AppColors.textMuted)),
                      ])),
                      Text('₹${s.price.toStringAsFixed(0)}', style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w600, color: AppColors.primary)),
                      const SizedBox(width: 12),
                      Container(
                        width: 22, height: 22,
                        decoration: BoxDecoration(
                          shape: BoxShape.circle,
                          color: selected ? AppColors.primary : Colors.transparent,
                          border: Border.all(color: selected ? AppColors.primary : AppColors.border, width: 1.5),
                        ),
                        child: selected ? const Icon(Icons.check, size: 14, color: Colors.white) : null,
                      ),
                    ],
                  ),
                ),
              );
            }).toList(),
          ),
        ),

        const SizedBox(height: 20),
        _sectionLabel('Pick a time slot'),
        const SizedBox(height: 8),
        GridView.builder(
          shrinkWrap: true,
          physics: const NeverScrollableScrollPhysics(),
          gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
            crossAxisCount: 3, mainAxisSpacing: 8, crossAxisSpacing: 8, childAspectRatio: 2.5,
          ),
          itemCount: _slots.length,
          itemBuilder: (_, i) {
            final slot = _slots[i];
            final selected = _selectedSlot == slot;
            final time = DateFormat('h:mm a').format(DateTime.parse(slot));
            return GestureDetector(
              onTap: () => setState(() => _selectedSlot = slot),
              child: Container(
                alignment: Alignment.center,
                decoration: BoxDecoration(
                  color: selected ? AppColors.primary : Colors.white,
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(color: selected ? AppColors.primary : AppColors.border),
                ),
                child: Text(time, style: TextStyle(fontSize: 12, fontWeight: FontWeight.w500, color: selected ? Colors.white : AppColors.textMuted)),
              ),
            );
          },
        ),
        const SizedBox(height: 80),
      ]),
    );
  }

  Widget _buildAboutTab() {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        if (salon.description != null) ...[
          _sectionLabel('About'),
          const SizedBox(height: 8),
          Text(salon.description!, style: const TextStyle(color: AppColors.textMuted, height: 1.6)),
          const SizedBox(height: 16),
        ],
        _sectionLabel('Hours'),
        const SizedBox(height: 8),
        _infoCard([
          _infoRow(Icons.access_time, '${salon.openTime} – ${salon.closeTime}'),
          _infoRow(Icons.location_on_outlined, salon.address),
        ]),
        if (barber != null) ...[
          const SizedBox(height: 16),
          _sectionLabel('Barber'),
          const SizedBox(height: 8),
          _infoCard([
            _infoRow(Icons.person_outline, barber!.name),
            _infoRow(Icons.work_outline, '${barber!.experience} years experience'),
            if (barber!.specialties.isNotEmpty) _infoRow(Icons.auto_awesome, barber!.specialties.join(', ')),
          ]),
        ],
      ]),
    );
  }

  Widget _buildReviewsTab() {
    return const Center(child: Text('No reviews yet', style: TextStyle(color: AppColors.textMuted)));
  }

  Widget _sectionLabel(String text) => Text(text.toUpperCase(),
    style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: AppColors.textLight, letterSpacing: 0.5));

  Widget _infoCard(List<Widget> children) => Container(
    padding: const EdgeInsets.all(14),
    decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(12), border: Border.all(color: AppColors.border)),
    child: Column(children: children),
  );

  Widget _infoRow(IconData icon, String text) => Padding(
    padding: const EdgeInsets.symmetric(vertical: 4),
    child: Row(children: [
      Icon(icon, size: 16, color: AppColors.textLight),
      const SizedBox(width: 10),
      Expanded(child: Text(text, style: const TextStyle(fontSize: 13, color: AppColors.textMuted))),
    ]),
  );
}
