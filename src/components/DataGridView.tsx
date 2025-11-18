import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Box, FormControl, InputLabel, MenuItem, Select, SelectChangeEvent, Stack, Typography, TextField, Button } from '@mui/material';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import dayjs, { Dayjs } from 'dayjs';
import GridToolbar from './GridToolbar';
import GridActionsToolbar from './GridActionsToolbar';
import { AgGridReact } from 'ag-grid-react';
import type { ColDef, GridApi, GridReadyEvent, RowClassRules, FirstDataRenderedEvent } from 'ag-grid-community';
import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-quartz.css';

export type AppRow = Record<string, unknown>;

interface Props {
  allColumns: string[];
  columns: string[]; // visible columns
  rows: AppRow[];
  pageSize: number;
  onPageSizeChange: (n: number) => void;
  onColumnsChange?: (cols: string[]) => void;
  preferredDefaults?: string[];
  onBatchNotices?: () => void;
}

const DataGridView = memo(function DataGridView({ allColumns, columns, rows, pageSize, onPageSizeChange, onColumnsChange, preferredDefaults, onBatchNotices }: Props) {
  const gridApiRef = useRef<GridApi | null>(null);
  const columnApiRef = useRef<any>(null);
  const initializedRef = useRef(false);

  // Filters state (left side toolbar)
  const [letterCode, setLetterCode] = useState<string>('');
  const [accountNumber, setAccountNumber] = useState<string>('');
  const [fromDate, setFromDate] = useState<string>(''); // MM/DD/YYYY
  const [toDate, setToDate] = useState<string>('');

  // Utility: parse various date string formats common in CSV/Excel
  const parseDate = useCallback((value: unknown): Date | null => {
    if (value == null) return null;
    if (value instanceof Date && !isNaN(value.getTime())) return value;
    const s = String(value).trim();
    if (!s) return null;
    // Try native Date first (can handle some formats)
    const d1 = new Date(s);
    if (!isNaN(d1.getTime())) return d1;
    // Try MM/DD/YYYY[ HH:mm[:ss]] or MM/DD/YY
    const m = s.match(/^\s*(\d{1,2})\/(\d{1,2})\/(\d{2,4})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?\s*$/);
    if (m) {
      const mm = Number(m[1]);
      const dd = Number(m[2]);
      let yy = Number(m[3]);
      if (yy < 100) yy += yy >= 70 ? 1900 : 2000; // pivot for 2-digit years
      const HH = m[4] ? Number(m[4]) : 0;
      const MM = m[5] ? Number(m[5]) : 0;
      const SS = m[6] ? Number(m[6]) : 0;
      const d = new Date(yy, mm - 1, dd, HH, MM, SS);
      return isNaN(d.getTime()) ? null : d;
    }
    return null;
  }, []);

  // Columns that must never be treated as dates
  const EXCLUDE_DATE_COLUMNS = useMemo(() => new Set<string>(['LetterNoticeID']), []);

  // Heuristic: consider a column a date if name hints or sample values parse as dates
  const dateColumns = useMemo(() => {
    const nameLooksDate = (name: string) => /date|time/i.test(name);
    const sampleCount = Math.min(rows.length, 50);
    const result = new Set<string>();
    allColumns.forEach((c) => {
      if (EXCLUDE_DATE_COLUMNS.has(c)) return; // explicit opt-out
      if (nameLooksDate(c)) {
        result.add(c);
        return;
      }
      if (sampleCount === 0) return;
      let hits = 0;
      let seen = 0;
      for (let i = 0; i < sampleCount; i++) {
        const v = (rows[i] as any)?.[c];
        if (v === '' || v == null) continue;
        seen++;
        if (parseDate(v)) hits++;
        if (seen >= 10) break; // enough samples
      }
      if (seen > 0 && hits / seen >= 0.6) result.add(c);
    });
    return result;
  }, [allColumns, rows, parseDate, EXCLUDE_DATE_COLUMNS]);

  const dateComparator = useCallback((filterLocalDateAtMidnight: Date | null, cellValue: any) => {
    // AG Grid passes null when no date is set; in that case don't match
    if (!filterLocalDateAtMidnight) return -1;
    const cellDate = parseDate(cellValue);
    if (!cellDate) return -1; // treat empty/non-date as less than
    // Compare by date only (ignore time)
    const a = new Date(cellDate.getFullYear(), cellDate.getMonth(), cellDate.getDate()).getTime();
    const b = new Date(filterLocalDateAtMidnight.getFullYear(), filterLocalDateAtMidnight.getMonth(), filterLocalDateAtMidnight.getDate()).getTime();
    if (a === b) return 0;
    return a < b ? -1 : 1;
  }, [parseDate]);

  const statusTextColor = useCallback((status: string | null | undefined) => {
    switch (status) {
      case 'Generating':
        return '#d32f2f'; // red
      case 'Processed':
        return '#7b1fa2'; // purple
      case 'Approved':
        return '#2e7d32'; // green
      case 'Flagged':
        return '#ed6c02'; // orange
      default:
        return undefined; // default/inherit
    }
  }, []);

  // Row background color excluding first three columns: we'll apply a class to the row then style cell backgrounds via CSS for non-flag columns.
  const rowClassRules: RowClassRules = useMemo(() => ({
    'row-status-review': params => params.data?.Status === 'Review',
    'row-status-flagged': params => params.data?.Status === 'Flagged',
    'row-status-generating': params => params.data?.Status === 'Generating',
    'row-status-processed': params => params.data?.Status === 'Processed',
    'row-status-approved': params => params.data?.Status === 'Approved',
    'row-status-pending': params => params.data?.Status === 'Pending',
  }), []);

  // Header renames for display only (underlying field keys unchanged)
  const headerNameMap: Record<string, string> = useMemo(() => ({
    // Previously requested
    ErrorText: 'Flag',
    // New mappings
    LetterNoticeID: 'Document ID',
    LoanNumber: 'Account Number',
    LetterCode: 'Letter Code',
    BorrowerFullName: 'Full Name',
    LetterDate: 'Letter Date',
    RecipientType: 'Recipient Type',
    RecipientTypeDescription: 'Recipient Type Description',
  }), []);

  const colDefs: ColDef[] = useMemo(() => {
    return columns.map((c) => {
      const isDate = dateColumns.has(c);
      const isFlag = c === 'Selected' || c === 'Override';
      const isStatus = c === 'Status';
      const base: ColDef = {
        field: c,
        headerName: headerNameMap[c] ?? c,
        headerTooltip: headerNameMap[c] ?? c,
        sortable: true,
        resizable: true,
        minWidth: isFlag ? 80 : 140,
      };
      if (isDate) {
        base.filter = 'agDateColumnFilter';
        base.filterParams = {
          comparator: dateComparator,
          browserDatePicker: true,
        } as any;
        // Use a value formatter so dates show with full 4-digit year (MM/DD/YYYY)
        base.valueFormatter = (params: any) => {
          const d = parseDate(params.value);
          if (!d) return params.value ?? '';
          const mm = String(d.getMonth() + 1).padStart(2, '0');
          const dd = String(d.getDate()).padStart(2, '0');
          const yyyy = String(d.getFullYear());
          return `${mm}/${dd}/${yyyy}`;
        };
        // Ensure sorting compares by date value, not string
        base.comparator = (a: any, b: any) => {
          const da = parseDate(a)?.getTime() ?? Number.NEGATIVE_INFINITY;
          const db = parseDate(b)?.getTime() ?? Number.NEGATIVE_INFINITY;
          if (da === db) return 0;
          return da < db ? -1 : 1;
        };
      } else if (isFlag) {
        base.filter = false;
        base.cellRenderer = (params: any) => {
          const checked = !!params.value;
          const onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
            params.node.setDataValue(c, e.target.checked);
          };
          return (
            <input
              type="checkbox"
              style={{
                cursor: 'pointer',
                accentColor: '#6b7280',
                width: 16,
                height: 16,
                transform: 'translateY(1px)',
              }}
              checked={checked}
              onChange={onChange}
            />
          );
        };
        base.editable = false;
      } else if (isStatus) {
        base.filter = true;
        base.cellStyle = (params: any) => {
          const color = statusTextColor(params.value);
          const style: any = {};
          if (color) style.color = color;
          if (params.value) style.fontWeight = 500;
          return style;
        };
      } else {
        base.filter = true;
      }
      return base;
    });
  }, [columns, dateColumns, dateComparator, statusTextColor]);

  const autoSizeAll = useCallback(() => {
    // Prefer new API if available; fallback to legacy columnApi
    const api: any = gridApiRef.current as any;
    const colApi: any = columnApiRef.current as any;
    if (api && typeof api.autoSizeAllColumns === 'function') {
      api.autoSizeAllColumns();
    } else if (colApi && typeof colApi.autoSizeAllColumns === 'function') {
      colApi.autoSizeAllColumns();
    }
  }, []);

  const onGridReady = useCallback((params: GridReadyEvent) => {
    gridApiRef.current = params.api;
    // Some versions expose columnApi, keep it if present
    (columnApiRef as any).current = (params as any).columnApi ?? null;
    // Auto-size to header content so full header names are visible; allow horizontal scroll
    setTimeout(() => autoSizeAll(), 0);
  }, [autoSizeAll]);

  const onFirstDataRendered = useCallback((e: FirstDataRenderedEvent) => {
    // Ensure sizing after data arrives as well
    autoSizeAll();
  }, [autoSizeAll]);

  useEffect(() => {
    const resize = () => autoSizeAll();
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, [autoSizeAll]);

  const handlePageSizeChange = (e: SelectChangeEvent<number>) => {
    const val = Number(e.target.value);
    onPageSizeChange(val);
    if (gridApiRef.current) {
      (gridApiRef.current as any).setGridOption?.('paginationPageSize', val);
    }
  };

  const noData = rows.length === 0 || columns.length === 0;

  // Compute unique Letter Code values from all loaded rows
  const letterCodeOptions = useMemo(() => {
    const set = new Set<string>();
    rows.forEach((r) => {
      const v = String((r as any)['LetterCode'] ?? '').trim();
      if (v) set.add(v);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [rows]);

  const fmt = useCallback((d: Date) => {
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const yyyy = d.getFullYear();
    return `${mm}/${dd}/${yyyy}`;
  }, []);

  // Default last 7 days range when new rows arrive (first load per dataset)
  useEffect(() => {
    if (!initializedRef.current && rows.length > 0) {
      const today = new Date();
      const from = new Date(today);
      from.setDate(today.getDate() - 7);
      setFromDate(fmt(new Date(from.getFullYear(), from.getMonth(), from.getDate())));
      setToDate(fmt(today));
      setLetterCode('');
      setAccountNumber('');
      initializedRef.current = true;
    }
  }, [rows.length, fmt]);

  const applyReset = useCallback(() => {
    const today = new Date();
    const from = new Date(today);
    from.setDate(today.getDate() - 7);
    setFromDate(fmt(new Date(from.getFullYear(), from.getMonth(), from.getDate())));
    setToDate(fmt(today));
    setLetterCode('');
    setAccountNumber('');
    // Clear any ag-Grid internal filters just in case
    gridApiRef.current?.setFilterModel(null as any);
  }, [fmt]);

  // Derived filtered rows based on toolbar filters
  const filteredRows = useMemo(() => {
    if (noData) return [] as AppRow[];
    const start = fromDate ? parseDate(fromDate) : null;
    const end = toDate ? parseDate(toDate) : null;
    if (start) start.setHours(0, 0, 0, 0);
    if (end) end.setHours(23, 59, 59, 999);
    const acct = accountNumber.trim();
    const code = letterCode.trim();
    return rows.filter((r) => {
      // Date filter on LetterDate
      if (start || end) {
        const d = parseDate((r as any)['LetterDate']);
        if (!d) return false;
        if (start && d < start) return false;
        if (end && d > end) return false;
      }
      // Letter Code filter
      if (code && String((r as any)['LetterCode'] ?? '') !== code) return false;
      // Account Number filter (substring match on LoanNumber)
      if (acct) {
        const ln = String((r as any)['LoanNumber'] ?? '').toLowerCase();
        if (!ln.includes(acct.toLowerCase())) return false;
      }
      return true;
    });
  }, [noData, rows, fromDate, toDate, letterCode, accountNumber, parseDate]);

  return (
    <Box display="flex" flexDirection="column" height="100%">
      {/* Toolbar with rounded top corners and shared border frame */}
      <Box
        sx={{
          px: 1.5,
          py: 1.25,
          border: 2,
          borderColor: 'divider',
          borderTopLeftRadius: 8,
          borderTopRightRadius: 8,
          borderBottom: 0,
          bgcolor: 'background.paper',
          overflow: 'hidden',
          minHeight: 60,
          display: 'grid',
          gridTemplateColumns: 'auto auto 1fr',
          alignItems: 'center',
          columnGap: 8,
        }}
      >
        {/* Section 1: Letter Code + Account Number (stacked) */}
        <Stack direction="column" spacing={0.75} alignItems="stretch" sx={{ overflow: 'visible' }}>
          <FormControl size="small" sx={{ minWidth: 160, '& .MuiInputBase-root': { height: 36 } }}>
            <InputLabel id="lc-label">Letter Code</InputLabel>
            <Select
              labelId="lc-label"
              value={letterCode as any}
              label="Letter Code"
              onChange={(e) => setLetterCode(String(e.target.value))}
            >
              <MenuItem value="">
                <em>All</em>
              </MenuItem>
              {letterCodeOptions.map((opt) => (
                <MenuItem key={opt} value={opt}>{opt}</MenuItem>
              ))}
            </Select>
          </FormControl>
          <TextField
            size="small"
            label="Account Number"
            autoComplete="off"
            value={accountNumber}
            onChange={(e) => setAccountNumber(e.target.value)}
            sx={{ width: 220, '& .MuiInputBase-root': { height: 36 }, '& input': { p: '6px 8px' } }}
          />
        </Stack>
        {/* Section 2: Letter Date (caption + From/To + Reset) */}
        <Stack direction="column" spacing={0.5} alignItems="stretch" sx={{ overflow: 'visible' }}>
          <Typography variant="caption" sx={{ color: 'text.secondary', pl: 0.25 }}>Letter Date</Typography>
          <LocalizationProvider dateAdapter={AdapterDayjs}>
            <Stack direction="row" spacing={0.75} alignItems="center">
              <DatePicker
                value={fromDate ? dayjs(fromDate, 'MM/DD/YYYY') : null}
                onChange={(d: Dayjs | null) => setFromDate(d && d.isValid() ? d.format('MM/DD/YYYY') : '')}
                format="MM/DD/YYYY"
                slotProps={{ textField: { size: 'small', sx: { width: 150, '& .MuiInputBase-root': { height: 36 } } } }}
                label="From"
              />
              <DatePicker
                value={toDate ? dayjs(toDate, 'MM/DD/YYYY') : null}
                onChange={(d: Dayjs | null) => setToDate(d && d.isValid() ? d.format('MM/DD/YYYY') : '')}
                format="MM/DD/YYYY"
                slotProps={{ textField: { size: 'small', sx: { width: 150, '& .MuiInputBase-root': { height: 36 } } } }}
                label="To"
              />
              <Button size="small" variant="outlined" onClick={applyReset} sx={{ height: 36, whiteSpace: 'nowrap' }}>Reset</Button>
            </Stack>
          </LocalizationProvider>
        </Stack>
        {/* Section 3: Action buttons + Columns chooser, flexes to take remaining space */}
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', width: '100%', overflowX: 'auto', gap: 1, pr: 1, justifySelf: 'stretch' }}>
          <GridActionsToolbar onBatchNotices={onBatchNotices} />
          <GridToolbar
            allColumns={allColumns}
            selectedColumns={columns}
            onChange={(cols) => onColumnsChange && onColumnsChange(cols)}
            preferredDefaults={preferredDefaults}
          />
        </Box>
      </Box>

      {/* Grid with straight borders (no rounding), aligned to toolbar frame */}
      <Box
        className="ag-theme-quartz"
        sx={{
          flex: 1,
          minHeight: 300,
          borderLeft: 2,
          borderRight: 2,
          borderBottom: 2,
          borderTop: 0,
          borderColor: 'divider',
          borderRadius: 0,
        }}
      >
        <AgGridReact
          columnDefs={colDefs}
          rowData={noData ? [] : filteredRows}
          pagination
          paginationPageSize={pageSize}
          animateRows
          rowSelection="multiple"
          onGridReady={onGridReady}
          onFirstDataRendered={onFirstDataRendered}
          suppressColumnVirtualisation={false}
          enableBrowserTooltips
          rowClassRules={rowClassRules}
          localeText={{ dateFormat: 'MM/DD/YYYY' }}
          defaultColDef={{
            sortable: true,
            filter: true,
            resizable: true,
            tooltipValueGetter: (p: any) => (p?.value == null ? '' : String(p.value)),
          }}
        />
      </Box>
    </Box>
  );
});

export default DataGridView;
