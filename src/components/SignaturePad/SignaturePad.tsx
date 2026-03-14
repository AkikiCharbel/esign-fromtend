import { useRef, useCallback } from 'react';
import SignatureCanvas from 'react-signature-canvas';

interface SignaturePadProps {
  onAccept: (base64Png: string) => void;
  onClear?: () => void;
  width?: number;
  height?: number;
  label?: string;
}

export default function SignaturePad({ onAccept, onClear, width = 300, height = 150, label }: SignaturePadProps) {
  const sigRef = useRef<SignatureCanvas>(null);

  const handleClear = useCallback(() => {
    sigRef.current?.clear();
    onClear?.();
  }, [onClear]);

  const handleAccept = useCallback(() => {
    if (sigRef.current && !sigRef.current.isEmpty()) {
      onAccept(sigRef.current.toDataURL('image/png'));
    }
  }, [onAccept]);

  return (
    <div>
      {label && (
        <div className="mb-1 text-xs font-medium text-text-secondary">
          {label}
        </div>
      )}
      <div className="inline-block rounded border border-border bg-surface">
        <SignatureCanvas
          ref={sigRef}
          canvasProps={{
            width,
            height,
            style: { display: 'block' },
          }}
        />
      </div>
      <div className="mt-2 flex gap-2">
        <button
          type="button"
          onClick={handleClear}
          className="cursor-pointer rounded border border-border bg-surface-raised px-3.5 py-1.5 text-[13px] text-text-secondary transition-colors hover:bg-surface-overlay"
        >
          Clear
        </button>
        <button
          type="button"
          onClick={handleAccept}
          className="cursor-pointer rounded border-none bg-accent px-3.5 py-1.5 text-[13px] font-medium text-white transition-colors hover:bg-accent-hover"
        >
          Accept
        </button>
      </div>
    </div>
  );
}
