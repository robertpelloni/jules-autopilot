'use client';

import { useState } from 'react';
import { useCloudDevStore } from '@/lib/stores/cloud-dev';
import { CLOUD_DEV_PROVIDERS, type CloudDevProviderId, type UnifiedSession } from '@/types/cloud-dev';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

import { Textarea } from '@/components/ui/textarea';
import { Loader2, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';

interface TransferSessionDialogProps {
  session: UnifiedSession;
  trigger?: React.ReactNode;
}

export function TransferSessionDialog({ session, trigger }: TransferSessionDialogProps) {
  const [open, setOpen] = useState(false);
  const [targetProviderId, setTargetProviderId] = useState<CloudDevProviderId | ''>('');
  const [continueState, setContinueState] = useState(true);
  const [newPrompt, setNewPrompt] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { getConfiguredProviders, initiateTransfer } = useCloudDevStore();
  const configuredProviders = getConfiguredProviders();
  const availableTargets = configuredProviders.filter(id => id !== session.providerId);

  const handleTransfer = async () => {
    if (!targetProviderId) return;

    setIsSubmitting(true);
    try {
      await initiateTransfer(session.id, targetProviderId, {
        continueFromLastState: continueState,
        newPrompt: newPrompt || undefined,
      });
      toast.success('Session transfer initiated');
      setOpen(false);
    } catch (error) {
      toast.error('Failed to initiate transfer');
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="ghost" size="icon" title="Transfer Session">
            <ArrowRight className="h-4 w-4" />
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Transfer Session</DialogTitle>
          <DialogDescription>
            Migrate this session to another provider. Context and files will be preserved.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label>Source</Label>
            <div className="text-sm font-medium flex items-center gap-2">
              <span className="capitalize">{session.providerId}</span>
              <span className="text-muted-foreground">/</span>
              <span>{session.title || 'Untitled'}</span>
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="target-provider">Target Provider</Label>
            <Select
              value={targetProviderId}
              onValueChange={(val) => setTargetProviderId(val as CloudDevProviderId)}
            >
              <SelectTrigger id="target-provider">
                <SelectValue placeholder="Select a provider" />
              </SelectTrigger>
              <SelectContent>
                {availableTargets.map((id) => (
                  <SelectItem key={id} value={id}>
                    {CLOUD_DEV_PROVIDERS[id].name}
                  </SelectItem>
                ))}
                {availableTargets.length === 0 && (
                  <SelectItem value="none" disabled>
                    No other providers configured
                  </SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="continue-state"
              checked={continueState}
              onChange={(e) => setContinueState(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-purple-600 focus:ring-purple-600"
            />
            <Label htmlFor="continue-state" className="text-sm font-normal">
              Continue from last state
            </Label>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="new-prompt">Additional Instructions (Optional)</Label>
            <Textarea
              id="new-prompt"
              placeholder="e.g., Use this context to implement the next feature..."
              value={newPrompt}
              onChange={(e) => setNewPrompt(e.target.value)}
              className="resize-none"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleTransfer} disabled={!targetProviderId || isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Transfer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
