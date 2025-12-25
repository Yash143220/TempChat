import { NextResponse } from 'next/server';

// This endpoint returns real-time stats
// Note: In development, this will show 0 because it can't access server.js in-memory storage
// Use Socket.IO for real-time updates instead
export async function GET() {
  return NextResponse.json({
    activeRooms: 0,
    totalUsers: 0,
    rooms: [],
    timestamp: new Date().toISOString(),
    note: 'Use Socket.IO events for real-time stats. This endpoint is for health checks only.',
  });
}
