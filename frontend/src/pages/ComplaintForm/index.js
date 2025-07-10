import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Container, 
  Typography, 
  Paper, 
  TextField, 
  Button, 
  Box,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  FormControlLabel,
  Switch
} from '@mui/material';
import { complaintService } from '../../services/complaint';

const categories = [
  'Roads & Pavement',
  'Water Supply & Leaks',
  'Electricity & Streetlights',
  'Waste & Sanitation',
  'Public Transport & Bus Stops',
  'Public Health Issues',
  'Parks & Public Spaces',
  'Illegal Construction/Encroachment',
  'Stray Animal Nuisance',
  'Others'  // Always good to have an Others option
];

function ComplaintForm() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: '',
    evidence: '', // URL or file reference
    latitude: '',
    longitude: '',
    is_public: false
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  // Get current location
  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setFormData(prev => ({
          ...prev,
          latitude: position.coords.latitude,
          longitude: position.coords.longitude
        }));
      },
      () => setError('Unable to retrieve your location')
    );
  };

  const handleChange = (e) => {
    const { name, value, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'is_public' ? checked : value
    }));
  };

  const validateForm = () => {
    if (!formData.title || formData.title.length < 5) {
      setError('Title must be at least 5 characters long');
      return false;
    }
    if (!formData.description || formData.description.length < 10) {
      setError('Description must be at least 10 characters long');
      return false;
    }
    if (!formData.category) {
      setError('Please select a category');
      return false;
    }
    if (!formData.latitude || !formData.longitude) {
      setError('Please set the location');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setLoading(true);
    setError('');
    try {
      await complaintService.submitComplaint(formData);
      setSuccess(true);
      setTimeout(() => {
        navigate('/user/dashboard');
      }, 2000);
    } catch (err) {
      setError(err.error || 'Failed to submit complaint');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container maxWidth="md">
      <Paper elevation={3} sx={{ p: 4, mt: 4 }}>
        <Typography variant="h4" gutterBottom>
          Submit Complaint
        </Typography>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {success && (
          <Alert severity="success" sx={{ mb: 2 }}>
            Complaint submitted successfully! Redirecting...
          </Alert>
        )}

        <form onSubmit={handleSubmit}>
          <TextField
            fullWidth
            label="Title"
            name="title"
            value={formData.title}
            onChange={handleChange}
            margin="normal"
            required
            disabled={loading}
            helperText="Minimum 5 characters"
          />

          <TextField
            fullWidth
            label="Description"
            name="description"
            value={formData.description}
            onChange={handleChange}
            margin="normal"
            required
            multiline
            rows={4}
            disabled={loading}
            helperText="Minimum 10 characters"
          />

          <FormControl fullWidth margin="normal">
            <InputLabel>Category</InputLabel>
            <Select
              name="category"
              value={formData.category}
              onChange={handleChange}
              required
              disabled={loading}
            >
              {categories.map(category => (
                <MenuItem key={category} value={category}>
                  {category}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <TextField
            fullWidth
            label="Evidence (URL)"
            name="evidence"
            value={formData.evidence}
            onChange={handleChange}
            margin="normal"
            disabled={loading}
            helperText="Optional: Link to photos or documents"
          />

          <Box sx={{ mt: 2, mb: 2 }}>
            <Typography variant="subtitle1" gutterBottom>
              Location
            </Typography>
            <Button
              variant="outlined"
              onClick={getCurrentLocation}
              disabled={loading}
              sx={{ mb: 2 }}
            >
              Get Current Location
            </Button>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField
                label="Latitude"
                name="latitude"
                value={formData.latitude}
                onChange={handleChange}
                disabled={loading}
                required
              />
              <TextField
                label="Longitude"
                name="longitude"
                value={formData.longitude}
                onChange={handleChange}
                disabled={loading}
                required
              />
            </Box>
          </Box>

          <FormControlLabel
            control={
              <Switch
                checked={formData.is_public}
                onChange={handleChange}
                name="is_public"
                disabled={loading}
              />
            }
            label="Make this complaint public"
            sx={{ mt: 2 }}
          />

          <Box sx={{ mt: 3 }}>
            <Button
              variant="contained"
              color="primary"
              type="submit"
              disabled={loading}
              sx={{ mr: 2 }}
            >
              {loading ? 'Submitting...' : 'Submit Complaint'}
            </Button>
            <Button
              variant="outlined"
              onClick={() => navigate('/user/dashboard')}
              disabled={loading}
            >
              Cancel
            </Button>
          </Box>
        </form>
      </Paper>
    </Container>
  );
}

export default ComplaintForm;