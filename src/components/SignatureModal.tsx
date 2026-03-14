import { useState, useRef, useCallback, useEffect } from 'react';
import SignatureCanvas from 'react-signature-canvas';
import { PenLine, X } from 'lucide-react';

const SIGNATURE_FONT = '"Georgia", "Times New Roman", cursive';

interface SignatureModalProps {
  title: string;
  onConfirm: (base64Png: string) => void;
  onClose: () => void;
}

export default function SignatureModal({ title, onConfirm, onClose }: SignatureModalProps) {
  const [tab, setTab] = useState<'draw' | 'type'>('draw');
  const [typedText, setTypedText] = useState('');
  const [canvasWidth, setCanvasWidth] = useState(() => Math.min(508, window.innerWidth - 80));
  const sigRef = useRef<SignatureCanvas>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const updateWidth = () => {
      if (containerRef.current) {
        setCanvasWidth(containerRef.current.clientWidth);
      } else {
        setCanvasWidth(Math.min(508, window.innerWidth - 80));
      }
    };
    window.addEventListener('resize', updateWidth);
    // Measure after mount
    updateWidth();
    return () => window.removeEventListener('resize', updateWidth);
  }, []);

  const handleClear = useCallback(() => {
    if (tab === 'draw') {
      sigRef.current?.clear();
    } else {
      setTypedText('');
    }
  }, [tab]);

  const handleConfirm = useCallback(() => {
    if (tab === 'draw') {
      if (sigRef.current && !sigRef.current.isEmpty()) {
        onConfirm(sigRef.current.toDataURL('image/png'));
      }
    } else if (typedText.trim()) {
      // Render typed text to canvas for consistent base64 output
      const canvas = document.createElement('canvas');
      canvas.width = 460;
      canvas.height = 160;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = '#000000';
        // Note: canvas fillStyle requires raw hex — CSS vars don't work in canvas 2D context
        ctx.font = `italic 48px ${SIGNATURE_FONT}`;
        ctx.textBaseline = 'middle';
        ctx.fillText(typedText, 20, canvas.height / 2);
        onConfirm(canvas.toDataURL('image/png'));
      }
    }
  }, [tab, typedText, onConfirm]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="w-full max-w-[560px] rounded-xl shadow-2xl"
        style={{ backgroundColor: 'var(--pub-surface, #fff)' }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between border-b px-6 py-4"
          style={{ borderColor: 'var(--pub-border, #e5e7eb)' }}
        >
          <div className="flex items-center gap-2">
            <PenLine className="h-5 w-5" style={{ color: 'var(--pub-text-secondary, #6b7280)' }} />
            <h3 className="text-lg font-semibold" style={{ color: 'var(--pub-text, #111)' }}>{title}</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="cursor-pointer rounded-lg border-none bg-transparent p-1.5 transition-colors"
            style={{ color: 'var(--pub-text-muted, #9ca3af)' }}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b px-6" style={{ borderColor: 'var(--pub-border, #e5e7eb)' }}>
          <button
            type="button"
            onClick={() => setTab('draw')}
            className="cursor-pointer border-none bg-transparent px-4 py-2.5 text-sm font-medium transition-colors"
            style={{
              color: tab === 'draw' ? 'var(--pub-accent, #4f46e5)' : 'var(--pub-text-secondary, #6b7280)',
              borderBottom: tab === 'draw' ? '2px solid var(--pub-accent, #4f46e5)' : '2px solid transparent',
            }}
          >
            Draw
          </button>
          <button
            type="button"
            onClick={() => setTab('type')}
            className="cursor-pointer border-none bg-transparent px-4 py-2.5 text-sm font-medium transition-colors"
            style={{
              color: tab === 'type' ? 'var(--pub-accent, #4f46e5)' : 'var(--pub-text-secondary, #6b7280)',
              borderBottom: tab === 'type' ? '2px solid var(--pub-accent, #4f46e5)' : '2px solid transparent',
            }}
          >
            Type
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {tab === 'draw' ? (
            <div
              ref={containerRef}
              className="overflow-hidden rounded-lg border"
              style={{ borderColor: 'var(--pub-border, #e5e7eb)', backgroundColor: 'var(--pub-surface, #fff)' }}
            >
              <SignatureCanvas
                ref={sigRef}
                canvasProps={{
                  width: canvasWidth,
                  height: 200,
                  style: { display: 'block', width: '100%' },
                }}
              />
            </div>
          ) : (
            <div>
              <input
                type="text"
                value={typedText}
                onChange={(e) => setTypedText(e.target.value)}
                placeholder="Type your name"
                className="w-full rounded-lg border px-4 py-3 text-2xl outline-none"
                style={{
                  borderColor: 'var(--pub-border, #e5e7eb)',
                  color: 'var(--pub-text, #111)',
                  fontFamily: SIGNATURE_FONT,
                  fontStyle: 'italic',
                }}
                autoFocus
              />
              {typedText && (
                <div
                  className="mt-4 flex h-[120px] items-center rounded-lg border px-6"
                  style={{ borderColor: 'var(--pub-border-subtle, #f3f4f6)', backgroundColor: 'var(--pub-bg, #fafafa)' }}
                >
                  <span
                    className="text-4xl"
                    style={{ color: 'var(--pub-text, #111)', fontFamily: SIGNATURE_FONT, fontStyle: 'italic' }}
                  >
                    {typedText}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          className="flex items-center justify-between border-t px-6 py-4"
          style={{ borderColor: 'var(--pub-border, #e5e7eb)' }}
        >
          <button
            type="button"
            onClick={handleClear}
            className="cursor-pointer rounded-lg border-none bg-transparent px-4 py-2 text-sm font-medium transition-colors"
            style={{ color: 'var(--pub-text-secondary, #6b7280)' }}
          >
            Clear
          </button>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="cursor-pointer rounded-lg border px-4 py-2 text-sm font-medium transition-colors"
              style={{
                borderColor: 'var(--pub-border, #d1d5db)',
                backgroundColor: 'var(--pub-surface, #fff)',
                color: 'var(--pub-text-secondary, #374151)',
              }}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              className="cursor-pointer rounded-lg border-none px-5 py-2 text-sm font-medium text-white transition-colors"
              style={{ backgroundColor: 'var(--pub-accent, #4f46e5)' }}
            >
              Confirm Signature
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
