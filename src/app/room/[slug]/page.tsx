'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useStore } from '@/store/userStore';
import { RoomManager } from '@/lib/roomManager';
import { Message, User } from '@/lib/supabase';
import ChatMessage from '@/components/ChatMessage';
import MessageInput from '@/components/MessageInput';
import OnlineUsers from '@/components/OnlineUsers';
import CodeModal from '@/components/CodeModal';
import ImageModal from '@/components/ImageModal';

const roomManager = new RoomManager();

export default function RoomPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;
  
  const { userId, userName, userColor, setUser, setCurrentRoom, theme, toggleTheme } = useStore();
  const [messages, setMessages] = useState<Message[]>([]);
  const [onlineUsers, setOnlineUsers] = useState<User[]>([]);
  const [roomId, setRoomId] = useState<string | null>(null);
  const [maxUsers, setMaxUsers] = useState<number | null>(null);
  const [maxUsersFromUrl, setMaxUsersFromUrl] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isMounted, setIsMounted] = useState(false);
  const [showCodeModal, setShowCodeModal] = useState(false);
  const [showImageModal, setShowImageModal] = useState(false);
  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const [copied, setCopied] = useState(false);
  const [showNameModal, setShowNameModal] = useState(false);
  const [tempName, setTempName] = useState('');
  const [isAdminRoom, setIsAdminRoom] = useState(false);
  const [adminPassword, setAdminPassword] = useState('');
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [authError, setAuthError] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Track if component has mounted to prevent SSR hydration issues
  useEffect(() => {
    setIsMounted(true);
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    const initRoom = async () => {
      // Parse URL parameters first
      const searchParams = new URLSearchParams(window.location.search);
      const limitParam = searchParams.get('limit');
      const parsedMaxUsers = limitParam && limitParam !== 'unlimited' ? parseInt(limitParam) : null;
      setMaxUsersFromUrl(parsedMaxUsers);
      
      // Check if admin room
      if (slug === 'admin') {
        setIsAdminRoom(true);
        if (!adminPassword && !userName) {
          setShowPasswordModal(true);
          setIsLoading(false);
          return;
        }
      }
      
      // Always prompt for username (not persistent)
      if (!userName) {
        setShowNameModal(true);
        setIsLoading(false);
        return;
      }

      try {
        const data = await roomManager.createOrJoinRoom(slug, userId, userName, userColor, parsedMaxUsers, isAdminRoom ? adminPassword : undefined);
        setRoomId(data.roomId);
        setCurrentRoom(data.roomId);
        setMaxUsers(data.maxUsers);
        
        // Set initial messages and users from room
        setMessages(data.messages);
        setOnlineUsers(data.users);

        // Subscribe to real-time updates
        roomManager.subscribeToRoom(
          data.roomId,
          (message) => {
            setMessages((prev) => {
              const exists = prev.find(m => m.id === message.id);
              if (exists) {
                return prev.map(m => m.id === message.id ? message : m);
              }
              return [...prev, message];
            });
          },
          (users) => {
            setOnlineUsers(users);
          }
        );

        // Start heartbeat
        roomManager.startHeartbeat(userId);

        setIsLoading(false);
      } catch (error: any) {
        console.error('Failed to join room:', error);
        if (error.message === 'Room is full') {
          alert('This room is full. Please try another room.');
        } else if (error.message === 'Invalid admin password') {
          setAuthError('Invalid password');
          setAdminPassword('');
          setShowPasswordModal(true);
          setIsLoading(false);
          return;
        } else {
          alert('Failed to join room. Please try again.');
        }
        router.push('/');
      }
    };

    initRoom();

    // Cleanup on unmount
    return () => {
      if (roomId) {
        roomManager.unsubscribe();
        roomManager.leaveRoom(userId);
        setCurrentRoom(null);
      }
    };
  }, [userName, adminPassword]);

  const handleSendMessage = async (content: string, type: 'text' | 'code' | 'image' | 'file' = 'text', metadata?: any) => {
    if (!roomId || !content.trim()) return;

    try {
      await roomManager.sendMessage({
        room_id: roomId,
        user_id: userId,
        user_name: userName,
        user_color: userColor,
        content,
        type,
        reply_to: replyTo?.id,
        ...metadata,
      });
      setReplyTo(null);
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  };

  const handleReaction = async (messageId: string, emoji: string) => {
    try {
      await roomManager.addReaction(messageId, emoji, userId);
    } catch (error) {
      console.error('Failed to add reaction:', error);
    }
  };

  const handleCopyLink = () => {
    const link = window.location.href;
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleLeaveRoom = async () => {
    if (confirm('Are you sure you want to leave? Messages will be deleted when everyone leaves.')) {
      await roomManager.leaveRoom(userId);
      router.push('/');
    }
  };

  const handleSubmitName = () => {
    if (tempName.trim()) {
      setUser(tempName.trim(), userColor);
      setShowNameModal(false);
    }
  };

  const handleSubmitPassword = () => {
    if (adminPassword.trim()) {
      setShowPasswordModal(false);
      setAuthError('');
      if (!userName) {
        setShowNameModal(true);
      }
    }
  };

  if (showPasswordModal) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 flex items-center justify-center p-4">
        <div className="bg-gray-800 rounded-2xl shadow-2xl p-8 max-w-md w-full border-2 border-purple-500">
          <div className="text-center mb-6">
            <div className="w-20 h-20 rounded-full mx-auto mb-4 flex items-center justify-center bg-gradient-to-r from-purple-600 to-pink-600 text-white text-3xl font-bold">
              🔐
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">
              Admin Room Access
            </h2>
            <p className="text-gray-400">
              This is a protected room. Enter password to continue.
            </p>
            {authError && (
              <p className="text-red-400 text-sm mt-2">❌ {authError}</p>
            )}
          </div>
          
          <input
            type="password"
            value={adminPassword}
            onChange={(e) => setAdminPassword(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSubmitPassword()}
            placeholder="Enter admin password"
            className="w-full px-4 py-3 rounded-xl border-2 border-purple-500 bg-gray-700 text-white placeholder-gray-400 focus:outline-none focus:border-purple-400 mb-4"
            autoFocus
          />
          
          <div className="flex gap-3">
            <button
              onClick={() => router.push('/')}
              className="flex-1 px-6 py-3 bg-gray-700 text-gray-300 font-semibold rounded-xl hover:bg-gray-600 transition-all"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmitPassword}
              disabled={!adminPassword.trim()}
              className="flex-1 px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold rounded-xl hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Access Room
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (showNameModal) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-purple-50 to-pink-50 dark:from-gray-900 dark:via-purple-900 dark:to-gray-900 flex items-center justify-center p-4">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-8 max-w-md w-full border border-gray-200 dark:border-gray-700">
          <div className="text-center mb-6">
            <div 
              className="w-20 h-20 rounded-full mx-auto mb-4 flex items-center justify-center text-white text-3xl font-bold"
              style={{ backgroundColor: userColor }}
            >
              {tempName ? tempName.charAt(0).toUpperCase() : '?'}
            </div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              Join #{slug}
            </h2>
            <p className="text-gray-600 dark:text-gray-400">
              Choose a nickname to enter the room
            </p>
          </div>
          
          <input
            type="text"
            value={tempName}
            onChange={(e) => setTempName(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSubmitName()}
            placeholder="Enter your nickname"
            className="w-full px-4 py-3 rounded-xl border-2 border-purple-300 dark:border-purple-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:border-purple-500 dark:focus:border-purple-400 mb-4"
            autoFocus
          />
          
          <div className="flex gap-3">
            <button
              onClick={() => router.push('/')}
              className="flex-1 px-6 py-3 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 font-semibold rounded-xl hover:bg-gray-300 dark:hover:bg-gray-600 transition-all"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmitName}
              disabled={!tempName.trim()}
              className="flex-1 px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold rounded-xl hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Join Room
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Prevent hydration errors by not rendering loading state during SSR
  if (!isMounted || isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center" suppressHydrationWarning>
        <div className="text-center" suppressHydrationWarning>
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-purple-600 mx-auto mb-4" suppressHydrationWarning></div>
          <p className="text-gray-600 dark:text-gray-400">Joining room...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-gray-50 dark:bg-gray-900 transition-colors duration-300">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 py-3 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-semibold text-gray-900 dark:text-white">#{slug}</h1>
              {isAdminRoom && (
                <span className="px-2 py-0.5 bg-gradient-to-r from-purple-600 to-pink-600 text-white text-xs font-bold rounded-full">
                  ADMIN
                </span>
              )}
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {onlineUsers.length} online{maxUsers ? ` / ${maxUsers} max` : isAdminRoom ? ' • Persistent Chat' : ' (unlimited)'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleCopyLink}
            className="px-4 py-2 text-sm font-medium text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/20 rounded-lg transition-colors flex items-center gap-2"
          >
            {copied ? (
              <>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Copied!
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                Copy Link
              </>
            )}
          </button>

          <button
            onClick={toggleTheme}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            {theme === 'light' ? '🌙' : '☀️'}
          </button>

          <button
            onClick={handleLeaveRoom}
            className="px-4 py-2 text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
          >
            Leave
          </button>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        {/* Main Chat Area */}
        <div className="flex-1 flex flex-col">
          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-6 space-y-4">
            {messages.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-6xl mb-4">👋</div>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                  Welcome to the room!
                </h3>
                <p className="text-gray-600 dark:text-gray-400">
                  Start the conversation. Share code, images, or just chat!
                </p>
              </div>
            ) : (
              messages.map((message) => (
                <ChatMessage
                  key={message.id}
                  message={message}
                  currentUserId={userId}
                  onReply={setReplyTo}
                  onReact={handleReaction}
                  replyToMessage={messages.find(m => m.id === message.reply_to)}
                />
              ))
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Message Input */}
          <MessageInput
            onSend={handleSendMessage}
            onOpenCodeModal={() => setShowCodeModal(true)}
            onOpenImageModal={() => setShowImageModal(true)}
            replyTo={replyTo}
            onCancelReply={() => setReplyTo(null)}
            roomManager={roomManager}
            userId={userId}
          />
        </div>

        {/* Online Users Sidebar */}
        <OnlineUsers users={onlineUsers} currentUserId={userId} />
      </div>

      {/* Modals */}
      {showCodeModal && (
        <CodeModal
          onClose={() => setShowCodeModal(false)}
          onSubmit={(code, language) => {
            handleSendMessage(code, 'code', { code_language: language });
            setShowCodeModal(false);
          }}
        />
      )}

      {showImageModal && (
        <ImageModal
          onClose={() => setShowImageModal(false)}
          onSubmit={(imageUrl, caption) => {
            handleSendMessage(caption || 'Image', 'image', { file_url: imageUrl, file_name: 'image' });
            setShowImageModal(false);
          }}
        />
      )}
    </div>
  );
}
