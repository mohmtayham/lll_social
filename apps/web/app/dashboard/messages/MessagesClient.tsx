'use client';

import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';

type ChatUser = {
  id: string;
  name: string;
  username?: string | null;
  avatarMediaId?: string | null;
};

type ChatParticipant = {
  userId: string;
  role: 'ADMIN' | 'MEMBER';
  user: ChatUser;
};

type ChatMessage = {
  id: string;
  conversationId: string;
  senderId: string;
  content: string | null;
  messageType: string;
  isEdited: boolean;
  isDeletedForEveryone: boolean;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
  sender?: ChatUser;
};

type ChatConversation = {
  id: string;
  type: 'DIRECT' | 'GROUP';
  name?: string | null;
  description?: string | null;
  participants: ChatParticipant[];
  lastMessage?: ChatMessage | null;
  unreadCount?: number;
};

type MessagesClientProps = {
  accessToken: string;
  currentUserId: string;
  backendUrl: string;
};

// Keep one canonical sorted list and dedupe by id.
// This protects UI from duplicate events after reconnect/retry.
const asSortedUnique = (messages: ChatMessage[]) => {
  const map = new Map<string, ChatMessage>();
  for (const message of messages) {
    map.set(message.id, message);
  }

  return [...map.values()].sort((a, b) => {
    return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
  });
};

