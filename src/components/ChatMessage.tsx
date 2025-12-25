'use client';

import { formatDistanceToNow } from 'date-fns';
import { Message } from '@/lib/supabase';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus, vs } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { useStore } from '@/store/userStore';
import { useState } from 'react';

interface ChatMessageProps {
  message: Message;
  currentUserId: string;
  onReply: (message: Message) => void;
  onReact: (messageId: string, emoji: string) => void;
  replyToMessage?: Message;
}

const QUICK_REACTIONS = ['👍', '😂', '🔥', '❤️', '👀', '✨'];

// Helper function to detect and render links
const renderTextWithLinks = (text: string) => {
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const parts = text.split(urlRegex);
  
  return parts.map((part, index) => {
    if (part.match(urlRegex)) {
      return (
        <a
          key={index}
          href={part}
          target="_blank"
          rel="noopener noreferrer"
          className="underline hover:text-blue-400 break-all"
        >
          {part}
        </a>
      );
    }
    return part;
  });
};

export default function ChatMessage({ message, currentUserId, onReply, onReact, replyToMessage }: ChatMessageProps) {
  const { theme } = useStore();
  const [showReactions, setShowReactions] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const isOwn = message.user_id === currentUserId;

  const handleCopyCode = () => {
    navigator.clipboard.writeText(message.content);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const reactions = message.reactions || {};
  const hasReactions = Object.keys(reactions).length > 0;

  return (
    <div className={`flex gap-3 message-appear ${isOwn ? 'flex-row-reverse' : ''}`}>
      {/* Avatar */}
      <div
        className="w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold flex-shrink-0"
        style={{ backgroundColor: message.user_color }}
      >
        {message.user_name.charAt(0).toUpperCase()}
      </div>

      {/* Message Content */}
      <div className={`${isOwn ? 'items-end flex flex-col' : 'flex flex-col'}`}>
        {/* User Name & Time */}
        <div className={`flex items-center gap-2 mb-1 ${isOwn ? 'flex-row-reverse' : ''}`}>
          <span className="text-sm font-semibold text-gray-900 dark:text-white">
            {message.user_name}
          </span>
          <span className="text-xs text-gray-500 dark:text-gray-400">
            {formatDistanceToNow(new Date(message.created_at), { addSuffix: true })}
          </span>
        </div>

        {/* Reply Reference */}
        {replyToMessage && (
          <div className="mb-2 px-3 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg text-sm border-l-4 border-purple-500">
            <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">
              Replying to {replyToMessage.user_name}
            </div>
            <div className="text-gray-700 dark:text-gray-300 truncate">
              {replyToMessage.content.substring(0, 100)}
              {replyToMessage.content.length > 100 && '...'}
            </div>
          </div>
        )}

        {/* Message Body */}
        <div
          className={`relative group inline-block max-w-2xl ${
            isOwn
              ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white'
              : 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white'
          } rounded-2xl px-4 py-3 shadow-sm`}
        >
          {message.type === 'text' && (
            <p className="break-words whitespace-pre-wrap">{renderTextWithLinks(message.content)}</p>
          )}

          {message.type === 'code' && (
            <div className="relative">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-mono opacity-75">
                  {message.code_language || 'plaintext'}
                </span>
                <button
                  onClick={handleCopyCode}
                  className="text-xs px-2 py-1 rounded bg-black/20 hover:bg-black/30 transition-colors"
                >
                  {copiedCode ? 'Copied!' : 'Copy'}
                </button>
              </div>
              <SyntaxHighlighter
                language={message.code_language || 'javascript'}
                style={theme === 'dark' ? vscDarkPlus : vs}
                customStyle={{
                  margin: 0,
                  borderRadius: '0.5rem',
                  fontSize: '0.875rem',
                }}
              >
                {message.content}
              </SyntaxHighlighter>
            </div>
          )}

          {message.type === 'image' && (
            <div>
              <img
                src={message.file_url}
                alt={message.file_name || 'Shared image'}
                className="max-w-full rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
                onClick={() => window.open(message.file_url, '_blank')}
              />
              {message.content && message.content !== 'Image' && (
                <p className="mt-2 break-words">{renderTextWithLinks(message.content)}</p>
              )}
            </div>
          )}

          {message.type === 'file' && (
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-purple-600 dark:text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
              </div>
              <div className="flex-1">
                <p className="font-medium">{message.file_name}</p>
                <a
                  href={message.file_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-purple-400 hover:underline"
                >
                  Download
                </a>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="absolute -bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
            <button
              onClick={() => setShowReactions(!showReactions)}
              className="p-1.5 bg-gray-100 dark:bg-gray-700 rounded-full text-sm hover:scale-110 transition-transform"
            >
              😊
            </button>
            <button
              onClick={() => onReply(message)}
              className="p-1.5 bg-gray-100 dark:bg-gray-700 rounded-full text-xs hover:scale-110 transition-transform"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
              </svg>
            </button>
          </div>
        </div>

        {/* Quick Reactions Popup */}
        {showReactions && (
          <div className="mt-2 flex gap-2 p-2 bg-white dark:bg-gray-800 rounded-lg shadow-lg animate-fade-in">
            {QUICK_REACTIONS.map((emoji) => (
              <button
                key={emoji}
                onClick={() => {
                  onReact(message.id, emoji);
                  setShowReactions(false);
                }}
                className="text-2xl hover:scale-125 transition-transform"
              >
                {emoji}
              </button>
            ))}
          </div>
        )}

        {/* Reactions Display */}
        {hasReactions && (
          <div className="flex flex-wrap gap-2 mt-2">
            {Object.entries(reactions).map(([emoji, userIds]) => (
              <button
                key={emoji}
                onClick={() => onReact(message.id, emoji)}
                className={`px-2 py-1 rounded-full text-sm flex items-center gap-1 transition-all ${
                  (userIds as string[]).includes(currentUserId)
                    ? 'bg-purple-100 dark:bg-purple-900 ring-2 ring-purple-500'
                    : 'bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                <span>{emoji}</span>
                <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
                  {(userIds as string[]).length}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
