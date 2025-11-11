import { AppBar, Toolbar, Stack, Button, Tooltip, IconButton, Box } from '@mui/material';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import ClearAllIcon from '@mui/icons-material/ClearAll';
import DarkModeIcon from '@mui/icons-material/DarkMode';
import LightModeIcon from '@mui/icons-material/LightMode';
import DownloadIcon from '@mui/icons-material/Download';
import { memo, useMemo } from 'react';
import emetcoreLogo from '../images/emetcore.png';

interface HeaderProps {
  hasData: boolean;
  onClear: () => void;
  onToggleTheme: () => void;
  onLogout?: () => void;
}

const TEMPLATE_CSV = 'data:text/csv;charset=utf-8,' + encodeURIComponent('Name,Age,City\nAlice,30,London\nBob,25,Paris');

const Header = memo(function Header({ hasData, onClear, onToggleTheme, onLogout }: HeaderProps) {
  // Prefer user OS scheme icon hint (no theme context here, so just show both logically)
  const prefersDark = useMemo(() => window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches, []);

  return (
    <AppBar position="sticky" color="primary" enableColorOnDark>
      <Toolbar sx={{ display: 'flex', gap: 2, justifyContent: 'space-between' }}>
        <Box
          aria-label="EmetCore logo"
          sx={{
            display: 'inline-flex',
            alignItems: 'center',
            bgcolor: '#ffffff',
            borderRadius: '9999px',
            px: { xs: 1.5, sm: 2 },
            py: { xs: 0.5, sm: 0.75 },
            boxShadow: 'none',
            overflow: 'hidden',
          }}
        >
          <Box
            component="img"
            src={emetcoreLogo}
            alt="EmetCore"
            sx={{
              height: { xs: 28, sm: 32 },
              width: 'auto',
              display: 'block',
            }}
          />
        </Box>

        <Stack direction="row" spacing={1} alignItems="center">
          <Tooltip title="Upload Excel from below section">
            <span>
              <Button color="inherit" startIcon={<UploadFileIcon />} disabled>
                Upload
              </Button>
            </span>
          </Tooltip>

          <Tooltip title="Clear data">
            <span>
              <Button color="inherit" startIcon={<ClearAllIcon />} disabled={!hasData} onClick={onClear}>
                Clear
              </Button>
            </span>
          </Tooltip>

          <Tooltip title="Download template CSV">
            <span>
              <Button
                color="inherit"
                startIcon={<DownloadIcon />}
                component="a"
                href={TEMPLATE_CSV}
                download="template.csv"
              >
                Template
              </Button>
            </span>
          </Tooltip>

          <Tooltip title="Toggle theme">
            <IconButton color="inherit" onClick={onToggleTheme} aria-label="toggle theme">
              {prefersDark ? <LightModeIcon /> : <DarkModeIcon />}
            </IconButton>
          </Tooltip>

          {onLogout && (
            <Tooltip title="Logout">
              <span>
                <Button color="inherit" onClick={onLogout}>
                  Logout
                </Button>
              </span>
            </Tooltip>
          )}
        </Stack>
      </Toolbar>
    </AppBar>
  );
});

export default Header;
