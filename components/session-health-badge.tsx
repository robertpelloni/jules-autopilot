import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { calculateSessionHealth, HealthStatus } from '@/lib/health';
import { Session } from '@jules/shared';
import { AlertCircle, CheckCircle2, Clock } from 'lucide-react';

interface SessionHealthBadgeProps {
  session: Session;
  compact?: boolean;
}

export function SessionHealthBadge({ session, compact }: SessionHealthBadgeProps) {
  const health = calculateSessionHealth(session);

  if (health.status === 'inactive') return null;

  const config: Record<HealthStatus, { color: string; icon: React.ElementType; label: string }> = {
    healthy: { color: 'bg-green-500/10 text-green-500 hover:bg-green-500/20', icon: CheckCircle2, label: 'Healthy' },
    stalled: { color: 'bg-yellow-500/10 text-yellow-500 hover:bg-yellow-500/20', icon: Clock, label: 'Stalled' },
    critical: { color: 'bg-red-500/10 text-red-500 hover:bg-red-500/20', icon: AlertCircle, label: 'Critical' },
    inactive: { color: '', icon: () => null, label: '' },
  };

  const { color, icon: Icon, label } = config[health.status];

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Badge variant="outline" className={`${color} border-0 gap-1 h-5 px-1.5`}>
          <Icon className="h-3 w-3" />
          {!compact && <span className="hidden sm:inline text-[10px] font-mono uppercase tracking-wider">{label}</span>}
        </Badge>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="text-[10px]">
        <p>Last active {health.minutesSinceActivity}m ago</p>
      </TooltipContent>
    </Tooltip>
  );
}
