import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Button,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormGroup,
  FormControlLabel,
  Checkbox,
  Stack,
  Chip,
  Divider,
  Paper,
  Drawer,
  CircularProgress,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  FormLabel,
  useTheme
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import PrevIcon from '@mui/icons-material/ChevronLeft';
import NextIcon from '@mui/icons-material/ChevronRight';
import UploadIcon from '@mui/icons-material/CloudUpload';
import EditIcon from '@mui/icons-material/Edit';
import CheckedIcon from '@mui/icons-material/CheckCircleOutlined';
import UncheckedIcon from '@mui/icons-material/RadioButtonUnchecked';
import InstaIcon from '@mui/icons-material/Instagram';
import FbIcon from '@mui/icons-material/Facebook';
import LnIcon from '@mui/icons-material/LinkedIn';
import api from '../utils/api';

interface PostContent {
  id: string;
  title: string;
  caption: string;
  scheduledAt: string;
  mediaUrl?: string;
  platforms: string[];
  checklist: Record<string, boolean>;
}

export default function SocialMedia() {
  const theme = useTheme();
  const [posts, setPosts] = useState<PostContent[]>([]);
  const [loading, setLoading] = useState(true);

  // Calendar Date Navigation
  const [currentDate, setCurrentDate] = useState(new Date());

  // Details drawer
  const [selectedPost, setSelectedPost] = useState<PostContent | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Form states
  const [openDialog, setOpenDialog] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [title, setTitle] = useState('');
  const [caption, setCaption] = useState('');
  const [scheduledAt, setScheduledAt] = useState('');
  const [mediaUrl, setMediaUrl] = useState('');
  const [uploading, setUploading] = useState(false);
  
  // Platform checklists
  const [selectedPlatforms, setSelectedPlatforms] = useState<Record<string, boolean>>({
    Instagram: true,
    Facebook: false,
    LinkedIn: false,
  });

  // Task lists
  const [checklistTasks, setChecklistTasks] = useState<Record<string, boolean>>({
    'Graphic Design': false,
    'Caption Drafted': false,
    'Approval': false,
    'Published': false,
  });

  const fetchPosts = () => {
    setLoading(true);
    api.get('/api/social-media')
      .then((res) => {
        setPosts(res.data);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchPosts();
  }, []);

  const handlePrevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  // Google Drive upload pointer
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    const formData = new FormData();
    formData.append('file', file);

    setUploading(true);
    try {
      const res = await api.post('/api/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setMediaUrl(res.data.url);
    } catch (err) {
      console.error(err);
      alert('Upload simulated.');
    } finally {
      setUploading(false);
    }
  };

  const handleOpenCreate = () => {
    setIsEditMode(false);
    setTitle('');
    setCaption('');
    setScheduledAt(new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 16)); // tomorrow
    setMediaUrl('');
    setSelectedPlatforms({ Instagram: true, Facebook: false, LinkedIn: false });
    setChecklistTasks({
      'Graphic Design': false,
      'Caption Drafted': false,
      'Approval': false,
      'Published': false,
    });
    setOpenDialog(true);
  };

  const handleOpenEdit = (post: PostContent) => {
    setIsEditMode(true);
    setSelectedPost(post);
    setTitle(post.title);
    setCaption(post.caption);
    
    // Format timestamp for datetime-local input
    const localTime = new Date(post.scheduledAt);
    const tzOffset = localTime.getTimezoneOffset() * 60000;
    const formatted = new Date(localTime.getTime() - tzOffset).toISOString().slice(0, 16);
    setScheduledAt(formatted);

    setMediaUrl(post.mediaUrl || '');
    
    const platformsMap: Record<string, boolean> = { Instagram: false, Facebook: false, LinkedIn: false };
    post.platforms.forEach(p => { platformsMap[p] = true; });
    setSelectedPlatforms(platformsMap);
    
    setChecklistTasks(post.checklist || {});
    setOpenDialog(true);
  };

  const handleSave = async () => {
    if (!title.trim() || !caption.trim() || !scheduledAt) {
      alert('Please fill in required fields');
      return;
    }

    const platforms = Object.keys(selectedPlatforms).filter(k => selectedPlatforms[k]);
    const payload = {
      title,
      caption,
      scheduledAt: new Date(scheduledAt).toISOString(),
      mediaUrl,
      platforms,
      checklist: checklistTasks,
    };

    try {
      if (isEditMode && selectedPost) {
        await api.put(`/api/social-media/${selectedPost.id}`, payload);
      } else {
        await api.post('/api/social-media', payload);
      }
      setOpenDialog(false);
      fetchPosts();
      setDrawerOpen(false);
    } catch (err) {
      console.error(err);
      alert('Failed to save social media content calendar post');
    }
  };

  const handleToggleChecklistItem = async (post: PostContent, key: string) => {
    const nextChecklist = { ...post.checklist, [key]: !post.checklist[key] };
    const updatedPost = { ...post, checklist: nextChecklist };
    
    // Optimistic UI update
    setPosts(prev => prev.map(p => p.id === post.id ? updatedPost : p));
    if (selectedPost && selectedPost.id === post.id) {
      setSelectedPost(updatedPost);
    }

    try {
      await api.put(`/api/social-media/${post.id}`, { checklist: nextChecklist });
    } catch (err) {
      console.error(err);
      fetchPosts(); // revert on fail
    }
  };

  // Generate Calendar Grid Days
  const getCalendarDays = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    const firstDayIndex = new Date(year, month, 1).getDay();
    const lastDay = new Date(year, month + 1, 0).getDate();

    const days = [];
    // Pad previous month days
    for (let i = 0; i < firstDayIndex; i++) {
      days.push(null);
    }
    // Current month days
    for (let i = 1; i <= lastDay; i++) {
      days.push(new Date(year, month, i));
    }
    return days;
  };

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const calendarDays = getCalendarDays();

  // Helper to match posts with calendar days
  const getPostsForDay = (day: Date) => {
    return posts.filter(post => {
      const postDate = new Date(post.scheduledAt);
      return (
        postDate.getDate() === day.getDate() &&
        postDate.getMonth() === day.getMonth() &&
        postDate.getFullYear() === day.getFullYear()
      );
    });
  };

  const getPlatformIcon = (platform: string) => {
    switch (platform) {
      case 'Instagram': return <InstaIcon sx={{ fontSize: 16, color: '#E1306C' }} />;
      case 'Facebook': return <FbIcon sx={{ fontSize: 16, color: '#1877F2' }} />;
      case 'LinkedIn': return <LnIcon sx={{ fontSize: 16, color: '#0A66C2' }} />;
      default: return null;
    }
  };

  return (
    <Box sx={{ pb: 6 }}>
      {/* Calendar Navigation header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4, flexWrap: 'wrap', gap: 2 }}>
        <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
          <IconButton onClick={handlePrevMonth} sx={{ border: `1px solid ${theme.palette.divider}` }}>
            <PrevIcon />
          </IconButton>
          
          <Typography variant="h5" sx={{ fontFamily: '"Fredoka", sans-serif', fontWeight: 700, minWidth: 180, textAlign: 'center' }}>
            {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
          </Typography>
          
          <IconButton onClick={handleNextMonth} sx={{ border: `1px solid ${theme.palette.divider}` }}>
            <NextIcon />
          </IconButton>
        </Stack>

        <Button
          variant="contained"
          color="primary"
          startIcon={<AddIcon />}
          onClick={handleOpenCreate}
          sx={{ bgcolor: '#FF5A09', '&:hover': { bgcolor: '#E04E07' }, borderRadius: 3 }}
        >
          Add Calendar Post
        </Button>
      </Box>

      {/* Days of week header */}
      <Grid container spacing={1} sx={{ mb: 1, textAlign: 'center' }}>
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
          <Grid size={1.7} key={d}>
            <Typography variant="subtitle2" sx={{ fontWeight: 800, color: 'text.secondary' }}>
              {d}
            </Typography>
          </Grid>
        ))}
      </Grid>

      {/* Calendar Grid */}
      {loading ? (
        <Stack direction="row" sx={{ justifyContent: 'center', py: 12 }}>
          <CircularProgress color="primary" />
        </Stack>
      ) : (
        <Grid container spacing={1}>
          {calendarDays.map((day, idx) => {
            const isToday = day && 
              day.getDate() === new Date().getDate() && 
              day.getMonth() === new Date().getMonth() && 
              day.getFullYear() === new Date().getFullYear();
              
            const dayPosts = day ? getPostsForDay(day) : [];

            return (
              <Grid size={1.7} key={idx} sx={{ height: 120 }}>
                <Paper
                  sx={{
                    height: '100%',
                    p: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    border: isToday ? '2px solid #FF5A09' : '1px solid #EFEAE4',
                    bgcolor: day 
                      ? isToday ? 'rgba(255, 90, 9, 0.02)' : 'theme.palette.background.paper' 
                      : theme.palette.mode === 'light' ? '#FAF6F0' : '#11100F',
                    opacity: day ? 1 : 0.4,
                  }}
                >
                  <Typography variant="body2" sx={{ fontWeight: isToday ? 800 : 500, color: isToday ? '#FF5A09' : 'inherit' }}>
                    {day ? day.getDate() : ''}
                  </Typography>

                  {/* List of post titles scheduled on this day */}
                  <Stack spacing={0.5} sx={{ overflowY: 'auto', flexGrow: 1, mt: 0.5 }}>
                    {dayPosts.map((post) => (
                      <Box
                        key={post.id}
                        onClick={() => {
                          setSelectedPost(post);
                          setDrawerOpen(true);
                        }}
                        sx={{
                          bgcolor: theme.palette.mode === 'light' ? 'rgba(10, 59, 176, 0.05)' : 'rgba(76, 123, 244, 0.1)',
                          color: theme.palette.mode === 'light' ? '#0A3BB0' : '#4C7BF4',
                          px: 1,
                          py: 0.5,
                          borderRadius: 1.5,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: 0.5,
                          '&:hover': {
                            bgcolor: '#FF5A09',
                            color: '#FFF',
                          },
                        }}
                      >
                        <Typography sx={{ fontSize: '0.7rem', fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {post.title}
                        </Typography>
                        <Stack direction="row" spacing={0.2}>
                          {post.platforms.map((p) => (
                            <Box key={p} sx={{ display: 'flex', alignItems: 'center' }}>
                              {getPlatformIcon(p)}
                            </Box>
                          ))}
                        </Stack>
                      </Box>
                    ))}
                  </Stack>
                </Paper>
              </Grid>
            );
          })}
        </Grid>
      )}

      {/* Post Inspect Drawer Side Panel */}
      <Drawer
        anchor="right"
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        PaperProps={{ sx: { width: { xs: '100%', sm: 380 }, p: 3 } }}
      >
        {selectedPost && (
          <Stack spacing={3}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="h5" sx={{ fontFamily: '"Fredoka", sans-serif', color: '#0A3BB0' }}>
                Inspect Post
              </Typography>
              <IconButton onClick={() => handleOpenEdit(selectedPost)}>
                <EditIcon color="primary" />
              </IconButton>
            </Box>

            <Divider />

            <Box>
              <Typography variant="caption" color="textSecondary">Scheduled Date</Typography>
              <Typography variant="body1" sx={{ fontWeight: 700 }}>
                {new Date(selectedPost.scheduledAt).toLocaleString()}
              </Typography>
            </Box>

            <Box>
              <Typography variant="caption" color="textSecondary">Post Title</Typography>
              <Typography variant="body1" sx={{ fontWeight: 800 }}>
                {selectedPost.title}
              </Typography>
            </Box>

            <Box>
              <Typography variant="caption" color="textSecondary">Caption / Body Copy</Typography>
              <Paper sx={{ p: 2, bgcolor: theme.palette.mode === 'light' ? '#FAF6F0' : '#222120', borderRadius: 2 }}>
                <Typography variant="body2" style={{ whiteSpace: 'pre-wrap' }}>
                  {selectedPost.caption}
                </Typography>
              </Paper>
            </Box>

            <Box>
              <Typography variant="caption" color="textSecondary">Platforms</Typography>
              <Stack direction="row" spacing={1} sx={{ mt: 0.5 }}>
                {selectedPost.platforms.map(p => (
                  <Chip
                    key={p}
                    icon={getPlatformIcon(p) || undefined}
                    label={p}
                    size="small"
                  />
                ))}
              </Stack>
            </Box>

            {selectedPost.mediaUrl && (
              <Box>
                <Typography variant="caption" color="textSecondary" display="block" sx={{ mb: 1 }}>Drive Attachment</Typography>
                <Button
                  variant="outlined"
                  href={selectedPost.mediaUrl}
                  target="_blank"
                  size="small"
                  sx={{ borderRadius: 2 }}
                >
                  View File on Google Drive
                </Button>
              </Box>
            )}

            <Divider />

            {/* Platform Checklist section */}
            <Box>
              <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 1.5 }}>
                Outbound Release Checklist
              </Typography>
              
              <List>
                {Object.keys(selectedPost.checklist || {}).map((key) => {
                  const checked = selectedPost.checklist[key];
                  return (
                    <ListItemButton
                      key={key}
                      onClick={() => handleToggleChecklistItem(selectedPost, key)}
                      sx={{
                        borderRadius: 2,
                        mb: 0.5,
                        bgcolor: checked ? 'rgba(76, 175, 80, 0.05)' : 'transparent',
                      }}
                    >
                      <IconButton size="small" color={checked ? 'success' : 'default'} sx={{ mr: 1.5 }}>
                        {checked ? <CheckedIcon /> : <UncheckedIcon />}
                      </IconButton>
                      <ListItemText
                        primary={key}
                        slotProps={{
                          primary: {
                            fontWeight: checked ? 700 : 500,
                            color: checked ? '#4CAF50' : 'inherit',
                            fontSize: '0.9rem'
                          }
                        }}
                      />
                    </ListItemButton>
                  );
                })}
              </List>
            </Box>
          </Stack>
        )}
      </Drawer>

      {/* Dialog for Post Create / Update */}
      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ borderBottom: `1px solid ${theme.palette.divider}` }}>
          <Typography variant="h5" sx={{ fontFamily: '"Fredoka", sans-serif', color: '#0A3BB0' }}>
            {isEditMode ? 'Edit Content Schedule' : 'Schedule Content Release'}
          </Typography>
        </DialogTitle>
        <DialogContent sx={{ py: 3 }}>
          <Stack spacing={2.5} sx={{ mt: 1 }}>
            <TextField
              label="Post / Event Title"
              fullWidth
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
            
            <TextField
              label="Caption Copywriting"
              fullWidth
              multiline
              rows={4}
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              required
            />

            <TextField
              label="Scheduling Date & Time"
              type="datetime-local"
              fullWidth
              value={scheduledAt}
              onChange={(e) => setScheduledAt(e.target.value)}
              slotProps={{ inputLabel: { shrink: true } }}
              required
            />

            <Box>
              <FormLabel sx={{ fontSize: '0.85rem', fontWeight: 700, mb: 1, display: 'block' }}>Target Platforms</FormLabel>
              <FormGroup row>
                {['Instagram', 'Facebook', 'LinkedIn'].map(p => (
                  <FormControlLabel
                    key={p}
                    control={
                      <Checkbox
                        checked={selectedPlatforms[p] || false}
                        onChange={(e) => {
                          setSelectedPlatforms(prev => ({ ...prev, [p]: e.target.checked }));
                        }}
                      />
                    }
                    label={p}
                  />
                ))}
              </FormGroup>
            </Box>

            {/* Google Drive Upload */}
            <Box>
              <FormLabel sx={{ fontSize: '0.85rem', fontWeight: 700, mb: 1, display: 'block' }}>Media Attachment</FormLabel>
              <Stack direction="row" spacing={2} sx={{ alignItems: 'center' }}>
                <Button
                  variant="outlined"
                  component="label"
                  startIcon={uploading ? <CircularProgress size={20} /> : <UploadIcon />}
                  disabled={uploading}
                >
                  {uploading ? 'Uploading to Drive...' : 'Upload Asset to Drive'}
                  <input type="file" hidden accept="image/*,video/*" onChange={handleFileUpload} />
                </Button>
                {mediaUrl && (
                  <Chip
                    label="Drive File Ready"
                    color="success"
                    variant="outlined"
                    onDelete={() => setMediaUrl('')}
                  />
                )}
              </Stack>
            </Box>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ borderTop: `1px solid ${theme.palette.divider}`, px: 3, py: 2 }}>
          <Button variant="outlined" onClick={() => setOpenDialog(false)} sx={{ borderRadius: 3 }}>
            Cancel
          </Button>
          <Button variant="contained" onClick={handleSave} sx={{ bgcolor: '#FF5A09', '&:hover': { bgcolor: '#E04E07' }, borderRadius: 3 }}>
            Save Event Settings
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
