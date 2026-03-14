import { useState, useCallback } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';
import { Spinner } from '@/components/ui/Spinner';
import { AlertTriangle } from 'lucide-react';

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).toString();

export interface PageDimensions {
  pageNumber: number;
  width: number;
  height: number;
  originalWidth: number;
  originalHeight: number;
}

interface PdfViewerProps {
  pdfUrl: string;
  overlayContent?: (pageNumber: number) => React.ReactNode;
  onPageRenderSuccess?: (dimensions: PageDimensions) => void;
}

export default function PdfViewer({
  pdfUrl,
  overlayContent,
  onPageRenderSuccess,
}: PdfViewerProps) {
  const [numPages, setNumPages] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const handleLoadSuccess = useCallback(({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
    setLoading(false);
  }, []);

  const handleLoadError = useCallback((err: Error) => {
    setError(err.message || 'Failed to load PDF');
    setLoading(false);
  }, []);

  const handlePageRenderSuccess = useCallback(
    (page: { pageNumber: number; width: number; height: number; originalWidth: number; originalHeight: number }) => {
      onPageRenderSuccess?.({
        pageNumber: page.pageNumber,
        width: page.width,
        height: page.height,
        originalWidth: page.originalWidth,
        originalHeight: page.originalHeight,
      });
    },
    [onPageRenderSuccess],
  );

  return (
    <div>
      {loading && (
        <div className="flex items-center justify-center gap-2 py-8">
          <Spinner size="md" />
          <span className="text-sm text-text-secondary">Loading PDF…</span>
        </div>
      )}

      {error && (
        <div className="mx-auto max-w-sm rounded-lg border border-danger/30 bg-danger-subtle p-4 text-center">
          <AlertTriangle className="mx-auto mb-2 h-6 w-6 text-danger" />
          <p className="text-sm font-medium text-danger">Failed to load PDF</p>
          <p className="mt-1 text-xs text-text-secondary">{error}</p>
        </div>
      )}

      <Document
        file={pdfUrl}
        onLoadSuccess={handleLoadSuccess}
        onLoadError={handleLoadError}
        loading={null}
      >
        {Array.from({ length: numPages }, (_, i) => i + 1).map((pageNumber) => (
          <div
            key={pageNumber}
            style={{ position: 'relative', display: 'inline-block', marginBottom: '1rem' }}
          >
            <Page
              pageNumber={pageNumber}
              onRenderSuccess={handlePageRenderSuccess}
            />
            {overlayContent && (
              <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', zIndex: 10, pointerEvents: 'none' }}>
                {overlayContent(pageNumber)}
              </div>
            )}
          </div>
        ))}
      </Document>
    </div>
  );
}
