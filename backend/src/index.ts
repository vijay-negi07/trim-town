import 'dotenv/config';
import http from 'http';
import { createApp } from './app';
import { createSocketServer } from './config/socket';
import { prisma, connectRedis } from './config/database';

const PORT = parseInt(process.env.PORT || '3000');

async function main() {
  // Connect to services
  await connectRedis();
  console.log('[DB] Prisma client ready');

  // Create HTTP + Socket server
  const app = createApp();
  const httpServer = http.createServer(app);
  const io = createSocketServer(httpServer);

  httpServer.listen(PORT, () => {
    console.log(`
╔══════════════════════════════════════╗
║        TrimTown API Server           ║
╠══════════════════════════════════════╣
║  HTTP   → http://localhost:${PORT}      ║
║  WS     → ws://localhost:${PORT}        ║
║  Mode   → ${process.env.NODE_ENV || 'development'}             ║
╚══════════════════════════════════════╝
    `);
  });

  // Graceful shutdown
  const shutdown = async (signal: string) => {
    console.log(`\n[Server] ${signal} received, shutting down...`);
    httpServer.close(async () => {
      await prisma.$disconnect();
      console.log('[Server] Shutdown complete');
      process.exit(0);
    });
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

main().catch((err) => {
  console.error('[Fatal]', err);
  process.exit(1);
});
