import React, { useState, useEffect } from 'react';
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

// Categories will be fetched from the backend

function ComplaintForm() {
  const navigate = useNavigate();
  const [categories, setCategories] = useState([]);
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
  const [locationLoading, setLocationLoading] = useState(false);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await complaintService.getCategories();
        if (response.data) {
          setCategories(response.data);
        }
      } catch (err) {
        console.error('Error fetching categories:', err);
        setError('Failed to load categories');
      }
    };
    
    const getLocationAutomatically = () => {
      if (navigator.geolocation) {
        setLocationLoading(true);
        navigator.geolocation.getCurrentPosition(
          (position) => {
            setFormData(prev => ({
              ...prev,
              latitude: position.coords.latitude,
              longitude: position.coords.longitude
            }));
            setLocationLoading(false);
            console.log('Auto-location successful:', position.coords.latitude, position.coords.longitude);
          },
          (error) => {
            setLocationLoading(false);
            console.log('Auto-location failed:', error);
            // Don't show error for auto-location failure, user can manually set it
          },
          {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 300000 // 5 minutes
          }
        );
      }
    };
    
    fetchCategories();
    getLocationAutomatically();
  }, []);

  // Get current location
  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser');
      return;
    }

    setLocationLoading(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setFormData(prev => ({
          ...prev,
          latitude: position.coords.latitude,
          longitude: position.coords.longitude
        }));
        setLocationLoading(false);
        setError(''); // Clear any previous errors
      },
      (error) => {
        setLocationLoading(false);
        let errorMessage = 'Unable to retrieve your location';
        switch(error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = "Location access denied. Please enable location permissions and try again.";
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage = "Location information is unavailable.";
            break;
          case error.TIMEOUT:
            errorMessage = "Location request timed out.";
            break;
          default:
            errorMessage = "An unknown error occurred while getting location.";
            break;
        }
        setError(errorMessage);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    );
  };

  const handleChange = (e) => {
    const { name, value, files, type, checked } = e.target;
    
    if (name === 'evidence' && files) {
      setFormData(prev => ({
        ...prev,
        [name]: files[0]
      }));
    } else if (type === 'checkbox') {
      setFormData(prev => ({
        ...prev,
        [name]: checked
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
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
                <MenuItem key={category.id} value={category.id}>
                  {category.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <Box sx={{ mt: 2, mb: 2 }}>
            <Typography variant="subtitle1" gutterBottom>
              Evidence
            </Typography>
            <input
              accept="image/*"
              style={{ display: 'none' }}
              id="evidence-upload"
              type="file"
              onChange={handleChange}
              name="evidence"
            />
            <label htmlFor="evidence-upload">
              <Button
                variant="contained"
                component="span"
                disabled={loading}
              >
                Upload Evidence
              </Button>
            </label>
            {formData.evidence && (
              <Typography variant="body2" sx={{ mt: 1 }}>
                Selected file: {formData.evidence.name}
              </Typography>
            )}
          </Box>

          <Box sx={{ mt: 2, mb: 2 }}>
            <Typography variant="subtitle1" gutterBottom>
              Location {locationLoading && "(Getting location...)"}
            </Typography>
            <Button
              variant="outlined"
              onClick={getCurrentLocation}
              disabled={loading || locationLoading}
              sx={{ mb: 2 }}
            >
              {locationLoading ? 'Getting Location...' : 'Get Current Location'}
            </Button>
            {formData.latitude && formData.longitude && (
              <Typography variant="caption" color="success.main" sx={{ display: 'block', mb: 1 }}>
                Location set: {formData.latitude.toFixed(6)}, {formData.longitude.toFixed(6)}
              </Typography>
            )}
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