import { signIn } from '@/lib/auth/config';
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
        <CardContent className="space-y-4">
          <form
            action={async (formData) => {
              'use server';
              await signIn('credentials', formData);
            }}
            className="space-y-4"
          >
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                name="password"
                type="password"
                placeholder="Enter password..."
                className="bg-black border-zinc-800"
              />
            </div>
            <Button type="submit" className="w-full">
              Sign In
            </Button>
          </form>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-zinc-800" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-zinc-950 px-2 text-muted-foreground">
                Or
              </span>
            </div>
          </div>

          <form
            action={async () => {
              'use server';
              await signIn('github');
            }}
          >
            <Button variant="outline" className="w-full bg-black border-zinc-800 hover:bg-zinc-900">
              Sign in with GitHub
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
