// Transcripts Page JavaScript
class TranscriptsManager {
    constructor() {
        this.transcripts = [];
        this.filteredTranscripts = [];
        this.currentFilters = {
            campaign: '',
            status: '',
            date: ''
        };
        
        this.init();
    }
    
    async init() {
        this.setupEventListeners();
        await this.loadTranscripts();
        this.setupProfileDropdown();
    }
    
    setupEventListeners() {
        // Filter event listeners
        document.getElementById('campaignFilter').addEventListener('change', (e) => {
            this.currentFilters.campaign = e.target.value;
            this.filterTranscripts();
        });
        
        document.getElementById('statusFilter').addEventListener('change', (e) => {
            this.currentFilters.status = e.target.value;
            this.filterTranscripts();
        });
        
        document.getElementById('dateFilter').addEventListener('change', (e) => {
            this.currentFilters.date = e.target.value;
            this.filterTranscripts();
        });
        
        // Logout functionality
        document.getElementById('logoutBtn').addEventListener('click', () => {
            this.handleLogout();
        });
    }
    
    setupProfileDropdown() {
        const profileBtn = document.getElementById('profileBtn');
        const dropdown = document.getElementById('profileDropdown');
        
        profileBtn.addEventListener('click', () => {
            dropdown.classList.toggle('active');
        });
        
        // Close dropdown when clicking outside
        document.addEventListener('click', (e) => {
            if (!profileBtn.contains(e.target) && !dropdown.contains(e.target)) {
                dropdown.classList.remove('active');
            }
        });
    }
    
