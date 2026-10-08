import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';

@WebSocketGateway({
  cors: {
    origin: '*',
    credentials: true,
  },
  namespace: '/notifications',
})
export class NotificationsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  private readonly logger = new Logger(NotificationsGateway.name);

  @WebSocketServer()
  server: Server;

  // Track connected users: userId -> Set of socket IDs
  private userSockets = new Map<string, Set<string>>();

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
    // Clean up socket mapping
    for (const [userId, sockets] of this.userSockets.entries()) {
      if (sockets.has(client.id)) {
        sockets.delete(client.id);
        if (sockets.size === 0) {
          this.userSockets.delete(userId);
        }
        break;
      }
    }
  }

  @SubscribeMessage('authenticate')
  handleAuthenticate(client: Socket, payload: { userId: string }) {
    if (!payload?.userId) return;
    const userId = payload.userId;
    if (!this.userSockets.has(userId)) {
      this.userSockets.set(userId, new Set());
    }
    this.userSockets.get(userId)!.add(client.id);
    client.join(`user:${userId}`);
    this.logger.log(`User ${userId} authenticated on socket ${client.id}`);
    client.emit('authenticated', { success: true, userId });
  }

  /**
   * Broadcast a notification to a specific user across all their connected devices/tabs
   */
  sendNotificationToUser(userId: string, notification: any) {
    try {
      if (this.server) {
        this.server.to(`user:${userId}`).emit('notification', notification);
        this.logger.log(`Dispatched real-time notification to user:${userId} (${notification.title})`);
      }
    } catch (err: any) {
      this.logger.warn(`Failed to dispatch websocket notification: ${err.message}`);
    }
  }
}
