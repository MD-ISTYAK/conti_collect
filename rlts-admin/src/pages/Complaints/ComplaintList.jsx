import { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { 
  Search, Download, ChevronLeft, ChevronRight, 
  Settings2, GripVertical, Eye, EyeOff, ListFilter,
  Plus, Trash2, Pencil, RotateCcw, Upload, CheckCircle2, AlertCircle, X
} from 'lucide-react';
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  createColumnHelper,
  getSortedRowModel,
  getFilteredRowModel,
} from '@tanstack/react-table';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { toast } from 'react-toastify';

import api from '../../api/axios';
import StatusChip from '../../components/StatusChip';
import Modal from '../../components/Modal';
import { formatDate, productTypeLabels } from '../../utils/formatters';

const STATUSES = ['', 'CREATED', 'APPROVED', 'CFA_ASSIGNED', 'PICKED_UP', 'RECEIVED_AT_CFA', 'VERIFIED', 'REFUND_PROCESSED', 'REJECTED'];

const BASE_AVAILABLE_FIELDS = [
  { id: 'complaintId', label: 'Complaint No. Case No', path: 'complaintId', type: 'id' },
  { id: 'status', label: 'Current Status', path: 'status', type: 'status' },
  { id: 'dealerCode', label: 'Dealer', path: 'dealerEntity.code', type: 'text' },
  { id: 'productName', label: 'Articale Number', path: 'productName', type: 'text' },
  { id: 'quantity', label: 'Quantity', path: 'quantity', type: 'number' },
  { id: 'reason', label: 'Return Reason', path: 'reason', type: 'text' },
  { id: 'description', label: 'Description', path: 'description', type: 'text' },
  { id: 'misCreatedAt', label: 'Created On', path: 'misCreatedAt', type: 'date' },
  { id: 'misAdjustedAt', label: 'Changed On', path: 'misAdjustedAt', type: 'date' },
  { id: 'createdAt', label: 'Imported On', path: 'createdAt', type: 'date' },
  { id: 'updatedAt', label: 'Changed On', path: 'updatedAt', type: 'date' },
  { id: 'refundAmount', label: 'Credit Value Net', path: 'refundAmount', type: 'currency' },
  { id: 'adminNotes', label: 'Admin Notes', path: 'adminNotes', type: 'text' },
  // Custom Metadata
  { id: 'mis_status', label: 'Status', path: 'customData.mis_status', type: 'text' },
  { id: 'status_remark', label: 'Status Remark', path: 'customData.status_remark', type: 'text' },
  { id: 'identification_no', label: 'Identification No.', path: 'customData.identification_no', type: 'text' },
  { id: 'ag', label: 'AG', path: 'customData.ag', type: 'text' },
  { id: 'asm', label: 'ASM', path: 'customData.asm', type: 'text' },
  { id: 'region', label: 'Region', path: 'customData.region', type: 'text' },
  { id: 'sales_office', label: 'Sales Office', path: 'customData.sales_office', type: 'text' },
  { id: 'dealer_reference', label: 'Dealer Reference', path: 'customData.dealer_reference', type: 'text' },
  { id: 'name_of_engineer', label: 'Name of Engineer', path: 'customData.name_of_engineer', type: 'text' },
  { id: 'general_status', label: 'General Status', path: 'customData.general_status', type: 'text' },
];

const DEFAULT_COLUMNS = [
  { id: 'default-19', fieldId: 'status', customLabel: 'Current Status' },
  { id: 'default-1', fieldId: 'complaintId', customLabel: 'Complaint No. Case No' },
  { id: 'default-3', fieldId: 'identification_no', customLabel: 'Identification No.' },
  { id: 'default-4', fieldId: 'productName', customLabel: 'Articale Number' },
  { id: 'default-5', fieldId: 'description', customLabel: 'Description' },
  { id: 'default-6', fieldId: 'ag', customLabel: 'AG' },
  { id: 'default-7', fieldId: 'dealerCode', customLabel: 'Dealer' },
  { id: 'default-9', fieldId: 'region', customLabel: 'Region' },
  { id: 'default-9a', fieldId: 'asm', customLabel: 'ASM' },
  { id: 'default-10', fieldId: 'misCreatedAt', customLabel: 'Created On' },
  { id: 'default-11', fieldId: 'misAdjustedAt', customLabel: 'Changed On' },
  { id: 'default-12', fieldId: 'sales_office', customLabel: 'Sales Office' },
  { id: 'default-13', fieldId: 'general_status', customLabel: 'General Status' },
  { id: 'default-14', fieldId: 'dealer_reference', customLabel: 'Dealer Reference' },
  { id: 'default-15', fieldId: 'name_of_engineer', customLabel: 'Name of Engineer' },
  { id: 'default-16', fieldId: 'refundAmount', customLabel: 'Credit Value Net' },
  { id: 'default-17', fieldId: 'mis_status', customLabel: 'Status' },
  { id: 'default-18', fieldId: 'status_remark', customLabel: 'Status Remark' },
];