    async loadTranscripts() {
        try {
            this.showLoading(true);
            
            // Get transcripts from API
            const response = await fetch('/api/transcript/debug/all', {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            
            if (!response.ok) {
                throw new Error('Failed to load transcripts');
            }
            
            const data = await response.json();
            // Filter out transcripts with only 1 message or no contact information
            this.transcripts = (data.data || []).filter(transcript => {
                // Skip transcripts with only 1 message (incomplete calls)
                if (!transcript.entries || transcript.entries.length <= 1) {
                    return false;
                }
                
                // Skip transcripts without proper contact information
                if (!transcript.contactId || !transcript.contactId.name || !transcript.contactId.phone) {
                    return false;
                }
                
                return true;
            });
            this.filteredTranscripts = [...this.transcripts];
            
            // Populate campaign filter
            this.populateCampaignFilter();
            
            // Render transcripts
            this.renderTranscripts();
            
        } catch (error) {
            console.error('Error loading transcripts:', error);
            this.showError('Failed to load transcripts. Please try again.');
        } finally {
            this.showLoading(false);
        }
    }
    
    populateCampaignFilter() {
        const campaignFilter = document.getElementById('campaignFilter');
        // Get all campaigns without deduplication to show all campaigns like call logs
        const campaigns = this.transcripts
            .map(t => t.campaignId)
            .filter(Boolean)
            .map(campaign => ({
                id: campaign._id,
                objective: campaign.objective,
                language: campaign.language
            }));
        
        // Clear existing options except "All Campaigns"
        campaignFilter.innerHTML = '<option value="">All Campaigns</option>';
        
        // Add campaign options with truncation
        campaigns.forEach(campaign => {
            const option = document.createElement('option');
            option.value = campaign.id; // Use campaign ID instead of objective
            // Truncate long campaign names to 50 characters
            const displayText = campaign.objective.length > 50 ? campaign.objective.substring(0, 50) + '...' : campaign.objective;
            option.textContent = displayText;
            option.title = campaign.objective; // Show full text on hover
            campaignFilter.appendChild(option);
        });
    }
    
    filterTranscripts() {
        this.filteredTranscripts = this.transcripts.filter(transcript => {
            // Campaign filter - now using campaign ID
            if (this.currentFilters.campaign && transcript.campaignId?._id !== this.currentFilters.campaign) {
                return false;
            }
            
            // Language filter (using status filter for now)
            if (this.currentFilters.status && transcript.campaignId?.language !== this.currentFilters.status) {
                return false;
            }
            
            // Date filter
            if (this.currentFilters.date) {
                const transcriptDate = new Date(transcript.createdAt);
                const now = new Date();
                
                switch (this.currentFilters.date) {
                    case 'today':
                        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                        if (transcriptDate < today) return false;
                        break;
                    case 'week':
                        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                        if (transcriptDate < weekAgo) return false;
                        break;
                    case 'month':
                        const monthAgo = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
                        if (transcriptDate < monthAgo) return false;
                        break;
                }
            }
            
            return true;
        });
        
        this.renderTranscripts();
    }
    
    renderTranscripts() {
        const grid = document.getElementById('transcriptsGrid');
        const emptyState = document.getElementById('emptyState');
        
        if (this.filteredTranscripts.length === 0) {
            grid.style.display = 'none';
            emptyState.style.display = 'block';
            return;
        }
        
        emptyState.style.display = 'none';
        grid.style.display = 'grid';
        
        grid.innerHTML = this.filteredTranscripts.map(transcript => this.createTranscriptCard(transcript)).join('');
        
        // Add event listeners to buttons
        this.addCardEventListeners();
    }
    
    createTranscriptCard(transcript) {
        const preview = this.getTranscriptPreview(transcript);
        const date = this.formatDate(transcript.createdAt);
        
        // Extract contact and campaign info from populated fields
        const contactName = transcript.contactId?.name || 'Unknown Contact';
        const phoneNumber = transcript.contactId?.phone || 'Unknown Phone';
        const fullCampaignName = transcript.campaignId?.objective || 'Unknown Campaign';
        const language = transcript.campaignId?.language || 'Unknown';
        
        // Truncate campaign name for display
        const campaignName = fullCampaignName.length > 30 ? fullCampaignName.substring(0, 30) + '...' : fullCampaignName;
        
        return `
            <div class="transcript-card" data-transcript-id="${transcript._id}">
                <div class="transcript-header">
                    <div class="transcript-icon">
                        <i class="fas fa-file-text"></i>
                    </div>
                    <div class="transcript-info">
                        <div class="transcript-contact">${contactName}</div>
                        <div class="transcript-phone">${phoneNumber}</div>
                    </div>
                </div>
                
                <div class="transcript-meta">
                    <span class="transcript-tag" title="${fullCampaignName}">${campaignName}</span>
                    <span class="transcript-tag">${language}</span>
                    <span class="transcript-tag">${transcript.entries?.length || 0} messages</span>
                </div>
                
                <div class="transcript-preview">${preview}</div>
                
                <div class="transcript-actions">
                    <a href="/transcript-viewer?id=${transcript._id}" class="view-transcript-btn">
                        <i class="fas fa-eye"></i>
                        View Transcript
                    </a>
                    <button class="download-transcript-btn" onclick="transcriptsManager.downloadTranscript('${transcript._id}')">
                        <i class="fas fa-download"></i>
                        Download
                    </button>
                </div>
            </div>
        `;
    }
    
    getTranscriptPreview(transcript) {
        if (!transcript.entries || transcript.entries.length === 0) {
            return 'No transcript available';
        }
        
        // Get the first few entries and create a preview
        const previewEntries = transcript.entries.slice(0, 2);
        const preview = previewEntries.map(entry => {
            const sender = entry.from === 'user' ? 'User' : 'AI';
            const text = entry.text.length > 80 ? entry.text.substring(0, 80) + '...' : entry.text;
            return `${sender}: ${text}`;
        }).join('\n');
        
        return preview.length > 120 ? preview.substring(0, 120) + '...' : preview;
    }
    
    formatDuration(seconds) {
        if (!seconds) return '0s';
        
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        
        if (minutes > 0) {
            return `${minutes}m ${remainingSeconds}s`;
        }
        return `${remainingSeconds}s`;
    }
    
    formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }
    
    addCardEventListeners() {
        // Add any additional event listeners for transcript cards if needed
    }
    
    async downloadTranscript(transcriptId) {
        try {
            const response = await fetch(`/api/transcript/${transcriptId}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            
            if (!response.ok) {
                throw new Error('Failed to download transcript');
            }
            
            const result = await response.json();
            const transcript = result.data || result;
            
            // Create transcript text content
            let content = `TRANSCRIPT REPORT\n`;
            content += `================\n\n`;
            content += `Contact: ${transcript.contactId?.name || 'Unknown'} (${transcript.contactId?.phone || 'Unknown'})\n`;
            content += `Campaign: ${transcript.campaignId?.objective || 'Unknown'}\n`;
            content += `Language: ${transcript.campaignId?.language || 'Unknown'}\n`;
            content += `Date: ${new Date(transcript.createdAt).toLocaleString()}\n`;
            content += `Total Messages: ${transcript.entries?.length || 0}\n\n`;
            content += `CONVERSATION:\n`;
            content += `=============\n\n`;
            
            if (transcript.entries && transcript.entries.length > 0) {
                transcript.entries.forEach((entry, index) => {
                    const sender = entry.from === 'user' ? 'USER' : 'AI ASSISTANT';
                    const timestamp = new Date(entry.timestamp).toLocaleString();
                    content += `${index + 1}. [${timestamp}] ${sender}:\n`;
                    content += `${entry.text}\n\n`;
                });
            } else {
                content += `No conversation entries found.\n`;
            }
            
            // Create and download file
            const blob = new Blob([content], { type: 'text/plain' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `transcript-${transcriptId}-${new Date().toISOString().split('T')[0]}.txt`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
            
        } catch (error) {
            console.error('Error downloading transcript:', error);
            alert('Failed to download transcript. Please try again.');
        }
    }
    
    showLoading(show) {
        const loadingState = document.getElementById('loadingState');
        const transcriptsGrid = document.getElementById('transcriptsGrid');
        const emptyState = document.getElementById('emptyState');
        
        if (show) {
            loadingState.style.display = 'flex';
            transcriptsGrid.style.display = 'none';
            emptyState.style.display = 'none';
        } else {
            loadingState.style.display = 'none';
        }
    }
    
    showError(message) {
        const emptyState = document.getElementById('emptyState');
        const emptyIcon = emptyState.querySelector('.empty-icon');
        const emptyTitle = emptyState.querySelector('h3');
        const emptyText = emptyState.querySelector('p');
        
        emptyIcon.innerHTML = '<i class="fas fa-exclamation-triangle"></i>';
        emptyTitle.textContent = 'Error Loading Transcripts';
        emptyText.textContent = message;
        emptyState.style.display = 'block';
        
        document.getElementById('transcriptsGrid').style.display = 'none';
    }
    
    async handleLogout() {
        try {
            // Clear local storage
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            
            // Redirect to login page
            window.location.href = '/';
        } catch (error) {
            console.error('Error during logout:', error);
            // Force redirect anyway
            window.location.href = '/';
        }
    }
}

// Initialize transcripts manager when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.transcriptsManager = new TranscriptsManager();
}); 