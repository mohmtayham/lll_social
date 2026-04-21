'use client';

import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';

// تمثيل بيانات المستخدم المختصرة في واجهة الدردشة.
type ChatUser = {
  id: string;
  name: string;
  username?: string | null;
  avatarMediaId?: string | null;
};

// تمثيل المشارك داخل محادثة (مع دوره).
type ChatParticipant = {
  userId: string;
  role: 'ADMIN' | 'MEMBER';
  user: ChatUser;
};

// تمثيل الرسالة القادمة من الـ API/Socket.
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

// تمثيل محادثة في sidebar.
type ChatConversation = {
  id: string;
  type: 'DIRECT' | 'GROUP';
  name?: string | null;
  description?: string | null;
  participants: ChatParticipant[];
  lastMessage?: ChatMessage | null;
  unreadCount?: number;
};

// خصائص العميل: توكن المصادقة + هوية المستخدم + رابط الـ backend.
type MessagesClientProps = {
  accessToken: string;
  currentUserId: string;
  backendUrl: string;
};

// توحيد وترتيب الرسائل:
// 1) إزالة التكرار بالاعتماد على id
// 2) ترتيب زمني تصاعدي (الأقدم -> الأحدث)
// يفيد عند إعادة الاتصال أو وصول نفس الحدث أكثر من مرة.
const asSortedUnique = (messages: ChatMessage[]) => {
  const map = new Map<string, ChatMessage>();
  // آخر نسخة من نفس id تستبدل النسخة السابقة.
  for (const message of messages) {
    map.set(message.id, message);
  }

  // تحويل map إلى array ثم ترتيب حسب createdAt.
  return [...map.values()].sort((a, b) => {
    return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
  });
};

