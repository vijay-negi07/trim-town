import { Server as HttpServer } from 'http';
import { Server as SocketServer, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { JwtPayload, SOCKET_EVENTS, SOCKET_ROOMS } from '../types';
import { setSocketServer as setQueueSocket } from '../services/queue.service';
import { setSocketServer as setAppointmentSocket } from '../services/appointment.service';

export function createSocketServer(httpServer: HttpServer): SocketServer {
  const io = new SocketServer(httpServer, {
    cors: {
      origin: process.env.FRONTEND_URL || '*',
      methods: ['GET', 'POST'],
    },
    pingTimeout: 60000,
    pingInterval: 25000,
  });

  // ─── AUTH MIDDLEWARE ─────────────────────────────────────────────────────────
  io.use((socket: Socket, next) => {
    const token = socket.handshake.auth?.token;
    if (token) {
      try {
        const payload = jwt.verify(token, process.env.JWT_SECRET!) as JwtPayload;
        (socket as any).user = payload;
      } catch {
        // allow unauthenticated — public queue watching is permitted
      }
    }
    next();
  });

  // ─── CONNECTION ──────────────────────────────────────────────────────────────
  io.on('connection', (socket: Socket) => {
    const user = (socket as any).user as JwtPayload | undefined;
    console.log(`[Socket] Connected: ${socket.id} ${user ? `(user: ${user.userId})` : '(guest)'}`);

    // Auto-join user's personal room if authenticated
    if (user) {
      socket.join(SOCKET_ROOMS.user(user.userId));
    }

    // ── JOIN SALON ROOM (for queue watching) ───────────────────────────────────
    socket.on(SOCKET_EVENTS.JOIN_SALON, (salonId: string) => {
      socket.join(SOCKET_ROOMS.salon(salonId));
      console.log(`[Socket] ${socket.id} joined salon:${salonId}`);
    });

    socket.on(SOCKET_EVENTS.LEAVE_SALON, (salonId: string) => {
      socket.leave(SOCKET_ROOMS.salon(salonId));
    });

    // ── JOIN CITY ROOM (for nearby status updates) ─────────────────────────────
    socket.on(SOCKET_EVENTS.JOIN_CITY, (city: string) => {
      socket.join(SOCKET_ROOMS.city(city));
      console.log(`[Socket] ${socket.id} joined city:${city}`);
    });

    socket.on('disconnect', (reason) => {
      console.log(`[Socket] Disconnected: ${socket.id} (${reason})`);
    });

    socket.on('error', (err) => {
      console.error(`[Socket] Error on ${socket.id}:`, err);
    });
  });

  // Share io instance with services that need to broadcast
  setQueueSocket(io);
  setAppointmentSocket(io);

  return io;
}
