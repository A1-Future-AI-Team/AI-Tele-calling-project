// ===== DASHBOARD FUNCTIONALITY =====

class DashboardManager {
    constructor() {
        this.init();
        this.setupEventListeners();
        this.loadDashboardData();
    }

    init() {
        console.log('🚀 Dashboard Manager initialized');
        this.addAnimations();
    }

    // Add entrance animations
    addAnimations() {
        const sections = document.querySelectorAll('.stats-grid, .campaign-card, .activity-card');
        
        // Intersection Observer for scroll animations
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('fade-in');
                }
            });
        }, { threshold: 0.1 });

        sections.forEach(section => {
            observer.observe(section);
        });
    }

    setupEventListeners() {
        // Profile dropdown toggle
        this.setupProfileDropdown();
        
        // File upload functionality
        this.setupFileUpload();
        
        // Campaign form submission
        this.setupCampaignForm();
        
        // Logout functionality
        this.setupLogout();

        // Stats card hover effects
        this.setupStatsHover();
    }

    setupProfileDropdown() {
        const profileBtn = document.getElementById('profileBtn');
        const profileDropdown = document.querySelector('.profile-dropdown');
        const dropdownMenu = document.getElementById('profileDropdown');

        if (profileBtn && profileDropdown) {
            profileBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                profileDropdown.classList.toggle('active');
            });

            // Close dropdown when clicking outside
            document.addEventListener('click', () => {
                profileDropdown.classList.remove('active');
            });

            // Prevent dropdown from closing when clicking inside
            if (dropdownMenu) {
                dropdownMenu.addEventListener('click', (e) => {
                    e.stopPropagation();
                });
            }
        }
    }

    setupFileUpload() {
        const fileUploadArea = document.getElementById('fileUploadArea');
        const csvFileInput = document.getElementById('csvFile');
        const filePreview = document.getElementById('filePreview');
        const removeFileBtn = document.getElementById('removeFile');

        if (fileUploadArea && csvFileInput) {
            // Click to upload
            fileUploadArea.addEventListener('click', () => {
                csvFileInput.click();
            });

            // File input change
            csvFileInput.addEventListener('change', (e) => {
                const file = e.target.files[0];
                if (file) {
                    this.handleFileSelection(file);
                }
            });

            // Drag and drop functionality
            fileUploadArea.addEventListener('dragover', (e) => {
                e.preventDefault();
                fileUploadArea.classList.add('dragover');
            });

            fileUploadArea.addEventListener('dragleave', () => {
                fileUploadArea.classList.remove('dragover');
            });

            fileUploadArea.addEventListener('drop', (e) => {
                e.preventDefault();
                fileUploadArea.classList.remove('dragover');
                
                const files = e.dataTransfer.files;
                if (files.length > 0) {
                    const file = files[0];
                    if (file.type === 'text/csv' || file.name.endsWith('.csv')) {
                        csvFileInput.files = files;
                        this.handleFileSelection(file);
                    } else {
                        this.showNotification('Please upload a CSV file only', 'error');
                    }
                }
            });

            // Remove file functionality
            if (removeFileBtn) {
                removeFileBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    this.removeFile();
                });
            }
        }
    }

    handleFileSelection(file) {
        const filePreview = document.getElementById('filePreview');
        const uploadContent = document.querySelector('.upload-content');
        const fileName = document.querySelector('.file-name');

        if (filePreview && uploadContent && fileName) {
            // Validate file size (5MB limit)
            if (file.size > 5 * 1024 * 1024) {
                this.showNotification('File size must be less than 5MB', 'error');
                return;
            }

            // Show file preview
            fileName.textContent = file.name;
            uploadContent.style.display = 'none';
            filePreview.style.display = 'flex';

            this.showNotification('File uploaded successfully', 'success');
            
            // Add bounce animation
            filePreview.classList.add('bounce-in');
        }
    }

    removeFile() {
        const csvFileInput = document.getElementById('csvFile');
        const filePreview = document.getElementById('filePreview');
        const uploadContent = document.querySelector('.upload-content');

        if (csvFileInput && filePreview && uploadContent) {
            csvFileInput.value = '';
            filePreview.style.display = 'none';
            uploadContent.style.display = 'block';
            
            this.showNotification('File removed', 'info');
        }
    }

    setupCampaignForm() {
        const campaignForm = document.getElementById('campaignForm');
        const startCampaignBtn = document.getElementById('startCampaignBtn');

        if (campaignForm) {
            campaignForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                await this.handleCampaignSubmission();
            });
        }
    }

    async handleCampaignSubmission() {
        const csvFile = document.getElementById('csvFile').files[0];
        const language = document.getElementById('language').value;
        const callingObjective = document.getElementById('callingObjective').value.trim();
        const exampleCallFlow = document.getElementById('exampleCallFlow').value.trim();
        const startBtn = document.getElementById('startCampaignBtn');

        // Validation
        if (!csvFile) {
            this.showNotification('Please upload a CSV file', 'error');
            return;
        }

        if (!callingObjective) {
            this.showNotification('Please enter a calling objective', 'error');
            return;
        }

        // Show loading state
        this.setButtonLoading(startBtn, true);

        try {
            // Simulate API call
            await this.simulateAPI();

            // Create form data
            const formData = new FormData();
            formData.append('csv', csvFile);
            formData.append('language', language);
            formData.append('objective', callingObjective);
            if (exampleCallFlow) {
                formData.append('sampleFlow', exampleCallFlow);
            }

            // Call the actual API
            const response = await window.api.post('/api/campaign/start', formData, {
                headers: {
                    // Don't set Content-Type for FormData, let browser set it
                }
            });

            if (response.ok && response.data.success) {
                this.showNotification(
                    `Campaign started successfully! 🚀 ${response.data.totalContacts} contacts added.`, 
                    'success'
                );
                console.log('✅ Campaign created:', response.data);
            } else {
                throw new Error(response.data?.message || 'Campaign creation failed');
            }
            
            // Update stats
            this.updateStats();
            
            // Reset form
            this.resetCampaignForm();
            
        } catch (error) {
            console.error('Campaign submission error:', error);
            this.showNotification('Failed to start campaign. Please try again.', 'error');
        } finally {
            this.setButtonLoading(startBtn, false);
        }
    }

    setButtonLoading(button, isLoading) {
        if (!button) return;

        const btnText = button.querySelector('.btn-text');
        const btnLoader = button.querySelector('.btn-loader');

        if (isLoading) {
            button.classList.add('loading');
            button.disabled = true;
            if (btnText) btnText.style.display = 'none';
            if (btnLoader) btnLoader.style.display = 'flex';
        } else {
            button.classList.remove('loading');
            button.disabled = false;
            if (btnText) btnText.style.display = 'flex';
            if (btnLoader) btnLoader.style.display = 'none';
        }
    }

    resetCampaignForm() {
        const campaignForm = document.getElementById('campaignForm');
        if (campaignForm) {
            campaignForm.reset();
            this.removeFile();
        }
    }

    setupLogout() {
        const logoutBtn = document.getElementById('logoutBtn');
        
        if (logoutBtn) {
            logoutBtn.addEventListener('click', async () => {
                try {
                    // Clear auth token
                    if (window.api) {
                        window.api.removeAuthToken();
                    }
                    
                    this.showNotification('Logged out successfully', 'info');
                    
                    // Redirect to login after short delay
                    setTimeout(() => {
                        window.location.href = '/';
                    }, 1000);
                    
                } catch (error) {
                    console.error('Logout error:', error);
                    // Still redirect even if logout API fails
                    window.location.href = '/';
                }
            });
        }
    }

    setupStatsHover() {
        const statCards = document.querySelectorAll('.stat-card');
        
        statCards.forEach(card => {
            card.addEventListener('mouseenter', () => {
                card.style.transform = 'translateY(-8px) scale(1.02)';
            });

            card.addEventListener('mouseleave', () => {
                card.style.transform = 'translateY(0) scale(1)';
            });
        });
    }

    async loadDashboardData() {
        try {
            // TODO: Replace with actual API calls
            const stats = await this.fetchDashboardStats();
            const recentActivity = await this.fetchRecentActivity();

            this.updateDashboardStats(stats);
            this.updateRecentActivity(recentActivity);
            
        } catch (error) {
            console.error('Error loading dashboard data:', error);
            this.loadMockData();
        }
    }

    async fetchDashboardStats() {
        // TODO: Replace with actual API call
        // return await window.api.get('/api/dashboard/stats');
        
        // Mock data for now
        return {
            totalCalls: 1247,
            successfulCalls: 892,
            successRate: 71.5,
            activeCampaigns: 3
        };
    }

    async fetchRecentActivity() {
        // Fetch real call logs from backend
        let logs = [];
        try {
            const response = await window.api.get('/api/calllog'); // Adjust endpoint if needed
            logs = response.data || [];
        } catch (err) {
            console.error('Failed to fetch call logs:', err);
            this.showNotification('Failed to fetch call logs', 'error');
            return [];
        }

        // For each log, fetch real-time status from Twilio
        const logsWithStatus = await Promise.all(logs.map(async (log) => {
            let realStatus = log.status;
            if (log.callSid) {
                try {
                    const statusResp = await window.api.getCallStatus(log.callSid);
                    if (statusResp && statusResp.status) {
                        realStatus = statusResp.status;
                    }
                } catch (e) {
                    console.warn('Could not fetch real-time status for', log.callSid, e);
                }
            }
            return { ...log, status: realStatus };
        }));
        return logsWithStatus;
    }

    loadMockData() {
        // Load mock stats
        this.updateDashboardStats({
            totalCalls: 0,
            successfulCalls: 0,
            successRate: 0,
            activeCampaigns: 0
        });

        // Show empty state for activity
        this.showEmptyActivityState();
    }

    updateDashboardStats(stats) {
        this.animateCounter('totalCalls', stats.totalCalls);
        this.animateCounter('successfulCalls', stats.successfulCalls);
        this.animateCounter('successRate', stats.successRate, '%');
        this.animateCounter('activeCampaigns', stats.activeCampaigns);
    }

    animateCounter(elementId, targetValue, suffix = '') {
        const element = document.getElementById(elementId);
        if (!element) return;

        const startValue = 0;
        const duration = 2000; // 2 seconds
        const startTime = performance.now();

        const animate = (currentTime) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            // Easing function (ease-out)
            const easeOut = 1 - Math.pow(1 - progress, 3);
            
            const currentValue = startValue + (targetValue - startValue) * easeOut;
            const displayValue = suffix === '%' ? currentValue.toFixed(1) : Math.floor(currentValue);
            
            element.textContent = displayValue + suffix;

            if (progress < 1) {
                requestAnimationFrame(animate);
            }
        };

        requestAnimationFrame(animate);
    }

    updateRecentActivity(activities) {
        const activityContent = document.getElementById('activityContent');
        if (!activityContent) return;

        if (activities.length === 0) {
            this.showEmptyActivityState();
            return;
        }

        const activityList = document.createElement('div');
        activityList.className = 'activity-list';

        activities.forEach(activity => {
            const activityItem = this.createActivityItem(activity);
            activityList.appendChild(activityItem);
        });

        activityContent.innerHTML = '';
        activityContent.appendChild(activityList);
    }

    createActivityItem(activity) {
        const item = document.createElement('div');
        item.className = 'activity-item';

        // Map status to display text and class
        const statusMapping = {
            'success': { text: 'SUCCESS', class: 'status-success' },
            'failed': { text: 'FAILED', class: 'status-failed' },
            'pending': { text: 'PENDING', class: 'status-pending' }
        };

        const statusInfo = statusMapping[activity.status] || { text: 'UNKNOWN', class: 'status-neutral' };
        
        const transcriptLink = activity.transcriptId 
            ? `<a href="/transcripts/${activity.transcriptId}" class="transcript-link">
                 <i class="fas fa-file-text"></i> View Transcript
               </a>`
            : '<span class="transcript-link no-transcript">No transcript</span>';

        item.innerHTML = `
            <div class="activity-info">
                <div class="activity-phone">${activity.phone}</div>
                <div class="activity-meta">
                    <span class="campaign-type">${activity.campaign}</span>
                    <span class="activity-date">${activity.date}</span>
                </div>
            </div>
            <div class="activity-actions">
                <span class="activity-status ${statusInfo.class}">
                    ${statusInfo.text}
                </span>
                ${transcriptLink}
            </div>
        `;

        // Add entrance animation with delay
        setTimeout(() => {
            item.classList.add('fade-in');
        }, Math.random() * 200);

        return item;
    }

    showEmptyActivityState() {
        const activityContent = document.getElementById('activityContent');
        if (!activityContent) return;

        activityContent.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">
                    <i class="fas fa-chart-bar"></i>
                </div>
                <h3>No Recent Activity</h3>
                <p>Start your first campaign to see call records and activity here</p>
            </div>
        `;
    }

    updateStats() {
        // Simulate stat updates after campaign start
        const currentStats = {
            totalCalls: Math.floor(Math.random() * 100) + 50,
            successfulCalls: Math.floor(Math.random() * 80) + 30,
            successRate: Math.random() * 30 + 60,
            activeCampaigns: Math.floor(Math.random() * 5) + 1
        };

        this.updateDashboardStats(currentStats);
    }

    // Utility Functions
    async simulateAPI() {
        return new Promise(resolve => {
            setTimeout(resolve, 2000 + Math.random() * 1000);
        });
    }

    showNotification(message, type = 'info') {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        
        const icon = this.getNotificationIcon(type);
        
        notification.innerHTML = `
            <div class="notification-content">
                <i class="${icon}"></i>
                <span>${message}</span>
            </div>
            <button class="notification-close" onclick="this.parentElement.remove()">
                <i class="fas fa-times"></i>
            </button>
        `;

        // Add styles
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: white;
            border-radius: 12px;
            padding: 1rem 1.5rem;
            box-shadow: 0 10px 40px rgba(0, 0, 0, 0.15);
            border-left: 4px solid var(--${type === 'error' ? 'error' : type === 'success' ? 'success' : 'primary'}-color);
            z-index: 10000;
            display: flex;
            align-items: center;
            gap: 1rem;
            max-width: 400px;
            transform: translateX(100%);
            transition: transform 0.3s ease;
        `;

        // Add notification to body
        document.body.appendChild(notification);

        // Animate in
        setTimeout(() => {
            notification.style.transform = 'translateX(0)';
        }, 100);

        // Auto remove after 5 seconds
        setTimeout(() => {
            notification.style.transform = 'translateX(100%)';
            setTimeout(() => {
                if (notification.parentElement) {
                    notification.remove();
                }
            }, 300);
        }, 5000);
    }

    getNotificationIcon(type) {
        switch (type) {
            case 'success': return 'fas fa-check-circle';
            case 'error': return 'fas fa-exclamation-circle';
            case 'warning': return 'fas fa-exclamation-triangle';
            default: return 'fas fa-info-circle';
        }
    }
}

