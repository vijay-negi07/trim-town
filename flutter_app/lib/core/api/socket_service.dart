import 'package:socket_io_client/socket_io_client.dart' as io;
import '../constants/app_constants.dart';

typedef QueueUpdateCallback = void Function(Map<String, dynamic> data);

class SocketService {
  static final SocketService _instance = SocketService._internal();
  factory SocketService() => _instance;
  SocketService._internal();

  io.Socket? _socket;
  final Map<String, List<QueueUpdateCallback>> _listeners = {};

  void connect({String? token}) {
    _socket = io.io(
      AppConstants.wsUrl,
      io.OptionBuilder()
          .setTransports(['websocket'])
          .setAuth({'token': token})
          .enableAutoConnect()
          .enableReconnection()
          .setReconnectionAttempts(5)
          .build(),
    );

    _socket!.onConnect((_) => print('[Socket] Connected'));
    _socket!.onDisconnect((_) => print('[Socket] Disconnected'));
    _socket!.onConnectError((e) => print('[Socket] Error: $e'));

    _socket!.on('queue:update', (data) {
      final map = Map<String, dynamic>.from(data);
      final barberId = map['barberId'] as String?;
      if (barberId != null && _listeners.containsKey(barberId)) {
        for (final cb in _listeners[barberId]!) {
          cb(map);
        }
      }
      // Also fire wildcard listeners
      if (_listeners.containsKey('*')) {
        for (final cb in _listeners['*']!) {
          cb(map);
        }
      }
    });
  }

  void joinSalon(String salonId) {
    _socket?.emit('join:salon', salonId);
  }

  void leaveSalon(String salonId) {
    _socket?.emit('leave:salon', salonId);
  }

  void joinCity(String city) {
    _socket?.emit('join:city', city);
  }

  void onQueueUpdate(String barberId, QueueUpdateCallback callback) {
    _listeners.putIfAbsent(barberId, () => []).add(callback);
  }

  void onAnyQueueUpdate(QueueUpdateCallback callback) {
    _listeners.putIfAbsent('*', () => []).add(callback);
  }

  void removeListener(String barberId, QueueUpdateCallback callback) {
    _listeners[barberId]?.remove(callback);
  }

  void disconnect() {
    _socket?.disconnect();
    _socket = null;
    _listeners.clear();
  }

  bool get isConnected => _socket?.connected ?? false;
}
