import { Autocomplete, Checkbox, Chip, TextField, Stack, Button } from '@mui/material';
import CheckBoxOutlineBlankIcon from '@mui/icons-material/CheckBoxOutlineBlank';
import CheckBoxIcon from '@mui/icons-material/CheckBox';

interface Props {
  allColumns: string[];
  selectedColumns: string[];
  onChange: (cols: string[]) => void;
  preferredDefaults?: string[];
}

const icon = <CheckBoxOutlineBlankIcon fontSize="small" />;
const checkedIcon = <CheckBoxIcon fontSize="small" />;

export default function ColumnSelector({ allColumns, selectedColumns, onChange, preferredDefaults }: Props) {
  // Exclude the first three fixed columns (Selected, Override, Status) from the chooser if present
  const FIXED = new Set(['Selected', 'Override', 'Status']);
  const selectableColumns = allColumns.filter(c => !FIXED.has(c));
  const visibleNonFixed = selectedColumns.filter(c => !FIXED.has(c));
  const allSelected = selectableColumns.length > 0 && visibleNonFixed.length === selectableColumns.length;
  const noneSelected = visibleNonFixed.length === 0;
  const handleSelectAll = () => {
    if (!allSelected) {
      onChange([
        ...allColumns.filter(c => FIXED.has(c)),
        ...selectableColumns
      ]);
    }
  };

  return (
    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} alignItems={{ xs: 'stretch', sm: 'center' }}>
      <Autocomplete
        multiple
        options={selectableColumns}
        value={visibleNonFixed}
        onChange={(_e: React.SyntheticEvent, value: string[]) => {
          // Preserve fixed columns at the front when updating selection
          const fixed = allColumns.filter(c => FIXED.has(c));
          onChange([...fixed, ...value]);
        }}
        disableCloseOnSelect
        sx={{ flex: 1, minWidth: 240 }}
        renderOption={(props, option, { selected }: { selected: boolean }) => (
          <li {...props} key={option}>
            <Checkbox
              icon={icon}
              checkedIcon={checkedIcon}
              style={{ marginRight: 8 }}
              checked={selected}
            />
            {option}
          </li>
        )}
        renderInput={(params) => (
          <TextField {...params} variant="outlined" label="Visible columns" placeholder="Choose columns" />
        )}
        renderTags={(value: string[], getTagProps) =>
          value.map((option: string, index: number) => (
            <Chip variant="outlined" label={option} {...getTagProps({ index })} key={option} />
          ))
        }
      />
      <Stack direction="row" spacing={1}>
        <Button
          variant="outlined"
          size="small"
          onClick={handleSelectAll}
          disabled={allSelected || selectableColumns.length === 0}
        >
          Select all
        </Button>
        <Button
          variant="outlined"
          size="small"
          onClick={() => {
            const fixed = allColumns.filter(c => FIXED.has(c));
            const preferred = (preferredDefaults || [])
              .filter((c) => allColumns.includes(c) && !FIXED.has(c));
            onChange([...fixed, ...preferred]); // keep fixed + preferred defaults
          }}
            disabled={noneSelected}
        >
          Clear all
        </Button>
      </Stack>
    </Stack>
  );
}
