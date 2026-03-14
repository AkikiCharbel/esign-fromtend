import type { ReactNode } from 'react';

interface PageContentProps {
  children: ReactNode;
}

export default function PageContent({ children }: PageContentProps) {
  return (
    <div className="mx-auto w-full max-w-7xl p-6">
      {children}
    </div>
  );
}
