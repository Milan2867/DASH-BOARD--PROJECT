import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { TextField, Button, Paper, Typography, Avatar, Box, Alert, CircularProgress } from '@mui/material';
import { useNavigate } from 'react-router-dom';

function Profile() {
  const [user, setUser] = useState({ username: '', email: '', avatar: '', profile: '' });
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      setError('No authentication token found. Please log in.');
      setLoading(false);
      return;
    }

    const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';
    axios.get(`${API_URL}/api/profile`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => {
        setUser(res.data);
        setLoading(false);
      })
      .catch(err => {
        setLoading(false);
        if (err.response && err.response.status === 401) {
          setError('Session expired. Please log in again.');
          setTimeout(() => {
            localStorage.removeItem('token');
            navigate('/login');
          }, 2000);
        } else if (err.response && err.response.status === 404) {
          setError('User profile not found. Please log in again.');
          setTimeout(() => {
            localStorage.removeItem('token');
            navigate('/login');
          }, 2000);
        } else {
          setError('An error occurred while loading your profile. Please try again.');
        }
      });
  }, [navigate]);

  const handleChange = e => setUser({ ...user, [e.target.name]: e.target.value });

  const handleAvatarChange = e => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = ev => setUser({ ...user, avatar: ev.target.result });
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async e => {
    e.preventDefault();
    const token = localStorage.getItem('token');
    try {
      const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';
      const res = await axios.put(`${API_URL}/api/profile`, user, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUser(res.data);
      setMessage('Profile updated!');
    } catch {
      setMessage('Update failed');
    }
  };

  if (loading) {
    return (
      <Box sx={{ width: '100%', minHeight: '100vh', bgcolor: 'background.default', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ width: '100%', minHeight: '100vh', bgcolor: 'background.default', display: 'flex', alignItems: 'center', justifyContent: 'center', p: { xs: 1, sm: 2 } }}>
        <Paper elevation={3} sx={{ maxWidth: 400, width: '100%', mx: 'auto', p: { xs: 2, sm: 3 }, mt: { xs: 2, sm: 5 } }}>
          <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>
          <Button variant="contained" onClick={() => navigate('/login')} fullWidth>
            Go to Login
          </Button>
        </Paper>
      </Box>
    );
  }

  return (
    <Box sx={{ width: '100%', minHeight: '100vh', bgcolor: 'background.default', display: 'flex', alignItems: 'center', justifyContent: 'center', p: { xs: 1, sm: 2 } }}>
      <Paper elevation={3} sx={{ maxWidth: 400, width: '100%', mx: 'auto', p: { xs: 2, sm: 3 }, mt: { xs: 2, sm: 5 } }}>
        <Box display="flex" flexDirection="column" alignItems="center" mb={2}>
          <Avatar src={user.avatar} sx={{ width: 64, height: 64, mb: 1 }} />
          <Button variant="outlined" component="label" size="small">
            Change Avatar
            <input type="file" hidden accept="image/*" onChange={handleAvatarChange} />
          </Button>
        </Box>
        <form onSubmit={handleSubmit}>
          <TextField
            label="Username"
            name="username"
            value={user.username}
            onChange={handleChange}
            fullWidth
            margin="normal"
            required
          />
          <TextField
            label="Email"
            name="email"
            value={user.email}
            onChange={handleChange}
            fullWidth
            margin="normal"
            required
          />
          <TextField
            label="Profile"
            name="profile"
            value={user.profile}
            onChange={handleChange}
            fullWidth
            margin="normal"
            multiline
            rows={3}
          />
          <Button type="submit" variant="contained" color="primary" fullWidth sx={{ mt: 2 }}>
            Save Changes
          </Button>
        </form>
        {message && <Alert severity={message === 'Profile updated!' ? 'success' : 'error'} sx={{ mt: 2 }}>{message}</Alert>}
      </Paper>
    </Box>
  );
}

export default Profile;
