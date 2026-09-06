// flutter_app/lib/features/appointment/appointments_screen.dart
import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../../core/api/api_service.dart';
import '../../core/constants/app_constants.dart';
import '../../core/models/models.dart';

class AppointmentsScreen extends StatefulWidget {
  const AppointmentsScreen({super.key});

  @override
  State<AppointmentsScreen> createState() => _AppointmentsScreenState();
}

class _AppointmentsScreenState extends State<AppointmentsScreen>
    with SingleTickerProviderStateMixin {
  final _api = ApiService();
  late TabController _tabs;

  List<Appointment> _upcoming = [];
  List<Appointment> _past = [];
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _tabs = TabController(length: 2, vsync: this);
    _load();
  }

  @override
  void dispose() {
    _tabs.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    setState(() => _loading = true);
    try {
      final all = await _api.getMyAppointments();
      final now = DateTime.now();
      setState(() {
        _upcoming = all
            .where((a) =>
                a.slotTime.isAfter(now) &&
                a.status != AppointmentStatus.cancelled)
            .toList();
        _past = all
            .where((a) =>
                a.slotTime.isBefore(now) ||
                a.status == AppointmentStatus.completed ||
                a.status == AppointmentStatus.cancelled)
            .toList();
        _loading = false;
      });
    } catch (_) {
      // Mock data for development
      setState(() {
        _upcoming = [];
        _past = [];
        _loading = false;
      });
    }
  }

  Future<void> _cancel(Appointment appt) async {
    final confirm = await showDialog<bool>(
      context: context,
      builder: (_) => AlertDialog(
        title: const Text('Cancel booking?'),
        content: Text(
            'Cancel your appointment at ${appt.barber.salon.name}? This cannot be undone.'),
        actions: [
          TextButton(
              onPressed: () => Navigator.pop(context, false),
              child: const Text('Keep it')),
          TextButton(
              onPressed: () => Navigator.pop(context, true),
              style: TextButton.styleFrom(foregroundColor: Colors.red),
              child: const Text('Cancel booking')),
        ],
      ),
    );

    if (confirm != true) return;

    try {
      await _api.cancelAppointment(appt.id);
      _load();
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
              content: Text('Appointment cancelled'),
              behavior: SnackBarBehavior.floating),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context)
            .showSnackBar(SnackBar(content: Text(e.toString())));
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        backgroundColor: AppColors.dark,
        title: const Text('My Bookings'),
        bottom: TabBar(
          controller: _tabs,
          labelColor: Colors.white,
          unselectedLabelColor: Colors.white38,
          indicatorColor: AppColors.primary,
          tabs: [
            Tab(text: 'Upcoming (${_upcoming.length})'),
            Tab(text: 'Past (${_past.length})'),
          ],
        ),
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : TabBarView(
              controller: _tabs,
              children: [
                _buildList(_upcoming, showCancel: true),
                _buildList(_past, showCancel: false),
              ],
            ),
    );
  }

  Widget _buildList(List<Appointment> list, {required bool showCancel}) {
    if (list.isEmpty) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.calendar_today_outlined,
                size: 56, color: AppColors.textLight),
            const SizedBox(height: 16),
            const Text('No appointments',
                style: TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.w500,
                    color: AppColors.textMuted)),
            const SizedBox(height: 6),
            const Text('Find a barber and book your slot',
                style: TextStyle(fontSize: 13, color: AppColors.textLight)),
          ],
        ),
      );
    }

    return RefreshIndicator(
      onRefresh: _load,
      child: ListView.builder(
        padding: const EdgeInsets.all(16),
        itemCount: list.length,
        itemBuilder: (_, i) => _AppointmentCard(
          appointment: list[i],
          showCancel: showCancel,
          onCancel: () => _cancel(list[i]),
        ),
      ),
    );
  }
}

// ─── APPOINTMENT CARD ─────────────────────────────────────────────────────────

class _AppointmentCard extends StatelessWidget {
  final Appointment appointment;
  final bool showCancel;
  final VoidCallback onCancel;

  const _AppointmentCard({
    required this.appointment,
    required this.showCancel,
    required this.onCancel,
  });