const columnHelper = createColumnHelper();

const getNestedValue = (obj, path) => {
  if (path.startsWith('customData.')) {
     const key = path.replace('customData.', '');
     return obj.customData ? obj.customData[key] : undefined;
  }
  return path.split('.').reduce((acc, part) => acc && acc[part], obj);
};

const ComplaintList = () => {
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [meta, setMeta] = useState({ page: 1, pages: 1, total: 0 });
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const [isCustomizeModalOpen, setIsCustomizeModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  
  // Custom Fields Pool
  const [customFields, setCustomFields] = useState([]);
  const availableFields = useMemo(() => {
    const fields = [...BASE_AVAILABLE_FIELDS];
    customFields.forEach(cf => {
      // Avoid duplicates if already in BASE_AVAILABLE_FIELDS
      if (!fields.find(f => f.id === cf.key)) {
        fields.push({ id: cf.key, label: cf.label, path: `customData.${cf.key}`, type: cf.type });
      }
    });
    return fields;
  }, [customFields]);

  // Table Configuration
  const [userColumns, setUserColumns] = useState(() => {
    const saved = localStorage.getItem('complaints_user_columns_v10');
    return saved ? JSON.parse(saved) : DEFAULT_COLUMNS;
  });
  const [columnVisibility, setColumnVisibility] = useState(() => {
    const saved = localStorage.getItem('complaints_visibility_v10');
    return saved ? JSON.parse(saved) : {};
  });
  const [columnSizing, setColumnSizing] = useState(() => {
    const saved = localStorage.getItem('complaints_sizing_v10');
    return saved ? JSON.parse(saved) : {};
  });
  const [sorting, setSorting] = useState([]);

  const [filters, setFilters] = useState({
    status: searchParams.get('status') || '',
    search: searchParams.get('search') || '',
    page: parseInt(searchParams.get('page') || '1'),
  });

  const [rowSelection, setRowSelection] = useState({});
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDeleteSelected = async () => {
    const selectedIds = Object.keys(rowSelection);
    if (!selectedIds.length) return;
    if (!window.confirm(`Are you sure you want to delete ${selectedIds.length} complaint(s)? This action cannot be undone.`)) return;
    
    setIsDeleting(true);
    try {
      await api.post('/admin/complaints/delete', { ids: selectedIds });
      toast.success(`${selectedIds.length} complaint(s) deleted successfully.`);
      setRowSelection({});
      loadData();
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed to delete complaints');
    } finally {
      setIsDeleting(false);
    }
  };

  useEffect(() => {
    localStorage.setItem('complaints_user_columns_v10', JSON.stringify(userColumns));
  }, [userColumns]);
  useEffect(() => {
    localStorage.setItem('complaints_visibility_v10', JSON.stringify(columnVisibility));
  }, [columnVisibility]);
  useEffect(() => {
    localStorage.setItem('complaints_sizing_v10', JSON.stringify(columnSizing));
  }, [columnSizing]);

  const loadData = async () => {
    try {
      const [complaintRes, customRes] = await Promise.all([
        api.get('/complaints', { 
          params: {
            ...filters,
            sortBy: sorting.length ? sorting[0].id : 'createdAt',
            sortOrder: sorting.length ? (sorting[0].desc ? 'desc' : 'asc') : 'desc',
            limit: 20
          }
        }),
        api.get('/admin/custom-fields')
      ]);
      setComplaints(complaintRes.data.data || []);
      setMeta(complaintRes.data.meta || { page: 1, pages: 1, total: 0 });
      setCustomFields(customRes.data.data || []);
    } catch (e) {
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setLoading(true);
    loadData();
    const newParams = {};
    if (filters.status) newParams.status = filters.status;
    if (filters.search) newParams.search = filters.search;
    if (filters.page > 1) newParams.page = filters.page;
    setSearchParams(newParams);
  }, [filters, sorting]);

  const columns = useMemo(() => {
    const cols = userColumns.map(colDef => {
      const field = availableFields.find(f => f.id === colDef.fieldId);
      if (!field) return null;

      return columnHelper.accessor(field.id, {
        id: colDef.id,
        header: colDef.customLabel || field.label,
        size: columnSizing[colDef.id] || 150,
        cell: info => {
          const value = getNestedValue(info.row.original, field.path);
          if (value === null || value === undefined) return '—';

          switch (field.type) {
            case 'id': return <span className="text-sm font-semibold text-blue-600">{value}</span>;
            case 'status': {
              const timeline = info.row.original.timeline || [];
              const latestStatus = timeline.length > 0 ? timeline[timeline.length - 1].status : value;
              return <StatusChip status={latestStatus} />;
            }
            case 'date': return formatDate(value);
            case 'currency': return `₹${Number(value).toLocaleString()}`;
            case 'productType': return productTypeLabels[value] || value;
            default: return <span className="text-gray-700 truncate block">{String(value)}</span>;
          }
        },
      });
    }).filter(Boolean);

    // Unshift select column
    cols.unshift(
      columnHelper.display({
        id: 'selection',
        size: 50,
        header: ({ table }) => (
          <div className="flex justify-center items-center h-full w-full">
            <input
              type="checkbox"
              checked={table.getIsAllPageRowsSelected()}
              onChange={table.getToggleAllPageRowsSelectedHandler()}
              className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
            />
          </div>
        ),
        cell: ({ row }) => (
          <div className="flex justify-center items-center h-full w-full" onClick={e => e.stopPropagation()}>
            <input
              type="checkbox"
              checked={row.getIsSelected()}
              onChange={row.getToggleSelectedHandler()}
              className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
            />
          </div>
        )
      })
    );
    return cols;
  }, [userColumns, columnSizing, availableFields]);

  const table = useReactTable({
    data: complaints,
    columns,
    state: { columnVisibility, columnSizing, sorting, rowSelection },
    onColumnVisibilityChange: setColumnVisibility,
    onColumnSizingChange: setColumnSizing,
    onSortingChange: setSorting,
    onRowSelectionChange: setRowSelection,
    enableRowSelection: true,
    getRowId: row => row._id,
    columnResizeMode: 'onChange',
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    manualSorting: true,
  });

  return (
    <div className="space-y-4 animate-fade-in pb-10">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Complaints</h1>
          <p className="text-gray-500 text-sm mt-0.5">{meta.total} records found</p>
        </div>
        <div className="flex gap-2">
          {Object.keys(rowSelection).length > 0 && (
            <button
               onClick={handleDeleteSelected}
               disabled={isDeleting}
               className="px-4 py-2.5 bg-red-600 text-white rounded-xl text-sm font-semibold hover:bg-red-700 flex items-center gap-2 transition-all active:scale-95 shadow-sm disabled:opacity-50"
            >
              <Trash2 size={16} /> {isDeleting ? 'Deleting...' : `Delete (${Object.keys(rowSelection).length})`}
            </button>
          )}
          <button 
             onClick={() => setIsImportModalOpen(true)}
             className="px-4 py-2.5 bg-green-600 text-white rounded-xl text-sm font-semibold hover:bg-green-700 flex items-center gap-2 transition-all active:scale-95 shadow-sm"
          >
            <Upload size={16} /> Import MIS
          </button>
          <button 
            onClick={() => setIsCustomizeModalOpen(true)}
            className="px-4 py-2.5 bg-white border border-gray-200 text-gray-700 rounded-xl text-sm font-semibold hover:bg-gray-50 flex items-center gap-2 transition-all active:scale-95 shadow-sm"
          >
            <Settings2 size={16} className="text-blue-500" /> Customize Table
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex flex-wrap gap-4 items-center">
        <div className="relative flex-1 min-w-[280px]">
          <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search by ID or product..."
            value={filters.search}
            onChange={(e) => setFilters(f => ({ ...f, search: e.target.value, page: 1 }))}
            className="w-full pl-11 pr-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-blue-500 bg-gray-50/20"
          />
        </div>
        <div className="flex items-center gap-2 bg-gray-50/50 p-1 rounded-xl border border-gray-100">
           <ListFilter size={16} className="ml-2 text-gray-400" />
           <select
            value={filters.status}
            onChange={(e) => setFilters(f => ({ ...f, status: e.target.value, page: 1 }))}
            className="px-3 py-1.5 rounded-lg text-sm bg-transparent border-none focus:outline-none font-medium text-gray-700"
          >
            <option value="">All Statuses</option>
            {STATUSES.filter(Boolean).map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden relative">
        <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-gray-200">
          <table className="w-full border-collapse table-fixed" style={{ width: table.getCenterTotalSize() }}>
            <thead>
              {table.getHeaderGroups().map(group => (
                <tr key={group.id} className="bg-gray-50/80 border-b border-gray-100">
                  {group.headers.map(header => (
                    <th key={header.id} className="relative px-5 py-4 text-left text-[10px] font-bold text-gray-500 uppercase tracking-widest" style={{ width: header.getSize() }}>
                      <div className="flex items-center gap-1.5 cursor-pointer hover:text-blue-600 transition-colors" onClick={header.column.getToggleSortingHandler()}>
                        {flexRender(header.column.columnDef.header, header.getContext())}
                        {{ asc: ' ▲', desc: ' ▼' }[header.column.getIsSorted()] ?? null}
                      </div>
                      <div onMouseDown={header.getResizeHandler()} onTouchStart={header.getResizeHandler()} className={`absolute right-0 top-0 h-full w-1 cursor-col-resize select-none touch-none bg-blue-400 opacity-0 hover:opacity-100 transition-opacity ${header.column.getIsResizing() ? 'bg-blue-600 opacity-100' : ''}`} />
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                [...Array(5)].map((_, i) => (
                  <tr key={i}>
                    {table.getVisibleLeafColumns().map((_, j) => <td key={j} className="px-5 py-5"><div className="h-4 bg-gray-100 rounded-lg animate-pulse" /></td>)}
                  </tr>
                ))
              ) : complaints.length === 0 ? (
                <tr><td colSpan={table.getVisibleLeafColumns().length} className="px-5 py-20 text-center text-gray-400 font-medium">No complaints found</td></tr>
              ) : (
                table.getRowModel().rows.map(row => (
                  <tr key={row.id} onClick={() => navigate(`/complaints/${row.original._id}`)} className="hover:bg-blue-50/40 cursor-pointer transition-all duration-200">
                    {row.getVisibleCells().map(cell => (
                      <td key={cell.id} className="px-5 py-4 overflow-hidden text-ellipsis whitespace-nowrap text-sm" style={{ width: cell.column.getSize() }}>
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        
        {/* Pagination Rendering */}
        {meta.pages > 1 && (
            <div className="px-6 py-4 flex items-center justify-between border-t border-gray-100 bg-gray-50/20">
                <span className="text-xs font-medium text-gray-500">Page {meta.page} of {meta.pages}</span>
                <div className="flex gap-2">
                    <button onClick={() => setFilters(f => ({ ...f, page: f.page - 1 }))} disabled={meta.page <= 1} className="p-2 border rounded-lg hover:bg-white disabled:opacity-30"><ChevronLeft size={16}/></button>
                    <button onClick={() => setFilters(f => ({ ...f, page: f.page + 1 }))} disabled={meta.page >= meta.pages} className="p-2 border rounded-lg hover:bg-white disabled:opacity-30"><ChevronRight size={16}/></button>
                </div>
            </div>
        )}
      </div>

      <CustomizeModal isOpen={isCustomizeModalOpen} onClose={() => setIsCustomizeModalOpen(false)} userColumns={userColumns} setUserColumns={setUserColumns} columnVisibility={columnVisibility} setColumnVisibility={setColumnVisibility} availableFields={availableFields} />
      <ImportModal isOpen={isImportModalOpen} onClose={() => { setIsImportModalOpen(false); loadData(); }} />
    </div>
  );
};

const CustomizeModal = ({ isOpen, onClose, userColumns, setUserColumns, columnVisibility, setColumnVisibility, availableFields }) => {
  const [editingId, setEditingId] = useState(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newCol, setNewCol] = useState({ fieldId: availableFields[0].id, label: '' });

  const handleDragEnd = (event) => {
    const { active, over } = event;
    if (active && over && active.id !== over.id) {
      setUserColumns(items => {
        const oldIndex = items.findIndex(i => i.id === active.id);
        const newIndex = items.findIndex(i => i.id === over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  const sensors = useSensors(useSensor(PointerSensor), useSensor(KeyboardSensor));

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Customize Table" size="md">
      <div className="space-y-6">
        <div className="flex justify-between items-center px-1">
          <button onClick={() => setShowAddForm(!showAddForm)} className="text-sm font-bold text-blue-600 flex items-center gap-1.5"><Plus size={16}/> Add Column</button>
          <button onClick={() => { if(confirm('Reset to defaults?')){ setUserColumns(DEFAULT_COLUMNS); setColumnVisibility({}); onClose(); } }} className="text-sm font-bold text-gray-400 flex items-center gap-1.5"><RotateCcw size={16}/> Reset</button>
        </div>

        {showAddForm && (
          <div className="p-4 bg-gray-50 rounded-2xl border space-y-4">
             <div className="grid grid-cols-2 gap-4">
               <input type="text" placeholder="Label" value={newCol.label} onChange={e => setNewCol({...newCol, label: e.target.value})} className="px-3 py-2 border rounded-xl text-sm" />
               <select value={newCol.fieldId} onChange={e => setNewCol({...newCol, fieldId: e.target.value})} className="px-3 py-2 border rounded-xl text-sm">
                 {availableFields.map(f => <option key={f.id} value={f.id}>{f.label}</option>)}
               </select>
             </div>
             <button onClick={() => { if(newCol.label){ setUserColumns([...userColumns, { id: `col-${Date.now()}`, fieldId: newCol.fieldId, customLabel: newCol.label }]); setShowAddForm(false); setNewCol({ fieldId: availableFields[0].id, label: '' }); } }} className="w-full py-2 bg-blue-600 text-white rounded-xl text-sm font-bold">Add Column</button>
          </div>
        )}

        <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
          <SortableContext items={userColumns.map(c => c.id)} strategy={verticalListSortingStrategy}>
            <div className="space-y-2">
              {userColumns.map(col => {
                const field = availableFields.find(f => f.id === col.fieldId);
                const isVisible = columnVisibility[col.id] ?? true;
                return (
                  <SortableItem key={col.id} col={col} isVisible={isVisible} field={field} 
                    onToggle={() => setColumnVisibility({...columnVisibility, [col.id]: !isVisible})}
                    onDelete={() => setUserColumns(userColumns.filter(c => c.id !== col.id))}
                    onLabelChange={val => setUserColumns(userColumns.map(c => c.id === col.id ? {...c, customLabel: val} : c))}
                    isEditing={editingId === col.id}
                    onEdit={() => setEditingId(editingId === col.id ? null : col.id)}
                  />
                );
              })}
            </div>
          </SortableContext>
        </DndContext>
        <button onClick={onClose} className="w-full py-2.5 bg-gray-900 text-white rounded-xl text-sm font-bold">Close</button>
      </div>
    </Modal>
  );
};

const SortableItem = ({ col, isVisible, isEditing, field, onToggle, onDelete, onEdit, onLabelChange }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: col.id });
  return (
    <div ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition, zIndex: isDragging ? 10 : 1 }} className="flex items-center gap-3 p-3 bg-white border rounded-xl">
      <div {...attributes} {...listeners} className="cursor-grab text-gray-300"><GripVertical size={18}/></div>
      <div className="flex-1">
        {isEditing ? <input value={col.customLabel} onChange={e => onLabelChange(e.target.value)} autoFocus onBlur={onEdit} className="text-sm font-bold border rounded px-1" /> : <div className="flex items-center gap-2"><span className={`text-sm font-bold ${isVisible ? 'text-gray-700' : 'text-gray-400'}`}>{col.customLabel}</span><button onClick={onEdit} className="text-gray-300 hover:text-blue-600"><Pencil size={12}/></button></div>}
        <p className="text-[9px] text-gray-400 uppercase font-bold">{field?.label || 'Unknown'}</p>
      </div>
      <div className="flex gap-1">
        <button onClick={onToggle} className={`p-2 rounded-lg ${isVisible ? 'text-blue-600 bg-blue-50' : 'text-gray-300 bg-gray-50'}`}>{isVisible ? <Eye size={16}/> : <EyeOff size={16}/>}</button>
        <button onClick={onDelete} className="p-2 text-gray-300 hover:text-red-500 rounded-lg"><Trash2 size={16}/></button>
      </div>
    </div>
  );
};

const ImportModal = ({ isOpen, onClose }) => {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  useEffect(() => {
    if (isOpen) {
      setFile(null);
      setResult(null);
      setLoading(false);
    }
  }, [isOpen]);

  const handleImport = async () => {
    if (!file) return;
    setLoading(true);
    const formData = new FormData();
    formData.append('file', file);
    try {
      const { data } = await api.post('/admin/complaints/import', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setResult(data);
    } catch (e) {
      toast.error(e.response?.data?.message || 'Import failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Import MIS Excel" size="md">
        <div className="space-y-6 py-2">
            {!result ? (
                <>
                    <p className="text-sm text-gray-500">Upload an Excel or CSV file (.xlsx, .csv) to import complaints. The system will skip any records with duplicate <strong>Complaint IDs</strong>.</p>
                    <div className={`mt-4 border-2 border-dashed rounded-2xl p-10 flex flex-col items-center justify-center transition-all ${file ? 'border-blue-400 bg-blue-50/30' : 'border-gray-200 hover:border-blue-300'}`}>
                        <input type="file" id="file" accept=".xlsx, .csv" className="hidden" onChange={e => setFile(e.target.files[0])}/>
                        <label htmlFor="file" className="cursor-pointer flex flex-col items-center">
                            <div className={`p-4 rounded-full mb-3 ${file ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-400'}`}>
                                <Upload size={32} />
                            </div>
                            <span className="text-sm font-bold text-gray-700">{file ? file.name : 'Select MIS Excel/CSV File'}</span>
                            <span className="text-xs text-gray-400 mt-1">Standard format with Complaint ID required</span>
                        </label>
                        {file && <button onClick={() => setFile(null)} className="mt-4 text-xs font-bold text-red-500 flex items-center gap-1"><X size={14}/> Remove file</button>}
                    </div>
                </>
            ) : (
                <div className="space-y-6 text-center py-4 animate-in fade-in zoom-in-95">
                    <div className="mx-auto w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center shadow-inner">
                        <CheckCircle2 size={32} />
                    </div>
                    <div>
                        <h3 className="text-xl font-bold text-gray-900">Import Complete</h3>
                        <p className="text-sm text-gray-500 mt-1">{result.message}</p>
                    </div>
                    <div className="grid grid-cols-3 gap-4 border-t border-b py-6 border-gray-100">
                        <div className="text-center">
                            <p className="text-[10px] uppercase font-bold text-gray-400 tracking-widest">Imported</p>
                            <p className="text-2xl font-black text-green-600 mt-1">{result.summary.imported}</p>
                        </div>
                        <div className="text-center">
                            <p className="text-[10px] uppercase font-bold text-gray-400 tracking-widest">Updated</p>
                            <p className="text-2xl font-black text-blue-600 mt-1">{result.summary.updated || 0}</p>
                        </div>
                        <div className="text-center">
                            <p className="text-[10px] uppercase font-bold text-gray-400 tracking-widest">Duplicates</p>
                            <p className="text-2xl font-black text-gray-600 mt-1">{result.summary.duplicates}</p>
                        </div>
                        <div className="text-center">
                            <p className="text-[10px] uppercase font-bold text-gray-400 tracking-widest">Errors</p>
                            <p className="text-2xl font-black text-red-600 mt-1">{result.summary.errors}</p>
                        </div>
                    </div>

                    {result.summary.errorDetails && result.summary.errorDetails.length > 0 && (
                        <div className="mt-4 text-left">
                            <p className="text-[11px] font-bold text-red-500 uppercase tracking-wider mb-2">Error Details</p>
                            <div className="max-h-[200px] overflow-y-auto bg-red-50/50 rounded-xl border border-red-100 p-3 space-y-2 scrollbar-thin">
                                {result.summary.errorDetails.map((err, idx) => (
                                    <div key={idx} className="text-xs flex gap-2">
                                        <span className="font-bold text-red-600 flex-shrink-0">Row {err.row}:</span>
                                        <span className="text-red-700 font-medium">{err.message}</span>
                                        {err.id && <span className="text-[10px] text-red-400 font-mono">({err.id})</span>}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}

            <div className="flex gap-3 mt-8">
                <button onClick={onClose} className="flex-1 py-3 text-sm font-bold text-gray-600 hover:bg-gray-50 rounded-xl transition-all">Close</button>
                {!result && (
                    <button 
                        onClick={handleImport} 
                        disabled={!file || loading} 
                        className="flex-2 py-3 px-8 bg-blue-600 text-white rounded-xl text-sm font-bold shadow-lg shadow-blue-500/25 disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                        {loading ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/> Processing...</> : 'Start Import'}
                    </button>
                )}
            </div>
        </div>
    </Modal>
  );
};

export default ComplaintList;
