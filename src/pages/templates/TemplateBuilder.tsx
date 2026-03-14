import { useEffect, useCallback, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useDrag, useDrop, DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import axios from 'axios';
import {
  ArrowLeft,
  Save,
  Check,
  GripVertical,
  PenLine,
  Type,
  AlignLeft,
  Calendar,
  CheckSquare,
  Circle,
  ChevronDown,
  Upload,
  Trash2,
  X,
  RefreshCw,
} from 'lucide-react';
import PdfViewer from '../../components/PdfViewer/PdfViewer';
import { getTemplate, syncFields, uploadPdf, updateTemplate } from '../../api/templates';
import {
  useBuilderStore,
  templateFieldToBuilderField,
  builderFieldToSync,
  type BuilderField,
} from '../../stores/builderStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { Separator } from '@/components/ui/separator';
import { Spinner } from '@/components/ui/Spinner';
import { cn } from '@/lib/utils';
import { useToastStore } from '@/stores/toastStore';
import type { FieldType } from '../../types';

// --- Field type definitions with icons ---

const FIELD_TYPE_ICON: Record<FieldType, React.ComponentType<{ className?: string }>> = {
  signature: PenLine,
  initials: Type,
  text: AlignLeft,
  date: Calendar,
  checkbox: CheckSquare,
  radio: Circle,
  dropdown: ChevronDown,
};

const FIELD_TYPES: { type: FieldType; label: string }[] = [
  { type: 'signature', label: 'Signature' },
  { type: 'initials', label: 'Initials' },
  { type: 'text', label: 'Text' },
  { type: 'date', label: 'Date' },
  { type: 'checkbox', label: 'Checkbox' },
  { type: 'radio', label: 'Radio' },
  { type: 'dropdown', label: 'Dropdown' },
];

const DEFAULT_FIELD_SIZE: Record<FieldType, { width: number; height: number }> = {
  signature: { width: 20, height: 5 },
  initials: { width: 10, height: 5 },
  text: { width: 20, height: 3 },
  date: { width: 15, height: 3 },
  checkbox: { width: 3, height: 3 },
  radio: { width: 3, height: 3 },
  dropdown: { width: 20, height: 3 },
};

type FieldColorGroup = 'indigo' | 'amber' | 'emerald';

function getFieldColorGroup(type: FieldType): FieldColorGroup {
  if (type === 'signature' || type === 'initials') return 'indigo';
  if (type === 'text' || type === 'date') return 'amber';
  return 'emerald';
}

const FIELD_COLOR_STYLES: Record<FieldColorGroup, { bg: string; border: string; text: string }> = {
  indigo: {
    bg: 'var(--color-field-indigo-bg)',
    border: 'var(--color-field-indigo-border)',
    text: 'var(--color-field-indigo-text)',
  },
  amber: {
    bg: 'var(--color-field-amber-bg)',
    border: 'var(--color-field-amber-border)',
    text: 'var(--color-field-amber-text)',
  },
  emerald: {
    bg: 'var(--color-field-emerald-bg)',
    border: 'var(--color-field-emerald-border)',
    text: 'var(--color-field-emerald-text)',
  },
};

function generateId(): string {
  return crypto.randomUUID();
}

// --- Left Panel: Draggable field pill ---

function DraggableFieldType({ type, label }: { type: FieldType; label: string }) {
  const Icon = FIELD_TYPE_ICON[type];
  const [{ isDragging }, drag] = useDrag(() => ({
    type: 'FIELD',
    item: { fieldType: type },
    collect: (monitor) => ({ isDragging: monitor.isDragging() }),
  }));

  return (
    <div
      ref={drag as unknown as React.Ref<HTMLDivElement>}
      className={cn(
        'flex items-center gap-2.5 rounded-md border border-border bg-surface-raised p-3 cursor-grab select-none transition-all',
        'hover:bg-accent-subtle hover:border-accent',
        isDragging && 'opacity-50 scale-95',
      )}
    >
      <Icon className="h-4 w-4 shrink-0 text-text-secondary" />
      <span className="flex-1 text-sm font-medium text-text-primary">{label}</span>
      <GripVertical className="h-4 w-4 shrink-0 text-text-tertiary" />
    </div>
  );
}

// --- Center Panel: Drop target overlay per page ---

interface PageDropOverlayProps {
  pageNumber: number;
  templateId: number;
}

function PageDropOverlay({ pageNumber, templateId }: PageDropOverlayProps) {
  const { fields, selectedFieldId, addField, updateField, setSelected } = useBuilderStore();
  const overlayRef = useRef<HTMLDivElement>(null);

  const [, drop] = useDrop(() => ({
    accept: ['FIELD', 'FIELD_MOVE'],
    drop: (item: { fieldType?: FieldType; fieldId?: string }, monitor) => {
      if (!overlayRef.current) return;
      const offset = monitor.getClientOffset();
      if (!offset) return;
      const rect = overlayRef.current.getBoundingClientRect();
      const dropX = offset.x - rect.left;
      const dropY = offset.y - rect.top;
      const xPercent = (dropX / rect.width) * 100;
      const yPercent = (dropY / rect.height) * 100;

      if (item.fieldId) {
        const existing = fields.find((f) => f.id === item.fieldId);
        if (!existing) return;
        updateField(item.fieldId, {
          x: Math.max(0, Math.min(xPercent - existing.width / 2, 100 - existing.width)),
          y: Math.max(0, Math.min(yPercent - existing.height / 2, 100 - existing.height)),
          page: pageNumber,
        });
      } else if (item.fieldType) {
        const size = DEFAULT_FIELD_SIZE[item.fieldType];
        const newField: BuilderField = {
          id: generateId(),
          template_id: templateId,
          page: pageNumber,
          type: item.fieldType,
          label: item.fieldType.charAt(0).toUpperCase() + item.fieldType.slice(1),
          required: false,
          x: Math.max(0, Math.min(xPercent, 100 - size.width)),
          y: Math.max(0, Math.min(yPercent, 100 - size.height)),
          width: size.width,
          height: size.height,
          font_size: 14,
          multiline: false,
          options: null,
          signer_role: 'signer',
          order: fields.length,
        };
        addField(newField);
        setSelected(newField.id);
      }
    },
  }), [fields, templateId, pageNumber, addField, updateField, setSelected]);

  const pageFields = fields.filter((f) => f.page === pageNumber);

  return (
    <div
      ref={(node) => {
        (overlayRef as React.MutableRefObject<HTMLDivElement | null>).current = node;
        drop(node);
      }}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'auto',
        zIndex: 10,
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) setSelected(null);
      }}
    >
      {pageFields.map((field) => (
        <FieldBox key={field.id} field={field} selected={field.id === selectedFieldId} />
      ))}
    </div>
  );
}