export function MessagesClient({
  accessToken,
  currentUserId,
  backendUrl,
}: MessagesClientProps) {
  // قائمة المحادثات في الشريط الجانبي.
  const [conversations, setConversations] = useState<ChatConversation[]>([]);
  // المحادثة النشطة حاليا.
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  // رسائل المحادثة النشطة.
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  // حالة تحميل المحادثات.
  const [loadingConversations, setLoadingConversations] = useState(true);
  // حالة تحميل الرسائل.
  const [loadingMessages, setLoadingMessages] = useState(false);
  // رسالة خطأ عامة للعرض في الواجهة.
  const [error, setError] = useState<string | null>(null);
  // محتوى الإدخال قبل الإرسال.
  const [draft, setDraft] = useState('');
  // userId الهدف لإنشاء Direct conversation.
  const [targetUserId, setTargetUserId] = useState('');
  // كائن الاتصال اللحظي.
  const [socket, setSocket] = useState<Socket | null>(null);
  // ref لتفادي مشكلة stale closure داخل listeners الخاصة بالسوكِت.
  const selectedConversationIdRef = useRef<string | null>(null);

  // نحدث ref في كل render حتى تقرأ listeners آخر قيمة.
  selectedConversationIdRef.current = selectedConversationId;

  // استخراج المحادثة المختارة من قائمة المحادثات.
  const selectedConversation = useMemo(() => {
    if (!selectedConversationId) return null;
    return conversations.find((conversation) => conversation.id === selectedConversationId) ?? null;
  }, [conversations, selectedConversationId]);

  const getConversationTitle = (conversation: ChatConversation) => {
    // إذا هناك اسم صريح للمحادثة (غالبا Group) نستخدمه مباشرة.
    if (conversation.name) return conversation.name;

    // في المحادثة المباشرة نستنتج الاسم من الطرف الآخر.
    if (conversation.type === 'DIRECT') {
      const peer = conversation.participants.find(
        (participant) => participant.userId !== currentUserId,
      );

      if (peer?.user?.name) return peer.user.name;
      if (peer?.user?.username) return `@${peer.user.username}`;
    }

    // fallback في حالة البيانات غير مكتملة.
    return `Conversation ${conversation.id}`;
  };

  // غلاف موحد لأي طلب HTTP يحتاج Authorization.
  const authedFetch = async (url: string, options?: RequestInit) => {
    const response = await fetch(url, {
      ...options,
      headers: {
        // backend يعتمد JSON payload.
        'Content-Type': 'application/json',
        // Bearer token من الجلسة الحالية.
        Authorization: `Bearer ${accessToken}`,
        ...(options?.headers ?? {}),
      },
    });

    // في حال الفشل نرفع Error يحتوي نص الاستجابة للعرض/التشخيص.
    if (!response.ok) {
      const body = await response.text();
      throw new Error(body || `Request failed with ${response.status}`);
    }

    // إرجاع JSON النهائي للنداء.
    return response.json();
  };

  // تحميل قائمة المحادثات (inbox).
  const loadConversations = async () => {
    setLoadingConversations(true);
    try {
      const data = (await authedFetch(`${backendUrl}/conversation/mine`)) as ChatConversation[];
      setConversations(data);

      // إذا لا يوجد اختيار حالي ونملك محادثات، اختر أول محادثة افتراضيا.
      if (!selectedConversationIdRef.current && data.length > 0) {
        setSelectedConversationId(data[0].id);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load conversations');
    } finally {
      setLoadingConversations(false);
    }
  };

  // تحميل سجل رسائل المحادثة المختارة.
  const loadMessages = async (conversationId: string) => {
    setLoadingMessages(true);
    try {
      const data = (await authedFetch(
        `${backendUrl}/message/conversation/${conversationId}?limit=50`,
      )) as ChatMessage[];

      // ترتيب/تنظيف الرسائل قبل عرضها.
      setMessages(asSortedUnique(data));

      if (socket) {
        // بعد تحميل الرسائل نرسل مؤشر القراءة عند آخر رسالة معروضة.
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

  // إنشاء محادثة مباشرة مع مستخدم عبر userId.
  const createDirectConversation = async (event: FormEvent) => {
    event.preventDefault();

    // نتجاهل القيمة الفارغة.
    const trimmed = targetUserId.trim();
    if (!trimmed) return;

    try {
      const created = (await authedFetch(`${backendUrl}/conversation`, {
        method: 'POST',
        body: JSON.stringify({
          // نطلب صراحة Direct conversation.
          type: 'DIRECT',
          participantIds: [trimmed],
        }),
      })) as ChatConversation;

      // تنظيف الإدخال ثم إعادة التحميل وتحديد المحادثة الجديدة.
      setTargetUserId('');
      await loadConversations();
      setSelectedConversationId(created.id);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to create direct conversation');
    }
  };

  // إرسال رسالة جديدة:
  // 1) التحقق من وجود محادثة ونص
  // 2) تجهيز payload
  // 3) التفريغ المتفائل لحقل الإدخال
  // 4) الإرسال عبر Socket إن كان متصلا
  // 5) fallback عبر HTTP إن كان السوكِت غير جاهز
  const sendMessage = async (event: FormEvent) => {
    event.preventDefault();

    if (!selectedConversationId || !draft.trim()) return;

    const payload = {
      conversationId: selectedConversationId,
      content: draft.trim(),
      messageType: 'TEXT',
    };

    // تفريغ الحقل مباشرة لتحسين الإحساس بالسرعة.
    setDraft('');

    if (socket?.connected) {
      // المسار الأساسي: حدث Socket فوري.
      socket.emit('message:send', payload);
      return;
    }

    try {
      // المسار البديل: REST API.
      const created = (await authedFetch(`${backendUrl}/message`, {
        method: 'POST',
        body: JSON.stringify(payload),
      })) as ChatMessage;

      // تحديث محلي في حال fallback.
      setMessages((prev) => asSortedUnique([...prev, created]));
      void loadConversations();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to send message');
    }
  };

  // تحميل inbox مرة واحدة عند أول render.
  useEffect(() => {
    void loadConversations();
  }, []);

  // دورة حياة Socket كاملة (إنشاء + listeners + cleanup).
  useEffect(() => {
    // فتح اتصال Namespace /chat مع تمرير token في handshake.
    const chatSocket = io(`${backendUrl}/chat`, {
      transports: ['websocket'],
      auth: {
        token: accessToken,
      },
    });

    chatSocket.on('connect', () => {
      // بعد أي reconnect نعيد الانضمام لغرفة المحادثة النشطة.
      if (selectedConversationIdRef.current) {
        chatSocket.emit('conversation:join', {
          conversationId: selectedConversationIdRef.current,
        });
      }
    });

    // استقبال أخطاء العمل القادمة من gateway.
    chatSocket.on('chat:error', (payload: { message?: string }) => {
      setError(payload?.message ?? 'Socket error');
    });

    // رسالة جديدة وصلت من السيرفر.
    chatSocket.on('message:new', (message: ChatMessage) => {
      // نضيفها فقط إذا كانت في المحادثة المفتوحة حاليا.
      if (message.conversationId === selectedConversationIdRef.current) {
        setMessages((prev) => asSortedUnique([...prev, message]));
      }
      // ونحدّث inbox دائما لأن آخر رسالة/الترتيب قد يتغيران.
      void loadConversations();
    });

    // تعديل رسالة موجودة.
    chatSocket.on('message:updated', (message: ChatMessage) => {
      if (message.conversationId === selectedConversationIdRef.current) {
        setMessages((prev) => asSortedUnique([...prev, message]));
      }
      void loadConversations();
    });

    // حذف رسالة موجودة.
    chatSocket.on('message:deleted', (message: ChatMessage) => {
      if (message.conversationId === selectedConversationIdRef.current) {
        setMessages((prev) => asSortedUnique([...prev, message]));
      }
      void loadConversations();
    });

    // تحديث عام على المحادثة (unread/lastMessage/participants...).
    chatSocket.on('conversation:updated', () => {
      // مزامنة sidebar باستمرار مع الحالة الفعلية على السيرفر.
      void loadConversations();
    });

    // حفظ socket في state للوصول له في أجزاء أخرى.
    setSocket(chatSocket);

    return () => {
      // تنظيف كامل لتفادي تكرار listeners وتسريب الاتصال.
      chatSocket.disconnect();
      setSocket(null);
    };
  }, [accessToken, backendUrl]);

  // عند تغيير المحادثة النشطة:
  // 1) تحميل التاريخ
  // 2) الانضمام لغرفة المحادثة
  // 3) مغادرة الغرفة السابقة عند cleanup
  useEffect(() => {
    if (!selectedConversationId) {
      // لا يوجد اختيار => نفرغ الرسائل المعروضة.
      setMessages([]);
      return;
    }

    void loadMessages(selectedConversationId);

    if (!socket) return;

    // انضمام لحظي لغرفة المحادثة المختارة.
    socket.emit('conversation:join', { conversationId: selectedConversationId });

    return () => {
      // مغادرة الغرفة عند تغيير الاختيار أو تفكيك المكون.
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
