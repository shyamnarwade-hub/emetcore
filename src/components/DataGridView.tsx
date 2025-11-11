import { memo, useCallback, useEffect, useMemo, useRef } from 'react';
import { Box, FormControl, InputLabel, MenuItem, Select, SelectChangeEvent, Stack, Typography } from '@mui/material';
import { AgGridReact } from 'ag-grid-react';
import type { ColDef, GridApi, GridReadyEvent, RowClassRules } from 'ag-grid-community';
import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-quartz.css';

export type AppRow = Record<string, unknown>;

interface Props {
  allColumns: string[];
  columns: string[]; // visible columns
  rows: AppRow[];
  pageSize: number;
  onPageSizeChange: (n: number) => void;
}

const DataGridView = memo(function DataGridView({ allColumns, columns, rows, pageSize, onPageSizeChange }: Props) {
  const gridApiRef = useRef<GridApi | null>(null);

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
        const v = rows[i]?.[c];
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

  const colDefs: ColDef[] = useMemo(() => {
    return columns.map((c) => {
      const isDate = dateColumns.has(c);
      const isFlag = c === 'Selected' || c === 'Override';
      const isStatus = c === 'Status';
      const base: ColDef = {
        field: c,
        headerName: c,
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
        // Keep grid display unchanged (let raw values render)
        delete (base as any).valueFormatter;
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

  const onGridReady = useCallback((params: GridReadyEvent) => {
    gridApiRef.current = params.api;
    // Fit columns to available width
    params.api.sizeColumnsToFit();
  }, []);

  useEffect(() => {
    const resize = () => gridApiRef.current?.sizeColumnsToFit();
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, []);

  const handlePageSizeChange = (e: SelectChangeEvent<number>) => {
    const val = Number(e.target.value);
    onPageSizeChange(val);
    if (gridApiRef.current) {
      (gridApiRef.current as any).setGridOption?.('paginationPageSize', val);
    }
  };

  const noData = rows.length === 0 || columns.length === 0;

  return (
    <Box display="flex" flexDirection="column" height="100%" gap={1}>
      {/* <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="center" justifyContent="space-between">
        <FormControl size="small" sx={{ minWidth: 160 }}>
          <InputLabel id="page-size-label">Rows per page</InputLabel>
          <Select<number>
            labelId="page-size-label"
            value={pageSize}
            label="Rows per page"
            onChange={handlePageSizeChange}
          >
            {[10, 20, 25, 50, 100, 250, 500].map((n) => (
              <MenuItem key={n} value={n}>
                {n}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Stack> */}

      <Box className="ag-theme-quartz" sx={{ flex: 1, minHeight: 300 }}>
        <AgGridReact
          columnDefs={colDefs}
          rowData={noData ? [] : rows}
          pagination
          paginationPageSize={pageSize}
          animateRows
          rowSelection="multiple"
          onGridReady={onGridReady}
          suppressColumnVirtualisation={false}
          enableBrowserTooltips
          rowClassRules={rowClassRules}
          localeText={{ dateFormat: 'DD/MM/YYYY' }}
          defaultColDef={{
            sortable: true,
            filter: true,
            resizable: true,
          }}
        />
      </Box>
    </Box>
  );
});

export default DataGridView;
