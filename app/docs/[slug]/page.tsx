import { getDocContent, getAllDocs } from '@/lib/docs';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { notFound } from 'next/navigation';

export async function generateStaticParams() {
  const docs = getAllDocs();
  const slugs = docs.flatMap(section => section.items.map(item => ({ slug: item.slug })));
  return slugs;
}

export default async function DocPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const doc = getDocContent(slug);

  if (!doc) {
    notFound();
  }

  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      <div className="mb-8 border-b border-white/10 pb-4">
        <h1 className="text-3xl font-bold tracking-tight text-white mb-2">{doc.title}</h1>
        {doc.description && (
          <p className="text-lg text-muted-foreground">{doc.description}</p>
        )}
      </div>

      <article className="prose prose-invert prose-blue max-w-none
        prose-headings:scroll-mt-20 prose-headings:font-semibold prose-headings:tracking-tight
        prose-h1:text-3xl prose-h2:text-2xl prose-h3:text-xl
        prose-pre:bg-zinc-950 prose-pre:border prose-pre:border-white/10
        prose-code:text-purple-400 prose-code:bg-white/5 prose-code:px-1 prose-code:py-0.5 prose-code:rounded-sm prose-code:before:content-none prose-code:after:content-none
        prose-a:text-blue-400 prose-a:no-underline hover:prose-a:underline
        prose-img:rounded-lg prose-img:border prose-img:border-white/10">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>
          {doc.content}
        </ReactMarkdown>
      </article>
    </div>
  );
}
