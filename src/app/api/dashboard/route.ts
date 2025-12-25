import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { RoomLog, UserActivity } from '@/lib/models';

export async function GET(request: NextRequest) {
  try {
    await connectDB();

    const searchParams = request.nextUrl.searchParams;
    const range = searchParams.get('range') || 'day';

    const now = new Date();
    let startTime: Date;

    switch (range) {
      case 'hour':
        startTime = new Date(now.getTime() - 60 * 60 * 1000);
        break;
      case 'week':
        startTime = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      default: // day
        startTime = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    }

    // Get all room logs in range
    const roomLogs = await RoomLog.find({
      timestamp: { $gte: startTime },
    }).sort({ timestamp: 1 });

    // Calculate stats
    const totalRooms = await RoomLog.countDocuments({ action: 'created' });
    
    // Note: Active rooms and total users come from Socket.IO real-time updates
    // The dashboard page will receive these via 'room-stats-update' event
    // Default to 0 here, will be updated by Socket.IO on the client
    let activeRooms = 0;
    let totalUsers = 0;

    const todayStart = new Date(now.setHours(0, 0, 0, 0));
    const roomsToday = await RoomLog.countDocuments({
      action: 'created',
      timestamp: { $gte: todayStart },
    });

    const hourStart = new Date(now.getTime() - 60 * 60 * 1000);
    const roomsThisHour = await RoomLog.countDocuments({
      action: 'created',
      timestamp: { $gte: hourStart },
    });

    // Rooms per minute (last 30 minutes)
    const roomsPerMinute: number[] = [];
    for (let i = 29; i >= 0; i--) {
      const minuteStart = new Date(Date.now() - i * 60 * 1000);
      const minuteEnd = new Date(minuteStart.getTime() + 60 * 1000);
      const count = roomLogs.filter(
        log =>
          log.action === 'created' &&
          log.timestamp >= minuteStart &&
          log.timestamp < minuteEnd
      ).length;
      roomsPerMinute.push(count);
    }

    // Rooms per hour (last 24 hours)
    const roomsPerHour: number[] = [];
    for (let i = 23; i >= 0; i--) {
      const hourStart = new Date(Date.now() - i * 60 * 60 * 1000);
      const hourEnd = new Date(hourStart.getTime() + 60 * 60 * 1000);
      const count = roomLogs.filter(
        log =>
          log.action === 'created' &&
          log.timestamp >= hourStart &&
          log.timestamp < hourEnd
      ).length;
      roomsPerHour.push(count);
    }

    // Rooms per day (last 7 days)
    const roomsPerDay: number[] = [];
    for (let i = 6; i >= 0; i--) {
      const dayStart = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);
      const count = roomLogs.filter(
        log =>
          log.action === 'created' &&
          log.timestamp >= dayStart &&
          log.timestamp < dayEnd
      ).length;
      roomsPerDay.push(count);
    }

    // Top rooms
    const roomCounts = new Map<string, number>();
    roomLogs.forEach(log => {
      if (log.action === 'joined' || log.action === 'created') {
        roomCounts.set(log.roomSlug, (roomCounts.get(log.roomSlug) || 0) + 1);
      }
    });
    const topRooms = Array.from(roomCounts.entries())
      .map(([slug, count]) => ({ slug, count }))
      .sort((a, b) => b.count - a.count);

    // User activity count (historical)
    const userActivity = await UserActivity.countDocuments({
      timestamp: { $gte: startTime },
    });

    return NextResponse.json({
      totalRooms,
      activeRooms: activeRooms,
      totalUsers: totalUsers,
      roomsToday,
      roomsThisHour,
      roomsPerMinute,
      roomsPerHour,
      roomsPerDay,
      topRooms,
      userActivity: userActivity,
    });
  } catch (error) {
    console.error('Dashboard API error:', error);
    return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 });
  }
}
