import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { X, Upload, FileText, AlertCircle, Users, Download } from 'lucide-react';
import { getDocuments } from '../api/documents';
import { bulkSend } from '../api/submissions';
import { Button } from '@/components/ui/button';
import { useToastStore } from '@/stores/toastStore';
import { cn } from '@/lib/utils';
import type { Document } from '../types';

interface BulkSendModalProps {
  onClose: () => void;
}

interface Recipient {
  name: string;
  email: string;
}

function parseCSV(text: string): { recipients: Recipient[]; errors: string[] } {
  const lines = text.trim().split('\n');
  if (lines.length === 0) return { recipients: [], errors: ['CSV file is empty'] };

  const header = lines[0].toLowerCase().replace(/\r$/, '');
  const cols = header.split(',').map((c) => c.trim());
  const nameIdx = cols.indexOf('name');
  const emailIdx = cols.indexOf('email');

  if (nameIdx === -1 || emailIdx === -1) {
    return { recipients: [], errors: ['CSV must have "name" and "email" columns in the header row'] };
  }

  const recipients: Recipient[] = [];
  const errors: string[] = [];
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].replace(/\r$/, '').trim();
    if (!line) continue;
    const parts = line.split(',').map((c) => c.trim());
    const name = parts[nameIdx] || '';
    const email = parts[emailIdx] || '';

    if (!name || !email) {
      errors.push(`Row ${i + 1}: missing name or email`);
      continue;
    }
    if (!emailRegex.test(email)) {
      errors.push(`Row ${i + 1}: invalid email "${email}"`);
      continue;
    }
    recipients.push({ name, email });
  }

  return { recipients, errors };
}

export default function BulkSendModal({ onClose }: BulkSendModalProps) {
  const addToast = useToastStore((s) => s.addToast);
  const queryClient = useQueryClient();
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);
  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [parseErrors, setParseErrors] = useState<string[]>([]);
  const [dragOver, setDragOver] = useState(false);

  const { data: documents, isLoading: loadingDocs } = useQuery({
    queryKey: ['documents'],
    queryFn: getDocuments,
  });

  const sendMutation = useMutation({
    mutationFn: () =>
      bulkSend({ document_id: selectedDocument!.id, recipients }),
    onSuccess: () => {
      addToast(`${recipients.length} submissions queued`, 'success');
      queryClient.invalidateQueries({ queryKey: ['submissions'] });
      onClose();
    },
    onError: () => addToast('Failed to send bulk submissions', 'error'),
  });

  const handleFile = useCallback((file: File) => {
    if (!file.name.endsWith('.csv')) {
      setParseErrors(['Please upload a .csv file']);
      setRecipients([]);
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const { recipients: parsed, errors } = parseCSV(text);
      setRecipients(parsed);
      setParseErrors(errors);
    };
    reader.readAsText(file);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile],
  );

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  const downloadSampleCSV = () => {
    const csv = 'name,email\nJohn Doe,john@example.com\nJane Smith,jane@example.com\n';
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'bulk-send-template.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="relative w-full max-w-lg rounded-lg bg-surface p-6 shadow-xl">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 text-text-tertiary hover:text-text-primary"
        >
          <X className="h-5 w-5" />
        </button>

        <h2 className="mb-4 text-lg font-semibold text-text-primary">Bulk Send</h2>

        {/* Step 1: Select Document */}
        <div className="mb-4 space-y-1.5">
          <label className="text-sm font-medium text-text-primary">Document</label>
          {loadingDocs ? (
            <div className="h-10 animate-pulse rounded bg-surface-raised" />
          ) : (
            <select
              value={selectedDocument?.id ?? ''}
              onChange={(e) => {
                const doc = documents?.find((d) => d.id === Number(e.target.value));
                setSelectedDocument(doc ?? null);
              }}
              className="block w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
            >
              <option value="">Select a document...</option>
              {documents?.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Step 2: CSV Upload */}
        <div className="mb-4 space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-text-primary">Recipients (CSV)</label>
            <button
              onClick={downloadSampleCSV}
              className="flex items-center gap-1 text-xs text-accent hover:underline"
            >
              <Download className="h-3 w-3" />
              Download template
            </button>
          </div>
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            className={cn(
              'flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-6 transition-colors',
              dragOver
                ? 'border-accent bg-accent-subtle'
                : 'border-border bg-background',
            )}
          >
            <Upload className="mb-2 h-8 w-8 text-text-tertiary" />
            <p className="mb-1 text-sm text-text-secondary">
              Drag & drop a CSV file, or{' '}
              <label className="cursor-pointer font-medium text-accent hover:underline">
                browse
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleFileInput}
                  className="hidden"
                />
              </label>
            </p>
            <p className="text-xs text-text-tertiary">CSV with "name" and "email" columns</p>
          </div>
        </div>

        {/* Parse errors */}
        {parseErrors.length > 0 && (
          <div className="mb-4 rounded-md border border-danger/30 bg-danger/5 p-3">
            <div className="flex items-center gap-2 text-sm font-medium text-danger">
              <AlertCircle className="h-4 w-4" />
              {parseErrors.length} issue{parseErrors.length !== 1 ? 's' : ''} found
            </div>
            <ul className="mt-1 space-y-0.5 text-xs text-danger/80">
              {parseErrors.slice(0, 5).map((err, i) => (
                <li key={i}>{err}</li>
              ))}
              {parseErrors.length > 5 && (
                <li>...and {parseErrors.length - 5} more</li>
              )}
            </ul>
          </div>
        )}

        {/* Recipients preview */}
        {recipients.length > 0 && (
          <div className="mb-4 rounded-md border border-border bg-background p-3">
            <div className="flex items-center gap-2 text-sm font-medium text-text-primary">
              <Users className="h-4 w-4 text-accent" />
              {recipients.length} recipient{recipients.length !== 1 ? 's' : ''} found
            </div>
            <div className="mt-2 max-h-32 space-y-1 overflow-y-auto text-xs text-text-secondary">
              {recipients.slice(0, 10).map((r, i) => (
                <div key={i} className="flex justify-between">
                  <span>{r.name}</span>
                  <span className="text-text-tertiary">{r.email}</span>
                </div>
              ))}
              {recipients.length > 10 && (
                <div className="text-text-tertiary">...and {recipients.length - 10} more</div>
              )}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={() => sendMutation.mutate()}
            disabled={!selectedDocument || recipients.length === 0 || sendMutation.isPending}
            loading={sendMutation.isPending}
          >
            <FileText className="h-4 w-4" />
            Send {recipients.length > 0 ? `${recipients.length} submissions` : ''}
          </Button>
        </div>
      </div>
    </div>
  );
}
