import { Session } from '@jules/shared';

export type HealthStatus = 'healthy' | 'stalled' | 'critical' | 'inactive';

export interface SessionHealth {
  status: HealthStatus;
  lastActivityTime: number;
  minutesSinceActivity: number;
}

export const STALLED_THRESHOLD_MINUTES = 5;
export const CRITICAL_THRESHOLD_MINUTES = 30;

export function calculateSessionHealth(session: Session): SessionHealth {
  if (session.status === 'completed' || session.status === 'failed' || session.status === 'paused') {
    return {
      status: 'inactive',
      lastActivityTime: 0,
      minutesSinceActivity: 0,
    };
  }

  const lastActivity = session.lastActivityAt || session.updatedAt;
  const lastActivityTime = new Date(lastActivity).getTime();
  const now = Date.now();
  const diffMs = now - lastActivityTime;
  const minutesSinceActivity = Math.floor(diffMs / (1000 * 60));

  let status: HealthStatus = 'healthy';

  if (minutesSinceActivity >= CRITICAL_THRESHOLD_MINUTES) {
    status = 'critical';
  } else if (minutesSinceActivity >= STALLED_THRESHOLD_MINUTES) {
    status = 'stalled';
  }

  return {
    status,
    lastActivityTime,
    minutesSinceActivity,
  };
}