// --- Field box rendered on PDF ---

function FieldBox({ field, selected }: { field: BuilderField; selected: boolean }) {
  const { setSelected, updateField } = useBuilderStore();
  const Icon = FIELD_TYPE_ICON[field.type];
  const colorGroup = getFieldColorGroup(field.type);
  const colors = FIELD_COLOR_STYLES[colorGroup];

  const [{ isDragging }, dragRef] = useDrag(() => ({
    type: 'FIELD_MOVE',
    item: { fieldId: field.id },
    collect: (monitor) => ({ isDragging: monitor.isDragging() }),
  }), [field.id]);

  const resizingRef = useRef<{
    handle: string;
    startX: number;
    startY: number;
    startFieldX: number;
    startFieldY: number;
    startFieldW: number;
    startFieldH: number;
    parentRect: DOMRect;
  } | null>(null);

  const handleMouseDown = useCallback(
    (handle: string, e: React.MouseEvent) => {
      e.stopPropagation();
      e.preventDefault();
      const parent = (e.currentTarget as HTMLElement).closest('[data-field-box]')?.parentElement;
      if (!parent) return;

      resizingRef.current = {
        handle,
        startX: e.clientX,
        startY: e.clientY,
        startFieldX: field.x,
        startFieldY: field.y,
        startFieldW: field.width,
        startFieldH: field.height,
        parentRect: parent.getBoundingClientRect(),
      };

      const onMouseMove = (ev: MouseEvent) => {
        if (!resizingRef.current) return;
        const { handle: h, startX, startY, startFieldX, startFieldY, startFieldW, startFieldH, parentRect } =
          resizingRef.current;
        const dx = ((ev.clientX - startX) / parentRect.width) * 100;
        const dy = ((ev.clientY - startY) / parentRect.height) * 100;

        let newX = startFieldX;
        let newY = startFieldY;
        let newW = startFieldW;
        let newH = startFieldH;

        if (h.includes('e')) newW = Math.max(2, startFieldW + dx);
        if (h.includes('w')) {
          newW = Math.max(2, startFieldW - dx);
          newX = startFieldX + dx;
        }
        if (h.includes('s')) newH = Math.max(1, startFieldH + dy);
        if (h.includes('n')) {
          newH = Math.max(1, startFieldH - dy);
          newY = startFieldY + dy;
        }

        updateField(field.id, {
          x: Math.max(0, newX),
          y: Math.max(0, newY),
          width: newW,
          height: newH,
        });
      };

      const onMouseUp = () => {
        resizingRef.current = null;
        window.removeEventListener('mousemove', onMouseMove);
        window.removeEventListener('mouseup', onMouseUp);
      };

      window.addEventListener('mousemove', onMouseMove);
      window.addEventListener('mouseup', onMouseUp);
    },
    [field.id, field.x, field.y, field.width, field.height, updateField],
  );

  const handles = ['n', 'ne', 'e', 'se', 's', 'sw', 'w', 'nw'];
  const handlePositions: Record<string, React.CSSProperties> = {
    n: { top: -4, left: '50%', transform: 'translateX(-50%)', cursor: 'ns-resize' },
    ne: { top: -4, right: -4, cursor: 'nesw-resize' },
    e: { top: '50%', right: -4, transform: 'translateY(-50%)', cursor: 'ew-resize' },
    se: { bottom: -4, right: -4, cursor: 'nwse-resize' },
    s: { bottom: -4, left: '50%', transform: 'translateX(-50%)', cursor: 'ns-resize' },
    sw: { bottom: -4, left: -4, cursor: 'nesw-resize' },
    w: { top: '50%', left: -4, transform: 'translateY(-50%)', cursor: 'ew-resize' },
    nw: { top: -4, left: -4, cursor: 'nwse-resize' },
  };

  return (
    <div
      ref={dragRef as unknown as React.Ref<HTMLDivElement>}
      data-field-box
      onClick={(e) => {
        e.stopPropagation();
        setSelected(field.id);
      }}
      style={{
        position: 'absolute',
        left: `${field.x}%`,
        top: `${field.y}%`,
        width: `${field.width}%`,
        height: `${field.height}%`,
        backgroundColor: colors.bg,
        border: `1.5px solid ${colors.border}`,
        borderRadius: '4px',
        cursor: 'grab',
        boxSizing: 'border-box',
        display: 'flex',
        alignItems: 'center',
        gap: '3px',
        padding: '0 4px',
        fontSize: '10px',
        color: colors.text,
        fontWeight: 500,
        overflow: 'hidden',
        whiteSpace: 'nowrap',
        userSelect: 'none',
        opacity: isDragging ? 0.4 : 1,
        boxShadow: isDragging ? '0 2px 8px rgba(0,0,0,0.3)' : undefined,
        outline: selected ? `2px solid var(--color-accent)` : undefined,
        outlineOffset: '1px',
      }}
    >
      <Icon className="h-[11px] w-[11px] shrink-0" />
      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
        {field.label}
      </span>
      {field.required && (
        <span style={{ color: 'rgb(239, 68, 68)', marginLeft: 1, flexShrink: 0 }}>*</span>
      )}
      {selected &&
        handles.map((h) => (
          <div
            key={h}
            onMouseDown={(e) => handleMouseDown(h, e)}
            style={{
              position: 'absolute',
              width: 8,
              height: 8,
              backgroundColor: 'var(--color-accent)',
              border: '1px solid var(--color-background)',
              borderRadius: '1px',
              pointerEvents: 'auto',
              zIndex: 10,
              ...handlePositions[h],
            }}
          />
        ))}
    </div>
  );
}

