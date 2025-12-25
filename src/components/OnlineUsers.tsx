'use client';

import { User } from '@/lib/supabase';

interface OnlineUsersProps {
  users: User[];
  currentUserId: string;
}

export default function OnlineUsers({ users, currentUserId }: OnlineUsersProps) {
  const typingUsers = users.filter(u => u.is_typing && u.id !== currentUserId);

  return (
    <div className="w-72 border-l border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 overflow-y-auto">
      <div className="p-4">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Online — {users.length}
        </h2>

        <div className="space-y-3">
          {users.map((user) => (
            <div
              key={user.id}
              className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              <div className="relative">
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold"
                  style={{ backgroundColor: user.color }}
                >
                  {user.name.charAt(0).toUpperCase()}
                </div>
                <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full border-2 border-white dark:border-gray-800"></div>
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                    {user.name}
                  </p>
                  {user.id === currentUserId && (
                    <span className="text-xs text-gray-500 dark:text-gray-400">(you)</span>
                  )}
                </div>
                {user.is_typing && user.id !== currentUserId && (
                  <div className="flex items-center gap-1 text-xs text-purple-600 dark:text-purple-400">
                    <span>typing</span>
                    <div className="flex gap-0.5">
                      <div className="w-1 h-1 bg-purple-600 dark:bg-purple-400 rounded-full typing-dot"></div>
                      <div className="w-1 h-1 bg-purple-600 dark:bg-purple-400 rounded-full typing-dot"></div>
                      <div className="w-1 h-1 bg-purple-600 dark:bg-purple-400 rounded-full typing-dot"></div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {typingUsers.length > 0 && (
          <div className="mt-6 p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
            <div className="text-xs text-purple-600 dark:text-purple-400 font-medium">
              {typingUsers.map(u => u.name).join(', ')} {typingUsers.length === 1 ? 'is' : 'are'} typing...
            </div>
          </div>
        )}

        <div className="mt-6 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
          <div className="flex items-start gap-2">
            <svg className="w-5 h-5 text-purple-600 dark:text-purple-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div className="text-xs text-gray-600 dark:text-gray-400">
              <p className="font-medium mb-1">Ephemeral Room</p>
              <p>Messages will be deleted when all users leave this room.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
