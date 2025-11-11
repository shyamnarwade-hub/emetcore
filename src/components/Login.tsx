import { useState } from 'react';
import { Box, Paper, Stack, TextField, Button, Typography, Alert } from '@mui/material';

interface LoginProps {
  onSuccess: () => void;
}

const DEFAULT_USER = (import.meta as any).env?.VITE_AUTH_USER ?? 'admin';
const DEFAULT_PASS = (import.meta as any).env?.VITE_AUTH_PASS ?? 'admin';

export default function Login({ onSuccess }: LoginProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const ok = username.trim() === String(DEFAULT_USER) && password === String(DEFAULT_PASS);
      if (!ok) {
        setError('Invalid username or password');
        return;
      }
      sessionStorage.setItem('auth', '1');
      onSuccess();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Box display="flex" alignItems="center" justifyContent="center" minHeight="50vh">
      <Paper elevation={3} sx={{ p: 3, width: '100%', maxWidth: 420 }}>
        <form onSubmit={handleSubmit}>
          <Stack spacing={2}>
            <Typography variant="h6" textAlign="center">
              Sign in
            </Typography>
            {error && <Alert severity="error">{error}</Alert>}
            <TextField
              label="Username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoFocus
              fullWidth
              required
            />
            <TextField
              label="Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              fullWidth
              required
            />
            <Button variant="contained" type="submit" disabled={submitting}>
              {submitting ? 'Signing in…' : 'Sign in'}
            </Button>
            <Typography variant="caption" color="text.secondary" textAlign="center">
              Demo credentials: {String(DEFAULT_USER)} / {String(DEFAULT_PASS)}
            </Typography>
          </Stack>
        </form>
      </Paper>
    </Box>
  );
}
