import { forwardRef, useCallback, useImperativeHandle, useRef } from 'react';
import { Box, Button, Stack } from '@mui/material';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import * as XLSX from 'xlsx';

export type AppRow = Record<string, unknown>;

export interface ParsedData {
  columns: string[];
  rows: AppRow[];
}

export interface FileUploaderHandle {
  open: () => void;
}

interface Props {
  onParsed: (data: ParsedData) => void;
  onError: (message: string) => void;
  onParsingChange?: (loading: boolean) => void;
  hideButton?: boolean; // if true, don't render the visible Choose file button
}

const MAX_FILE_SIZE_MB = 15;

const FileUploader = forwardRef<FileUploaderHandle, Props>(function FileUploader({ onParsed, onError, onParsingChange, hideButton }: Props, ref) {
  const inputRef = useRef<HTMLInputElement | null>(null);


  const handleFiles = useCallback(
    async (fileList: FileList | null) => {
      if (!fileList || fileList.length === 0) return;
      const file = fileList[0];
      // Reset input value so selecting the same file again will trigger onChange
      if (inputRef.current) inputRef.current.value = '';

  const extOk = /\.(xlsx|xls|csv)$/i.test(file.name);
      if (!extOk) return onError('Please upload an Excel file (.xlsx, .xls) or CSV.');
      const sizeMb = file.size / (1024 * 1024);
      if (sizeMb > MAX_FILE_SIZE_MB) return onError(`File is too large (${sizeMb.toFixed(1)} MB). Max ${MAX_FILE_SIZE_MB} MB.`);

      try {
        onParsingChange?.(true);

        // Single path: parse via ArrayBuffer (xlsx/xls/csv)
        const buffer = await file.arrayBuffer();
        const wb = XLSX.read(buffer, { type: 'array', cellDates: true });

        if (!wb || !wb.SheetNames || wb.SheetNames.length === 0) {
          throw new Error('No worksheets found in the file.');
        }

        const firstSheetName = wb.SheetNames[0];
        const sheet = wb.Sheets[firstSheetName];
        if (!sheet) {
          throw new Error('The first worksheet could not be read.');
        }

        // Read rows as objects
        const json = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '', raw: false });
        if (!Array.isArray(json) || json.length === 0) {
          throw new Error('No data rows found in the first worksheet.');
        }

        // Derive columns from union of keys (first draft behavior)
        const colSet = new Set<string>();
        json.forEach((row: Record<string, unknown>) => Object.keys(row).forEach((k) => colSet.add(k)));
        const columns = Array.from(colSet);

        if (columns.length === 0) {
          throw new Error('No columns detected. Ensure the sheet has a header row.');
        }

        onParsed({ columns, rows: json });
      } catch (e: any) {
        console.error(e);
        let message = e?.message || 'Failed to parse file. Please ensure it is a valid Excel/CSV file.';
        // Map known SheetJS internal error to a clearer explanation
        if (typeof message === 'string' && /Unsupported payload version/i.test(message)) {
          message = 'This file format is not supported by the parser (possible encrypted/corrupted or non-Excel container). Please re-save/export the file as .xlsx or .csv and try again.';
        }
        onError(message);
      } finally {
        onParsingChange?.(false);
      }
    },
    [onParsed, onError, onParsingChange]
  );

  const openPicker = () => inputRef.current?.click();

  useImperativeHandle(ref, () => ({
    open: openPicker,
  }));

  return (
    <Box>
      {!hideButton && (
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={2}
          alignItems="center"
          justifyContent="center"
        >
          <Button variant="contained" startIcon={<UploadFileIcon />} onClick={openPicker}>
            Choose file
          </Button>
        </Stack>
      )}

      <input
        type="file"
        accept=".xlsx,.xls,.csv"
        ref={inputRef}
        style={{ display: 'none' }}
        onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleFiles(e.target.files)}
      />

      {/* Drag-and-drop removed: using only file picker */}
    </Box>
  );
});

export default FileUploader;
