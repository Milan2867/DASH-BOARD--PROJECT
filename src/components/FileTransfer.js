import React, { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import LogoutIcon from '@mui/icons-material/Logout';
import { IconButton, Snackbar, Alert, FormControl, InputLabel, Select, MenuItem, Button, LinearProgress, Box, Typography, Paper } from '@mui/material';

function FileTransfer() {
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState('');
  const [file, setFile] = useState(null);
  const [progress, setProgress] = useState(0);
  const [receivedFiles, setReceivedFiles] = useState([]);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'info' });
  const socketRef = useRef();

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      setSnackbar({ open: true, message: 'Please login first.', severity: 'error' });
      return;
    }
    socketRef.current = io('http://localhost:5000', {
      auth: { token }
    });

    socketRef.current.on('onlineUsers', (users) => {
      setOnlineUsers(users);
    });

    socketRef.current.on('receiveFile', (data) => {
      setReceivedFiles((prev) => [...prev, data]);
      setSnackbar({ open: true, message: `Received file '${data.fileName}' from ${data.from}`, severity: 'success' });
    });

    return () => {
      if (socketRef.current) socketRef.current.disconnect();
    };
  }, []);

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
  };

  const handleUserChange = (e) => {
    setSelectedUser(e.target.value);
  };

  const sendFile = () => {
    if (!file || !selectedUser) {
      setSnackbar({ open: true, message: 'Please select a user and a file.', severity: 'error' });
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      const fileBuffer = e.target.result;
      setProgress(0);
      // For simplicity, send the whole file at once. For large files, use chunking.
      socketRef.current.emit('sendFile', {
        to: selectedUser,
        fileName: file.name,
        fileBuffer
      });
      setProgress(100);
      setSnackbar({ open: true, message: 'File sent!', severity: 'success' });
    };
    reader.readAsArrayBuffer(file);
  };

  const downloadFile = (fileData) => {
    const blob = new Blob([fileData.fileBuffer]);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileData.fileName;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Box sx={{ width: '100%', minHeight: '100vh', bgcolor: 'background.default', display: 'flex', alignItems: 'center', justifyContent: 'center', p: { xs: 1, sm: 2 } }}>
      <Paper elevation={3} sx={{ width: '100%', maxWidth: 500, mx: 'auto', p: { xs: 2, sm: 3 }, mt: { xs: 2, sm: 5 } }}>
        <Box display="flex" justifyContent="flex-end">
          <IconButton
            color="primary"
            onClick={() => {
              localStorage.removeItem('token');
              window.location.href = '/login';
            }}
            title="Logout"
          >
            <LogoutIcon />
          </IconButton>
        </Box>
        <Typography variant="h5" align="center" gutterBottom>File Transfer</Typography>
        <FormControl fullWidth margin="normal">
          <InputLabel id="user-select-label">Online Users</InputLabel>
          <Select
            labelId="user-select-label"
            value={selectedUser}
            label="Online Users"
            onChange={handleUserChange}
          >
            <MenuItem value="">Select user</MenuItem>
            {onlineUsers.map((user) => (
              <MenuItem key={user} value={user}>{user}</MenuItem>
            ))}
          </Select>
        </FormControl>
        <Button
          variant="contained"
          component="label"
          fullWidth
          sx={{ mt: 2 }}
        >
          Choose File
          <input type="file" hidden onChange={handleFileChange} />
        </Button>
        {file && (
          <Typography variant="body2" sx={{ mt: 1 }}>
            Selected file: {file.name}
          </Typography>
        )}
        <Button
          variant="contained"
          color="primary"
          fullWidth
          sx={{ mt: 2 }}
          onClick={sendFile}
          disabled={!file || !selectedUser}
        >
          Send File
        </Button>
        <Box sx={{ mt: 2 }}>
          {progress > 0 && <LinearProgress variant="determinate" value={progress} />}
        </Box>
        <Box sx={{ mt: 4 }}>
          <Typography variant="h6">Received Files</Typography>
          <ul style={{ paddingLeft: 16 }}>
            {receivedFiles.map((fileData, idx) => (
              <li key={idx} style={{ marginBottom: 8 }}>
                {fileData.fileName} from {fileData.from}
                <Button
                  variant="outlined"
                  size="small"
                  sx={{ ml: 2 }}
                  onClick={() => downloadFile(fileData)}
                >
                  Download
                </Button>
              </li>
            ))}
          </ul>
        </Box>
        <Snackbar
          open={snackbar.open}
          autoHideDuration={3000}
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
        >
          <Alert onClose={() => setSnackbar({ ...snackbar, open: false })} severity={snackbar.severity} sx={{ width: '100%' }}>
            {snackbar.message}
          </Alert>
        </Snackbar>
      </Paper>
    </Box>
  );
}

export default FileTransfer;
