import { AppBar, Toolbar, Stack, Button, Tooltip, IconButton, Box } from '@mui/material';
import DarkModeIcon from '@mui/icons-material/DarkMode';
import LightModeIcon from '@mui/icons-material/LightMode';
import { memo, useMemo } from 'react';
import emetcoreLogo from '../images/emetcore.png';

interface HeaderProps {
  onToggleTheme: () => void;
  onLogout?: () => void;
}

const Header = memo(function Header({ onToggleTheme, onLogout }: HeaderProps) {
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
