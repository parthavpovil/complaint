import React, { useState, useEffect, useCallback } from 'react';
import { 
  Container, 
  Typography, 
  Box, 
  Paper, 
  Grid, 
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  CircularProgress,
  Alert
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { complaintService } from '../../services/complaint';
import LogoutIcon from '@mui/icons-material/Logout';
import FilterListIcon from '@mui/icons-material/FilterList';
import DashboardIcon from '@mui/icons-material/Dashboard';
import LocationOnIcon from '@mui/icons-material/LocationOn';

const districts = [
  'Ernakulam',
  'Thiruvananthapuram',
  'Kozhikode',
  'Thrissur',
  'Kottayam'
];

const statuses = ['pending', 'in_progress', 'resolved'];

const parseLocation = (locationStr) => {
  if (!locationStr) return { latitude: null, longitude: null };
  try {
    // Check if we already have latitude and longitude properties
    if (typeof locationStr === 'object') {
      if ('latitude' in locationStr && 'longitude' in locationStr) {
        const lat = Number(locationStr.latitude);
        const lng = Number(locationStr.longitude);
        if (!isNaN(lat) && !isNaN(lng)) {
          return { latitude: lat, longitude: lng };
        }
      }
      return { latitude: null, longitude: null };
    }

    // Format is "POINT(longitude latitude)"
    const match = String(locationStr).match(/POINT\(([-\d.]+) ([-\d.]+)\)/);
    if (match) {
      const longitude = parseFloat(match[1]);
      const latitude = parseFloat(match[2]);
      
      // Validate the parsed values are within valid ranges
      if (!isNaN(latitude) && !isNaN(longitude) &&
          latitude >= -90 && latitude <= 90 &&
          longitude >= -180 && longitude <= 180) {
        return { latitude, longitude };
      }
    }
    return { latitude: null, longitude: null };
  } catch (err) {
    console.error('Error parsing location:', err, 'locationStr:', locationStr);
    return { latitude: null, longitude: null };
  }
};

function OfficialDashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [complaints, setComplaints] = useState([]);
  const [categories, setCategories] = useState([]);
  const [filters, setFilters] = useState({
    district: '',
    category: '',
    status: ''
  });

  const fetchComplaints = useCallback(async () => {
    setLoading(true);
    try {
      const response = await complaintService.getFilteredComplaints(filters);
      // Handle both response formats (filtered and allcomplaints)
      const complaintsData = response.data || response.complaints || [];
      setComplaints(complaintsData);
      setError('');
    } catch (err) {
      setError('Failed to fetch complaints. Please try again later.');
      console.error('Error fetching complaints:', err);
    } finally {
      setLoading(false);
    }
  }, [filters]); // Include filters in dependencies

  const fetchCategories = useCallback(async () => {
    try {
      const response = await complaintService.getCategories();
      setCategories(response.data || []);
    } catch (err) {
      console.error('Error fetching categories:', err);
      // Don't set error for categories as it's not critical
    }
  }, []);

  useEffect(() => {
    fetchComplaints();
    fetchCategories();
  }, [fetchComplaints, fetchCategories]);

  const handleFilterChange = (event) => {
    const { name, value } = event.target;
    setFilters(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const clearFilters = () => {
    setFilters({
      district: '',
      category: '',
      status: ''
    });
  };

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'pending':
        return 'warning';
      case 'in_progress':
        return 'info';
      case 'resolved':
        return 'success';
      default:
        return 'default';
    }
  };

  const getCategoryName = (categoryId) => {
    const category = categories.find(cat => cat.id === categoryId);
    return category ? category.name : `Category ${categoryId}`;
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <Box sx={{ 
      minHeight: '100vh',
      backgroundColor: '#f5f5f5',
      pt: 3,
      pb: 6
    }}>
      <Container maxWidth="xl">
        <Box sx={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          mb: 4,
          backgroundColor: 'white',
          p: 3,
          borderRadius: 2,
          boxShadow: 1
        }}>
          <Box>
            <Typography variant="h4" sx={{ fontWeight: 600, color: '#1976d2' }}>
              Official Dashboard
            </Typography>
            <Typography variant="subtitle1" sx={{ mt: 1, color: 'text.secondary' }}>
              Welcome back, {user?.name}
            </Typography>
          </Box>
          <Button
            variant="contained"
            color="primary"
            startIcon={<LogoutIcon />}
            onClick={handleLogout}
            sx={{ 
              borderRadius: 2,
              textTransform: 'none',
              px: 3
            }}
          >
            Logout
          </Button>
        </Box>
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <Paper sx={{ 
                p: 2,
                borderRadius: 1,
                backgroundColor: '#fff',
                mb: 3,
                width: '100%'
              }}>
              <Box sx={{ 
                display: 'flex', 
                alignItems: 'center',
                gap: 2,
                mb: 2
              }}>
                <FilterListIcon sx={{ color: '#1976d2' }} />
                <Typography sx={{ color: '#1976d2', fontWeight: 500 }}>
                  Filter Complaints
                </Typography>
                <Button
                  variant="text"
                  size="small"
                  onClick={clearFilters}
                  sx={{ 
                    ml: 'auto',
                    color: '#1976d2',
                    textTransform: 'none'
                  }}
                >
                  Clear Filters
                </Button>
              </Box>
              
              <Box sx={{ display: 'flex', gap: 2 }}>
                <FormControl sx={{ minWidth: 200 }} size="small">
                  <InputLabel>District</InputLabel>
                  <Select
                    name="district"
                    value={filters.district}
                    onChange={handleFilterChange}
                    label="District"
                  >
                    <MenuItem value="">All Districts</MenuItem>
                    {districts.map(district => (
                      <MenuItem key={district} value={district}>
                        {district}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                <FormControl sx={{ minWidth: 200 }} size="small">
                  <InputLabel>Category</InputLabel>
                  <Select
                    name="category"
                    value={filters.category}
                    onChange={handleFilterChange}
                    label="Category"
                  >
                    <MenuItem value="">All Categories</MenuItem>
                    {categories.map(category => (
                      <MenuItem key={category.id} value={category.id}>
                        {category.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                <FormControl sx={{ minWidth: 200 }} size="small">
                  <InputLabel>Status</InputLabel>
                  <Select
                    name="status"
                    value={filters.status}
                    onChange={handleFilterChange}
                    label="Status"
                  >
                    <MenuItem value="">All Statuses</MenuItem>
                    {statuses.map(status => (
                      <MenuItem key={status} value={status}>
                        {status.charAt(0).toUpperCase() + status.slice(1).replace('_', ' ')}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Box>
            </Paper>
          </Grid>

          <Grid item xs={12}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                Complaints List
              </Typography>
              
              {error && (
                <Alert severity="error" sx={{ mb: 2 }}>
                  {error}
                </Alert>
              )}

              {loading ? (
                <Box display="flex" justifyContent="center" p={3}>
                  <CircularProgress />
                </Box>
              ) : complaints.length === 0 ? (
                <Typography variant="body1" color="textSecondary">
                  No complaints found matching the filters.
                </Typography>
              ) : (
                <TableContainer>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>Title</TableCell>
                        <TableCell>Category</TableCell>
                        <TableCell>Status</TableCell>
                        <TableCell>Location</TableCell>
                        <TableCell>Created At</TableCell>
                        <TableCell>Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {complaints.map((complaint) => (
                        <TableRow key={complaint.id}>
                          <TableCell>
                            <Typography variant="body2">
                              {complaint.title}
                            </Typography>
                            <Typography variant="caption" color="textSecondary">
                              {complaint.description.substring(0, 100)}
                              {complaint.description.length > 100 ? '...' : ''}
                            </Typography>
                          </TableCell>
                          <TableCell>{getCategoryName(complaint.category)}</TableCell>
                          <TableCell>
                            <Chip
                              label={complaint.status || 'Pending'}
                              color={getStatusColor(complaint.status)}
                              size="small"
                            />
                          </TableCell>
                          <TableCell>
                            <Typography variant="caption">
                              {complaint.latitude && complaint.longitude ? (
                                <>
                                  Lat: {Number(complaint.latitude).toFixed(6)}<br />
                                  Long: {Number(complaint.longitude).toFixed(6)}
                                </>
                              ) : (
                                'Location not available'
                              )}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            {new Date(complaint.created_at).toLocaleDateString()}
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="outlined"
                              size="small"
                              onClick={() => {/* Add update handler */}}
                            >
                              Update Status
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </Paper>
          </Grid>
        </Grid>
      </Container>
    </Box>
  );
}

export default OfficialDashboard;
