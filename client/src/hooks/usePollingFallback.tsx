import { useState, useEffect, useCallback, useRef } from 'react';

interface PollingMessage {
  id?: number;
  conversationId: number;
  senderId: string;
  content: string;
  createdAt: string;
}

interface UsePollingFallbackOptions {
  userId?: string;
  enabled: boolean;
  onMessage?: (message: PollingMessage) => void;
  pollInterval?: number;
}

export function usePollingFallback(options: UsePollingFallbackOptions) {
  const { userId, enabled, onMessage, pollInterval = 3000 } = options;
  const [isConnected, setIsConnected] = useState(false);
  const lastPollRef = useRef<Date>(new Date());
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const pollMessages = useCallback(async () => {
    if (!enabled || !userId) return;

    try {
      const response = await fetch('/api/messages/poll', {
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
          data.messages.forEach((message: PollingMessage) => {
            onMessage?.(message);
          });
        }
        lastPollRef.current = new Date();
        setIsConnected(true);
      }
    } catch (error) {
      console.error('Polling failed:', error);
      setIsConnected(false);
    }
  }, [enabled, userId, onMessage]);

  useEffect(() => {
    if (enabled) {
      pollMessages(); // Initial poll
      intervalRef.current = setInterval(pollMessages, pollInterval);
      
      return () => {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
        }
      };
    }
  }, [enabled, pollMessages, pollInterval]);

  const sendMessage = useCallback(async (conversationId: number, content: string) => {
    if (!userId) return false;

    try {
      const response = await fetch('/api/messages', {
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

  return {
    isConnected,
    sendMessage,
    sendTypingIndicator: () => {}, // No-op for polling
  };
}