import { signIn } from '@/auth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-black p-4">
      <Card className="w-full max-w-sm bg-zinc-950 border-zinc-800">
        <CardHeader>
          <CardTitle>Jules UI</CardTitle>
          <CardDescription>Sign in to your command center</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4 text-center">
            <p className="text-sm text-zinc-400">
              Welcome to the Jules Autopilot UI. Please authenticate using your version control provider to begin.
            </p>
            <form
              action={async () => {
                'use server';
                await signIn('github', { redirectTo: '/' });
              }}
            >
              <Button variant="outline" className="w-full bg-black border-zinc-800 hover:bg-zinc-900">
                Sign in with GitHub
              </Button>
            </form>
            <form
              action={async () => {
                'use server';
                await signIn('credentials', { username: 'admin', password: 'admin', redirectTo: '/' });
              }}
            >
              <Button variant="default" className="w-full mt-2 bg-purple-600 hover:bg-purple-700 text-white">
                Sign in as Local Admin
              </Button>
            </form>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
