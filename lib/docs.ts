import fs from 'fs';
import path from 'path';
import { DOCS_CONFIG, DocItem } from './docs-config';


export function getDocContent(slug: string): { content: string; title: string; description?: string } | null {
  // Flatten the config to find the item
  let foundItem: DocItem | undefined;

  for (const section of DOCS_CONFIG) {
    const item = section.items.find(i => i.slug === slug);
    if (item) {
      foundItem = item;
      break;
    }
  }

  if (!foundItem) return null;

  try {
    const fullPath = path.join(process.cwd(), foundItem.filePath);
    if (!fs.existsSync(fullPath)) {
      console.warn(`Doc file not found: ${fullPath}`);
      return {
        content: `File not found: ${foundItem.filePath}`,
        title: foundItem.title,
        description: foundItem.description
      };
    }
    const content = fs.readFileSync(fullPath, 'utf-8');
    return {
      content,
      title: foundItem.title,
      description: foundItem.description
    };
  } catch (error) {
    console.error(`Error reading doc file: ${slug}`, error);
    return null;
  }
}

export function getAllDocs() {
  return DOCS_CONFIG;
}
