import { createTheme } from '@mui/material/styles';

export const getAppTheme = (mode: 'light' | 'dark') =>
  createTheme({
    palette: {
      mode,
      primary: {
        main: '#0d47a1',
      },
    },
    components: {
      MuiContainer: {
        defaultProps: {
          maxWidth: 'xl',
        },
      },
    },
  });
