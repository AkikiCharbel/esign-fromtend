import { useEffect, useCallback, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useDrag, useDrop, DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import PdfViewer, { type PageDimensions } from '../../components/PdfViewer/PdfViewer';
import { getTemplate, syncFields } from '../../api/templates';
import {
  useBuilderStore,
  templateFieldToBuilderField,
  builderFieldToSync,
  type BuilderField,
} from '../../stores/builderStore';
import type { FieldType } from '../../types';

const FIELD_TYPES: { type: FieldType; label: string; color: string }[] = [
  { type: 'signature', label: 'Signature', color: '#3b82f6' },
  { type: 'initials', label: 'Initials', color: '#8b5cf6' },
  { type: 'text', label: 'Text', color: '#10b981' },
  { type: 'date', label: 'Date', color: '#f59e0b' },
  { type: 'checkbox', label: 'Checkbox', color: '#ef4444' },
  { type: 'radio', label: 'Radio', color: '#ec4899' },
  { type: 'dropdown', label: 'Dropdown', color: '#06b6d4' },
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

function generateId(): string {
  return crypto.randomUUID();
}

// --- Left Panel: Draggable field palette ---

function DraggableFieldType({ type, label, color }: { type: FieldType; label: string; color: string }) {
  const [{ isDragging }, drag] = useDrag(() => ({
    type: 'FIELD',
    item: { fieldType: type },
    collect: (monitor) => ({ isDragging: monitor.isDragging() }),
  }));

  return (
    <div
      ref={drag as unknown as React.Ref<HTMLDivElement>}
      style={{
        padding: '8px 12px',
        marginBottom: '6px',
        backgroundColor: color,
        color: '#fff',
        borderRadius: '4px',
        cursor: 'grab',
        opacity: isDragging ? 0.5 : 1,
        fontSize: '14px',
        fontWeight: 500,
      }}
    >
      {label}
    </div>
  );
}

// --- Center Panel: Drop target overlay per page ---

interface PageDropOverlayProps {
  pageNumber: number;
  templateId: number;
  dimensions: PageDimensions | undefined;
}

function PageDropOverlay({ pageNumber, templateId, dimensions }: PageDropOverlayProps) {
  const { fields, selectedFieldId, addField, updateField, setSelected } = useBuilderStore();
  const overlayRef = useRef<HTMLDivElement>(null);

  const [, drop] = useDrop(() => ({
    accept: ['FIELD', 'FIELD_MOVE'],
    drop: (item: { fieldType?: FieldType; fieldId?: string }, monitor) => {
      if (!overlayRef.current || !dimensions) return;
      const offset = monitor.getClientOffset();
      if (!offset) return;
      const rect = overlayRef.current.getBoundingClientRect();
      const dropX = offset.x - rect.left;
      const dropY = offset.y - rect.top;
      const xPercent = (dropX / rect.width) * 100;
      const yPercent = (dropY / rect.height) * 100;

      if (item.fieldId) {
        // Moving an existing field
        const existing = fields.find((f) => f.id === item.fieldId);
        if (!existing) return;
        updateField(item.fieldId, {
          x: Math.max(0, Math.min(xPercent - existing.width / 2, 100 - existing.width)),
          y: Math.max(0, Math.min(yPercent - existing.height / 2, 100 - existing.height)),
          page: pageNumber,
        });
      } else if (item.fieldType) {
        // Creating a new field from palette
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
  }), [dimensions, fields, templateId, pageNumber, addField, updateField, setSelected]);

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

  const fieldColor = FIELD_TYPES.find((ft) => ft.type === field.type)?.color ?? '#888';

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
        backgroundColor: `${fieldColor}22`,
        border: `2px solid ${selected ? '#2563eb' : fieldColor}`,
        borderRadius: '2px',
        cursor: 'move',
        boxSizing: 'border-box',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '10px',
        color: fieldColor,
        fontWeight: 600,
        overflow: 'hidden',
        whiteSpace: 'nowrap',
        userSelect: 'none',
        opacity: isDragging ? 0.4 : 1,
      }}
    >
      {field.label}
      {selected &&
        handles.map((h) => (
          <div
            key={h}
            onMouseDown={(e) => handleMouseDown(h, e)}
            style={{
              position: 'absolute',
              width: 8,
              height: 8,
              backgroundColor: '#2563eb',
              border: '1px solid #fff',
              borderRadius: '50%',
              pointerEvents: 'auto',
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
      <div style={{ padding: '16px', color: '#888', fontSize: '14px' }}>
        Select a field to edit its properties
      </div>
    );
  }

  const showMultiline = field.type === 'text';
  const showOptions = field.type === 'radio' || field.type === 'dropdown';

  return (
    <div style={{ padding: '16px', fontSize: '14px' }}>
      <h3 style={{ margin: '0 0 16px', fontSize: '16px' }}>
        Field Properties
      </h3>

      <label style={{ display: 'block', marginBottom: '12px' }}>
        <span style={{ display: 'block', marginBottom: '4px', fontWeight: 500 }}>Label</span>
        <input
          type="text"
          value={field.label}
          onChange={(e) => updateField(field.id, { label: e.target.value })}
          style={{ width: '100%', padding: '6px 8px', border: '1px solid #d1d5db', borderRadius: '4px', boxSizing: 'border-box' }}
        />
      </label>

      <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px', cursor: 'pointer' }}>
        <input
          type="checkbox"
          checked={field.required}
          onChange={(e) => updateField(field.id, { required: e.target.checked })}
        />
        <span style={{ fontWeight: 500 }}>Required</span>
      </label>

      <label style={{ display: 'block', marginBottom: '12px' }}>
        <span style={{ display: 'block', marginBottom: '4px', fontWeight: 500 }}>Font Size</span>
        <input
          type="number"
          value={field.font_size}
          min={8}
          max={72}
          onChange={(e) => updateField(field.id, { font_size: Number(e.target.value) })}
          style={{ width: '100%', padding: '6px 8px', border: '1px solid #d1d5db', borderRadius: '4px', boxSizing: 'border-box' }}
        />
      </label>

      {showMultiline && (
        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px', cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={field.multiline}
            onChange={(e) => updateField(field.id, { multiline: e.target.checked })}
          />
          <span style={{ fontWeight: 500 }}>Multiline</span>
        </label>
      )}

      <label style={{ display: 'block', marginBottom: '12px' }}>
        <span style={{ display: 'block', marginBottom: '4px', fontWeight: 500 }}>Signer Role</span>
        <input
          type="text"
          value={field.signer_role}
          onChange={(e) => updateField(field.id, { signer_role: e.target.value })}
          style={{ width: '100%', padding: '6px 8px', border: '1px solid #d1d5db', borderRadius: '4px', boxSizing: 'border-box' }}
        />
      </label>

      {showOptions && <OptionsEditor fieldId={field.id} options={field.options ?? []} />}

      <button
        onClick={() => {
          removeField(field.id);
          setSelected(null);
        }}
        style={{
          marginTop: '16px',
          width: '100%',
          padding: '8px',
          backgroundColor: '#ef4444',
          color: '#fff',
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer',
          fontWeight: 500,
        }}
      >
        Delete Field
      </button>
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
    <div style={{ marginBottom: '12px' }}>
      <span style={{ display: 'block', marginBottom: '4px', fontWeight: 500 }}>Options</span>
      <div style={{ display: 'flex', gap: '4px', marginBottom: '8px' }}>
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              addOption();
            }
          }}
          placeholder="Add option..."
          style={{ flex: 1, padding: '6px 8px', border: '1px solid #d1d5db', borderRadius: '4px' }}
        />
        <button
          onClick={addOption}
          style={{
            padding: '6px 12px',
            backgroundColor: '#3b82f6',
            color: '#fff',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
          }}
        >
          Add
        </button>
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
        {options.map((opt, i) => (
          <span
            key={i}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              padding: '2px 8px',
              backgroundColor: '#e5e7eb',
              borderRadius: '12px',
              fontSize: '12px',
            }}
          >
            {opt}
            <button
              onClick={() => removeOption(i)}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: 0,
                fontSize: '14px',
                lineHeight: 1,
                color: '#6b7280',
              }}
            >
              x
            </button>
          </span>
        ))}
      </div>
    </div>
  );
}

