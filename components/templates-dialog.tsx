'use client';

import { useState, useEffect, useCallback } from 'react';
import { SessionTemplate } from '@/types/jules';
import { getTemplates, saveTemplate, deleteTemplate } from '@/lib/templates';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Plus, Trash2, Edit2, Check, ArrowLeft } from 'lucide-react';

interface TemplatesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (template: SessionTemplate) => void;
  initialCreateValues?: Partial<Omit<SessionTemplate, 'id' | 'createdAt' | 'updatedAt'>>;
}

export function TemplatesDialog({ open, onOpenChange, onSelect, initialCreateValues }: TemplatesDialogProps) {
  const [templates, setTemplates] = useState<SessionTemplate[]>([]);
  const [view, setView] = useState<'list' | 'edit' | 'create'>('list');
  const [editingTemplate, setEditingTemplate] = useState<SessionTemplate | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    prompt: '',
    title: ''
  });

  const loadTemplates = useCallback(() => {
    setTemplates(getTemplates());
  }, []);

  useEffect(() => {
    if (open) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      loadTemplates();
      if (initialCreateValues) {
        setFormData({
          name: initialCreateValues.name || '',
          description: initialCreateValues.description || '',
          prompt: initialCreateValues.prompt || '',
          title: initialCreateValues.title || ''
        });
        setView('create');
      } else {
        setView('list');
      }
    }
  }, [open, initialCreateValues, loadTemplates]);

  const handleCreate = () => {
    setFormData({ name: '', description: '', prompt: '', title: '' });
    setView('create');
  };

  const handleEdit = (template: SessionTemplate) => {
    setEditingTemplate(template);
    setFormData({
      name: template.name,
      description: template.description,
      prompt: template.prompt,
      title: template.title || ''
    });
    setView('edit');
  };

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this template?')) {
      deleteTemplate(id);
      loadTemplates();
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    try {
      saveTemplate({
        id: view === 'edit' ? editingTemplate?.id : undefined,
        ...formData
      });
      loadTemplates();
      setView('list');
    } catch (error) {
      console.error('Failed to save template:', error);
    }
  };

  const handleSelect = (template: SessionTemplate) => {
    onSelect(template);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] h-[80vh] flex flex-col p-0 gap-0 border-purple-500/20 shadow-[0_0_15px_rgba(168,85,247,0.15)]">
        <DialogHeader className="p-6 pb-4 border-b border-white/10 flex-none">
          <DialogTitle className="text-xl flex items-center gap-2">
            {view !== 'list' && (
              <Button variant="ghost" size="icon" className="h-6 w-6 mr-2" onClick={() => setView('list')}>
                <ArrowLeft className="h-4 w-4" />
              </Button>
            )}
            {view === 'list' ? 'Session Templates' : view === 'create' ? 'New Template' : 'Edit Template'}
          </DialogTitle>
          <DialogDescription>
            {view === 'list' 
              ? 'Select a template to start a new session quickly.' 
              : 'Configure the template details below.'}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden">
          {view === 'list' ? (
            <ScrollArea className="h-full">
              <div className="p-6 space-y-4">
                {templates.length === 0 ? (
                  <div className="text-center py-10 text-muted-foreground">
                    <p>No templates found.</p>
                    <Button onClick={handleCreate} className="mt-4 bg-purple-600 hover:bg-purple-500 text-white">
                      Create your first template
                    </Button>
                  </div>
                ) : (
                  <div className="grid gap-4">
                    <Button 
                      onClick={handleCreate} 
                      className="w-full justify-start gap-2 bg-white/5 hover:bg-white/10 border-dashed border border-white/20 h-12 text-muted-foreground hover:text-white"
                      variant="ghost"
                    >
                      <Plus className="h-4 w-4" /> Create New Template
                    </Button>
                    {templates.map((template) => (
                      <Card key={template.id} className="bg-black/40 border-white/10 hover:border-purple-500/50 transition-colors group">
                        <CardHeader className="p-4 pb-2">
                          <div className="flex justify-between items-start gap-2">
                            <div>
                              <CardTitle className="text-sm font-medium text-white">{template.name}</CardTitle>
                              {template.title && (
                                <p className="text-xs text-muted-foreground mt-0.5">Default Title: {template.title}</p>
                              )}
                            </div>
                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-white" onClick={() => handleEdit(template)}>
                                <Edit2 className="h-3 w-3" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive hover:text-destructive/80" onClick={() => handleDelete(template.id)}>
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                          <CardDescription className="text-xs line-clamp-2 mt-1">
                            {template.description}
                          </CardDescription>
                        </CardHeader>
                        <CardFooter className="p-4 pt-2">
                          <Button 
                            className="w-full h-7 text-xs bg-purple-600/20 hover:bg-purple-600/40 text-purple-300 border border-purple-500/30"
                            onClick={() => handleSelect(template)}
                          >
                            <Check className="h-3 w-3 mr-1.5" /> Use Template
                          </Button>
                        </CardFooter>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            </ScrollArea>
          ) : (
            <ScrollArea className="h-full">
              <form id="template-form" onSubmit={handleSave} className="p-6 space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="name" className="text-xs font-semibold">Template Name</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="e.g., React Component Refactor"
                    className="h-9 text-xs"
                    required
                  />
                </div>
                
                <div className="space-y-1.5">
                  <Label htmlFor="description" className="text-xs font-semibold">Description</Label>
                  <Input
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Brief description of what this template does"
                    className="h-9 text-xs"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="title" className="text-xs font-semibold">Default Session Title (Optional)</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="e.g., Refactor Component"
                    className="h-9 text-xs"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="prompt" className="text-xs font-semibold">Prompt Instructions</Label>
                  <Textarea
                    id="prompt"
                    value={formData.prompt}
                    onChange={(e) => setFormData(prev => ({ ...prev, prompt: e.target.value }))}
                    placeholder="Enter the detailed instructions for Jules..."
                    className="min-h-[200px] text-xs font-mono"
                    required
                  />
                </div>
              </form>
            </ScrollArea>
          )}
        </div>

        {view !== 'list' && (
          <div className="p-4 border-t border-white/10 bg-black/20 flex justify-end gap-2 flex-none">
            <Button variant="ghost" onClick={() => setView('list')} className="h-8 text-xs">
              Cancel
            </Button>
            <Button type="submit" form="template-form" className="h-8 text-xs bg-purple-600 hover:bg-purple-500 text-white">
              Save Template
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
