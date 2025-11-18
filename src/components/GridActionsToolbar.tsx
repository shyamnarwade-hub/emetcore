import React from 'react';
import { Stack, IconButton, Tooltip } from '@mui/material';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import FileOpenIcon from '@mui/icons-material/FileOpen';
import RefreshIcon from '@mui/icons-material/Refresh';
import IosShareIcon from '@mui/icons-material/IosShare';
import StickyNote2Icon from '@mui/icons-material/StickyNote2';
import SelectAllIcon from '@mui/icons-material/SelectAll';
import DeselectIcon from '@mui/icons-material/Deselect';
import PlayCircleOutlineIcon from '@mui/icons-material/PlayCircleOutline';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import CancelIcon from '@mui/icons-material/Cancel';
import PrintIcon from '@mui/icons-material/Print';
import EmailIcon from '@mui/icons-material/Email';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';

type Props = {
  onLoad?: () => void;
  onBatchNotices?: () => void;
  onRefresh?: () => void;
  onExportDetails?: () => void;
  onNotes?: () => void;
  onSelect?: () => void;
  onDeselect?: () => void;
  onProcess?: () => void;
  onApprove?: () => void;
  onCancel?: () => void;
  onPrint?: () => void;
  onEmail?: () => void;
  onExportDocs?: () => void;
};

const Group: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <Stack
    direction="row"
    spacing={0.75}
    sx={{
      px: 0.75,
      py: 0.375,
      border: 1,
      borderColor: 'divider',
      borderRadius: 1,
      bgcolor: 'background.paper',
    }}
    alignItems="center"
  >
    {children}
  </Stack>
);

export default function GridActionsToolbar(props: Props) {
  const iconBtnSx = { height: 28, width: 28, p: 0.5 } as const;
  return (
    <Stack direction="row" spacing={1} alignItems="center" sx={{ flexWrap: 'nowrap', whiteSpace: 'nowrap' }}>
      <Group>
        <Tooltip title="Load" arrow>
          <IconButton size="small" onClick={props.onLoad} aria-label="Load" sx={iconBtnSx}>
            <FileOpenIcon fontSize="small" />
          </IconButton>
        </Tooltip>
        <Tooltip title="Batch Notices" arrow>
          <IconButton size="small" onClick={props.onBatchNotices} aria-label="Batch Notices" sx={iconBtnSx}>
            <UploadFileIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </Group>
      <Group>
        <Tooltip title="Refresh" arrow>
          <IconButton size="small" onClick={props.onRefresh} aria-label="Refresh" sx={iconBtnSx}>
            <RefreshIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </Group>
      <Group>
        <Tooltip title="Export Details" arrow>
          <IconButton size="small" onClick={props.onExportDetails} aria-label="Export Details" sx={iconBtnSx}>
            <IosShareIcon fontSize="small" />
          </IconButton>
        </Tooltip>
        <Tooltip title="Notes" arrow>
          <IconButton size="small" onClick={props.onNotes} aria-label="Notes" sx={iconBtnSx}>
            <StickyNote2Icon fontSize="small" />
          </IconButton>
        </Tooltip>
      </Group>
      <Group>
        <Tooltip title="Select All" arrow>
          <IconButton size="small" onClick={props.onSelect} aria-label="Select All" sx={iconBtnSx}>
            <SelectAllIcon fontSize="small" />
          </IconButton>
        </Tooltip>
        <Tooltip title="Deselect" arrow>
          <IconButton size="small" onClick={props.onDeselect} aria-label="Deselect" sx={iconBtnSx}>
            <DeselectIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </Group>
      <Group>
        <Tooltip title="Process" arrow>
          <IconButton size="small" color="warning" onClick={props.onProcess} aria-label="Process" sx={iconBtnSx}>
            <PlayCircleOutlineIcon fontSize="small" />
          </IconButton>
        </Tooltip>
        <Tooltip title="Approve" arrow>
          <IconButton size="small" color="success" onClick={props.onApprove} aria-label="Approve" sx={iconBtnSx}>
            <CheckCircleOutlineIcon fontSize="small" />
          </IconButton>
        </Tooltip>
        <Tooltip title="Cancel" arrow>
          <IconButton size="small" color="error" onClick={props.onCancel} aria-label="Cancel" sx={iconBtnSx}>
            <CancelIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </Group>
      <Group>
        <Tooltip title="Print" arrow>
          <IconButton size="small" onClick={props.onPrint} aria-label="Print" sx={iconBtnSx}>
            <PrintIcon fontSize="small" />
          </IconButton>
        </Tooltip>
        <Tooltip title="Email" arrow>
          <IconButton size="small" onClick={props.onEmail} aria-label="Email" sx={iconBtnSx}>
            <EmailIcon fontSize="small" />
          </IconButton>
        </Tooltip>
        <Tooltip title="Export Docs" arrow>
          <IconButton size="small" onClick={props.onExportDocs} aria-label="Export Docs" sx={iconBtnSx}>
            <PictureAsPdfIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </Group>
    </Stack>
  );
}
