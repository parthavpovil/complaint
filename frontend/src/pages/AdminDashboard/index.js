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
  Alert,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Tabs,
  Tab
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { complaintService } from '../../services/complaint';
import { authService } from '../../services/auth';
import LogoutIcon from '@mui/icons-material/Logout';
import FilterListIcon from '@mui/icons-material/FilterList';
import PersonAddIcon from '@mui/icons-material/PersonAdd';

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
  'Others'
];

const districts = [
  'Ernakulam',
  'Thiruvananthapuram',
  'Kozhikode',
  'Thrissur',
  'Kottayam'
];

const statuses = ['pending', 'in_progress', 'resolved'];

function AdminDashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState(0);
  const [loading, setLoading] = useState(false);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [loadingOfficials, setLoadingOfficials] = useState(false);
  const [error, setError] = useState('');
  const [complaints, setComplaints] = useState([]);
  const [users, setUsers] = useState([]);
  const [officials, setOfficials] = useState([]);
  const [filters, setFilters] = useState({
    district: '',
    category: '',
    status: ''
  });

  const fetchComplaints = useCallback(async () => {
    setLoading(true);
    try {
      const response = await complaintService.getFilteredComplaints(filters);
      const complaintsData = response.data || response.complaints || [];
      setComplaints(complaintsData);
      setError('');
    } catch (err) {
      setError('Failed to fetch complaints. Please try again later.');
      console.error('Error fetching complaints:', err);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  const fetchUsers = async () => {
    setLoadingUsers(true);
    try {
      const response = await authService.getAllUsers();
      if (response && response.users) {
        setUsers(response.users);
      } else {
        setUsers([]);
      }
      setError('');
    } catch (err) {
      setError('Failed to fetch users. Please try again later.');
      console.error('Error fetching users:', err);
      setUsers([]);
    } finally {
      setLoadingUsers(false);
    }
  };

  const fetchOfficials = async () => {
    setLoadingOfficials(true);
    try {
      const response = await authService.getAllOfficials();
      console.log('Officials response:', response); // Debug log
      if (response && response.officials) {
        setOfficials(response.officials);
      } else {
        setOfficials([]);
      }
      setError('');
    } catch (err) {
      setError('Failed to fetch officials. Please try again later.');
      console.error('Error fetching officials:', err);
      setOfficials([]);
    } finally {
      setLoadingOfficials(false);
    }
  };

  useEffect(() => {
    if (activeTab === 0) {
      fetchComplaints();
    } else {
      fetchUsers();
      fetchOfficials();
    }
  }, [activeTab]);

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

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  const handlePromoteUser = async (userId) => {
    try {
      await authService.updateUserRole(userId, 'official');
      fetchUsers(); // Refresh the list
      setError('');
    } catch (err) {
      setError('Failed to update user role. Please try again later.');
      console.error('Error updating user role:', err);
    }
  };

  return (
    <Box sx={{ 
      minHeight: '100vh',
      backgroundColor: '#f5f5f5',
      pt: 3,
      pb: 6
    }}>
      <Container maxWidth="xl">
        {/* Header */}
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
              Admin Dashboard
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

        {/* Tabs */}
        <Paper sx={{ mb: 3 }}>
          <Tabs value={activeTab} onChange={handleTabChange} centered>
            <Tab label="View Complaints" />
            <Tab label="Manage Officials" />
          </Tabs>
        </Paper>

        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        {activeTab === 0 ? (
          <>
            {/* Complaints Section */}
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
                        <MenuItem key={category} value={category}>
                          {category}
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

              <Paper sx={{ p: 3 }}>
                <Typography variant="h6" gutterBottom>
                  Complaints List
                </Typography>

                {loadingOfficials ? (
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
                          <TableCell>District</TableCell>
                          <TableCell>Created At</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {complaints.map((complaint) => (
                          <TableRow key={complaint.id}>
                            <TableCell>
                              <Typography variant="body2">
                                {complaint.title || 'No Title'}
                              </Typography>
                              <Typography variant="caption" color="textSecondary">
                                {complaint.description ? 
                                  `${complaint.description.substring(0, 100)}${complaint.description.length > 100 ? '...' : ''}` 
                                  : 'No description'}
                              </Typography>
                            </TableCell>
                            <TableCell>{complaint.category || 'N/A'}</TableCell>
                            <TableCell>
                              <Chip
                                label={complaint.status ? (
                                  complaint.status.charAt(0).toUpperCase() + complaint.status.slice(1).replace('_', ' ')
                                ) : 'Pending'}
                                color={
                                  complaint.status === 'resolved' ? 'success' :
                                  complaint.status === 'in_progress' ? 'info' : 'warning'
                                }
                                size="small"
                              />
                            </TableCell>
                            <TableCell>{complaint.district || 'N/A'}</TableCell>
                            <TableCell>
                              {complaint.created_at ? 
                                new Date(complaint.created_at).toLocaleDateString() 
                                : 'N/A'}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                )}
              </Paper>
            </Grid>
          </>
        ) : (
          <>
            {/* Officials Management Section */}
            <Paper sx={{ p: 3, mb: 3 }}>
              <Box sx={{ mb: 3 }}>
                <Typography variant="h6" gutterBottom>
                  Regular Users
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  Promote users to official role to give them complaint management capabilities.
                </Typography>
              </Box>

              {loadingUsers ? (
                <Box display="flex" justifyContent="center" p={3}>
                  <CircularProgress />
                </Box>
              ) : users.length === 0 ? (
                <Typography variant="body1" color="textSecondary">
                  No regular users found.
                </Typography>
              ) : (
                <List>
                  {users.filter(user => user.Role === 'user').map((user) => (
                    <ListItem
                      key={user.id}
                      divider
                      sx={{
                        '&:hover': {
                          backgroundColor: 'rgba(0, 0, 0, 0.04)'
                        }
                      }}
                    >
                      <ListItemText
                        primary={
                          <Typography variant="body1">
                            {user.Name || user.Email || 'Unknown User'}
                          </Typography>
                        }
                        secondary={
                          <Typography variant="body2" color="textSecondary" component="div">
                            <Box>Email: {user.Email || 'N/A'}</Box>
                          </Typography>
                        }
                      />
                      <ListItemSecondaryAction>
                        <Button
                          variant="outlined"
                          startIcon={<PersonAddIcon />}
                          onClick={() => handlePromoteUser(user.id)}
                          sx={{ textTransform: 'none' }}
                        >
                          Promote to Official
                        </Button>
                      </ListItemSecondaryAction>
                    </ListItem>
                  ))}
                </List>
              )}
            </Paper>

            {/* Officials List Section */}
            <Paper sx={{ p: 3 }}>
              <Box sx={{ mb: 3 }}>
                <Typography variant="h6" gutterBottom>
                  Current Officials
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  Officials who can manage and update complaints.
                </Typography>
              </Box>

              {loadingOfficials ? (
                <Box display="flex" justifyContent="center" p={3}>
                  <CircularProgress />
                </Box>
              ) : officials.length === 0 ? (
                <Typography variant="body1" color="textSecondary">
                  No officials found.
                </Typography>
              ) : (
                <List>
                  {officials.map((official) => (
                    <ListItem
                      key={official.id}
                      divider
                      sx={{
                        '&:hover': {
                          backgroundColor: 'rgba(0, 0, 0, 0.04)'
                        }
                      }}
                    >
                      <ListItemText
                        primary={
                          <Typography variant="body1">
                            {official.Name || official.Email || 'Unknown Official'}
                          </Typography>
                        }
                        secondary={
                          <Typography variant="body2" color="textSecondary" component="div">
                            <Box>Email: {official.Email || 'N/A'}</Box>
                            <Box>Since: {official.CreatedAt ? new Date(official.CreatedAt).toLocaleDateString() : 'N/A'}</Box>
                          </Typography>
                        }
                      />
                    </ListItem>
                  ))}
                </List>
              )}
            </Paper>
          </>
        )}
      </Container>
    </Box>
  );
}

export default AdminDashboard;