// --- Right Panel: Field properties ---

function FieldProperties() {
  const { fields, selectedFieldId, updateField, removeField, setSelected } = useBuilderStore();
  const field = fields.find((f) => f.id === selectedFieldId);

  if (!field) {
    return (
      <div className="flex h-full flex-col items-center justify-center px-6 text-center">
        <p className="text-sm text-text-tertiary">Select a field to edit</p>
      </div>
    );
  }

  const Icon = FIELD_TYPE_ICON[field.type];
  const showFontSize = field.type === 'text' || field.type === 'date';
  const showMultiline = field.type === 'text';
  const showOptions = field.type === 'radio' || field.type === 'dropdown';

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center gap-2.5 px-4 py-3">
        <Icon className="h-4 w-4 text-text-secondary" />
        <span className="flex-1 text-sm font-semibold text-text-primary capitalize">
          {field.type}
        </span>
        <button
          onClick={() => setSelected(null)}
          aria-label="Close"
          className="rounded p-1 text-text-tertiary hover:bg-surface-raised hover:text-text-primary transition-colors cursor-pointer"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      <Separator />

      {/* Form */}
      <div className="flex-1 space-y-4 overflow-y-auto p-4">
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-text-secondary">Label</label>
          <Input
            value={field.label}
            onChange={(e) => updateField(field.id, { label: e.target.value })}
          />
        </div>

        <label className="flex cursor-pointer items-center gap-2.5">
          <input
            type="checkbox"
            checked={field.required}
            onChange={(e) => updateField(field.id, { required: e.target.checked })}
            className="h-4 w-4 rounded border-border accent-accent cursor-pointer"
          />
          <span className="text-sm font-medium text-text-primary">Required</span>
        </label>

        {showFontSize && (
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-text-secondary">Font Size</label>
            <Input
              type="number"
              value={field.font_size}
              min={8}
              max={72}
              onChange={(e) => updateField(field.id, { font_size: Number(e.target.value) })}
            />
          </div>
        )}

        {showMultiline && (
          <label className="flex cursor-pointer items-center gap-2.5">
            <input
              type="checkbox"
              checked={field.multiline}
              onChange={(e) => updateField(field.id, { multiline: e.target.checked })}
              className="h-4 w-4 rounded border-border accent-accent cursor-pointer"
            />
            <span className="text-sm font-medium text-text-primary">Multiline</span>
          </label>
        )}

        <div className="space-y-1.5">
          <label className="text-xs font-medium text-text-secondary">Signer Role</label>
          <Input
            value={field.signer_role}
            onChange={(e) => updateField(field.id, { signer_role: e.target.value })}
            placeholder="e.g. Customer, Witness"
          />
        </div>

        {showOptions && <OptionsEditor fieldId={field.id} options={field.options ?? []} />}
      </div>

      {/* Delete button - sticky bottom */}
      <div className="border-t border-border p-4">
        <Button
          variant="danger"
          className="w-full"
          onClick={() => {
            removeField(field.id);
            setSelected(null);
          }}
        >
          <Trash2 className="h-4 w-4" />
          Delete Field
        </Button>
      </div>
    </div>
  );
}

