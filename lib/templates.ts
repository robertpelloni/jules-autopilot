import { SessionTemplate } from '@/types/jules';

const TEMPLATES_KEY = 'jules-session-templates';

export function getTemplates(): SessionTemplate[] {
  if (typeof window === 'undefined') return [];

  try {
    const stored = localStorage.getItem(TEMPLATES_KEY);
    if (!stored) return [];
    
    // Sort by most recently updated
    const templates: SessionTemplate[] = JSON.parse(stored);
    return templates.sort((a, b) => 
      new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );
  } catch (error) {
    console.error('Failed to parse templates from localStorage:', error);
    return [];
  }
}

export function saveTemplate(template: Omit<SessionTemplate, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }): SessionTemplate {
  if (typeof window === 'undefined') {
    throw new Error('Cannot save template on server side');
  }

  const templates = getTemplates();
  const now = new Date().toISOString();
  
  let savedTemplate: SessionTemplate;

  if (template.id) {
    // Update existing
    const index = templates.findIndex(t => t.id === template.id);
    if (index === -1) throw new Error('Template not found');
    
    savedTemplate = {
      ...templates[index],
      ...template,
      id: template.id, // Ensure ID is preserved
      updatedAt: now
    };
    templates[index] = savedTemplate;
  } else {
    // Create new
    savedTemplate = {
      ...template,
      id: crypto.randomUUID(),
      createdAt: now,
      updatedAt: now
    };
    templates.push(savedTemplate);
  }

  try {
    localStorage.setItem(TEMPLATES_KEY, JSON.stringify(templates));
    return savedTemplate;
  } catch (error) {
    console.error('Failed to save template to localStorage:', error);
    throw error;
  }
}

export function deleteTemplate(id: string): void {
  if (typeof window === 'undefined') return;

  const templates = getTemplates();
  const filtered = templates.filter(t => t.id !== id);
  
  try {
    localStorage.setItem(TEMPLATES_KEY, JSON.stringify(filtered));
  } catch (error) {
    console.error('Failed to delete template from localStorage:', error);
  }
}

export function getTemplate(id: string): SessionTemplate | undefined {
  const templates = getTemplates();
  return templates.find(t => t.id === id);
}
