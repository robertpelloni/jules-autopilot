'use client';

import { useState, memo } from 'react';
import { Activity, Session } from '@jules/shared';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { formatDistanceToNow, isValid, parseISO } from 'date-fns';
import { Check, Copy, ChevronDown, ChevronRight, Terminal, Loader2 } from 'lucide-react';
import { ActivityContent } from './activity-content';
import { BashOutput } from '@/components/ui/bash-output';
import { BorderGlow } from '@/components/ui/border-glow';

interface ActivityItemProps {
  activity: Activity;
  session: Session;
  isArchived: boolean;
  isNew: boolean;
  onApprovePlan?: () => void;
  isApprovingPlan?: boolean;
}

const formatDate = (dateString: string) => {
  if (!dateString) return 'Unknown date';
  try {
    const date = parseISO(dateString);
    if (!isValid(date)) return 'Unknown date';
    return formatDistanceToNow(date, { addSuffix: true });
  } catch {
    return 'Unknown date';
  }
};

const getActivityIcon = (activity: Activity) => {
  if (activity.role === 'user') {
    return <AvatarFallback className="bg-purple-500 text-white text-[9px] font-bold uppercase tracking-wider">U</AvatarFallback>;
  }
  return <AvatarFallback className="bg-white text-black text-[9px] font-bold uppercase tracking-wider">J</AvatarFallback>;
};

const getActivityTypeColor = (type: Activity['type']) => {
  switch (type) {
    case 'message': return 'bg-blue-500';
    case 'plan': return 'bg-purple-500';
    case 'progress': return 'bg-yellow-500';
    case 'result': return 'bg-green-500';
    case 'error': return 'bg-red-500';
    default: return 'bg-gray-500';
  }
};

export const ActivityItem = memo(function ActivityItem({
  activity,
  session,
  isArchived,
  isNew,
  onApprovePlan,
  isApprovingPlan
}: ActivityItemProps) {
  const [copied, setCopied] = useState(false);
  const [showBash, setShowBash] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(activity.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const showApprove = !isArchived && activity.type === 'plan' && session.status === 'awaiting_approval';

  return (
    <div
      className={`flex gap-2.5 ${activity.role === "user" ? "flex-row-reverse" : ""} ${
        isNew ? "animate-in fade-in slide-in-from-bottom-2 duration-500" : ""
      }`}
    >
      <Avatar className="h-6 w-6 shrink-0 mt-0.5 bg-zinc-900 border border-white/10">
        {getActivityIcon(activity)}
      </Avatar>
      
      {activity.role === "user" ? (
        <Card className="flex-1 min-w-0 border-white/[0.08] bg-purple-950/20 border-purple-500/20">
          <CardContent className="p-3 group/card relative">
            <div className="flex items-center gap-2 mb-2">
              <Badge
                variant="outline"
                className={`text-[9px] h-4 px-1.5 font-mono uppercase tracking-wider ${getActivityTypeColor(activity.type)} border-transparent text-black font-bold`}
              >
                {activity.type}
              </Badge>
              <span className="text-[9px] font-mono text-white/40 tracking-wide">
                {formatDate(activity.createdAt)}
              </span>
              <Button
                variant="ghost"
                size="icon"
                className="h-4 w-4 ml-auto opacity-0 group-hover/card:opacity-100 transition-opacity"
                onClick={handleCopy}
              >
                {copied ? <Check className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3 text-white/40" />}
              </Button>
            </div>
            <div className="text-[11px] leading-relaxed text-white/90 break-words">
              <ActivityContent content={activity.content} metadata={activity.metadata} />
            </div>
          </CardContent>
        </Card>
      ) : (
        <BorderGlow
          className="flex-1 min-w-0"
          containerClassName="bg-zinc-950/50"
        >
          <Card className="border-0 bg-transparent">
            <CardContent className="p-3 group/card relative">
              <div className="flex items-center gap-2 mb-2">
                <Badge
                  variant="outline"
                  className={`text-[9px] h-4 px-1.5 font-mono uppercase tracking-wider ${getActivityTypeColor(activity.type)} border-transparent text-black font-bold`}
                >
                  {activity.type}
                </Badge>
                <span className="text-[9px] font-mono text-white/40 tracking-wide">
                  {formatDate(activity.createdAt)}
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-4 w-4 ml-auto opacity-0 group-hover/card:opacity-100 transition-opacity"
                  onClick={handleCopy}
                >
                  {copied ? <Check className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3 text-white/40" />}
                </Button>
              </div>

              {activity.media && activity.media.data && (
                  <div className="mb-2 rounded overflow-hidden border border-white/10">
                    <img
                      src={`data:${activity.media.mimeType};base64,${activity.media.data}`}
                      alt="Generated Artifact"
                      className="max-w-full h-auto block"
                    />
                  </div>
              )}

              <div className="text-[11px] leading-relaxed text-white/90 break-words">
                <ActivityContent content={activity.content} metadata={activity.metadata} />
              </div>

              {activity.bashOutput && activity.bashOutput.trim().length > 0 && (
                <div className="mt-3 pt-3 border-t border-white/[0.08]">
                  <button
                    onClick={() => setShowBash(!showBash)}
                    className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-wider text-green-400 hover:text-green-300 transition-colors mb-2"
                  >
                    {showBash ? (
                      <ChevronDown className="h-3.5 w-3.5" />
                    ) : (
                      <ChevronRight className="h-3.5 w-3.5" />
                    )}
                    <Terminal className="h-3.5 w-3.5" />
                    <span>Command Output</span>
                  </button>
                  {showBash && (
                    <BashOutput output={activity.bashOutput} />
                  )}
                </div>
              )}

              {showApprove && (
                <div className="mt-3 pt-3 border-t border-white/[0.08]">
                  <Button
                    onClick={onApprovePlan}
                    disabled={isApprovingPlan}
                    size="sm"
                    className="h-7 px-3 text-[9px] font-mono uppercase tracking-widest bg-purple-600 hover:bg-purple-500 text-white border-0"
                  >
                    {isApprovingPlan ? (
                      <>
                        <Loader2 className="mr-1.5 h-3 w-3 animate-spin" />
                        Approving...
                      </>
                    ) : (
                      "Approve Plan"
                    )}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </BorderGlow>
      )}
    </div>
  );
});
