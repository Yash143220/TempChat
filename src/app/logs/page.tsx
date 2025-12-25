'use client';

import { useEffect, useState } from 'react';
import { useStore } from '@/store/userStore';
import { getSocket } from '@/lib/supabase';

interface LogEntry {
  type: 'created' | 'destroyed' | 'stats';
  slug?: string;
  creator?: string;
  maxUsers?: number | null;
  reason?: string;
  activeRooms?: number;
  totalUsers?: number;
  timestamp: string;
}

export default function LogsPage() {
  const { theme, toggleTheme } = useStore();
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [stats, setStats] = useState<{ activeRooms: number; totalUsers: number } | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState('');

  const handleAuth = () => {
    if (password.trim()) {
      const adminPassword = process.env.NEXT_PUBLIC_ADMIN_PASSWORD || 'admin123';
      if (password === adminPassword) {
        setIsAuthenticated(true);
        setAuthError('');
      } else {
        setAuthError('Invalid password');
      }
    }
  };

  useEffect(() => {
    if (!isAuthenticated) return;
    
    const socket = getSocket();

    const connectSocket = () => {
      if (!socket.connected) {
        console.log('🔌 Attempting to connect Socket.IO...');
        socket.connect();
      }
    };

    socket.on('connect', () => {
      setIsConnected(true);
      console.log('✅ Connected to logs socket');
    });

    socket.on('disconnect', () => {
      setIsConnected(false);
      console.log('❌ Disconnected from logs socket');
    });

    socket.on('connect_error', (error) => {
      console.error('❌ Logs connection error:', error.message);
      setIsConnected(false);
    });

    // Listen for room creation events
    socket.on('room-created', (data: { slug: string; creator: string; maxUsers: number | null; timestamp: string }) => {
      console.log('🟢 Room created event received:', data);
      const logEntry: LogEntry = {
        type: 'created',
        ...data,
      };
      setLogs(prev => [logEntry, ...prev].slice(0, 100)); // Keep last 100 logs
    });

    // Listen for room destruction events
    socket.on('room-destroyed', (data: { slug: string; reason: string; timestamp: string }) => {
      console.log('🔴 Room destroyed event received:', data);
      const logEntry: LogEntry = {
        type: 'destroyed',
        ...data,
      };
      setLogs(prev => [logEntry, ...prev].slice(0, 100));
    });

    // Listen for stats updates
    socket.on('room-stats-update', (data: { activeRooms: number; totalUsers: number; timestamp: string }) => {
      console.log('📊 Stats update received:', data);
      setStats({ activeRooms: data.activeRooms, totalUsers: data.totalUsers });
      
      const logEntry: LogEntry = {
        type: 'stats',
        ...data,
      };
      setLogs(prev => [logEntry, ...prev].slice(0, 100));
    });

    // Initial stats will be set to 0, then updated via Socket.IO events
    setStats({ activeRooms: 0, totalUsers: 0 });

    connectSocket();

    return () => {
      socket.off('connect');
      socket.off('disconnect');
      socket.off('connect_error');
      socket.off('room-created');
      socket.off('room-destroyed');
      socket.off('room-stats-update');
    };
  }, [isAuthenticated]);

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', { hour12: false });
  };

  const getLogColor = (type: string) => {
    switch (type) {
      case 'created':
        return 'text-green-600 dark:text-green-400';
      case 'destroyed':
        return 'text-red-600 dark:text-red-400';
      case 'stats':
        return 'text-blue-600 dark:text-blue-400';
      default:
        return 'text-gray-600 dark:text-gray-400';
    }
  };

  const getLogIcon = (type: string) => {
    switch (type) {
      case 'created':
        return '✅';
      case 'destroyed':
        return '❌';
      case 'stats':
        return '📊';
      default:
        return '•';
    }
  };

  const renderLogMessage = (log: LogEntry) => {
    switch (log.type) {
      case 'created':
        return (
          <>
            <span className="font-semibold">{log.slug}</span> created by{' '}
            <span className="font-semibold">{log.creator}</span>
            {log.maxUsers && ` (max: ${log.maxUsers} users)`}
          </>
        );
      case 'destroyed':
        return (
          <>
            <span className="font-semibold">{log.slug}</span> destroyed{' '}
            <span className="text-xs text-gray-500">({log.reason})</span>
          </>
        );
      case 'stats':
        return (
          <>
            Rooms: <span className="font-semibold">{log.activeRooms}</span> | Users:{' '}
            <span className="font-semibold">{log.totalUsers}</span>
          </>
        );
      default:
        return 'Unknown event';
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-8 max-w-md w-full mx-4">
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              🔐 Logs Access
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Enter admin password to continue
            </p>
          </div>
          
          {authError && (
            <div className="mb-4 p-3 bg-red-100 dark:bg-red-900/30 border border-red-300 dark:border-red-800 rounded-lg text-red-700 dark:text-red-400 text-sm">
              {authError}
            </div>
          )}
          
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleAuth()}
            placeholder="Enter password"
            className="w-full px-4 py-3 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white border-none focus:outline-none focus:ring-2 focus:ring-purple-500 mb-4"
            autoFocus
          />
          
          <div className="flex gap-3">
            <button
              onClick={() => window.location.href = '/'}
              className="flex-1 px-6 py-3 rounded-lg bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleAuth}
              disabled={!password.trim()}
              className="flex-1 px-6 py-3 rounded-lg bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              Access
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <a
              href="/"
              className="text-gray-600 dark:text-gray-400 hover:text-purple-600 dark:hover:text-purple-400"
            >
              ← Back
            </a>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              📡 Real-Time Logs
            </h1>
            <div className="flex items-center gap-2">
              <div
                className={`w-2 h-2 rounded-full ${
                  isConnected ? 'bg-green-500' : 'bg-red-500'
                }`}
              ></div>
              <span className="text-sm text-gray-600 dark:text-gray-400">
                {isConnected ? 'Connected' : 'Disconnected'}
              </span>
            </div>
          </div>
          <button
            onClick={toggleTheme}
            className="p-2 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600"
          >
            {theme === 'dark' ? '☀️' : '🌙'}
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
              <div className="text-sm text-gray-600 dark:text-gray-400">Active Rooms</div>
              <div className="text-3xl font-bold text-purple-600 dark:text-purple-400 mt-2">
                {stats.activeRooms}
              </div>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
              <div className="text-sm text-gray-600 dark:text-gray-400">Online Users</div>
              <div className="text-3xl font-bold text-purple-600 dark:text-purple-400 mt-2">
                {stats.totalUsers}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Logs */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Event Stream
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Live updates of room creation and destruction
            </p>
          </div>
          <div className="divide-y divide-gray-200 dark:divide-gray-700 max-h-[600px] overflow-y-auto">
            {logs.length === 0 ? (
              <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                No events yet. Create or join a room to see logs.
              </div>
            ) : (
              logs.map((log, index) => (
                <div
                  key={`${log.timestamp}-${index}`}
                  className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                >
                  <div className="flex items-start gap-3">
                    <span className="text-xl mt-0.5">{getLogIcon(log.type)}</span>
                    <div className="flex-1 min-w-0">
                      <div className={`text-sm ${getLogColor(log.type)}`}>
                        {renderLogMessage(log)}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                        {formatTime(log.timestamp)}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Help Text */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <p className="text-sm text-blue-800 dark:text-blue-300">
            💡 <strong>Tip:</strong> This page shows real-time events as rooms are created and
            destroyed. Leave this page open to monitor your chat server activity.
          </p>
        </div>
      </div>
    </div>
  );
}
