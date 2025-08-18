import { useState, useEffect, useCallback, useRef } from 'react';

export interface Message {
  id?: number;
  conversationId: number;
  senderId: string;
  content: string;
  createdAt: string;
}

interface UseRealtimeMessagingOptions {
  userId?: string;
  onMessage?: (message: Message) => void;
  onConnect?: () => void;
  onDisconnect?: () => void;
}

export function useRealtimeMessaging(options: UseRealtimeMessagingOptions) {
  const { userId, onMessage, onConnect, onDisconnect } = options;
  
  const [isConnected, setIsConnected] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected'>('disconnected');
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastPollRef = useRef<Date>(new Date());

  // Polling-based messaging system that works reliably
  const pollMessages = useCallback(async () => {
    if (!userId) return;

    try {
      const response = await fetch('/api/messages/poll', {
        credentials: 'include',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          userId,
          since: lastPollRef.current.toISOString()
        })
      });

      if (response.ok) {
        const data = await response.json();
        if (data.messages && data.messages.length > 0) {
          data.messages.forEach((message: Message) => {
            onMessage?.(message);
          });
        }
        lastPollRef.current = new Date();
        
        if (!isConnected) {
          setIsConnected(true);
          setConnectionStatus('connected');
          onConnect?.();
        }
      } else {
        throw new Error(`Poll failed: ${response.status}`);
      }
    } catch (error) {
      console.error('Message polling failed:', error);
      if (isConnected) {
        setIsConnected(false);
        setConnectionStatus('disconnected');
        onDisconnect?.();
      }
    }
  }, [userId, onMessage, isConnected, onConnect, onDisconnect]);

  useEffect(() => {
    if (userId) {
      setConnectionStatus('connecting');
      pollMessages(); // Initial poll
      
      pollingIntervalRef.current = setInterval(pollMessages, 3000); // Poll every 3 seconds
      
      return () => {
        if (pollingIntervalRef.current) {
          clearInterval(pollingIntervalRef.current);
        }
      };
    }
  }, [userId, pollMessages]);

  const sendChatMessage = useCallback(async (conversationId: number, content: string) => {
    if (!userId) return false;

    try {
      const response = await fetch('/api/messages', {
        credentials: 'include',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversationId,
          content,
          senderId: userId
        })
      });
      return response.ok;
    } catch (error) {
      console.error('Send message failed:', error);
      return false;
    }
  }, [userId]);

  const sendTypingIndicator = useCallback(() => {
    // No-op for polling-based system
  }, []);

  return {
    isConnected,
    connectionStatus,
    sendChatMessage,
    sendTypingIndicator
  };
}