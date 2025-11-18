import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ThemeProvider, CssBaseline, Container, Box, Snackbar, Alert, CircularProgress, Stack, Typography } from '@mui/material';
import { getAppTheme } from './theme';
import Header from './components/Header';
import FileUploader, { ParsedData, FileUploaderHandle } from './components/FileUploader';
// import ColumnSelector from './components/ColumnSelector';
import DataGridView, { AppRow } from './components/DataGridView';
import Login from './components/Login';
import * as XLSX from 'xlsx';

const DEFAULT_VISIBLE_COLS = 8; // legacy fallback if needed
const PREFERRED_DEFAULTS = [
  'LetterNoticeID',
  'LoanNumber',
  'LetterCode',
  'BorrowerFullName',
  'LetterDate',
  'RecipientType',
  'RecipientTypeDescription',
  'ErrorText'
];

function App() {
  const [mode, setMode] = useState<'light' | 'dark'>('light');
  const theme = useMemo(() => getAppTheme(mode), [mode]);

  const [allColumns, setAllColumns] = useState<string[]>([]);
  const [selectedColumns, setSelectedColumns] = useState<string[]>([]);
  const [rows, setRows] = useState<AppRow[]>([]);
  const [pageSize, setPageSize] = useState<number>(20);
  const [parsing, setParsing] = useState<boolean>(false);
  const [authed, setAuthed] = useState<boolean>(() => sessionStorage.getItem('auth') === '1');
  const defaultLoadedRef = useRef(false);
  const uploaderRef = useRef<FileUploaderHandle | null>(null);

  const [error, setError] = useState<string | null>(null);

  const deriveStatus = (r: Record<string, any>): string | null => {
    const Error = toNum(r['Error']);
    const Complete = toNum(r['Complete']);
    const Approved = toNum(r['Approved']);
    const Processing = toNum(r['Processing']);
    const RowColor = toNum(r['RowColor'] ?? r['Rowcolor']); // handle Rowcolor vs RowColor casing
    // Conditions (evaluate in given order)
    if (Error === 0 && Complete === 0 && Approved === 0 && Processing === -1) return 'Generating';
    if (Error === 0 && Complete === -1 && Approved === 0 && Processing === 0 && RowColor === 4) return 'Review';
    if (Error === 0 && Complete === -1 && Approved === 0 && Processing === 0) return 'Processed';
    if (Error === 0 && Complete === -1 && Approved === -1 && Processing === 0) return 'Approved';
    if (Error === 0 && Complete === 0 && Approved === 0 && Processing === 0 && (RowColor === 0 || RowColor === 4)) return 'Pending';
    if (Error === -1 && Complete === 0 && Approved === 0 && Processing === 0 && RowColor === 1) return 'Flagged';
    return null;
  };

  const toNum = (v: any): number | null => {
    if (v === null || v === undefined || v === '') return null;
    const n = Number(v);
    return isNaN(n) ? null : n;
  };

  const onParsed = useCallback((data: ParsedData) => {
    const { columns, rows } = data;
    const extra = ['Selected', 'Override', 'Status'];
    const mergedColumns = Array.from(new Set<string>([...extra, ...columns]));
    const augmentedRows: AppRow[] = rows.map(r => ({
      ...r,
      Selected: false,
      Override: false,
      Status: deriveStatus(r)
    }));
    // Default visible non-fixed columns in a preferred order if present
    const preferred = PREFERRED_DEFAULTS.filter((c) => columns.includes(c));
    const visible = Array.from(new Set<string>([
      ...extra,
      ...preferred,
    ]));
    setAllColumns(mergedColumns);
    setSelectedColumns(visible);
    setRows(augmentedRows);
  }, []);

  const clearData = useCallback(() => {
    setAllColumns([]);
    setSelectedColumns([]);
    setRows([]);
  }, []);

  const themeToggle = useCallback(() => {
    setMode((m: 'light' | 'dark') => (m === 'light' ? 'dark' : 'light'));
  }, []);

  // Persist page size choice per session
  useEffect(() => {
    const stored = sessionStorage.getItem('pageSize');
    if (stored) setPageSize(Number(stored));
  }, []);
  useEffect(() => {
    sessionStorage.setItem('pageSize', String(pageSize));
  }, [pageSize]);

  const handleLoginSuccess = useCallback(() => {
    setAuthed(true);
  }, []);

  const handleLogout = useCallback(() => {
    sessionStorage.removeItem('auth');
    setAuthed(false);
    clearData();
    defaultLoadedRef.current = false;
  }, [clearData]);

  // On login, automatically load the bundled sample CSV once per session
  useEffect(() => {
    if (!authed || defaultLoadedRef.current || rows.length > 0) return;
    let cancelled = false;
    const load = async () => {
      try {
        setParsing(true);
        const url = new URL('./file/SMS_LetterNotices_20251022080407.csv', import.meta.url).href;
        const res = await fetch(url);
        if (!res.ok) throw new Error(`Failed to load default CSV (${res.status})`);
        const text = await res.text();
        const wb = XLSX.read(text, { type: 'string' });
        const sheet = wb.Sheets[wb.SheetNames[0]];
        if (!sheet) throw new Error('Default CSV sheet missing');
        const json = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '', raw: false });
        const colSet = new Set<string>();
        json.forEach((row) => Object.keys(row).forEach((k) => colSet.add(k)));
        const dataColumns = Array.from(colSet);
        const extra = ['Selected', 'Override', 'Status'];
        const mergedColumns = Array.from(new Set<string>([...extra, ...dataColumns]));
        const augmentedRows: AppRow[] = json.map(r => ({
          ...r,
          Selected: false,
          Override: false,
          Status: deriveStatus(r)
        }));
        const preferred = PREFERRED_DEFAULTS.filter((c) => dataColumns.includes(c));
        const visible = Array.from(new Set<string>([
          ...extra,
          ...preferred,
        ]));
        if (!cancelled) {
          setAllColumns(mergedColumns);
          setSelectedColumns(visible);
          setRows(augmentedRows);
          defaultLoadedRef.current = true;
        }
      } catch (e: any) {
        if (!cancelled) setError(e?.message || 'Failed to load default file');
      } finally {
        if (!cancelled) setParsing(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [authed, rows.length]);

  const triggerBatchNotices = useCallback(() => {
    uploaderRef.current?.open();
  }, []);

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box className="app-container">
        <Header
          onToggleTheme={themeToggle}
          onLogout={authed ? handleLogout : undefined}
        />

        <Container className="content-wrapper">
          {!authed ? (
            <Login onSuccess={handleLoginSuccess} />
          ) : (
            <>
          {/* Hidden file uploader; triggered by Batch Notices button in the grid header */}
          <FileUploader ref={uploaderRef} hideButton onParsed={onParsed} onError={setError} onParsingChange={setParsing} />

          {/* ColumnSelector removed in favor of in-grid toolbar popover */}

          <Box className="grid-wrapper" sx={{ mt: 2 }}>
            {parsing ? (
              <Stack alignItems="center" justifyContent="center" sx={{ height: '100%' }} spacing={2}>
                <CircularProgress />
                <Typography variant="body2" color="text.secondary">Parsing file…</Typography>
              </Stack>
            ) : rows.length > 0 && selectedColumns.length > 0 ? (
              <DataGridView
                columns={selectedColumns}
                allColumns={allColumns}
                rows={rows}
                pageSize={pageSize}
                onPageSizeChange={setPageSize}
                onColumnsChange={setSelectedColumns}
                preferredDefaults={PREFERRED_DEFAULTS}
                onBatchNotices={triggerBatchNotices}
              />
            ) : (
              <Stack alignItems="center" justifyContent="center" sx={{ height: '100%', color: 'text.secondary' }}>
                <Typography variant="body2">Upload an Excel/CSV file to view data</Typography>
              </Stack>
            )}
          </Box>
            </>
          )}
        </Container>

        <Snackbar
          open={!!error}
          autoHideDuration={5000}
          onClose={() => setError(null)}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        >
          <Alert severity="error" variant="filled" onClose={() => setError(null)}>
            {error}
          </Alert>
        </Snackbar>
      </Box>
    </ThemeProvider>
  );
}

export default App;
