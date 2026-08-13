import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useRef } from 'react';
import { API, tokenStore } from '../utils';

export function useWebSocket(user) {
  const queryClient = useQueryClient();
  const wsRef = useRef(null);

  const refetchKeys = useCallback(
    (prefix) => {
      queryClient
        .getQueryCache()
        .getAll()
        .forEach((query) => {
          if (
            query.queryKey.length >= prefix.length &&
            prefix.every((item, i) => item === query.queryKey[i])
          ) {
            queryClient.invalidateQueries({ queryKey: query.queryKey });
          }
        });
    },
    [queryClient],
  );

  useEffect(() => {
    const token = tokenStore.get();
    if (!token || !user) return;

    const wsUrl = API
      ? `${API.replace(/^http/, 'ws')}/ws?token=${token}`
      : `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/ws?token=${token}`;

    let reconnectTimer;
    let closed = false;
    let isFirstConnect = true;

    function connect() {
      if (closed) return;
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        if (!isFirstConnect) {
          refetchKeys(['bookings']);
          refetchKeys(['schedule']);
          refetchKeys(['halls']);
        }
        isFirstConnect = false;
      };

      ws.onmessage = (event) => {
        let data;
        try {
          data = JSON.parse(event.data);
        } catch {
          return;
        }

        switch (data.type) {
          case 'booking.created':
          case 'booking.updated':
          case 'booking.cancelled':
            refetchKeys(['bookings']);
            refetchKeys(['schedule']);
            break;
          case 'hall.created':
          case 'hall.deactivated':
            refetchKeys(['halls']);
            break;
        }
      };

      ws.onclose = () => {
        wsRef.current = null;
        if (!closed) {
          reconnectTimer = setTimeout(connect, 3000);
        }
      };

      ws.onerror = () => {
        ws.close();
      };
    }

    connect();

    return () => {
      closed = true;
      clearTimeout(reconnectTimer);
      if (wsRef.current) {
        wsRef.current.onclose = null;
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [user, refetchKeys]);
}