// --- Main TemplateBuilder ---

export default function TemplateBuilder() {
  const { id } = useParams<{ id: string }>();
  const templateId = Number(id);

  const { fields, setFields, clearFields } = useBuilderStore();
  const [pageDimensions, setPageDimensions] = useState<Map<number, PageDimensions>>(new Map());
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  const { data: template, isLoading, error } = useQuery({
    queryKey: ['template', templateId],
    queryFn: () => getTemplate(templateId),
    enabled: !isNaN(templateId),
  });

  // Load existing fields into the builder store when template first loads
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
    onSuccess: (data) => {
      setFields(data.fields.map(templateFieldToBuilderField));
      setSaveMessage('Template saved!');
      setTimeout(() => setSaveMessage(null), 3000);
    },
    onError: () => {
      setSaveMessage('Failed to save.');
      setTimeout(() => setSaveMessage(null), 3000);
    },
  });

  const handlePageRender = useCallback((dims: PageDimensions) => {
    setPageDimensions((prev) => {
      const next = new Map(prev);
      next.set(dims.pageNumber, dims);
      return next;
    });
  }, []);

  const overlayContent = useCallback(
    (pageNumber: number) => (
      <PageDropOverlay
        pageNumber={pageNumber}
        templateId={templateId}
        dimensions={pageDimensions.get(pageNumber)}
      />
    ),
    [templateId, pageDimensions],
  );

  if (isLoading) {
    return <div style={{ padding: '2rem', textAlign: 'center' }}>Loading template...</div>;
  }

  if (error || !template) {
    return <div style={{ padding: '2rem', textAlign: 'center', color: 'red' }}>Failed to load template.</div>;
  }

  return (
    <DndProvider backend={HTML5Backend}>
      <div style={{ display: 'flex', height: '100vh', fontFamily: 'system-ui, sans-serif' }}>
        {/* Left Panel — Field Palette */}
        <div
          style={{
            width: '200px',
            borderRight: '1px solid #e5e7eb',
            padding: '16px',
            backgroundColor: '#f9fafb',
            flexShrink: 0,
            overflowY: 'auto',
          }}
        >
          <h3 style={{ margin: '0 0 12px', fontSize: '14px', fontWeight: 600, color: '#374151' }}>
            Field Types
          </h3>
          {FIELD_TYPES.map((ft) => (
            <DraggableFieldType key={ft.type} {...ft} />
          ))}
        </div>

        {/* Center Panel — PDF Canvas */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '16px',
            backgroundColor: '#e5e7eb',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
          }}
        >
          <div style={{ marginBottom: '12px', display: 'flex', gap: '12px', alignItems: 'center' }}>
            <h2 style={{ margin: 0, fontSize: '18px' }}>{template.name}</h2>
            <button
              onClick={() => saveMutation.mutate()}
              disabled={saveMutation.isPending}
              style={{
                padding: '8px 20px',
                backgroundColor: '#2563eb',
                color: '#fff',
                border: 'none',
                borderRadius: '4px',
                cursor: saveMutation.isPending ? 'not-allowed' : 'pointer',
                fontWeight: 500,
                opacity: saveMutation.isPending ? 0.7 : 1,
              }}
            >
              {saveMutation.isPending ? 'Saving...' : 'Save Template'}
            </button>
            {saveMessage && (
              <span style={{ fontSize: '14px', color: saveMessage.includes('!') ? '#16a34a' : '#ef4444' }}>
                {saveMessage}
              </span>
            )}
          </div>
          <PdfViewer
            pdfUrl={template.pdf_url}
            overlayContent={overlayContent}
            onPageRenderSuccess={handlePageRender}
          />
        </div>

        {/* Right Panel — Properties */}
        <div
          style={{
            width: '260px',
            borderLeft: '1px solid #e5e7eb',
            backgroundColor: '#f9fafb',
            flexShrink: 0,
            overflowY: 'auto',
          }}
        >
          <FieldProperties />
        </div>
      </div>
    </DndProvider>
  );
}
