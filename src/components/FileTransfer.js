import React, { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import LogoutIcon from '@mui/icons-material/Logout';
import { IconButton, Snackbar, Alert, FormControl, InputLabel, Select, MenuItem, Button, LinearProgress, Box, Typography, Paper, Avatar } from '@mui/material';
import axios from 'axios';

const CHUNK_SIZE = 64 * 1024; // 64KB per chunk
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_FILE_TYPES = ['.jpg', '.jpeg', '.png', '.gif', '.pdf', '.doc', '.docx', '.txt', '.zip', '.rar'];

function FileTransfer() {
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState('');
  const [file, setFile] = useState(null);
  const [progress, setProgress] = useState(0);
  const [receivedFiles, setReceivedFiles] = useState([]);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'info' });
  const socketRef = useRef();
  const [transferHistory, setTransferHistory] = useState([]);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      setSnackbar({ open: true, message: 'Please login first.', severity: 'error' });
      return;
    }
    const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';
    socketRef.current = io(API_URL, {
      auth: { token }
    });

    socketRef.current.on('onlineUsers', (users) => {
      setOnlineUsers(users);
    });

    socketRef.current.on('receiveFile', (data) => {
      setReceivedFiles((prev) => [...prev, data]);
      setTransferHistory(prev => [
        ...prev,
        {
          type: 'received',
          fileName: data.fileName,
          to: data.from,
          from: data.from,
          date: new Date(),
        }
      ]);
      setSnackbar({ open: true, message: `Received file '${data.fileName}' from ${data.from}`, severity: 'success' });
    });

    socketRef.current.on('fileError', (data) => {
      setSnackbar({ open: true, message: data.message, severity: 'error' });
      setProgress(0);
    });

    return () => {
      if (socketRef.current) socketRef.current.disconnect();
    };
  }, []);

  const validateFile = (file) => {
    if (!file) return { valid: false, message: 'No file selected' };
    
    if (file.size > MAX_FILE_SIZE) {
      return { 
        valid: false, 
        message: `File size (${(file.size / 1024 / 1024).toFixed(2)}MB) exceeds maximum limit of ${MAX_FILE_SIZE / 1024 / 1024}MB` 
      };
    }
    
    const fileExtension = '.' + file.name.split('.').pop().toLowerCase();
    if (!ALLOWED_FILE_TYPES.includes(fileExtension)) {
      return { 
        valid: false, 
        message: `File type '${fileExtension}' is not allowed. Allowed types: ${ALLOWED_FILE_TYPES.join(', ')}` 
      };
    }
    
    return { valid: true };
  };

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      const validation = validateFile(selectedFile);
      if (!validation.valid) {
        setSnackbar({ open: true, message: validation.message, severity: 'error' });
        e.target.value = ''; // Clear the input
        return;
      }
      setFile(selectedFile);
    }
  };

  const handleUserChange = (e) => {
    setSelectedUser(e.target.value);
  };

  const sendFile = () => {
    if (!file || !selectedUser) {
      setSnackbar({ open: true, message: 'Please select a user and a file.', severity: 'error' });
      return;
    }

    const validation = validateFile(file);
    if (!validation.valid) {
      setSnackbar({ open: true, message: validation.message, severity: 'error' });
      return;
    }

    const totalChunks = Math.ceil(file.size / CHUNK_SIZE);
    let currentChunk = 0;
    const reader = new FileReader();

    reader.onload = (e) => {
      const chunkBuffer = e.target.result;
      socketRef.current.emit('sendFileChunk', {
        to: selectedUser,
        fileName: file.name,
        totalChunks,
        currentChunk,
        chunkBuffer,
        fileSize: file.size,
        type: file.type,
      });
      setProgress(Math.round(((currentChunk + 1) / totalChunks) * 100));
      currentChunk++;
      if (currentChunk < totalChunks) {
        readNextChunk();
      } else {
        setTransferHistory(prev => [
          ...prev,
          {
            type: 'sent',
            fileName: file.name,
            to: selectedUser,
            from: socketRef.current.user?.username,
            date: new Date(),
          }
        ]);
        setSnackbar({ open: true, message: 'File sent successfully!', severity: 'success' });
      }
    };

    const readNextChunk = () => {
      const start = currentChunk * CHUNK_SIZE;
      const end = Math.min(file.size, start + CHUNK_SIZE);
      const blob = file.slice(start, end);
      reader.readAsArrayBuffer(blob);
    };

    readNextChunk();
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
        
        <Typography variant="caption" color="textSecondary" sx={{ mb: 2, display: 'block' }}>
          Max file size: {MAX_FILE_SIZE / 1024 / 1024}MB | Allowed types: {ALLOWED_FILE_TYPES.join(', ')}
        </Typography>
        
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
              <MenuItem key={user} value={user}>
                <Avatar src={user.avatar} alt={user.username} />
                {user}
              </MenuItem>
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
            Selected file: {file.name} ({(file.size / 1024 / 1024).toFixed(2)}MB)
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
        <Button onClick={() => window.location.href = '/profile'}>Profile</Button>
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
