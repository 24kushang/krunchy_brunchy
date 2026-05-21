import React, { useState, useEffect } from 'react';
import { api, SocialCampaign } from '../services/api';
import { 
  ChevronLeft, 
  ChevronRight, 
  Plus, 
  Calendar as CalendarIcon, 
  Image as ImageIcon, 
  Paperclip, 
  X, 
  Loader, 
  Save, 
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

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2>Social Campaign Planner</h2>
          <p className="subtitle" style={{ margin: 0 }}>Schedule, write captions, preview attachments, and align marketing timelines.</p>
        </div>
        <button className="btn btn-primary" onClick={() => openCreateModal(new Date())}>
          <Plus size={16} />
          <span>Create Campaign Post</span>
        </button>
      </div>

      <div className="glass-panel">
        <div className="calendar-wrapper">
          {/* Calendar Month Header Selector */}
          <div className="calendar-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <CalendarIcon size={20} color="var(--color-primary)" />
              <span style={{ fontSize: '1.25rem', fontWeight: 700 }}>{monthName}</span>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button className="btn btn-secondary" style={{ padding: '0.5rem' }} onClick={handlePrevMonth}>
                <ChevronLeft size={16} />
              </button>
              <button className="btn btn-secondary" style={{ padding: '0.5rem' }} onClick={handleNextMonth}>
                <ChevronRight size={16} />
              </button>
            </div>
          </div>

          {/* Days of Week Header */}
          <div className="calendar-grid">
            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(d => (
              <div key={d} className="calendar-day-header">{d}</div>
            ))}

            {/* Grid days */}
            {calendarDays.map((day, idx) => {
              const dayCampaigns = getCampaignsForDay(day.date);
              const isToday = new Date().toDateString() === day.date.toDateString();
              
              return (
                <div 
                  key={idx}
                  className={`calendar-cell ${day.isCurrentMonth ? '' : 'other-month'} ${isToday ? 'today' : ''}`}
                  onClick={() => handleCellClick(day.date, dayCampaigns)}
                >
                  <div className="calendar-day-number">{day.date.getDate()}</div>
                  
                  <div className="calendar-campaigns-list">
                    {dayCampaigns.slice(0, 2).map(camp => (
                      <div 
                        key={camp.id} 
                        className="calendar-campaign-tag"
                        onClick={(e) => {
                          e.stopPropagation(); // Avoid triggering cell click
                          openEditModal(camp);
                        }}
                      >
                        {camp.campaign_name}
                      </div>
                    ))}
                    {dayCampaigns.length > 2 && (
                      <div style={{ fontSize: '0.65rem', color: 'var(--color-primary)', fontWeight: 700, paddingLeft: '4px' }}>
                        +{dayCampaigns.length - 2} more
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Campaign Dialog Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '650px' }}>
            <button className="modal-close" onClick={() => setShowModal(false)}>
              <X size={20} />
            </button>

            <h2>{selectedCampaign ? 'Modify Scheduled Campaign' : 'Schedule Social Campaign'}</h2>
            <p className="subtitle" style={{ marginBottom: '1.5rem' }}>Draft caption templates, attach visual assets, and define publishing dates.</p>

            <form onSubmit={handleSaveCampaign}>
              <div className="form-grid">
                <div className="form-group full-width">
                  <label htmlFor="camp-name">Campaign Title *</label>
                  <input
                    id="camp-name"
                    type="text"
                    placeholder="e.g. Weekend Cookie Special Launch"
                    value={campaignName}
                    onChange={(e) => setCampaignName(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Target Social Channels *</label>
                  <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
                    {['Instagram', 'Facebook', 'Twitter', 'Linkedin'].map(platform => (
                      <label 
                        key={platform} 
                        style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer', border: '1px solid var(--border-color)', padding: '6px 12px', borderRadius: '4px', backgroundColor: platforms.includes(platform) ? 'rgba(245, 158, 11, 0.1)' : 'transparent', borderColor: platforms.includes(platform) ? 'var(--color-primary)' : 'var(--border-color)' }}
                      >
                        <input
                          type="checkbox"
                          checked={platforms.includes(platform)}
                          onChange={() => handlePlatformToggle(platform)}
                          style={{ display: 'none' }}
                        />
                        {getPlatformIcon(platform)}
                        <span style={{ fontSize: '0.85rem', color: 'white' }}>{platform}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="camp-date">Schedule Date & Time *</label>
                  <input
                    id="camp-date"
                    type="datetime-local"
                    value={scheduledDate}
                    onChange={(e) => setScheduledDate(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group full-width">
                  <label htmlFor="camp-caption">Caption template (Instagram/Facebook text)</label>
                  <textarea
                    id="camp-caption"
                    rows={3}
                    placeholder="Draft captions here, including tags: #cookies #biscuit #bakery..."
                    value={caption}
                    onChange={(e) => setCaption(e.target.value)}
                  />
                </div>

                <div className="form-group full-width">
                  <label htmlFor="camp-notes">Internal Planner Notes (Private Admin remarks)</label>
                  <textarea
                    id="camp-notes"
                    rows={2}
                    placeholder="e.g. Needs approval from baking team regarding cookie stock..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                  />
                </div>

                {/* Simulated File Upload for Image Preview */}
                <div className="form-group">
                  <label>Creative Asset (Image Attachment) *</label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <label className="btn btn-secondary" style={{ cursor: 'pointer', padding: '0.6rem', fontSize: '0.85rem', justifyContent: 'center' }}>
                      <ImageIcon size={16} />
                      <span>{attachmentName ? 'Change Image File' : 'Upload Creative File'}</span>
                      <input 
                        type="file" 
                        accept="image/*" 
                        style={{ display: 'none' }} 
                        onChange={handleMockImageUpload} 
                      />
                    </label>
                    {attachmentName && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem', color: 'var(--color-primary)' }}>
                        <Paperclip size={12} />
                        <span style={{ textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', maxWidth: '200px' }}>{attachmentName}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="camp-status">Publishing Status</label>
                  <select
                    id="camp-status"
                    value={status}
                    onChange={(e) => setStatus(e.target.value as SocialCampaign['status'])}
                  >
                    <option value="Scheduled">Scheduled</option>
                    <option value="Draft">Draft</option>
                    <option value="Published">Published</option>
                  </select>
                </div>

                {/* Upload Image Preview container */}
                {imageUrl && (
                  <div className="form-group full-width" style={{ marginTop: '0.5rem' }}>
                    <label>Attachment Visual Preview</label>
                    <div style={{ border: '1px solid var(--border-color)', padding: '4px', borderRadius: '8px', maxWidth: '250px', backgroundColor: 'black' }}>
                      <img 
                        src={imageUrl} 
                        alt="Campaign preview" 
                        style={{ width: '100%', height: '140px', objectFit: 'cover', borderRadius: '6px' }} 
                      />
                    </div>
                  </div>
                )}

                <div className="form-group full-width" style={{ display: 'flex', justifyContent: 'space-between', marginTop: '1.5rem', borderTop: '1px solid var(--border-color)', paddingTop: '1.5rem' }}>
                  {selectedCampaign ? (
                    <button 
                      type="button" 
                      className="btn btn-danger"
                      onClick={handleDeleteCampaign}
                      disabled={saving}
                    >
                      <Trash2 size={16} />
                      <span>Cancel Post</span>
                    </button>
                  ) : (
                    <div></div>
                  )}

                  <button 
                    type="submit" 
                    className="btn btn-primary"
                    disabled={saving}
                  >
                    {saving ? (
                      <>
                        <Loader className="animate-spin" size={16} />
                        <span>Saving...</span>
                      </>
                    ) : (
                      <>
                        <Save size={16} />
                        <span>Save Campaign</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
export default SocialDashboard;
