import { useEffect, useRef, useState, useCallback } from 'react';

export interface WebSocketMessage {
  type: 'message' | 'typing' | 'read_receipt' | 'user_joined' | 'user_left' | 'task_update' | 'auth_success' | 'error';
  conversationId?: number;
  data?: any;
  userId?: string;
  timestamp?: string;
  message?: string;
}

export interface UseWebSocketOptions {
  userId?: string;
  onMessage?: (message: WebSocketMessage) => void;
  onConnect?: () => void;
  onDisconnect?: () => void;
  reconnectAttempts?: number;
  reconnectInterval?: number;
}

export function useWebSocket(options: UseWebSocketOptions = {}) {
  const {
    userId,
    onMessage,
    onConnect,
    onDisconnect,
    reconnectAttempts = 5,
    reconnectInterval = 3000
  } = options;

  const [isConnected, setIsConnected] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected' | 'error'>('disconnected');
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectCountRef = useRef(0);
  const messageQueueRef = useRef<WebSocketMessage[]>([]);

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    try {
      setConnectionStatus('connecting');
      
      // Alternative WebSocket connection strategy - use polling fallback for Replit environment
      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      const hostname = window.location.hostname;
      
      // Try direct connection to backend port for WebSocket
      const isReplit = hostname.includes('replit.dev');
      const wsUrl = isReplit 
        ? `${protocol}//${hostname.replace('-00-', '-5000-00-')}/ws`  // Target port 5000 directly
        : `${protocol}://localhost:5000/ws`;
      
      console.log('Connecting to WebSocket:', wsUrl);
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('WebSocket connected');
        setIsConnected(true);
        setConnectionStatus('connected');
        reconnectCountRef.current = 0;
        onConnect?.();

        // Authenticate if userId is provided - add delay to ensure connection is stable
        if (userId) {
          setTimeout(() => {
            if (ws.readyState === WebSocket.OPEN) {
              ws.send(JSON.stringify({
                type: 'auth',
                userId,
                timestamp: new Date().toISOString()
              }));
            }
          }, 100);
        }

        // Send queued messages
        while (messageQueueRef.current.length > 0) {
          const queuedMessage = messageQueueRef.current.shift();
          if (queuedMessage) {
            ws.send(JSON.stringify(queuedMessage));
          }
        }
      };

      ws.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data);
          onMessage?.(message);
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

      ws.onclose = () => {
        console.log('WebSocket disconnected');
        setIsConnected(false);
        setConnectionStatus('disconnected');
        wsRef.current = null;
        onDisconnect?.();

        // Attempt to reconnect with exponential backoff
        if (reconnectCountRef.current < reconnectAttempts) {
          reconnectCountRef.current++;
          const backoffDelay = Math.min(reconnectInterval * Math.pow(2, reconnectCountRef.current - 1), 30000);
          console.log(`Attempting to reconnect (${reconnectCountRef.current}/${reconnectAttempts}) in ${backoffDelay}ms...`);
          
          reconnectTimeoutRef.current = setTimeout(() => {
            connect();
          }, backoffDelay);
        } else {
          console.error('Max reconnection attempts reached');
          setConnectionStatus('error');
        }
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        console.error('WebSocket URL was:', wsUrl);
        console.error('WebSocket readyState:', ws.readyState);
        setConnectionStatus('error');
      };

    } catch (error) {
      console.error('Failed to create WebSocket connection:', error);
      setConnectionStatus('error');
    }
  }, [userId, onConnect, onMessage, onDisconnect, reconnectAttempts, reconnectInterval]);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    
    setIsConnected(false);
    setConnectionStatus('disconnected');
  }, []);

  const sendMessage = useCallback((message: WebSocketMessage) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      try {
        wsRef.current.send(JSON.stringify({
          ...message,
          timestamp: new Date().toISOString()
        }));
      } catch (error) {
        console.error('Error sending WebSocket message:', error);
        messageQueueRef.current.push(message);
      }
    } else {
      // Queue message for when connection is established
      messageQueueRef.current.push(message);
      
      // Try to reconnect if not connected
      if (!isConnected && connectionStatus !== 'connecting') {
        connect();
      }
    }
  }, [isConnected, connectionStatus, connect]);

  const sendChatMessage = useCallback((conversationId: number, content: string, messageType: string = 'text', attachments: any[] = []) => {
    sendMessage({
      type: 'message',
      conversationId,
      data: {
        content,
        messageType,
        attachments,
        senderRole: 'user'
      }
    });
  }, [sendMessage]);

  const sendTypingIndicator = useCallback((conversationId: number, isTyping: boolean) => {
    sendMessage({
      type: 'typing',
      conversationId,
      data: { isTyping }
    });
  }, [sendMessage]);

  const markMessagesAsRead = useCallback((conversationId: number, messageIds: number[]) => {
    sendMessage({
      type: 'read_receipt',
      conversationId,
      data: { messageIds }
    });
  }, [sendMessage]);

  useEffect(() => {
    if (userId) {
      connect();
    }

    return () => {
      disconnect();
    };
  }, [userId, connect, disconnect]);

  return {
    isConnected,
    connectionStatus,
    connect,
    disconnect,
    sendMessage,
    sendChatMessage,
    sendTypingIndicator,
    markMessagesAsRead
  };
}