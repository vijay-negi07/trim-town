// flutter_app/lib/features/queue/barber_queue_screen.dart
import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../../core/api/api_service.dart';
import '../../core/api/socket_service.dart';
import '../../core/constants/app_constants.dart';
import '../../core/models/models.dart';
import '../home/widgets/status_chip.dart';

class BarberQueueScreen extends StatefulWidget {
  final String barberId;
  final String barberName;
  const BarberQueueScreen({super.key, required this.barberId, required this.barberName});

  @override
  State<BarberQueueScreen> createState() => _BarberQueueScreenState();
}

class _BarberQueueScreenState extends State<BarberQueueScreen> {
  final _api = ApiService();
  final _socket = SocketService();

  AvailabilityStatus _status = AvailabilityStatus.closed;
  int _queueCount = 0;
  List<Map<String, dynamic>> _queue = [];
  bool _loading = true;
  double _todayEarnings = 0;
  int _servedToday = 0;

  @override
  void initState() {
    super.initState();
    _load();
    _socket.onQueueUpdate(widget.barberId, _onQueueUpdate);
  }

  @override
  void dispose() {
    _socket.removeListener(widget.barberId, _onQueueUpdate);
    super.dispose();
  }

  void _onQueueUpdate(Map<String, dynamic> data) {
    setState(() {
      _status = _parseStatus(data['status'] ?? 'CLOSED');
      _queueCount = data['queueCount'] ?? 0;
    });
  }

  Future<void> _load() async {
    setState(() => _loading = true);
    try {
      final avail = await _api.getAvailability(widget.barberId);
      setState(() {
        _status = _parseStatus(avail['status'] ?? 'CLOSED');
        _queueCount = avail['queueCount'] ?? 0;
        _queue = List<Map<String, dynamic>>.from(avail['queue'] ?? []);
        _loading = false;
      });
    } catch (_) {
      // Mock data for dev
      setState(() {
        _status = AvailabilityStatus.available;
        _queueCount = 2;
        _queue = [
          {'id': '1', 'customerName': 'Rahul Sharma', 'position': 1, 'addedAt': DateTime.now().toIso8601String()},
          {'id': '2', 'customerName': 'Amit Singh', 'position': 2, 'addedAt': DateTime.now().subtract(const Duration(minutes: 5)).toIso8601String()},
        ];
        _todayEarnings = 560;
        _servedToday = 7;
        _loading = false;
      });
    }
  }

  Future<void> _setStatus(AvailabilityStatus status) async {
    try {
      final statusStr = status.name.toUpperCase();
      await _api.updateStatus(widget.barberId, statusStr);
      setState(() => _status = status);
      _showSnack('Status updated to ${status.name}');
    } catch (_) {
      setState(() => _status = status); // optimistic update in dev
    }
  }

  Future<void> _markDone() async {
    if (_queue.isEmpty) return;
    try {
      await _api.markNextDone(widget.barberId);
      setState(() {
        _queue.removeAt(0);
        _queueCount = _queue.length;
        _servedToday++;
        _todayEarnings += 80; // avg
      });
      _showSnack('Customer marked as done ✓');
    } catch (_) {
      // Dev mode
      if (_queue.isNotEmpty) {
        setState(() {
          _queue.removeAt(0);
          _queueCount = _queue.length;
          _servedToday++;
          _todayEarnings += 80;
        });
      }
    }
  }

