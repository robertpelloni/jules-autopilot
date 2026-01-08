
import { Metadata } from 'next';
import { DebateHistoryList } from '@/components/debate-history-list';
import { Separator } from '@/components/ui/separator';

export const metadata: Metadata = {
    title: 'Debate History',
    description: 'View past multi-agent debates.',
};

export default function DebatesPage() {
    return (
        <div className="h-full flex-1 flex-col space-y-8 p-8 md:flex">
            <div className="flex items-center justify-between space-y-2">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight">Debate History</h2>
                    <p className="text-muted-foreground">
                        Review past debates and agent interactions.
                    </p>
                </div>
            </div>
            <Separator />
            <div className="max-w-4xl">
                <DebateHistoryList />
            </div>
        </div>
    );
}
