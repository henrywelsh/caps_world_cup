import React, { createContext, useContext, useEffect, useRef, useCallback } from 'react';

const WsCtx = createContext(null);

const WS_URL = import.meta.env.VITE_WS_URL || `ws://${window.location.host}/ws`;

export function WebSocketProvider({ children }) {
  const ws = useRef(null);
  const handlers = useRef({}); // { eventName: Set<fn> }
  const reconnectTimer = useRef(null);

  const connect = useCallback(() => {
    const socket = new WebSocket(WS_URL);

    socket.onmessage = (e) => {
      let msg;
      try { msg = JSON.parse(e.data); } catch { return; }
      const fns = handlers.current[msg.event];
      if (fns) fns.forEach((fn) => fn(msg.data));
    };

    socket.onclose = () => {
      reconnectTimer.current = setTimeout(connect, 3000);
    };

    socket.onerror = () => socket.close();

    ws.current = socket;
  }, []);

  useEffect(() => {
    connect();
    return () => {
      clearTimeout(reconnectTimer.current);
      ws.current?.close();
    };
  }, [connect]);

  function subscribe(event, fn) {
    if (!handlers.current[event]) handlers.current[event] = new Set();
    handlers.current[event].add(fn);
    return () => handlers.current[event].delete(fn);
  }

  function send(msg) {
    if (ws.current?.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify(msg));
    }
  }

  return (
    <WsCtx.Provider value={{ subscribe, send }}>
      {children}
    </WsCtx.Provider>
  );
}

export function useWebSocketEvent(event, handler) {
  const { subscribe } = useContext(WsCtx);
  const handlerRef = useRef(handler);
  handlerRef.current = handler;

  useEffect(() => {
    return subscribe(event, (data) => handlerRef.current(data));
  }, [event, subscribe]);
}

export function useWsSend() {
  return useContext(WsCtx).send;
}
