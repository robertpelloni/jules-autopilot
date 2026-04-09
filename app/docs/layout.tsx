import { DocsSidebar } from '@/components/docs-sidebar';

export default function DocsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen overflow-hidden bg-black text-white">
      <DocsSidebar />
      <div className="flex-1 overflow-auto">
        <div className="max-w-4xl mx-auto p-8">
          {children}
        </div>
      </div>
    </div>
  );
}
