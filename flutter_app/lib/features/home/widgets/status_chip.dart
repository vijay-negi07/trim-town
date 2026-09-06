import 'package:flutter/material.dart';
import '../../../core/constants/app_constants.dart';
import '../../../core/models/models.dart';

class StatusChip extends StatelessWidget {
  final AvailabilityStatus status;
  final int? queueCount;
  final int? waitMins;

  const StatusChip({
    super.key,
    required this.status,
    this.queueCount,
    this.waitMins,
  });

  @override
  Widget build(BuildContext context) {
    final cfg = _config[status]!;
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(
        color: cfg['bg'] as Color,
        borderRadius: BorderRadius.circular(20),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            width: 6,
            height: 6,
            decoration: BoxDecoration(
              color: cfg['dot'] as Color,
              shape: BoxShape.circle,
            ),
          ),
          const SizedBox(width: 5),
          Text(
            cfg['label'] as String,
            style: TextStyle(
              fontSize: 11,
              fontWeight: FontWeight.w600,
              color: cfg['text'] as Color,
            ),
          ),
          if (queueCount != null && queueCount! > 0) ...[
            const SizedBox(width: 4),
            Text(
              '· ${queueCount}w',
              style: TextStyle(
                fontSize: 11,
                color: cfg['text'] as Color,
              ),
            ),
          ],
          if (waitMins != null && waitMins! > 0) ...[
            const SizedBox(width: 4),
            Text(
              '~${waitMins}m',
              style: TextStyle(
                fontSize: 11,
                color: cfg['text'] as Color,
              ),
            ),
          ],
        ],
      ),
    );
  }

  static const _config = {
    AvailabilityStatus.available: {
      'label': 'Available',
      'bg': AppColors.availableBg,
      'dot': AppColors.available,
      'text': AppColors.availableText,
    },
    AvailabilityStatus.busy: {
      'label': 'Busy',
      'bg': AppColors.busyBg,
      'dot': AppColors.busy,
      'text': AppColors.busyText,
    },
    AvailabilityStatus.closed: {
      'label': 'Closed',
      'bg': AppColors.closedBg,
      'dot': AppColors.closed,
      'text': AppColors.closedText,
    },
  };
}