function OptionsEditor({ fieldId, options }: { fieldId: string; options: string[] }) {
  const { updateField } = useBuilderStore();
  const [inputValue, setInputValue] = useState('');

  const addOption = () => {
    const trimmed = inputValue.trim();
    if (!trimmed) return;
    updateField(fieldId, { options: [...options, trimmed] });
    setInputValue('');
  };

  const removeOption = (index: number) => {
    const updated = options.filter((_, i) => i !== index);
    updateField(fieldId, { options: updated.length > 0 ? updated : null });
  };

  return (
    <div className="space-y-2">
      <label className="text-xs font-medium text-text-secondary">Options</label>
      <Input
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            addOption();
          }
        }}
        placeholder="Type option + Enter"
      />
      {options.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {options.map((opt, i) => (
            <span
              key={i}
              className="inline-flex items-center gap-1 rounded-md bg-surface-raised border border-border px-2 py-0.5 text-xs text-text-secondary"
            >
              {opt}
              <button
                onClick={() => removeOption(i)}
                className="ml-0.5 text-text-tertiary hover:text-text-primary cursor-pointer bg-transparent border-none p-0 leading-none"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

// --- Inline editable title ---

function EditableTitle({
  value,
  onSave,
}: {
  value: string;
  onSave: (name: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setDraft(value);
  }, [value]);

  useEffect(() => {
    if (editing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [editing]);

  const commit = () => {
    const trimmed = draft.trim();
    if (trimmed && trimmed !== value) {
      onSave(trimmed);
    } else {
      setDraft(value);
    }
    setEditing(false);
  };

  if (editing) {
    return (
      <input
        ref={inputRef}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') commit();
          if (e.key === 'Escape') {
            setDraft(value);
            setEditing(false);
          }
        }}
        className="bg-transparent border-none text-lg font-semibold text-text-primary outline-none focus:ring-0 p-0 m-0 w-64"
      />
    );
  }

  return (
    <h1
      onClick={() => setEditing(true)}
      className="text-lg font-semibold text-text-primary cursor-pointer hover:text-accent transition-colors"
      title="Click to edit"
    >
      {value}
    </h1>
  );
}

// --- Inline editable description ---

function EditableDescription({
  value,
  onSave,
}: {
  value: string | null;
  onSave: (description: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value ?? '');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setDraft(value ?? '');
  }, [value]);

  useEffect(() => {
    if (editing) {
      inputRef.current?.focus();
    }
  }, [editing]);

  const commit = () => {
    const trimmed = draft.trim();
    if (trimmed !== (value ?? '')) {
      onSave(trimmed);
    } else {
      setDraft(value ?? '');
    }
    setEditing(false);
  };

  if (editing) {
    return (
      <input
        ref={inputRef}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') commit();
          if (e.key === 'Escape') {
            setDraft(value ?? '');
            setEditing(false);
          }
        }}
        className="bg-transparent border-none text-xs text-text-secondary outline-none focus:ring-0 p-0 m-0 w-64"
        placeholder="Add a description..."
      />
    );
  }

  return (
    <p
      onClick={() => setEditing(true)}
      className="text-xs text-text-tertiary cursor-pointer hover:text-text-secondary transition-colors"
      title="Click to edit"
    >
      {value || 'Add description...'}
    </p>
  );
}

const MAX_PDF_SIZE_MB = 20;
const MAX_PDF_SIZE_BYTES = MAX_PDF_SIZE_MB * 1024 * 1024;

function getUploadErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data;
    if (data?.message) return data.message;
    if (data?.errors?.pdf) return data.errors.pdf[0];
    if (error.response?.status === 413) return 'File is too large for the server';
  }
  return 'Failed to upload PDF';
}

