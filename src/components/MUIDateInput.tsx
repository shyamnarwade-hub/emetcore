import React, { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import type { IDateComp, IDateParams } from 'ag-grid-community';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import dayjs, { Dayjs } from 'dayjs';

// A React implementation of AG Grid's IDateComp using MUI DatePicker.
// Enforces MM/DD/YYYY format and shows a calendar popover.

export interface MUIDateInputRef extends IDateComp {}

const MUIDateInput = forwardRef<MUIDateInputRef, { params: IDateParams }>((props, ref) => {
  const { params } = props;
  const [value, setValue] = useState<Dayjs | null>(null);
  const [placeholder, setPlaceholder] = useState<string>('MM/DD/YYYY');
  const [ariaLabel, setAriaLabel] = useState<string>('Date Filter');
  const [containerEl, setContainerEl] = useState<HTMLElement | undefined>(undefined);

  const rootRef = useRef<HTMLDivElement | null>(null);

  useImperativeHandle(ref, () => ({
    getDate() {
      if (!value) return null;
      const d = value.toDate();
      return isNaN(d.getTime()) ? null : d;
    },
    setDate(date: Date | null) {
      if (!date) {
        setValue(null);
      } else {
        const d = dayjs(date);
        setValue(d.isValid() ? d : null);
      }
    },
    setInputPlaceholder(p: string) {
      if (p) setPlaceholder(p);
    },
    setInputAriaLabel(a: string) {
      if (a) setAriaLabel(a);
    },
    // Required by IDateComp (interface methods grid may call)
    getGui() {
      return rootRef.current as any;
    },
    afterGuiAttached() {},
    destroy() {},
  }));

  const onChange = (d: Dayjs | null) => {
    // Update local state; grid will be notified after state commits
    const next = d && d.isValid() ? d : null;
    setValue(next);
  };

  const onAccept = (d: Dayjs | null) => {
    // When user accepts a date (selects from calendar), update value; grid notified via effect
    const next = d && d.isValid() ? d : null;
    setValue(next);
  };

  useEffect(() => {
    // Notify grid after value updates to ensure getDate returns the latest
    params.onDateChanged();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  // Focus input when created so keyboard users can type immediately
  useEffect(() => {
    // Determine a stable container inside the grid popup to avoid outside-click closing
    const theme = rootRef.current?.closest('.ag-theme-quartz, .ag-theme-alpine, .ag-theme-material') as HTMLElement | null;
    setContainerEl(theme ?? document.body);
  }, []);

  return (
    <div
      ref={rootRef}
      style={{ display: 'flex' }}
      onMouseDown={(e) => e.stopPropagation()}
    >
      <LocalizationProvider dateAdapter={AdapterDayjs}>
        <DatePicker
          value={value}
          onChange={onChange}
          onAccept={onAccept}
          format="MM/DD/YYYY"
          closeOnSelect
          reduceAnimations
          slotProps={{
            textField: {
              size: 'small',
              placeholder,
              inputProps: { 'aria-label': ariaLabel },
              onKeyDown: (e: any) => e.stopPropagation(),
            },
            popper: { placement: 'bottom-start', container: containerEl },
          }}
        />
      </LocalizationProvider>
    </div>
  );
});

export default MUIDateInput;
