import 'package:flutter/material.dart';
import '../../../core/constants/app_constants.dart';
import '../../../core/models/models.dart';
import 'status_chip.dart';

// ─── SALON CARD ───────────────────────────────────────────────────────────────

class SalonCard extends StatelessWidget {
  final Salon salon;
  final VoidCallback onTap;

  const SalonCard({super.key, required this.salon, required this.onTap});

  @override
  Widget build(BuildContext context) {
    final status = salon.overallStatus;
    return GestureDetector(
      onTap: onTap,
      child: Container(
        margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: AppColors.border),
        ),
        padding: const EdgeInsets.all(14),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Top row
            Row(
              children: [
                Container(
                  width: 46,
                  height: 46,
                  decoration: BoxDecoration(
                    color: AppColors.primary.withOpacity(0.08),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: const Center(child: Text('✂️', style: TextStyle(fontSize: 22))),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(salon.name, style: Theme.of(context).textTheme.titleMedium),
                      const SizedBox(height: 2),
                      Text('${salon.area} · ${salon.distance != null ? "${salon.distance!.toStringAsFixed(1)} km" : "nearby"}',
                        style: Theme.of(context).textTheme.bodyMedium),
                    ],
                  ),
                ),
                StatusChip(status: status, queueCount: salon.totalQueueCount),
              ],
            ),
            const SizedBox(height: 10),

            // Meta row
            Row(
              children: [
                if (salon.averageRating != null) ...[
                  const Icon(Icons.star_rounded, size: 14, color: Color(0xFFF59E0B)),
                  const SizedBox(width: 3),
                  Text('${salon.averageRating!.toStringAsFixed(1)} (${salon.reviewCount})',
                    style: const TextStyle(fontSize: 12, color: AppColors.textMuted)),
                  const SizedBox(width: 12),
                ],
                const Icon(Icons.access_time, size: 13, color: AppColors.textLight),
                const SizedBox(width: 3),
                Text(
                  status == AvailabilityStatus.available
                    ? 'Walk in now'
                    : status == AvailabilityStatus.busy
                      ? '~${salon.minWaitMins} min wait'
                      : 'Closed',
                  style: const TextStyle(fontSize: 12, color: AppColors.textMuted),
                ),
              ],
            ),
            const SizedBox(height: 10),

            // Queue bar
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
              decoration: BoxDecoration(
                color: AppColors.background,
                borderRadius: BorderRadius.circular(8),
              ),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Text('Queue', style: TextStyle(fontSize: 12, color: AppColors.textMuted)),
                  Text(
                    salon.totalQueueCount == 0
                      ? 'Empty · Walk in'
                      : '${salon.totalQueueCount} waiting · ~${salon.minWaitMins} min',
                    style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w500, color: AppColors.text),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

// ─── SKELETON ────────────────────────────────────────────────────────────────

class SalonCardSkeleton extends StatefulWidget {
  const SalonCardSkeleton({super.key});
  @override
  State<SalonCardSkeleton> createState() => _SalonCardSkeletonState();
}

class _SalonCardSkeletonState extends State<SalonCardSkeleton> with SingleTickerProviderStateMixin {
  late final AnimationController _ctrl = AnimationController(vsync: this, duration: const Duration(milliseconds: 1000))..repeat(reverse: true);
  late final Animation<double> _anim = Tween(begin: 0.4, end: 1.0).animate(_ctrl);

  @override
  void dispose() { _ctrl.dispose(); super.dispose(); }

  @override
  Widget build(BuildContext context) {
    return FadeTransition(
      opacity: _anim,
      child: Container(
        margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(14), border: Border.all(color: AppColors.border)),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Row(children: [
            Container(width: 46, height: 46, decoration: BoxDecoration(color: Colors.grey[200], borderRadius: BorderRadius.circular(12))),
            const SizedBox(width: 12),
            Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Container(height: 14, width: 140, color: Colors.grey[200]),
              const SizedBox(height: 6),
              Container(height: 11, width: 100, color: Colors.grey[100]),
            ])),
            Container(height: 24, width: 72, decoration: BoxDecoration(color: Colors.grey[100], borderRadius: BorderRadius.circular(20))),
          ]),
          const SizedBox(height: 10),
          Container(height: 11, width: 160, color: Colors.grey[100]),
          const SizedBox(height: 10),
          Container(height: 36, decoration: BoxDecoration(color: Colors.grey[100], borderRadius: BorderRadius.circular(8))),
        ]),
      ),
    );
  }
}
