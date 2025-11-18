import React, { useMemo, useState } from 'react';
import { Box, IconButton, Popover, Stack, TextField, Checkbox, List, ListItem, ListItemIcon, ListItemText, Divider, Button, Tooltip, Typography } from '@mui/material';
import ViewColumnIcon from '@mui/icons-material/ViewColumn';

type Props = {
  allColumns: string[];
  selectedColumns: string[];
  onChange: (cols: string[]) => void;
  preferredDefaults?: string[];
};

const FIXED = new Set(['Selected', 'Override', 'Status']);

export default function GridToolbar({ allColumns, selectedColumns, onChange, preferredDefaults }: Props) {
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const [query, setQuery] = useState('');

  // Display-only header renames (underlying field names remain unchanged)
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
  const displayName = (name: string) => headerNameMap[name] ?? name;

  const selectable = useMemo(() => allColumns.filter(c => !FIXED.has(c)), [allColumns]);
  const visibleNonFixed = useMemo(() => selectedColumns.filter(c => !FIXED.has(c)), [selectedColumns]);
  const allSelected = selectable.length > 0 && visibleNonFixed.length === selectable.length;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return selectable;
    return selectable.filter(c => {
      const disp = displayName(c).toLowerCase();
      return disp.includes(q);
    });
  }, [query, selectable]);

  const open = Boolean(anchorEl);
  const id = open ? 'columns-popover' : undefined;

  const apply = (nonFixed: string[]) => {
    const fixed = allColumns.filter(c => FIXED.has(c));
    // Keep order based on appearance in allColumns
    const orderMap = new Map(allColumns.map((c, i) => [c, i] as const));
    const orderedNonFixed = [...new Set(nonFixed)].sort((a, b) => (orderMap.get(a)! - orderMap.get(b)!));
    onChange([...fixed, ...orderedNonFixed]);
  };

  const toggleOne = (name: string) => {
    const set = new Set(visibleNonFixed);
    if (set.has(name)) set.delete(name); else set.add(name);
    apply(Array.from(set));
  };

  const handleShowHideAll = () => {
    if (allSelected) {
      // When everything is visible, treat this as a Reset to defaults
      handleReset();
    } else {
      // Otherwise show all non-fixed columns
      apply(selectable);
    }
  };

  const handleReset = () => {
    const preferred = (preferredDefaults || []).filter(c => allColumns.includes(c) && !FIXED.has(c));
    apply(preferred);
  };

  return (
    <Stack direction="row" alignItems="center" justifyContent="flex-end" spacing={1} sx={{ p: 1, pt: 0 }}>
      <Tooltip title="Columns">
        <IconButton aria-describedby={id} size="small" onClick={(e) => setAnchorEl(e.currentTarget)}>
          <ViewColumnIcon />
        </IconButton>
      </Tooltip>

      <Popover
        id={id}
        open={open}
        anchorEl={anchorEl}
        onClose={() => setAnchorEl(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        slotProps={{ paper: { sx: { width: 360, maxHeight: 420 } } } as any}
      >
        <Box sx={{ p: 2, pt: 1 }}>
          <TextField
            size="small"
            fullWidth
            placeholder="Search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </Box>
        <Divider />
        <List dense sx={{ px: 1, py: 0, maxHeight: 300, overflowY: 'auto' }}>
          {filtered.map((name) => {
            const checked = visibleNonFixed.includes(name);
            return (
              <ListItem key={name} button onClick={() => toggleOne(name)} sx={{ py: 0.25 }}>
                <ListItemIcon sx={{ minWidth: 36 }}>
                  <Checkbox edge="start" checked={checked} tabIndex={-1} disableRipple />
                </ListItemIcon>
                <ListItemText primary={<Typography variant="body2">{displayName(name)}</Typography>} />
              </ListItem>
            );
          })}
          {filtered.length === 0 && (
            <Box sx={{ px: 2, py: 3, color: 'text.secondary' }}>
              <Typography variant="body2">No columns</Typography>
            </Box>
          )}
        </List>
        <Divider />
        <Stack direction="row" spacing={1} sx={{ p: 1.5, pt: 1 }} justifyContent="space-between" alignItems="center">
          <Button variant="text" size="small" onClick={handleShowHideAll}>
            {allSelected ? 'Hide All' : 'Show All'}
          </Button>
          <Stack direction="row" spacing={1}>
            <Button variant="outlined" size="small" onClick={handleReset}>Reset</Button>
            <Button variant="contained" size="small" onClick={() => setAnchorEl(null)}>Close</Button>
          </Stack>
        </Stack>
      </Popover>
    </Stack>
  );
}