  void _showSnack(String msg) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text(msg), duration: const Duration(seconds: 2), behavior: SnackBarBehavior.floating),
    );
  }

  AvailabilityStatus _parseStatus(String s) {
    switch (s.toUpperCase()) {
      case 'AVAILABLE': return AvailabilityStatus.available;
      case 'BUSY': return AvailabilityStatus.busy;
      default: return AvailabilityStatus.closed;
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        backgroundColor: AppColors.dark,
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(widget.barberName, style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w600, color: Colors.white)),
            const Text('Barber dashboard', style: TextStyle(fontSize: 11, color: Colors.white54)),
          ],
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh, color: Colors.white70),
            onPressed: _load,
          ),
        ],
      ),
      body: _loading
        ? const Center(child: CircularProgressIndicator())
        : RefreshIndicator(
            onRefresh: _load,
            child: SingleChildScrollView(
              physics: const AlwaysScrollableScrollPhysics(),
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // ── Status toggle ───────────────────────────────────────
                  _sectionLabel('Your status'),
                  const SizedBox(height: 10),
                  Row(
                    children: [
                      _statusBtn('🟢 Open', AvailabilityStatus.available,
                        const Color(0xFFDCFCE7), const Color(0xFF166534)),
                      const SizedBox(width: 8),
                      _statusBtn('🟡 Busy', AvailabilityStatus.busy,
                        const Color(0xFFFEF9C3), const Color(0xFF854D0E)),
                      const SizedBox(width: 8),
                      _statusBtn('🔴 Closed', AvailabilityStatus.closed,
                        const Color(0xFFFEE2E2), const Color(0xFF991B1B)),
                    ],
                  ),

                  const SizedBox(height: 16),

                  // ── Queue summary ───────────────────────────────────────
                  Container(
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(14),
                      border: Border.all(color: AppColors.border),
                    ),
                    child: Row(
                      children: [
                        _queueStat('Queue now', '$_queueCount waiting', AppColors.primary),
                        _divider(),
                        _queueStat('Wait time', '~${_queueCount * 20} min', AppColors.busy),
                        _divider(),
                        _queueStat('Served', '$_servedToday today', AppColors.available),
                      ],
                    ),
                  ),

                  const SizedBox(height: 20),

                  // ── Live queue ──────────────────────────────────────────
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      _sectionLabel('Live queue'),
                      if (_queue.isNotEmpty)
                        TextButton(
                          onPressed: _markDone,
                          child: const Text('Mark next done ✓', style: TextStyle(fontSize: 13)),
                        ),
                    ],
                  ),
                  const SizedBox(height: 8),

                  if (_queue.isEmpty)
                    Container(
                      padding: const EdgeInsets.all(24),
                      decoration: BoxDecoration(
                        color: Colors.white,
                        borderRadius: BorderRadius.circular(14),
                        border: Border.all(color: AppColors.border),
                      ),
                      child: const Center(
                        child: Column(
                          children: [
                            Icon(Icons.people_outline, size: 40, color: AppColors.textLight),
                            SizedBox(height: 8),
                            Text('Queue is empty', style: TextStyle(color: AppColors.textMuted)),
                            Text('Walk-ins will appear here', style: TextStyle(fontSize: 12, color: AppColors.textLight)),
                          ],
                        ),
                      ),
                    )
                  else
                    Container(
                      decoration: BoxDecoration(
                        color: Colors.white,
                        borderRadius: BorderRadius.circular(14),
                        border: Border.all(color: AppColors.border),
                      ),
                      child: Column(
                        children: _queue.asMap().entries.map((entry) {
                          final idx = entry.key;
                          final item = entry.value;
                          final isFirst = idx == 0;
                          return Container(
                            padding: const EdgeInsets.all(14),
                            decoration: BoxDecoration(
                              color: isFirst ? AppColors.primary.withOpacity(0.04) : null,
                              border: idx < _queue.length - 1
                                ? const Border(bottom: BorderSide(color: AppColors.border))
                                : null,
                            ),
                            child: Row(
                              children: [
                                Container(
                                  width: 30, height: 30,
                                  decoration: BoxDecoration(
                                    color: isFirst ? AppColors.primary : AppColors.background,
                                    shape: BoxShape.circle,
                                  ),
                                  child: Center(
                                    child: Text('${idx + 1}',
                                      style: TextStyle(
                                        fontSize: 13, fontWeight: FontWeight.w600,
                                        color: isFirst ? Colors.white : AppColors.textMuted,
                                      )),
                                  ),
                                ),
                                const SizedBox(width: 12),
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      Text(item['customerName'] ?? 'Walk-in',
                                        style: const TextStyle(fontWeight: FontWeight.w500, fontSize: 14)),
                                      Text(
                                        'Added ${DateFormat('h:mm a').format(DateTime.parse(item['addedAt'] ?? DateTime.now().toIso8601String()))}',
                                        style: const TextStyle(fontSize: 12, color: AppColors.textMuted),
                                      ),
                                    ],
                                  ),
                                ),
                                if (isFirst)
                                  GestureDetector(
                                    onTap: _markDone,
                                    child: Container(
                                      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                                      decoration: BoxDecoration(
                                        color: AppColors.primary,
                                        borderRadius: BorderRadius.circular(8),
                                      ),
                                      child: const Text('Done ✓',
                                        style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: Colors.white)),
                                    ),
                                  ),
                              ],
                            ),
                          );
                        }).toList(),
                      ),
                    ),

                  const SizedBox(height: 20),

                  // ── Today's earnings ────────────────────────────────────
                  _sectionLabel("Today's earnings"),
                  const SizedBox(height: 8),
                  Container(
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(14),
                      border: Border.all(color: AppColors.border),
                    ),
                    child: Column(
                      children: [
                        _earningsRow('Customers served', '$_servedToday'),
                        _earningsRow('Revenue', '₹${_todayEarnings.toStringAsFixed(0)}'),
                        _earningsRow('Avg per customer', _servedToday > 0
                          ? '₹${(_todayEarnings / _servedToday).toStringAsFixed(0)}'
                          : '—'),
                        _earningsRow('Peak hour', '11 AM – 1 PM'),
                      ],
                    ),
                  ),
                  const SizedBox(height: 24),
                ],
              ),
            ),
          ),
    );
  }

  Widget _statusBtn(String label, AvailabilityStatus status, Color bg, Color fg) {
    final active = _status == status;
    return Expanded(
      child: GestureDetector(
        onTap: () => _setStatus(status),
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 200),
          padding: const EdgeInsets.symmetric(vertical: 10),
          decoration: BoxDecoration(
            color: active ? bg : Colors.white,
            borderRadius: BorderRadius.circular(10),
            border: Border.all(color: active ? bg : AppColors.border, width: active ? 1.5 : 1),
          ),
          child: Center(
            child: Text(label,
              style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600,
                color: active ? fg : AppColors.textMuted)),
          ),
        ),
      ),
    );
  }

  Widget _queueStat(String label, String value, Color color) => Expanded(
    child: Column(children: [
      Text(value, style: TextStyle(fontSize: 16, fontWeight: FontWeight.w600, color: color)),
      const SizedBox(height: 2),
      Text(label, style: const TextStyle(fontSize: 11, color: AppColors.textMuted)),
    ]),
  );

  Widget _divider() => Container(width: 1, height: 36, color: AppColors.border);

  Widget _earningsRow(String label, String value) => Padding(
    padding: const EdgeInsets.symmetric(vertical: 6),
    child: Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(label, style: const TextStyle(fontSize: 13, color: AppColors.textMuted)),
        Text(value, style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w500)),
      ],
    ),
  );

  Widget _sectionLabel(String text) => Text(
    text.toUpperCase(),
    style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w600,
      color: AppColors.textLight, letterSpacing: 0.5),
  );
}