  Color get _statusColor {
    switch (appointment.status) {
      case AppointmentStatus.confirmed:
        return AppColors.available;
      case AppointmentStatus.completed:
        return AppColors.primary;
      case AppointmentStatus.cancelled:
        return AppColors.closed;
      case AppointmentStatus.inProgress:
        return AppColors.busy;
      default:
        return AppColors.textLight;
    }
  }

  String get _statusLabel {
    switch (appointment.status) {
      case AppointmentStatus.confirmed:
        return 'Confirmed';
      case AppointmentStatus.completed:
        return 'Completed';
      case AppointmentStatus.cancelled:
        return 'Cancelled';
      case AppointmentStatus.inProgress:
        return 'In progress';
      default:
        return 'Pending';
    }
  }

  @override
  Widget build(BuildContext context) {
    final slot = appointment.slotTime;
    final serviceNames =
        appointment.services.map((s) => s.service['name'] ?? '').join(', ');

    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: AppColors.border),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Header
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
            decoration: BoxDecoration(
              color: _statusColor.withOpacity(0.06),
              borderRadius:
                  const BorderRadius.vertical(top: Radius.circular(14)),
              border: Border(
                  bottom: BorderSide(color: _statusColor.withOpacity(0.2))),
            ),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  DateFormat('EEE, d MMM · h:mm a').format(slot),
                  style: const TextStyle(
                      fontSize: 13,
                      fontWeight: FontWeight.w600,
                      color: AppColors.text),
                ),
                Container(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                  decoration: BoxDecoration(
                    color: _statusColor.withOpacity(0.12),
                    borderRadius: BorderRadius.circular(20),
                  ),
                  child: Text(
                    _statusLabel,
                    style: TextStyle(
                        fontSize: 11,
                        fontWeight: FontWeight.w600,
                        color: _statusColor),
                  ),
                ),
              ],
            ),
          ),

          // Body
          Padding(
            padding: const EdgeInsets.all(14),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(children: [
                  const Text('✂️', style: TextStyle(fontSize: 18)),
                  const SizedBox(width: 10),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(appointment.barber.salon.name,
                            style: const TextStyle(
                                fontSize: 14, fontWeight: FontWeight.w600)),
                        Text(appointment.barber.name,
                            style: const TextStyle(
                                fontSize: 12, color: AppColors.textMuted)),
                      ],
                    ),
                  ),
                  Text(
                    '₹${appointment.totalPrice.toStringAsFixed(0)}',
                    style: const TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.w600,
                        color: AppColors.primary),
                  ),
                ]),
                const SizedBox(height: 10),
                Container(
                  padding: const EdgeInsets.all(10),
                  decoration: BoxDecoration(
                    color: AppColors.background,
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Row(
                    children: [
                      const Icon(Icons.content_cut,
                          size: 14, color: AppColors.textLight),
                      const SizedBox(width: 6),
                      Expanded(
                        child: Text(
                          serviceNames.isEmpty ? 'Services' : serviceNames,
                          style: const TextStyle(
                              fontSize: 12, color: AppColors.textMuted),
                        ),
                      ),
                    ],
                  ),
                ),
                if (showCancel) ...[
                  const SizedBox(height: 10),
                  Row(children: [
                    Expanded(
                      child: OutlinedButton(
                        onPressed: onCancel,
                        style: OutlinedButton.styleFrom(
                          foregroundColor: Colors.red,
                          side: const BorderSide(color: Colors.red),
                          padding: const EdgeInsets.symmetric(vertical: 10),
                          shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(8)),
                        ),
                        child: const Text('Cancel',
                            style: TextStyle(fontSize: 13)),
                      ),
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: ElevatedButton(
                        onPressed: () {},
                        style: ElevatedButton.styleFrom(
                          padding: const EdgeInsets.symmetric(vertical: 10),
                          shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(8)),
                        ),
                        child: const Text('Get directions',
                            style: TextStyle(fontSize: 13)),
                      ),
                    ),
                  ]),
                ],
              ],
            ),
          ),
        ],
      ),
    );
  }
}
