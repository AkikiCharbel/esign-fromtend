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
        <div style={{ marginBottom: 4, fontSize: 12, fontWeight: 500, color: '#374151' }}>
          {label}
        </div>
      )}
      <div
        style={{
          border: '1px solid #d1d5db',
          borderRadius: 4,
          background: '#fff',
          display: 'inline-block',
        }}
      >
        <SignatureCanvas
          ref={sigRef}
          canvasProps={{
            width,
            height,
            style: { display: 'block' },
          }}
        />
      </div>
      <div style={{ marginTop: 8, display: 'flex', gap: 8 }}>
        <button
          type="button"
          onClick={handleClear}
          style={{
            padding: '6px 14px',
            fontSize: 13,
            background: '#f3f4f6',
            border: '1px solid #d1d5db',
            borderRadius: 4,
            cursor: 'pointer',
          }}
        >
          Clear
        </button>
        <button
          type="button"
          onClick={handleAccept}
          style={{
            padding: '6px 14px',
            fontSize: 13,
            background: '#2563eb',
            color: '#fff',
            border: 'none',
            borderRadius: 4,
            cursor: 'pointer',
            fontWeight: 500,
          }}
        >
          Accept
        </button>
      </div>
    </div>
  );
}
