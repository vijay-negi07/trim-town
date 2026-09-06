import 'package:dio/dio.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import '../constants/app_constants.dart';
import '../models/models.dart';

class ApiService {
  static final ApiService _instance = ApiService._internal();
  factory ApiService() => _instance;
  ApiService._internal();

  final _storage = const FlutterSecureStorage();

  late final Dio _dio = Dio(BaseOptions(
    baseUrl: AppConstants.baseUrl,
    connectTimeout: const Duration(seconds: 10),
    receiveTimeout: const Duration(seconds: 15),
    headers: {'Content-Type': 'application/json'},
  ))
    ..interceptors.add(InterceptorsWrapper(
      onRequest: (options, handler) async {
        final token = await _storage.read(key: 'access_token');
        if (token != null) {
          options.headers['Authorization'] = 'Bearer $token';
        }
        handler.next(options);
      },
      onError: (error, handler) async {
        if (error.response?.statusCode == 401) {
          final refreshed = await _refreshToken();
          if (refreshed) {
            final token = await _storage.read(key: 'access_token');
            error.requestOptions.headers['Authorization'] = 'Bearer $token';
            final retryRes = await _dio.fetch(error.requestOptions);
            return handler.resolve(retryRes);
          }
        }
        handler.next(error);
      },
    ));

  Future<bool> _refreshToken() async {
    try {
      final rt = await _storage.read(key: 'refresh_token');
      if (rt == null) return false;
      final res = await Dio().post('${AppConstants.baseUrl}/auth/token/refresh', data: {'refreshToken': rt});
      final data = res.data['data'];
      await _storage.write(key: 'access_token', value: data['accessToken']);
      await _storage.write(key: 'refresh_token', value: data['refreshToken']);
      return true;
    } catch (_) {
      await logout();
      return false;
    }
  }

  // ─── AUTH ──────────────────────────────────────────────────────────────────

  Future<Map<String, dynamic>> sendOtp(String phone) async {
    final res = await _dio.post('/auth/otp/send', data: {'phone': phone});
    return res.data;
  }

  Future<Map<String, dynamic>> verifyOtp(
    String phone, 
    String otp, {
    String? name, 
    String role = 'CUSTOMER',
  }) async {
    final res = await _dio.post('/auth/otp/verify', data: {
      'phone': phone, 
      'otp': otp, 
      if (name != null) 'name': name, 
      'role': role,
    });
    final data = res.data['data'];
    await _storage.write(key: 'access_token', value: data['accessToken']);
    await _storage.write(key: 'refresh_token', value: data['refreshToken']);
    return data;
  }

  Future<void> logout() async {
    try { await _dio.post('/auth/logout'); } catch (_) {}
    await _storage.deleteAll();
  }

  Future<bool> isLoggedIn() async {
    final token = await _storage.read(key: 'access_token');
    return token != null;
  }

  // ─── SALONS ───────────────────────────────────────────────────────────────

  Future<List<Salon>> getNearbySalons({
    required double lat,
    required double lng,
    double radius = 5,
    double? minRating,
  }) async {
    final res = await _dio.get('/salons/nearby', queryParameters: {
      'lat': lat, 'lng': lng, 'radius': radius,
      if (minRating != null) 'minRating': minRating,
    });
    return (res.data['data'] as List).map((s) => Salon.fromJson(s)).toList();
  }

  Future<Salon> getSalonById(String salonId) async {
    final res = await _dio.get('/salons/$salonId');
    return Salon.fromJson(res.data['data']);
  }

  Future<bool> toggleFavorite(String salonId) async {
    final res = await _dio.post('/salons/$salonId/favorite');
    return res.data['data']['favorited'];
  }

  // ─── QUEUE (CUSTOMER & BARBER) ────────────────────────────────────────────

  Future<Map<String, dynamic>> getAvailability(String barberId) async {
    final res = await _dio.get('/queue/barber/$barberId');
    return res.data['data'];
  }

  Future<Map<String, dynamic>> joinQueue(String barberId, {String? appointmentId}) async {
    final res = await _dio.post('/queue/barber/$barberId/join', data: {
      if (appointmentId != null) 'appointmentId': appointmentId,
    });
    return res.data['data'];
  }

  Future<void> updateStatus(String barberId, String status) async {
    await _dio.put('/queue/barber/$barberId/status', data: {'status': status});
  }

  Future<void> markNextDone(String barberId) async {
    await _dio.post('/queue/barber/$barberId/done');
  }

  Future<Map<String, dynamic>> addWalkInCustomer(String barberId, String customerName, List<String> serviceIds) async {
    final res = await _dio.post('/queue/barber/$barberId/walk-in', data: {
      'customerName': customerName,
      'serviceIds': serviceIds,
    });
    return res.data['data'];
  }

  // ─── APPOINTMENTS ─────────────────────────────────────────────────────────

  Future<List<Appointment>> getMyAppointments({String? status}) async {
    final res = await _dio.get('/appointments', queryParameters: {
      if (status != null) 'status': status,
    });
    return (res.data['data'] as List).map((a) => Appointment.fromJson(a)).toList();
  }

  Future<List<String>> getAvailableSlots(String barberId, DateTime date) async {
    final res = await _dio.get('/appointments/slots/$barberId', queryParameters: {
      'date': date.toIso8601String(),
    });
    return List<String>.from(res.data['data']);
  }

  Future<Appointment> createAppointment({
    required String barberId,
    required List<String> serviceIds,
    required DateTime slotTime,
    String? notes,
  }) async {
    final res = await _dio.post('/appointments', data: {
      'barberId': barberId,
      'serviceIds': serviceIds,
      'slotTime': slotTime.toIso8601String(),
      if (notes != null) 'notes': notes,
    });
    return Appointment.fromJson(res.data['data']);
  }

  Future<Appointment> cancelAppointment(String appointmentId) async {
    final res = await _dio.patch('/appointments/$appointmentId/status', data: {'status': 'CANCELLED'});
    return Appointment.fromJson(res.data['data']);
  }
}
