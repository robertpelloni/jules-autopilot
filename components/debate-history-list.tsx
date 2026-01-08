'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Loader2, MessageSquare, Calendar } from 'lucide-react';
import { format } from 'date-fns';
import { DebateResult } from '@/lib/orchestration/types';

interface StoredDebate {
    id: string;
    topic: string;
    summary: string | null;
    createdAt: string;
}

export function DebateHistoryList() {
    const [debates, setDebates] = useState<StoredDebate[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchDebates = async () => {
            try {
                const res = await fetch('/api/debate/history');
                if (res.ok) {
                    const data = await res.json();
                    setDebates(data);
                }
            } catch (error) {
                console.error('Failed to fetch debate history:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchDebates();
    }, []);

    if (loading) {
        return (
            <div className="flex justify-center p-8">
                <Loader2 className="h-8 w-8 animate-spin text-zinc-500" />
            </div>
        );
    }

    if (debates.length === 0) {
        return (
            <Card className="bg-zinc-900 border-zinc-800">
                <CardContent className="flex flex-col items-center justify-center p-8 text-zinc-500">
                    <MessageSquare className="h-12 w-12 mb-4 opacity-50" />
                    <p>No debates recorded yet.</p>
                </CardContent>
            </Card>
        );
    }

    return (
        <ScrollArea className="h-[600px] w-full pr-4">
            <div className="space-y-4">
                {debates.map((debate) => (
                    <Card key={debate.id} className="bg-zinc-900 border-zinc-800 hover:border-zinc-700 transition-colors">
                        <CardHeader className="pb-2">
                            <div className="flex justify-between items-start">
                                <CardTitle className="text-lg font-medium text-zinc-100">
                                    {debate.topic}
                                </CardTitle>
                                <Badge variant="outline" className="text-zinc-400 border-zinc-700">
                                    <Calendar className="h-3 w-3 mr-1" />
                                    {format(new Date(debate.createdAt), 'MMM d, h:mm a')}
                                </Badge>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <CardDescription className="text-zinc-400 line-clamp-3">
                                {debate.summary || "No summary available."}
                            </CardDescription>
                        </CardContent>
                    </Card>
                ))}
            </div>
        </ScrollArea>
    );
}
