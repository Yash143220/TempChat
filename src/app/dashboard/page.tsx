'use client';

import { useEffect, useState } from 'react';
import { useStore } from '@/store/userStore';
import { getSocket } from '@/lib/supabase';

interface DashboardStats {
  totalRooms: number;
  activeRooms: number;
  totalUsers: number;
  roomsToday: number;
  roomsThisHour: number;
  roomsPerMinute: number[];
  roomsPerHour: number[];
  roomsPerDay: number[];
  topRooms: Array<{ slug: string; count: number }>;
  userActivity: number;
}

export default function DashboardPage() {
  const { theme, toggleTheme } = useStore();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [liveStats, setLiveStats] = useState<{ activeRooms: number; totalUsers: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<'hour' | 'day' | 'week'>('day');
  const [isConnected, setIsConnected] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState('');

  useEffect(() => {
    if (isAuthenticated) {
      fetchStats();
      fetchLiveStats();
      
      const interval = setInterval(() => {
        fetchStats();
        fetchLiveStats();
      }, 30000); // Refresh every 30 seconds
      
      return () => clearInterval(interval);
    }
  }, [timeRange, isAuthenticated]);

  const handleAuth = () => {
    if (password.trim()) {
      // Simple password check (you can enhance this with API call)
      const adminPassword = process.env.NEXT_PUBLIC_ADMIN_PASSWORD || 'admin123';
      if (password === adminPassword) {
        setIsAuthenticated(true);
        setAuthError('');
      } else {
        setAuthError('Invalid password');
      }
    }
  };

  // Socket.IO for real-time updates
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
      console.log('✅ Dashboard connected to Socket.IO');
      // Request current stats
      socket.emit('get-stats');
    });

    socket.on('disconnect', () => {
      setIsConnected(false);
      console.log('❌ Dashboard disconnected from Socket.IO');
    });

    socket.on('connect_error', (error) => {
      console.error('❌ Dashboard connection error:', error.message);
      setIsConnected(false);
    });

    // Listen for real-time stats updates
    socket.on('room-stats-update', (data: { activeRooms: number; totalUsers: number }) => {
      console.log('📊 Dashboard received stats update:', data);
      setLiveStats({ activeRooms: data.activeRooms, totalUsers: data.totalUsers });
    });

    connectSocket();

    return () => {
      socket.off('connect');
      socket.off('disconnect');
      socket.off('connect_error');
      socket.off('room-stats-update');
    };
  }, [isAuthenticated]);

  const fetchStats = async () => {
    try {
      const response = await fetch(`/api/dashboard?range=${timeRange}`);
      const data = await response.json();
      setStats(data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching stats:', error);
      setLoading(false);
    }
  };

  const fetchLiveStats = async () => {
    // Initial stats will be 0, then updated via Socket.IO 'room-stats-update' events
    setLiveStats({ activeRooms: 0, totalUsers: 0 });
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-8 max-w-md w-full mx-4">
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              🔐 Dashboard Access
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

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <p className="text-gray-600 dark:text-gray-400">No data available</p>
      </div>
    );
  }

  const maxRoomsPerMin = Math.max(...stats.roomsPerMinute, 1);
  const maxRoomsPerHour = Math.max(...stats.roomsPerHour, 1);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-purple-50 to-pink-50 dark:from-gray-900 dark:via-purple-900 dark:to-gray-900 transition-colors duration-300">
      {/* Header */}
      <header className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm border-b border-gray-200 dark:border-gray-700 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <a href="/" className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-pink-600">
              Chat Dashboard
            </a>
            <span className="px-3 py-1 bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300 text-xs font-semibold rounded-full">
              LIVE
            </span>
          </div>
          
          <div className="flex items-center gap-4">
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value as any)}
              className="px-4 py-2 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white border-none focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="hour">Last Hour</option>
              <option value="day">Last 24 Hours</option>
              <option value="week">Last 7 Days</option>
            </select>
            
            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              {theme === 'light' ? '🌙' : '☀️'}
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Real-Time Stats Banner */}
        {liveStats && (
          <div className="mb-6 p-4 bg-gradient-to-r from-green-500 to-emerald-500 rounded-xl text-white shadow-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-white animate-pulse' : 'bg-red-300'}`}></div>
                  <span className="font-semibold">
                    {isConnected ? 'LIVE' : 'DISCONNECTED'}
                  </span>
                </div>
                <div className="h-6 w-px bg-white/30"></div>
                <div>
                  <span className="font-bold text-2xl">{liveStats.activeRooms}</span>
                  <span className="ml-2 text-sm opacity-90">Active Rooms</span>
                </div>
                <div className="h-6 w-px bg-white/30"></div>
                <div>
                  <span className="font-bold text-2xl">{liveStats.totalUsers}</span>
                  <span className="ml-2 text-sm opacity-90">Online Users</span>
                </div>
              </div>
              <a
                href="/logs"
                className="px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors flex items-center gap-2"
              >
                📡 View Real-Time Logs
              </a>
            </div>
          </div>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatCard
            title="Total Rooms Created"
            value={stats.totalRooms}
            icon="🏠"
            color="from-blue-500 to-cyan-500"
          />
          <StatCard
            title="Active Rooms Now"
            value={liveStats?.activeRooms ?? stats.activeRooms}
            icon="⚡"
            color="from-purple-500 to-pink-500"
            pulse
          />
          <StatCard
            title="Rooms Today"
            value={stats.roomsToday}
            icon="📅"
            color="from-green-500 to-emerald-500"
          />
          <StatCard
            title="Rooms This Hour"
            value={stats.roomsThisHour}
            icon="⏱️"
            color="from-orange-500 to-red-500"
          />
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Rooms Per Minute */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Rooms Created (Per Minute)
            </h3>
            <div className="flex items-end justify-between h-48 gap-1">
              {stats.roomsPerMinute.slice(-30).map((count, i) => (
                <div key={i} className="flex-1 flex flex-col justify-end">
                  <div
                    className="bg-gradient-to-t from-purple-600 to-pink-500 rounded-t transition-all duration-500 hover:scale-105"
                    style={{ height: `${(count / maxRoomsPerMin) * 100}%`, minHeight: count > 0 ? '4px' : '0' }}
                    title={`${count} rooms`}
                  />
                </div>
              ))}
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-2 text-center">
              Last 30 minutes
            </p>
          </div>

          {/* Rooms Per Hour */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Rooms Created (Per Hour)
            </h3>
            <div className="flex items-end justify-between h-48 gap-1">
              {stats.roomsPerHour.slice(-24).map((count, i) => (
                <div key={i} className="flex-1 flex flex-col justify-end">
                  <div
                    className="bg-gradient-to-t from-blue-600 to-cyan-500 rounded-t transition-all duration-500 hover:scale-105"
                    style={{ height: `${(count / maxRoomsPerHour) * 100}%`, minHeight: count > 0 ? '4px' : '0' }}
                    title={`${count} rooms`}
                  />
                </div>
              ))}
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-2 text-center">
              Last 24 hours
            </p>
          </div>
        </div>

        {/* Top Rooms & Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Top Rooms */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              🔥 Most Popular Rooms
            </h3>
            <div className="space-y-3">
              {stats.topRooms.slice(0, 10).map((room, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl font-bold text-purple-600 dark:text-purple-400 w-8">
                      {i + 1}
                    </span>
                    <span className="font-medium text-gray-900 dark:text-white">
                      #{room.slug}
                    </span>
                  </div>
                  <span className="px-3 py-1 bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300 text-sm font-semibold rounded-full">
                    {room.count} visits
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Live Activity */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              📊 System Statistics
            </h3>
            <div className="space-y-4">
              <StatRow label="Total User Sessions" value={stats.totalUsers} />
              <StatRow label="Active Rooms" value={stats.activeRooms} />
              <StatRow label="Rooms Created Today" value={stats.roomsToday} />
              <StatRow label="Peak Activity" value={Math.max(...stats.roomsPerHour) + ' rooms/hour'} />
              <StatRow label="Avg Rooms/Hour" value={Math.round(stats.roomsPerHour.reduce((a, b) => a + b, 0) / stats.roomsPerHour.length) + ' rooms'} />
              
              <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Data Retention</span>
                  <span className="text-sm font-semibold text-purple-600 dark:text-purple-400">15 Days</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Note */}
        <div className="mt-8 text-center">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            📝 Analytics data is automatically cleaned up after 15 days
          </p>
        </div>
      </div>
    </div>
  );
}

function StatCard({ title, value, icon, color, pulse = false }: any) {
  return (
    <div className={`bg-gradient-to-br ${color} rounded-2xl shadow-lg p-6 text-white transform hover:scale-105 transition-transform duration-300`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-3xl">{icon}</span>
        {pulse && <div className="w-2 h-2 bg-white rounded-full animate-pulse" />}
      </div>
      <h3 className="text-sm opacity-90 mb-1">{title}</h3>
      <p className="text-4xl font-bold">{value.toLocaleString()}</p>
    </div>
  );
}

function StatRow({ label, value }: any) {
  return (
    <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
      <span className="text-sm text-gray-600 dark:text-gray-400">{label}</span>
      <span className="text-lg font-semibold text-gray-900 dark:text-white">{value}</span>
    </div>
  );
}
