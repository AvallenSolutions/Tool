import { WebSocketServer, WebSocket } from 'ws';
import { Server } from 'http';
import { db } from '../db';
import { conversations, messages, users } from '@shared/schema';
import { eq, and, desc } from 'drizzle-orm';

export interface WebSocketMessage {
  type: 'message' | 'typing' | 'read_receipt' | 'user_joined' | 'user_left' | 'task_update';
  conversationId?: number;
  data?: any;
  userId?: string;
  timestamp?: string;
}

export interface ConnectedClient {
  ws: WebSocket;
  userId: string;
  conversationIds: Set<number>;
  lastActive: Date;
}

export class WebSocketService {
  private wss: WebSocketServer;
  private clients: Map<string, ConnectedClient> = new Map();

  constructor(server: Server) {
    // Create WebSocket server on distinct path to avoid conflicts with Vite HMR
    this.wss = new WebSocketServer({ server, path: '/ws' });
    this.setupWebSocket();
  }

  private setupWebSocket() {
    this.wss.on('connection', (ws: WebSocket, request) => {
      console.log('New WebSocket connection');

      ws.on('message', async (data: Buffer) => {
        try {
          const message = JSON.parse(data.toString()) as WebSocketMessage & { userId?: string };
          
          if (message.type === 'auth' && message.userId) {
            // Register client
            this.clients.set(message.userId, {
              ws,
              userId: message.userId,
              conversationIds: new Set(),
              lastActive: new Date()
            });

            // Join user to their conversations
            await this.joinUserConversations(message.userId);
            
            ws.send(JSON.stringify({
              type: 'auth_success',
              userId: message.userId,
              timestamp: new Date().toISOString()
            }));
          } else {
            await this.handleMessage(ws, message);
          }
        } catch (error) {
          console.error('WebSocket message error:', error);
          ws.send(JSON.stringify({
            type: 'error',
            message: 'Invalid message format',
            timestamp: new Date().toISOString()
          }));
        }
      });

      ws.on('close', () => {
        // Remove client from connected clients
        for (const [userId, client] of this.clients.entries()) {
          if (client.ws === ws) {
            this.clients.delete(userId);
            console.log(`User ${userId} disconnected`);
            break;
          }
        }
      });

      ws.on('error', (error) => {
        console.error('WebSocket error:', error);
      });
    });
  }

  private async handleMessage(ws: WebSocket, message: WebSocketMessage) {
    const client = this.getClientByWebSocket(ws);
    if (!client) return;

    switch (message.type) {
      case 'message':
        await this.handleChatMessage(client, message);
        break;
      case 'typing':
        this.broadcastToConversation(message.conversationId!, {
          type: 'typing',
          userId: client.userId,
          conversationId: message.conversationId,
          data: message.data,
          timestamp: new Date().toISOString()
        }, client.userId);
        break;
      case 'read_receipt':
        await this.handleReadReceipt(client, message);
        break;
      default:
        console.log('Unknown message type:', message.type);
    }
  }

  private async handleChatMessage(client: ConnectedClient, message: WebSocketMessage) {
    if (!message.conversationId || !message.data?.content) return;

    try {
      // Save message to database
      const [newMessage] = await db.insert(messages).values({
        conversationId: message.conversationId,
        senderId: client.userId,
        senderRole: message.data.senderRole || 'user',
        content: message.data.content,
        messageType: message.data.messageType || 'text',
        attachments: message.data.attachments || [],
        metadata: {
          priority: message.data.priority || 'normal'
        }
      }).returning();

      // Update conversation last message time
      await db.update(conversations)
        .set({ 
          lastMessageAt: new Date(),
          updatedAt: new Date()
        })
        .where(eq(conversations.id, message.conversationId));

      // Get sender details
      const [sender] = await db.select()
        .from(users)
        .where(eq(users.id, client.userId))
        .limit(1);

      const messageData = {
        type: 'message' as const,
        conversationId: message.conversationId,
        data: {
          ...newMessage,
          senderName: sender ? `${sender.firstName} ${sender.lastName}` : 'Unknown User',
          senderEmail: sender?.email
        },
        timestamp: new Date().toISOString()
      };

      // Broadcast to all clients in the conversation
      this.broadcastToConversation(message.conversationId, messageData);

    } catch (error) {
      console.error('Error saving message:', error);
      client.ws.send(JSON.stringify({
        type: 'error',
        message: 'Failed to save message',
        timestamp: new Date().toISOString()
      }));
    }
  }

  private async handleReadReceipt(client: ConnectedClient, message: WebSocketMessage) {
    if (!message.conversationId || !message.data?.messageIds) return;

    try {
      // Update read receipts in database
      for (const messageId of message.data.messageIds) {
        await db.update(messages)
          .set({
            metadata: {
              readBy: [...(message.data.readBy || []), client.userId]
            }
          })
          .where(eq(messages.id, messageId));
      }

      // Broadcast read receipt to conversation participants
      this.broadcastToConversation(message.conversationId, {
        type: 'read_receipt',
        conversationId: message.conversationId,
        data: {
          messageIds: message.data.messageIds,
          readBy: client.userId
        },
        timestamp: new Date().toISOString()
      }, client.userId);

    } catch (error) {
      console.error('Error updating read receipt:', error);
    }
  }

  private async joinUserConversations(userId: string) {
    try {
      const userConversations = await db.select()
        .from(conversations)
        .where(
          and(
            eq(conversations.status, 'active'),
            // User is either in participants array or it's their company's conversation
            // Note: This is simplified - in production you'd want more complex participant matching
          )
        );

      const client = this.clients.get(userId);
      if (client) {
        userConversations.forEach(conv => {
          if (conv.participants.includes(userId) || 
              (conv.participants.length === 0)) { // Legacy support for conversations without explicit participants
            client.conversationIds.add(conv.id);
          }
        });
      }
    } catch (error) {
      console.error('Error joining user conversations:', error);
    }
  }

  private broadcastToConversation(conversationId: number, message: WebSocketMessage, excludeUserId?: string) {
    for (const [userId, client] of this.clients.entries()) {
      if (excludeUserId && userId === excludeUserId) continue;
      
      if (client.conversationIds.has(conversationId) && 
          client.ws.readyState === WebSocket.OPEN) {
        client.ws.send(JSON.stringify(message));
      }
    }
  }

  private getClientByWebSocket(ws: WebSocket): ConnectedClient | null {
    for (const client of this.clients.values()) {
      if (client.ws === ws) return client;
    }
    return null;
  }

  // Public methods for external use
  public broadcastToUser(userId: string, message: WebSocketMessage) {
    const client = this.clients.get(userId);
    if (client && client.ws.readyState === WebSocket.OPEN) {
      client.ws.send(JSON.stringify(message));
    }
  }

  public broadcastSystemMessage(conversationId: number, content: string, priority: 'low' | 'normal' | 'high' | 'urgent' = 'normal') {
    this.broadcastToConversation(conversationId, {
      type: 'message',
      conversationId,
      data: {
        content,
        messageType: 'system',
        priority,
        senderName: 'System',
        senderRole: 'system'
      },
      timestamp: new Date().toISOString()
    });
  }

  public getActiveUsers(): string[] {
    return Array.from(this.clients.keys());
  }

  public isUserOnline(userId: string): boolean {
    return this.clients.has(userId);
  }

  public getConnectionCount(): number {
    return this.clients.size;
  }
}