// Additional CSS for notifications
const notificationStyles = `
    .notification {
        --primary-color: #667eea;
        --success-color: #10b981;
        --error-color: #ef4444;
        --warning-color: #f59e0b;
    }

    .notification-content {
        display: flex;
        align-items: center;
        gap: 0.75rem;
        flex: 1;
    }

    .notification-content i {
        font-size: 1.2rem;
    }

    .notification-success .notification-content i {
        color: var(--success-color);
    }

    .notification-error .notification-content i {
        color: var(--error-color);
    }

    .notification-warning .notification-content i {
        color: var(--warning-color);
    }

    .notification-info .notification-content i {
        color: var(--primary-color);
    }

    .notification-close {
        background: none;
        border: none;
        cursor: pointer;
        color: var(--text-secondary);
        padding: 0.25rem;
        border-radius: 4px;
        transition: all 0.2s ease;
    }

    .notification-close:hover {
        background: rgba(0, 0, 0, 0.1);
        color: var(--text-primary);
    }
`;

// Inject notification styles
const styleSheet = document.createElement('style');
styleSheet.textContent = notificationStyles;
document.head.appendChild(styleSheet);

// Initialize Dashboard when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    console.log('✅ DOM loaded, initializing dashboard...');
    
    // Wait a moment for API to be fully loaded, then check authentication
    setTimeout(() => {
        const token = window.api ? window.api.getAuthToken() : localStorage.getItem('auth_token');
        
        console.log('🔍 Checking authentication...');
        console.log('API available:', !!window.api);
        console.log('Token found:', !!token);
        console.log('Token value:', token ? token.substring(0, 20) + '...' : 'null');
        
        if (!token) {
            console.log('❌ No auth token found, redirecting to login in 1 second...');
            setTimeout(() => {
                window.location.href = '/';
            }, 1000);
            return;
        }

        console.log('✅ Authentication check passed, initializing dashboard...');
        
        // Initialize dashboard
        window.dashboard = new DashboardManager();
        
        // Set up periodic data refresh
        setInterval(() => {
            if (window.dashboard) {
                window.dashboard.loadDashboardData();
            }
        }, 30000); // Refresh every 30 seconds

        console.log('🎉 Dashboard fully initialized!');
    }, 100); // Small delay to ensure API is loaded
});

// Export for potential use in other scripts
if (typeof module !== 'undefined' && module.exports) {
    module.exports = DashboardManager;
} 