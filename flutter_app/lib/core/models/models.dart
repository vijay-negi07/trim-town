// ─── ENUMS ────────────────────────────────────────────────────────────────────

enum AvailabilityStatus { available, busy, closed }

enum AppointmentStatus { pending, confirmed, inProgress, completed, cancelled, noShow }

// ─── USER ─────────────────────────────────────────────────────────────────────

class User {
  final String id;
  final String phone;
  final String name;
  final String? email;
  final String? avatarUrl;
  final String role;

  const User({
    required this.id,
    required this.phone,
    required this.name,
    this.email,
    this.avatarUrl,
    required this.role,
  });

  factory User.fromJson(Map<String, dynamic> j) => User(
    id: j['id'],
    phone: j['phone'],
    name: j['name'],
    email: j['email'],
    avatarUrl: j['avatarUrl'],
    role: j['role'],
  );
}

// ─── SERVICE ─────────────────────────────────────────────────────────────────

class Service {
  final String id;
  final String name;
  final String? description;
  final double price;
  final int durationMins;

  const Service({
    required this.id,
    required this.name,
    this.description,
    required this.price,
    required this.durationMins,
  });

  factory Service.fromJson(Map<String, dynamic> j) => Service(
    id: j['id'],
    name: j['name'],
    description: j['description'],
    price: (j['price'] as num).toDouble(),
    durationMins: j['durationMins'],
  );
}

// ─── AVAILABILITY ─────────────────────────────────────────────────────────────

class Availability {
  final AvailabilityStatus status;
  final int queueCount;
  final int maxQueueSize;
  final int estimatedWaitMins;

  const Availability({
    required this.status,
    required this.queueCount,
    required this.maxQueueSize,
    required this.estimatedWaitMins,
  });

  factory Availability.fromJson(Map<String, dynamic> j) => Availability(
    status: _parseStatus(j['status']),
    queueCount: j['queueCount'] ?? 0,
    maxQueueSize: j['maxQueueSize'] ?? 10,
    estimatedWaitMins: j['estimatedWaitMins'] ?? 0,
  );

  static AvailabilityStatus _parseStatus(String s) {
    switch (s.toUpperCase()) {
      case 'AVAILABLE': return AvailabilityStatus.available;
      case 'BUSY': return AvailabilityStatus.busy;
      default: return AvailabilityStatus.closed;
    }
  }
}

// ─── BARBER ──────────────────────────────────────────────────────────────────

class Barber {
  final String id;
  final String name;
  final String? bio;
  final String? photoUrl;
  final int experience;
  final List<String> specialties;
  final Availability? availability;
  final List<Service> services;
  final double? averageRating;
  final int reviewCount;

  const Barber({
    required this.id,
    required this.name,
    this.bio,
    this.photoUrl,
    required this.experience,
    required this.specialties,
    this.availability,
    required this.services,
    this.averageRating,
    required this.reviewCount,
  });

  factory Barber.fromJson(Map<String, dynamic> j) => Barber(
    id: j['id'],
    name: j['name'],
    bio: j['bio'],
    photoUrl: j['photoUrl'],
    experience: j['experience'] ?? 0,
    specialties: List<String>.from(j['specialties'] ?? []),
    availability: j['availability'] != null ? Availability.fromJson(j['availability']) : null,
    services: (j['services'] as List? ?? []).map((s) => Service.fromJson(s)).toList(),
    averageRating: j['averageRating'] != null ? (j['averageRating'] as num).toDouble() : null,
    reviewCount: j['reviewCount'] ?? 0,
  );
}

// ─── SALON ───────────────────────────────────────────────────────────────────

class Salon {
  final String id;
  final String name;
  final String? description;
  final String address;
  final String area;
  final String city;
  final double lat;
  final double lng;
  final String? photoUrl;
  final List<String> photos;
  final String openTime;
  final String closeTime;
  final List<int> workingDays;
  final double? distance;
  final double? averageRating;
  final int reviewCount;
  final List<Barber> barbers;

  const Salon({
    required this.id,
    required this.name,
    this.description,
    required this.address,
    required this.area,
    required this.city,
    required this.lat,
    required this.lng,
    this.photoUrl,
    required this.photos,
    required this.openTime,
    required this.closeTime,
    required this.workingDays,
    this.distance,
    this.averageRating,
    required this.reviewCount,
    required this.barbers,
  });

