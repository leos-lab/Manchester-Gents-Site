import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { ChatClient } from '../lib/chatClient';
import { useAuth } from './AuthContext';

const ChatContext = createContext(null);

// One chat connection for the signed-in member, shared by every screen.
export function ChatProvider({ children }) {
  const { token, chatUrl, signOut } = useAuth();
  const clientRef = useRef(null);
  const [client, setClient] = useState(null);
  const [status, setStatus] = useState('idle');
  const [rooms, setRooms] = useState([]);

  const refreshRooms = useCallback(async () => {
    const c = clientRef.current;
    if (!c) return;
    try {
      const reply = await c.request('rooms');
      setRooms(reply.rooms || []);
    } catch {
      // offline; the list refreshes on reconnect
    }
  }, []);

  useEffect(() => {
    if (!token || !chatUrl) return undefined;
    const c = new ChatClient({ url: chatUrl, getToken: async () => token });
    clientRef.current = c;
    setClient(c);
    const offs = [
      c.on('status', setStatus),
      c.on('ready', refreshRooms),
      c.on('rooms_changed', refreshRooms),
      c.on('message', refreshRooms),
      c.on('unauthorized', () => signOut())
    ];
    c.connect();
    const appState = AppState.addEventListener('change', (next) => {
      if (next === 'active') {
        c.reconnectNow();
        refreshRooms();
      }
    });
    return () => {
      offs.forEach((off) => off());
      appState.remove();
      c.close();
      clientRef.current = null;
      setClient(null);
      setRooms([]);
    };
  }, [token, chatUrl, refreshRooms, signOut]);

  const unreadTotal = rooms.reduce((sum, r) => sum + (r.muted ? 0 : r.unread || 0), 0);

  const value = useMemo(
    () => ({ client, status, rooms, unreadTotal, refreshRooms, configured: Boolean(chatUrl) }),
    [client, status, rooms, unreadTotal, refreshRooms, chatUrl]
  );
  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
}

export function useChat() {
  const ctx = useContext(ChatContext);
  if (!ctx) throw new Error('useChat must be used inside ChatProvider');
  return ctx;
}
