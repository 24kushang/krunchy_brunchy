import React, { useState, useEffect } from 'react';
import { api, SocialCampaign } from '../services/api';
import {
  Box,
  Grid,
  Paper,
  Typography,
  Button,
  IconButton,
  TextField,
  MenuItem,
  Checkbox,
  FormControlLabel,
  Dialog,
  DialogContent,
  DialogActions,
  DialogTitle,
  CircularProgress,
  Chip
} from '@mui/material';
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Calendar as CalendarIcon,
  Image as ImageIcon,
  Paperclip,
  X,
  Trash2,
  Instagram,
  Facebook,
  Twitter,
  Linkedin
} from 'lucide-react';

export const SocialDashboard: React.FC = () => {
  const [campaigns, setCampaigns] = useState<SocialCampaign[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentDate, setCurrentDate] = useState(new Date());

  // Modal states
  const [showModal, setShowModal] = useState(false);
  const [selectedCampaign, setSelectedCampaign] = useState<SocialCampaign | null>(null);
  const [targetDate, setTargetDate] = useState<Date | null>(null);

  // Form Fields
  const [campaignName, setCampaignName] = useState('');
  const [caption, setCaption] = useState('');
  const [notes, setNotes] = useState('');
  const [platforms, setPlatforms] = useState<string[]>(['Instagram']);
  const [scheduledDate, setScheduledDate] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [attachmentName, setAttachmentName] = useState('');
  const [status, setStatus] = useState<SocialCampaign['status']>('Scheduled');

  const [saving, setSaving] = useState(false);

  const loadCampaigns = async () => {
    setLoading(true);
    try {
      const res = await api.getSocialCampaigns();
      setCampaigns(res);
    } catch (err) {
      console.error('Failed to load campaigns:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCampaigns();
  }, []);

  const handlePrevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const handleCellClick = (dayDate: Date, campaignsOnDay: SocialCampaign[]) => {
    setTargetDate(dayDate);
    if (campaignsOnDay.length > 0) {
      // Edit the first campaign on this day or display selector
      openEditModal(campaignsOnDay[0]);
    } else {
      // Create new campaign for this day
      openCreateModal(dayDate);
    }
  };

  const openCreateModal = (date: Date) => {
    setSelectedCampaign(null);
    setCampaignName('');
    setCaption('');
    setNotes('');
    setPlatforms(['Instagram']);

    // Format to yyyy-MM-ddThh:mm for input
    const formatted = new Date(date);
    formatted.setHours(12, 0, 0, 0); // Default to noon
    const pad = (n: number) => n.toString().padStart(2, '0');
    const localDateTime = `${formatted.getFullYear()}-${pad(formatted.getMonth() + 1)}-${pad(formatted.getDate())}T12:00`;

    setScheduledDate(localDateTime);
    setImageUrl('');
    setAttachmentName('');
    setStatus('Scheduled');
    setShowModal(true);
  };

  const openEditModal = (camp: SocialCampaign) => {
    setSelectedCampaign(camp);
    setCampaignName(camp.campaign_name);
    setCaption(camp.caption || '');
    setNotes(camp.notes || '');
    setPlatforms(camp.platforms);

    // Format timezone date for local ISO string
    const dateObj = new Date(camp.scheduled_date);
    const pad = (n: number) => n.toString().padStart(2, '0');
    const localDateTime = `${dateObj.getFullYear()}-${pad(dateObj.getMonth() + 1)}-${pad(dateObj.getDate())}T${pad(dateObj.getHours())}:${pad(dateObj.getMinutes())}`;

    setScheduledDate(localDateTime);
    setImageUrl(camp.image_url || '');
    setAttachmentName(camp.attachment_name || '');
    setStatus(camp.status);
    setShowModal(true);
  };

  const handlePlatformToggle = (platform: string) => {
    if (platforms.includes(platform)) {
      setPlatforms(platforms.filter(p => p !== platform));
    } else {
      setPlatforms([...platforms, platform]);
    }
  };

  const handleSaveCampaign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!campaignName || !scheduledDate || platforms.length === 0) {
      alert('Name, Date, and at least one Platform are required');
      return;
    }

    setSaving(true);
    try {
      const payload: SocialCampaign = {
        campaign_name: campaignName,
        caption,
        notes,
        platforms,
        scheduled_date: new Date(scheduledDate).toISOString(),
        image_url: imageUrl,
        attachment_name: attachmentName,
        status
      };

      if (selectedCampaign && selectedCampaign.id) {
        await api.updateSocialCampaign(selectedCampaign.id, payload);
      } else {
        await api.createSocialCampaign(payload);
      }

      setShowModal(false);
      loadCampaigns();
    } catch (err: any) {
      alert(`Failed to save: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteCampaign = async () => {
    if (!selectedCampaign || !selectedCampaign.id) return;
    if (!confirm('Are you sure you want to delete this campaign scheduled post?')) return;

    setSaving(true);
    try {
      await api.deleteSocialCampaign(selectedCampaign.id);
      setShowModal(false);
      loadCampaigns();
    } catch (err: any) {
      alert(`Failed to delete: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  // Helper: Generates month calendar grid days
  const getCalendarDays = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    const firstDayIndex = new Date(year, month, 1).getDay(); // Sunday=0, Monday=1
    // Adjust to make Monday index 0
    const startOffset = firstDayIndex === 0 ? 6 : firstDayIndex - 1;

    const totalDays = new Date(year, month + 1, 0).getDate();
    const prevMonthTotalDays = new Date(year, month, 0).getDate();

    const days = [];

    // Prior month days
    for (let i = startOffset - 1; i >= 0; i--) {
      days.push({
        date: new Date(year, month - 1, prevMonthTotalDays - i),
        isCurrentMonth: false
      });
    }

    // Current month days
    for (let i = 1; i <= totalDays; i++) {
      days.push({
        date: new Date(year, month, i),
        isCurrentMonth: true
      });
    }

    // Remaining slots to round up to full week rows (42 total slots or multiples of 7)
    const totalSlots = days.length <= 35 ? 35 : 42;
    const remaining = totalSlots - days.length;
    for (let i = 1; i <= remaining; i++) {
      days.push({
        date: new Date(year, month + 1, i),
        isCurrentMonth: false
      });
    }

    return days;
  };

  const calendarDays = getCalendarDays();
  const monthName = currentDate.toLocaleString('default', { month: 'long', year: 'numeric' });

  // Filter campaigns for a specific day
  const getCampaignsForDay = (date: Date) => {
    return campaigns.filter(camp => {
      const campDate = new Date(camp.scheduled_date);
      return (
        campDate.getDate() === date.getDate() &&
        campDate.getMonth() === date.getMonth() &&
        campDate.getFullYear() === date.getFullYear()
      );
    });
  };

  const getPlatformIcon = (platform: string) => {
    switch (platform.toLowerCase()) {
      case 'instagram': return <Instagram size={14} style={{ color: '#E1306C' }} />;
      case 'facebook': return <Facebook size={14} style={{ color: '#1877F2' }} />;
      case 'twitter': return <Twitter size={14} style={{ color: '#1DA1F2' }} />;
      case 'linkedin': return <Linkedin size={14} style={{ color: '#0077B5' }} />;
      default: return null;
    }
  };

  // Mock Upload Handler (simulates uploading an image file and sets a placeholder path)
  const handleMockImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAttachmentName(file.name);
      // Create a simulated local blob URL for previewing in browser
      setImageUrl(URL.createObjectURL(file));
    }
  };

  const campaignStatuses = ['Scheduled', 'Draft', 'Published'];

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography variant="h5" component="h2" sx={{ fontWeight: 600 }} color="text.primary">
            Social Campaign Planner
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Schedule, write captions, preview attachments, and align marketing timelines.
          </Typography>
        </Box>
        <Button
          variant="contained"
          onClick={() => openCreateModal(new Date())}
          startIcon={<Plus size={18} />}
        >
          Create Campaign Post
        </Button>
      </Box>

      {/* Calendar Panel */}
      <Paper sx={{ p: 3, display: 'flex', flexDirection: 'column', gap: 2 }}>
        {/* Calendar Month Header Selector */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <CalendarIcon size={20} style={{ color: '#d97706' }} />
            <Typography variant="h6" sx={{ fontWeight: 700 }}>
              {monthName}
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <IconButton onClick={handlePrevMonth} variant="outlined" size="small" sx={{ border: '1px solid', borderColor: 'divider' }}>
              <ChevronLeft size={16} />
            </IconButton>
            <IconButton onClick={handleNextMonth} variant="outlined" size="small" sx={{ border: '1px solid', borderColor: 'divider' }}>
              <ChevronRight size={16} />
            </IconButton>
          </Box>
        </Box>

        {/* Days of Week Header & Days Grid */}
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: 'repeat(7, 1fr)',
            border: '1px solid',
            borderColor: 'divider',
            borderRadius: 2,
            overflow: 'hidden'
          }}
        >
          {/* Weekday headers */}
          {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(d => (
            <Box
              key={d}
              sx={{
                p: 1.5,
                textAlign: 'center',
                fontWeight: 700,
                fontSize: '0.85rem',
                backgroundColor: (theme) => theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)',
                borderBottom: '1px solid',
                borderColor: 'divider'
              }}
            >
              {d}
            </Box>
          ))}

          {/* Grid days cells */}
          {loading ? (
            <Box sx={{ gridColumn: 'span 7', display: 'flex', justifyContent: 'center', py: 8 }}>
              <CircularProgress size={32} />
            </Box>
          ) : (
            calendarDays.map((day, idx) => {
              const dayCampaigns = getCampaignsForDay(day.date);
              const isToday = new Date().toDateString() === day.date.toDateString();

              return (
                <Box
                  key={idx}
                  onClick={() => handleCellClick(day.date, dayCampaigns)}
                  sx={{
                    minHeight: 100,
                    p: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 0.5,
                    cursor: 'pointer',
                    transition: 'background-color 0.2s',
                    backgroundColor: isToday
                      ? (theme) => theme.palette.mode === 'dark' ? 'rgba(245, 158, 11, 0.05)' : 'rgba(217, 119, 6, 0.04)'
                      : 'transparent',
                    opacity: day.isCurrentMonth ? 1 : 0.4,
                    borderRight: (idx + 1) % 7 === 0 ? 'none' : '1px solid',
                    borderBottom: idx >= calendarDays.length - 7 ? 'none' : '1px solid',
                    borderColor: 'divider',
                    position: 'relative',
                    '&:hover': {
                      backgroundColor: 'action.hover'
                    }
                  }}
                >
                  <Typography
                    variant="caption"
                    sx={{
                      fontWeight: isToday ? 800 : 500,
                      color: isToday ? 'primary.main' : 'text.secondary',
                      fontSize: '0.75rem'
                    }}
                  >
                    {day.date.getDate()}
                  </Typography>

                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, flexGrow: 1, overflowY: 'auto' }}>
                    {dayCampaigns.slice(0, 2).map(camp => (
                      <Box
                        key={camp.id}
                        onClick={(e) => {
                          e.stopPropagation(); // Avoid triggering cell click
                          openEditModal(camp);
                        }}
                        sx={{
                          fontSize: '0.7rem',
                          fontWeight: 600,
                          backgroundColor: 'primary.main',
                          color: 'primary.contrastText',
                          p: '2px 6px',
                          borderRadius: '4px',
                          whiteSpace: 'nowrap',
                          textOverflow: 'ellipsis',
                          overflow: 'hidden'
                        }}
                      >
                        {camp.campaign_name}
                      </Box>
                    ))}
                    {dayCampaigns.length > 2 && (
                      <Typography variant="caption" sx={{ fontSize: '0.65rem', color: 'primary.main', fontWeight: 700, pl: 0.5 }}>
                        +{dayCampaigns.length - 2} more
                      </Typography>
                    )}
                  </Box>
                </Box>
              );
            })
          )}
        </Box>
      </Paper>

      {/* Campaign Dialog Modal */}
      <Dialog
        open={showModal}
        onClose={() => setShowModal(false)}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: { borderRadius: 3, p: 1 }
        }}
      >
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pb: 1 }}>
          <Typography variant="h6" sx={{ fontWeight: 700 }}>
            {selectedCampaign ? 'Modify Scheduled Campaign' : 'Schedule Social Campaign'}
          </Typography>
          <IconButton onClick={() => setShowModal(false)} size="small">
            <X size={20} />
          </IconButton>
        </DialogTitle>

        <DialogContent sx={{ px: 3, pb: 1, pt: 0 }}>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Draft caption templates, attach visual assets, and define publishing dates.
          </Typography>

          <Box component="form" onSubmit={handleSaveCampaign}>
            <Grid container spacing={2.5}>
              <Grid item xs={12}>
                <TextField
                  required
                  fullWidth
                  label="Campaign Title"
                  placeholder="e.g. Weekend Cookie Special Launch"
                  value={campaignName}
                  onChange={(e) => setCampaignName(e.target.value)}
                />
              </Grid>

              {/* Target Platforms selector */}
              <Grid item xs={12} sm={6}>
                <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>
                  Target Social Channels *
                </Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                  {['Instagram', 'Facebook', 'Twitter', 'Linkedin'].map(platform => {
                    const isSelected = platforms.includes(platform);
                    return (
                      <Chip
                        key={platform}
                        label={platform}
                        icon={getPlatformIcon(platform) || undefined}
                        onClick={() => handlePlatformToggle(platform)}
                        color={isSelected ? 'primary' : 'default'}
                        variant={isSelected ? 'filled' : 'outlined'}
                        sx={{ fontWeight: 600, px: 0.5 }}
                      />
                    );
                  })}
                </Box>
              </Grid>

              <Grid item xs={12} sm={6}>
                <TextField
                  required
                  fullWidth
                  type="datetime-local"
                  label="Schedule Date & Time"
                  value={scheduledDate}
                  onChange={(e) => setScheduledDate(e.target.value)}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>

              <Grid item xs={12}>
                <TextField
                  fullWidth
                  multiline
                  rows={3}
                  label="Caption template (Instagram/Facebook text)"
                  placeholder="Draft captions here, including tags: #cookies #biscuit #bakery..."
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                />
              </Grid>

              <Grid item xs={12}>
                <TextField
                  fullWidth
                  multiline
                  rows={2}
                  label="Internal Planner Notes (Private Admin remarks)"
                  placeholder="e.g. Needs approval from baking team regarding cookie stock..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </Grid>

              {/* Attachment selector */}
              <Grid item xs={12} sm={6}>
                <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>
                  Creative Asset (Image Attachment) *
                </Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  <Button
                    variant="outlined"
                    component="label"
                    startIcon={<ImageIcon size={16} />}
                    sx={{ textTransform: 'none', justifyContent: 'center' }}
                  >
                    {attachmentName ? 'Change Image File' : 'Upload Creative File'}
                    <input
                      type="file"
                      accept="image/*"
                      hidden
                      onChange={handleMockImageUpload}
                    />
                  </Button>
                  {attachmentName && (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, color: 'primary.main', fontSize: '0.75rem' }}>
                      <Paperclip size={12} />
                      <Typography variant="caption" noWrap sx={{ maxWidth: '200px' }}>
                        {attachmentName}
                      </Typography>
                    </Box>
                  )}
                </Box>
              </Grid>

              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  select
                  label="Publishing Status"
                  value={status}
                  onChange={(e) => setStatus(e.target.value as SocialCampaign['status'])}
                >
                  {campaignStatuses.map(st => (
                    <MenuItem key={st} value={st}>
                      {st}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>

              {/* Upload Image Preview container */}
              {imageUrl && (
                <Grid item xs={12}>
                  <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>
                    Attachment Visual Preview
                  </Typography>
                  <Box sx={{
                    border: '1px solid',
                    borderColor: 'divider',
                    p: 0.5,
                    borderRadius: 2,
                    maxWidth: 250,
                    backgroundColor: 'black'
                  }}>
                    <img
                      src={imageUrl}
                      alt="Campaign preview"
                      style={{ width: '100%', height: '140px', objectFit: 'cover', borderRadius: '6px' }}
                    />
                  </Box>
                </Grid>
              )}
            </Grid>

            {/* Dialog Action Buttons footer */}
            <DialogActions sx={{ pt: 3, px: 0, justifyContent: 'space-between' }}>
              {selectedCampaign ? (
                <Button
                  variant="outlined"
                  color="error"
                  onClick={handleDeleteCampaign}
                  disabled={saving}
                  startIcon={<Trash2 size={16} />}
                >
                  Cancel Post
                </Button>
              ) : (
                <Box />
              )}

              <Box sx={{ display: 'flex', gap: 1 }}>
                <Button
                  variant="outlined"
                  onClick={() => setShowModal(false)}
                  disabled={saving}
                >
                  Close
                </Button>
                <Button
                  type="submit"
                  variant="contained"
                  disabled={saving}
                  startIcon={saving ? <CircularProgress size={16} color="inherit" /> : null}
                >
                  {saving ? 'Saving...' : 'Save Campaign'}
                </Button>
              </Box>
            </DialogActions>
          </Box>
        </DialogContent>
      </Dialog>
    </Box>
  );
};

export default SocialDashboard;
