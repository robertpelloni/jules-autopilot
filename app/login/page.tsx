'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { toast } from 'sonner';
import { Loader2, Key } from 'lucide-react';

export default function LoginPage() {
  const [apiKey, setApiKey] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!apiKey.trim()) return;

    setLoading(true);

    try {
        const res = await fetch('/api/auth/login', {
            method: 'POST',
            body: JSON.stringify({ apiKey })
        });

        if (res.ok) {
            toast.success('Logged in successfully');
            window.location.href = '/';
        } else {
            const data = await res.json();
            toast.error(data.error || 'Login failed');
        }
    } catch (error) {
        toast.error('An error occurred during login');
        console.error(error);
    } finally {
        setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-black p-4">
      <Card className="w-full max-w-md border-white/10 bg-zinc-950">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <Key className="h-6 w-6 text-purple-500" />
            Jules UI
          </CardTitle>
          <CardDescription className="text-white/60">
            Enter your Jules API key to access the workspace.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Input
                type="password"
                placeholder="Google Jules API Key"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                className="bg-zinc-900 border-white/10 text-white placeholder:text-white/20"
                disabled={loading}
              />
            </div>
            <Button
                type="submit"
                className="w-full bg-purple-600 hover:bg-purple-500 text-white"
                disabled={loading || !apiKey}
            >
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {loading ? 'Authenticating...' : 'Enter Workspace'}
            </Button>
            <p className="text-xs text-center text-white/30 pt-4">
              Your key is encrypted and stored in a secure HTTP-only cookie.
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
