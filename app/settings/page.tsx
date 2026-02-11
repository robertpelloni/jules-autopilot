import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { ContextHelp } from "@/components/context-help";

export default function SettingsPage() {
  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between pb-4 border-b border-white/10">
        <div>
           <h1 className="text-3xl font-bold tracking-tight text-white flex items-center gap-3">
             General Settings
             <ContextHelp topic="default" />
           </h1>
           <p className="text-white/40 mt-1">Configure global application behavior.</p>
        </div>
      </div>

      <Card className="bg-zinc-950 border-white/10">
        <CardHeader>
          <CardTitle>Session Defaults</CardTitle>
          <CardDescription>Configure default behavior for new sessions.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label className="text-white/80 font-medium">Auto-Archive Inactive Sessions</Label>
              <p className="text-xs text-white/40">Automatically archive sessions after 30 days of inactivity to keep your workspace clean.</p>
            </div>
            <Switch defaultChecked className="data-[state=checked]:bg-purple-600" />
          </div>
          <div className="flex items-center justify-between">
             <div className="space-y-1">
              <Label className="text-white/80 font-medium">Enable Council Debate by Default</Label>
              <p className="text-xs text-white/40">Start new sessions with Council Debate mode enabled for enhanced decision making.</p>
            </div>
            <Switch className="data-[state=checked]:bg-purple-600" />
          </div>
          <div className="flex items-center justify-between">
             <div className="space-y-1">
              <Label className="text-white/80 font-medium">Show Code Diffs on Start</Label>
              <p className="text-xs text-white/40">Automatically expand the code diff sidebar when entering a session.</p>
            </div>
            <Switch defaultChecked className="data-[state=checked]:bg-purple-600" />
          </div>
        </CardContent>
      </Card>

      <Card className="bg-zinc-950 border-white/10">
        <CardHeader>
          <CardTitle>Data & Privacy</CardTitle>
          <CardDescription>Manage local data and analytics sharing.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label className="text-white/80 font-medium">Share Anonymous Usage Data</Label>
              <p className="text-xs text-white/40">Help improve Jules by sharing anonymous usage statistics and error reports.</p>
            </div>
            <Switch defaultChecked className="data-[state=checked]:bg-purple-600" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
