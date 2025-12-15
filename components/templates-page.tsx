'use client';

import { useState, useEffect, useCallback } from 'react';
import { SessionTemplate } from '@/types/jules';
import { getTemplates, deleteTemplate } from '@/lib/templates';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Plus, Trash2, Edit2, Play, LayoutTemplate } from 'lucide-react';
import { TemplateFormDialog } from './template-form-dialog';

interface TemplatesPageProps {
  onStartSession: (template: SessionTemplate) => void;
}

export function TemplatesPage({ onStartSession }: TemplatesPageProps) {
  const [templates, setTemplates] = useState<SessionTemplate[]>([]);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<SessionTemplate | null>(null);

  const loadTemplates = useCallback(() => {
    setTemplates(getTemplates());
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadTemplates();
  }, [loadTemplates]);

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this template?')) {
      deleteTemplate(id);
      loadTemplates();
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-white tracking-tight">Session Templates</h2>
            <p className="text-muted-foreground mt-1">Manage and use your reusable prompt templates.</p>
          </div>
          <Button 
            onClick={() => setIsCreateOpen(true)} 
            className="bg-purple-600 hover:bg-purple-500 text-white"
          >
            <Plus className="h-4 w-4 mr-2" />
            Create Template
          </Button>
        </div>

        {templates.length === 0 ? (
          <div className="text-center py-20 border border-dashed border-white/10 rounded-lg bg-white/5">
            <div className="bg-white/10 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4">
              <LayoutTemplate className="h-6 w-6 text-white/60" />
            </div>
            <h3 className="text-lg font-medium text-white mb-2">No templates yet</h3>
            <p className="text-muted-foreground max-w-sm mx-auto mb-6">
              Create your first template to save common prompts and configurations for quick reuse.
            </p>
            <Button onClick={() => setIsCreateOpen(true)} variant="outline">
              Create Template
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {templates.map((template) => (
              <Card key={template.id} className="bg-zinc-900/50 border-white/10 hover:border-purple-500/30 transition-all group flex flex-col">
                <CardHeader className="flex-1">
                  <div className="flex justify-between items-start gap-2 mb-2">
                    <CardTitle className="text-base font-medium text-white">{template.name}</CardTitle>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-7 w-7 text-muted-foreground hover:text-white" 
                        onClick={() => setEditingTemplate(template)}
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-7 w-7 text-muted-foreground hover:text-destructive" 
                        onClick={() => handleDelete(template.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                  <CardDescription className="line-clamp-3">
                    {template.description}
                  </CardDescription>
                </CardHeader>
                <CardFooter className="pt-0 mt-auto">
                  <Button 
                    className="w-full bg-white/5 hover:bg-white/10 text-white border border-white/10 hover:border-purple-500/50"
                    onClick={() => onStartSession(template)}
                  >
                    <Play className="h-3.5 w-3.5 mr-2 text-purple-400" />
                    Start Session
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        )}
      </div>

      <TemplateFormDialog 
        open={isCreateOpen} 
        onOpenChange={setIsCreateOpen} 
        onSave={loadTemplates}
      />

      <TemplateFormDialog 
        open={!!editingTemplate} 
        onOpenChange={(open) => !open && setEditingTemplate(null)} 
        template={editingTemplate}
        onSave={loadTemplates}
      />
    </div>
  );
}