// --- Empty state (no PDF) ---

function EmptyPdfState({ templateId }: { templateId: number }) {
  const queryClient = useQueryClient();
  const addToast = useToastStore((s) => s.addToast);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const uploadMutation = useMutation({
    mutationFn: (file: File) => uploadPdf(templateId, file),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['template', templateId] });
    },
    onError: (error) => addToast(getUploadErrorMessage(error), 'error'),
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > MAX_PDF_SIZE_BYTES) {
      addToast(`PDF must be under ${MAX_PDF_SIZE_MB}MB`, 'error');
      e.target.value = '';
      return;
    }
    uploadMutation.mutate(file);
  };

  return (
    <div className="flex flex-1 items-center justify-center p-8">
      <div className="flex flex-col items-center gap-4 rounded-lg border-2 border-dashed border-border p-12">
        <Upload className="h-12 w-12 text-text-tertiary" />
        <p className="text-sm text-text-secondary">Upload a PDF to start building</p>
        <Button onClick={() => fileInputRef.current?.click()} loading={uploadMutation.isPending}>
          Upload PDF
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,application/pdf"
          className="hidden"
          onChange={handleFileChange}
        />
      </div>
    </div>
  );
}

// --- Main TemplateBuilder ---

export default function TemplateBuilder() {
  const { id } = useParams<{ id: string }>();
  const templateId = Number(id);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const addToast = useToastStore((s) => s.addToast);
  const { fields, setFields, clearFields } = useBuilderStore();
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saved' | 'error'>('idle');
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { data: template, isLoading, error } = useQuery({
    queryKey: ['template', templateId],
    queryFn: () => getTemplate(templateId),
    enabled: !isNaN(templateId),
  });

  const fieldsLoaded = useRef(false);
  useEffect(() => {
    if (template?.fields && !fieldsLoaded.current) {
      setFields(template.fields.map(templateFieldToBuilderField));
      fieldsLoaded.current = true;
    }
    return () => {
      clearFields();
      fieldsLoaded.current = false;
    };
  }, [template?.id, setFields, clearFields]);

  const saveMutation = useMutation({
    mutationFn: () => syncFields(templateId, fields.map(builderFieldToSync)),
    onSuccess: (fields) => {
      setFields(fields.map(templateFieldToBuilderField));
      setSaveStatus('saved');
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      saveTimerRef.current = setTimeout(() => setSaveStatus('idle'), 3000);
    },
    onError: () => {
      setSaveStatus('error');
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      saveTimerRef.current = setTimeout(() => setSaveStatus('idle'), 3000);
    },
  });

  const renameMutation = useMutation({
    mutationFn: (name: string) => updateTemplate(templateId, { name }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['template', templateId] });
    },
    onError: () => {
      setSaveStatus('error');
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      saveTimerRef.current = setTimeout(() => setSaveStatus('idle'), 3000);
    },
  });

  const descriptionMutation = useMutation({
    mutationFn: (description: string) => updateTemplate(templateId, { description: description || undefined }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['template', templateId] });
    },
  });

  const statusMutation = useMutation({
    mutationFn: (status: string) => updateTemplate(templateId, { status }),
    onSuccess: (_data, newStatus) => {
      queryClient.invalidateQueries({ queryKey: ['template', templateId] });
      queryClient.invalidateQueries({ queryKey: ['templates'] });
      addToast(`Template ${newStatus === 'active' ? 'activated' : 'set to draft'}`, 'success');
    },
    onError: () => addToast('Failed to update status', 'error'),
  });

  const reuploadMutation = useMutation({
    mutationFn: (file: File) => uploadPdf(templateId, file),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['template', templateId] });
      addToast('PDF replaced', 'success');
    },
    onError: (error) => addToast(getUploadErrorMessage(error), 'error'),
  });

  const reuploadInputRef = useRef<HTMLInputElement>(null);

  const overlayContent = useCallback(
    (pageNumber: number) => (
      <PageDropOverlay
        pageNumber={pageNumber}
        templateId={templateId}
      />
    ),
    [templateId],
  );

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center gap-2">
        <Spinner size="md" />
        <span className="text-text-secondary">Loading template…</span>
      </div>
    );
  }

  if (error || !template) {
    return <div className="flex h-full items-center justify-center text-danger">Failed to load template.</div>;
  }

  const hasPdf = !!template.pdf_url;

  return (
    <DndProvider backend={HTML5Backend}>
      {/* Mobile warning */}
      <div className="flex h-full items-center justify-center p-6 text-center md:hidden">
        <div className="space-y-2">
          <p className="text-lg font-semibold text-text-primary">Builder works best on desktop</p>
          <p className="text-sm text-text-secondary">
            Please use a larger screen for the template builder.
          </p>
          <Button variant="secondary" onClick={() => navigate('/templates')}>
            Back to Templates
          </Button>
        </div>
      </div>
      <div className="hidden h-full overflow-hidden md:flex">
        {/* Left Panel — Field Palette */}
        <div className="flex w-[220px] shrink-0 flex-col border-r border-border bg-surface">
          <div className="px-4 pt-4 pb-0">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-text-secondary">
              Fields
            </h3>
          </div>
          <Separator className="my-3" />
          <div className="flex-1 space-y-2 overflow-y-auto px-4 pb-4">
            {FIELD_TYPES.map((ft) => (
              <DraggableFieldType key={ft.type} {...ft} />
            ))}
          </div>
          {hasPdf && template.page_count > 0 && (
            <>
              <Separator />
              <div className="px-4 py-3 text-center text-xs text-text-tertiary">
                {template.page_count} {template.page_count === 1 ? 'page' : 'pages'}
              </div>
            </>
          )}
        </div>

        {/* Center Panel — PDF Canvas */}
        <div className="flex flex-1 flex-col overflow-hidden">
          {/* Top bar */}
          <div className="flex items-center gap-3 border-b border-border bg-surface px-4 py-2.5 shrink-0">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate('/templates')}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div className="min-w-0">
              <EditableTitle
                value={template.name}
                onSave={(name) => renameMutation.mutate(name)}
              />
              <EditableDescription
                value={template.description}
                onSave={(desc) => descriptionMutation.mutate(desc)}
              />
            </div>
            <div className="flex-1" />
            <div className="flex items-center gap-2">
              <Badge
                variant={template.status === 'active' ? 'success' : 'warning'}
                className="cursor-pointer select-none"
                onClick={() =>
                  statusMutation.mutate(template.status === 'active' ? 'draft' : 'active')
                }
                title={`Click to ${template.status === 'active' ? 'deactivate' : 'activate'}`}
              >
                {statusMutation.isPending ? '...' : template.status}
              </Badge>
              {hasPdf && (
                <>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => reuploadInputRef.current?.click()}
                    loading={reuploadMutation.isPending}
                    title="Replace PDF"
                  >
                    <RefreshCw className="h-4 w-4" />
                    Replace PDF
                  </Button>
                  <input
                    ref={reuploadInputRef}
                    type="file"
                    accept=".pdf,application/pdf"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        if (file.size > MAX_PDF_SIZE_BYTES) {
                          addToast(`PDF must be under ${MAX_PDF_SIZE_MB}MB`, 'error');
                        } else {
                          reuploadMutation.mutate(file);
                        }
                      }
                      e.target.value = '';
                    }}
                  />
                </>
              )}
              {saveStatus === 'saved' && (
                <span className="flex items-center gap-1 text-xs text-success animate-in fade-in duration-200">
                  <Check className="h-3.5 w-3.5" />
                  Saved
                </span>
              )}
              {saveStatus === 'error' && (
                <span className="text-xs text-danger">Failed to save</span>
              )}
              <Button
                onClick={() => saveMutation.mutate()}
                disabled={saveMutation.isPending}
                loading={saveMutation.isPending}
              >
                <Save className="h-4 w-4" />
                Save
              </Button>
            </div>
          </div>

          {/* PDF area */}
          {hasPdf ? (
            <div className="builder-pdf flex-1 overflow-y-auto bg-background p-6">
              <div className="mx-auto flex flex-col items-center gap-4">
                <PdfViewer
                  pdfUrl={template.pdf_url ?? ''}
                  overlayContent={overlayContent}
                />
              </div>
            </div>
          ) : (
            <EmptyPdfState templateId={templateId} />
          )}
        </div>

        {/* Right Panel — Properties */}
        <div className="w-[280px] shrink-0 border-l border-border bg-surface">
          <FieldProperties />
        </div>
      </div>
    </DndProvider>
  );
}
