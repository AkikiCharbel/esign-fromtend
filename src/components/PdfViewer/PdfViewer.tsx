import { useState, useCallback } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/esm/Page/AnnotationLayer.css';
import 'react-pdf/dist/esm/Page/TextLayer.css';

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
        <div style={{ padding: '2rem', textAlign: 'center' }}>
          Loading PDF…
        </div>
      )}

      {error && (
        <div style={{ padding: '2rem', textAlign: 'center', color: 'red' }}>
          Error: {error}
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
              <div
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: '100%',
                  pointerEvents: 'none',
                }}
              >
                {overlayContent(pageNumber)}
              </div>
            )}
          </div>
        ))}
      </Document>
    </div>
  );
}