  factory Salon.fromJson(Map<String, dynamic> j) => Salon(
    id: j['id'],
    name: j['name'],
    description: j['description'],
    address: j['address'],
    area: j['area'],
    city: j['city'],
    lat: (j['lat'] as num).toDouble(),
    lng: (j['lng'] as num).toDouble(),
    photoUrl: j['photoUrl'],
    photos: List<String>.from(j['photos'] ?? []),
    openTime: j['openTime'] ?? '09:00',
    closeTime: j['closeTime'] ?? '20:00',
    workingDays: List<int>.from(j['workingDays'] ?? []),
    distance: j['distance'] != null ? (j['distance'] as num).toDouble() : null,
    averageRating: j['averageRating'] != null ? (j['averageRating'] as num).toDouble() : null,
    reviewCount: j['reviewCount'] ?? 0,
    barbers: (j['barbers'] as List? ?? []).map((b) => Barber.fromJson(b)).toList(),
  );

  // Convenience: overall status based on barbers
  AvailabilityStatus get overallStatus {
    if (barbers.isEmpty) return AvailabilityStatus.closed;
    final statuses = barbers.map((b) => b.availability?.status ?? AvailabilityStatus.closed);
    if (statuses.any((s) => s == AvailabilityStatus.available)) return AvailabilityStatus.available;
    if (statuses.any((s) => s == AvailabilityStatus.busy)) return AvailabilityStatus.busy;
    return AvailabilityStatus.closed;
  }

  int get totalQueueCount =>
      barbers.fold(0, (sum, b) => sum + (b.availability?.queueCount ?? 0));

  int get minWaitMins =>
      barbers.map((b) => b.availability?.estimatedWaitMins ?? 0).fold(999, (a, b) => a < b ? a : b);
}

// ─── APPOINTMENT ─────────────────────────────────────────────────────────────

class Appointment {
  final String id;
  final DateTime slotTime;
  final AppointmentStatus status;
  final double totalPrice;
  final String? notes;
  final DateTime createdAt;
  final AppointmentBarber barber;
  final List<AppointmentServiceItem> services;

  const Appointment({
    required this.id,
    required this.slotTime,
    required this.status,
    required this.totalPrice,
    this.notes,
    required this.createdAt,
    required this.barber,
    required this.services,
  });

  factory Appointment.fromJson(Map<String, dynamic> j) => Appointment(
    id: j['id'],
    slotTime: DateTime.parse(j['slotTime']),
    status: _parseStatus(j['status']),
    totalPrice: (j['totalPrice'] as num).toDouble(),
    notes: j['notes'],
    createdAt: DateTime.parse(j['createdAt']),
    barber: AppointmentBarber.fromJson(j['barber']),
    services: (j['services'] as List? ?? []).map((s) => AppointmentServiceItem.fromJson(s)).toList(),
  );

  static AppointmentStatus _parseStatus(String s) {
    switch (s.toUpperCase()) {
      case 'CONFIRMED': return AppointmentStatus.confirmed;
      case 'IN_PROGRESS': return AppointmentStatus.inProgress;
      case 'COMPLETED': return AppointmentStatus.completed;
      case 'CANCELLED': return AppointmentStatus.cancelled;
      default: return AppointmentStatus.pending;
    }
  }
}

class AppointmentBarber {
  final String id;
  final String name;
  final String? photoUrl;
  final AppointmentSalon salon;

  const AppointmentBarber({ required this.id, required this.name, this.photoUrl, required this.salon });

  factory AppointmentBarber.fromJson(Map<String, dynamic> j) => AppointmentBarber(
    id: j['id'], name: j['name'], photoUrl: j['photoUrl'],
    salon: AppointmentSalon.fromJson(j['salon']),
  );
}

class AppointmentSalon {
  final String id;
  final String name;
  final String address;

  const AppointmentSalon({ required this.id, required this.name, required this.address });
  factory AppointmentSalon.fromJson(Map<String, dynamic> j) =>
      AppointmentSalon(id: j['id'], name: j['name'], address: j['address']);
}

class AppointmentServiceItem {
  final Map<String, String> service;
  final double price;
  final int durationMins;

  const AppointmentServiceItem({ required this.service, required this.price, required this.durationMins });
  factory AppointmentServiceItem.fromJson(Map<String, dynamic> j) => AppointmentServiceItem(
    service: Map<String, String>.from(j['service']),
    price: (j['price'] as num).toDouble(),
    durationMins: j['durationMins'],
  );
}