export function MessagesClient({
  accessToken,
  currentUserId,
  backendUrl,
}: MessagesClientProps) {
  const [conversations, setConversations] = useState<ChatConversation[]>([]);
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loadingConversations, setLoadingConversations] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const [targetUserId, setTargetUserId] = useState('');
  const [socket, setSocket] = useState<Socket | null>(null);
  // Ref is used inside socket listeners to avoid stale closure over selected conversation.
  const selectedConversationIdRef = useRef<string | null>(null);

  selectedConversationIdRef.current = selectedConversationId;

  const selectedConversation = useMemo(() => {
    if (!selectedConversationId) return null;
    return conversations.find((conversation) => conversation.id === selectedConversationId) ?? null;
  }, [conversations, selectedConversationId]);

  const getConversationTitle = (conversation: ChatConversation) => {
    // If a group name exists, prefer it.
    if (conversation.name) return conversation.name;

    // For direct chats derive title from the other participant.
    if (conversation.type === 'DIRECT') {
      const peer = conversation.participants.find(
        (participant) => participant.userId !== currentUserId,
      );

      if (peer?.user?.name) return peer.user.name;
      if (peer?.user?.username) return `@${peer.user.username}`;
    }

    return `Conversation ${conversation.id}`;
  };

  // Shared authenticated fetch wrapper for message/conversation APIs.
  const authedFetch = async (url: string, options?: RequestInit) => {
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
        ...(options?.headers ?? {}),
      },
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(body || `Request failed with ${response.status}`);
    }

    return response.json();
  };

  // Load inbox list and auto-select first conversation when none selected.
  const loadConversations = async () => {
    setLoadingConversations(true);
    try {
      const data = (await authedFetch(`${backendUrl}/conversation/mine`)) as ChatConversation[];
      setConversations(data);

      if (!selectedConversationIdRef.current && data.length > 0) {
        setSelectedConversationId(data[0].id);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load conversations');
    } finally {
      setLoadingConversations(false);
    }
  };

  // Load message history for selected conversation and send read pointer.
  const loadMessages = async (conversationId: string) => {
    setLoadingMessages(true);
    try {
      const data = (await authedFetch(
        `${backendUrl}/message/conversation/${conversationId}?limit=50`,
      )) as ChatMessage[];
      setMessages(asSortedUnique(data));

      if (socket) {
        // Read up to latest loaded message so unread badge can be recomputed server-side.
        socket.emit('message:read', {
          conversationId,
          messageId: data[data.length - 1]?.id,
        });
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load messages');
    } finally {
      setLoadingMessages(false);
    }
  };

  // Create a direct conversation by target user id.
  const createDirectConversation = async (event: FormEvent) => {
    event.preventDefault();

    const trimmed = targetUserId.trim();
    if (!trimmed) return;

    try {
      const created = (await authedFetch(`${backendUrl}/conversation`, {
        method: 'POST',
        body: JSON.stringify({
          type: 'DIRECT',
          participantIds: [trimmed],
        }),
      })) as ChatConversation;

      setTargetUserId('');
      await loadConversations();
      setSelectedConversationId(created.id);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to create direct conversation');
    }
  };

  // Send flow:
  // 1) optimistic clear input
  // 2) send via socket if connected
  // 3) fallback to HTTP when socket is not ready
  const sendMessage = async (event: FormEvent) => {
    event.preventDefault();

    if (!selectedConversationId || !draft.trim()) return;

    const payload = {
      conversationId: selectedConversationId,
      content: draft.trim(),
      messageType: 'TEXT',
    };

    setDraft('');

    if (socket?.connected) {
      socket.emit('message:send', payload);
      return;
    }

    try {
      const created = (await authedFetch(`${backendUrl}/message`, {
        method: 'POST',
        body: JSON.stringify(payload),
      })) as ChatMessage;

      setMessages((prev) => asSortedUnique([...prev, created]));
      void loadConversations();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to send message');
    }
  };

  // Initial inbox load on first render.
  useEffect(() => {
    void loadConversations();
  }, []);

  // Socket lifecycle setup with all server event subscriptions.
  useEffect(() => {
    const chatSocket = io(`${backendUrl}/chat`, {
      transports: ['websocket'],
      auth: {
        token: accessToken,
      },
    });

    chatSocket.on('connect', () => {
      // Re-join active room after reconnect.
      if (selectedConversationIdRef.current) {
        chatSocket.emit('conversation:join', {
          conversationId: selectedConversationIdRef.current,
        });
      }
    });

    chatSocket.on('chat:error', (payload: { message?: string }) => {
      setError(payload?.message ?? 'Socket error');
    });

    chatSocket.on('message:new', (message: ChatMessage) => {
      // Only append to currently open thread; always refresh inbox metadata.
      if (message.conversationId === selectedConversationIdRef.current) {
        setMessages((prev) => asSortedUnique([...prev, message]));
      }
      void loadConversations();
    });

    chatSocket.on('message:updated', (message: ChatMessage) => {
      if (message.conversationId === selectedConversationIdRef.current) {
        setMessages((prev) => asSortedUnique([...prev, message]));
      }
      void loadConversations();
    });

    chatSocket.on('message:deleted', (message: ChatMessage) => {
      if (message.conversationId === selectedConversationIdRef.current) {
        setMessages((prev) => asSortedUnique([...prev, message]));
      }
      void loadConversations();
    });

    chatSocket.on('conversation:updated', () => {
      // Keep sidebar order/unread values synchronized.
      void loadConversations();
    });

    setSocket(chatSocket);

    return () => {
      // Prevent duplicate listeners and release socket on unmount.
      chatSocket.disconnect();
      setSocket(null);
    };
  }, [accessToken, backendUrl]);

  // Whenever active conversation changes:
  // - fetch recent history
  // - join conversation room for real-time events
  // - leave previous room in cleanup
  useEffect(() => {
    if (!selectedConversationId) {
      setMessages([]);
      return;
    }

    void loadMessages(selectedConversationId);

    if (!socket) return;

    socket.emit('conversation:join', { conversationId: selectedConversationId });

    return () => {
      socket.emit('conversation:leave', { conversationId: selectedConversationId });
    };
  }, [selectedConversationId, socket]);

  return (
    <div className="mx-auto flex h-[86vh] w-full max-w-7xl gap-4 p-4">
      <aside className="flex w-80 shrink-0 flex-col rounded-xl border bg-white p-3">
        <h2 className="text-lg font-semibold">Conversations</h2>

        <form onSubmit={createDirectConversation} className="mt-3 flex gap-2">
          <input
            value={targetUserId}
            onChange={(event) => setTargetUserId(event.target.value)}
            placeholder="Start direct chat by user id"
            className="flex-1 rounded-md border px-3 py-2 text-sm"
          />
          <button type="submit" className="rounded-md bg-black px-3 py-2 text-sm text-white">
            Start
          </button>
        </form>

        <div className="mt-3 flex-1 overflow-y-auto">
          {loadingConversations ? (
            <p className="text-sm text-neutral-500">Loading conversations...</p>
          ) : conversations.length === 0 ? (
            <p className="text-sm text-neutral-500">No conversations yet.</p>
          ) : (
            <ul className="space-y-2">
              {conversations.map((conversation) => {
                const isSelected = conversation.id === selectedConversationId;

                return (
                  <li key={conversation.id}>
                    <button
                      onClick={() => setSelectedConversationId(conversation.id)}
                      className={`w-full rounded-lg border px-3 py-2 text-left ${
                        isSelected ? 'border-black bg-neutral-100' : 'border-neutral-200'
                      }`}
                    >
                      <p className="text-sm font-semibold">{getConversationTitle(conversation)}</p>
                      <p className="mt-1 line-clamp-1 text-xs text-neutral-600">
                        {conversation.lastMessage?.content ?? 'No messages yet'}
                      </p>
                      {conversation.unreadCount ? (
                        <span className="mt-1 inline-flex rounded-full bg-black px-2 py-0.5 text-[11px] text-white">
                          {conversation.unreadCount}
                        </span>
                      ) : null}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </aside>

      <section className="flex min-w-0 flex-1 flex-col rounded-xl border bg-white">
        <header className="border-b px-4 py-3">
          <h3 className="text-base font-semibold">
            {selectedConversation ? getConversationTitle(selectedConversation) : 'Select a conversation'}
          </h3>
        </header>

        <div className="flex-1 overflow-y-auto px-4 py-3">
          {loadingMessages ? (
            <p className="text-sm text-neutral-500">Loading messages...</p>
          ) : !selectedConversationId ? (
            <p className="text-sm text-neutral-500">Pick a conversation to start messaging.</p>
          ) : messages.length === 0 ? (
            <p className="text-sm text-neutral-500">No messages yet.</p>
          ) : (
            <ul className="space-y-3">
              {messages.map((message) => {
                const mine = message.senderId === currentUserId;

                return (
                  <li key={message.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                    <div
                      className={`max-w-[70%] rounded-xl px-3 py-2 text-sm ${
                        mine ? 'bg-black text-white' : 'bg-neutral-100 text-neutral-900'
                      }`}
                    >
                      {!mine ? (
                        <p className="mb-1 text-[11px] font-semibold opacity-80">
                          {message.sender?.name ?? 'User'}
                        </p>
                      ) : null}
                      <p>{message.content ?? '[message deleted]'}</p>
                      <p className="mt-1 text-[10px] opacity-70">
                        {new Date(message.createdAt).toLocaleString()}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <form onSubmit={sendMessage} className="border-t p-3">
          <div className="flex gap-2">
            <input
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              disabled={!selectedConversationId}
              placeholder={selectedConversationId ? 'Write a message...' : 'Select a conversation first'}
              className="flex-1 rounded-md border px-3 py-2 text-sm"
            />
            <button
              type="submit"
              disabled={!selectedConversationId || !draft.trim()}
              className="rounded-md bg-black px-4 py-2 text-sm text-white disabled:cursor-not-allowed disabled:opacity-40"
            >
              Send
            </button>
          </div>
          {error ? <p className="mt-2 text-xs text-red-600">{error}</p> : null}
        </form>
      </section>
    </div>
  );
}
