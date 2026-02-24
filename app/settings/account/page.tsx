'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useJules } from "@/lib/jules/provider";
import { Check, Eye, EyeOff, Save, Shield, AlertTriangle } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ContextHelp } from "@/components/context-help";

export default function AccountSettingsPage() {
  const { apiKey, setApiKey, clearApiKey } = useJules();
  const [keyInput, setKeyInput] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [saved, setSaved] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const hasConfiguredKey = apiKey !== null;

  const handleSave = async () => {
    if (!keyInput.trim()) {
      return;
    }
    setIsSaving(true);
    await setApiKey(keyInput.trim());
    setKeyInput('');
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
    setIsSaving(false);
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between pb-4 border-b border-white/10">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white flex items-center gap-3">
            Account Settings
            <ContextHelp topic="default" />
          </h1>
          <p className="text-white/40 mt-1">Manage your identity and authentication.</p>
        </div>
      </div>

      <Card className="bg-zinc-950 border-white/10">
        <CardHeader>
          <CardTitle>Profile</CardTitle>
          <CardDescription>Manage your public profile and avatar.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col md:flex-row items-start md:items-center gap-8">
          <Avatar className="h-24 w-24 border-2 border-white/10 bg-zinc-900">
            <AvatarFallback className="bg-purple-600/20 text-purple-400 text-3xl font-bold">JD</AvatarFallback>
          </Avatar>
          <div className="space-y-4 flex-1 w-full max-w-sm">
            <div className="space-y-2">
              <Label className="text-white/80">Display Name</Label>
              <Input defaultValue="Jane Doe" className="bg-zinc-900 border-white/10 text-white" />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" className="border-white/10 hover:bg-white/5">Upload New</Button>
              <Button variant="outline" size="sm" className="border-red-500/20 text-red-400 hover:bg-red-500/10">Remove</Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-zinc-950 border-white/10">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-purple-400" />
            Session Authentication
          </CardTitle>
          <CardDescription>Manage your Jules Platform authentication key.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label className="text-white/80">Jules API Key</Label>
            <div className="relative max-w-xl">
              <Input
                type={showKey ? "text" : "password"}
                value={keyInput}
                onChange={(e) => setKeyInput(e.target.value)}
                className="bg-zinc-900 border-white/10 pr-10 font-mono text-sm"
                placeholder={hasConfiguredKey ? "A Jules API key is already configured. Enter a new key to replace it." : "Enter your Jules API Key"}
              />
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-0 top-0 h-full w-10 text-white/40 hover:text-white"
                onClick={() => setShowKey(!showKey)}
              >
                {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>
            <p className="text-xs text-white/40 flex items-center gap-1.5 mt-2">
              <AlertTriangle className="h-3 w-3 text-yellow-500" />
              API keys are submitted to the auth API and stored in a server-side session (HTTP-only cookie). They are not persisted in this page&apos;s local storage.
            </p>
          </div>
        </CardContent>
        <CardFooter className="bg-white/5 border-t border-white/10 flex justify-end gap-2 p-4">
          {hasConfiguredKey && (
            <Button
              variant="outline"
              className="border-red-500/30 text-red-300 hover:bg-red-500/10"
              onClick={clearApiKey}
            >
              Clear Session
            </Button>
          )}
          <Button onClick={handleSave} disabled={saved || isSaving || !keyInput.trim()} className="bg-purple-600 hover:bg-purple-500 text-white transition-all w-36">
            {saved ? (
              <>
                <Check className="h-4 w-4 mr-2" />
                Saved
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                {isSaving ? 'Saving...' : 'Save Changes'}
              </>
            )}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
