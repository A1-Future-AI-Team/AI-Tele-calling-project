class ProfileManager {
    constructor() {
        this.init();
    }

    async init() {
        this.setupEventListeners();
        this.setupProfileDropdown();
        await this.loadProfileData();
        this.loadStats();
    }

    setupEventListeners() {
        // Edit Profile Button
        document.getElementById('editProfileBtn').addEventListener('click', () => {
            this.showEditProfileModal();
        });

        // Change Password Button
        document.getElementById('changePasswordBtn').addEventListener('click', () => {
            this.showChangePasswordModal();
        });

        // Logout Buttons
        document.getElementById('logoutBtnMain').addEventListener('click', () => {
            this.handleLogout();
        });

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

    async loadProfileData() {
        try {
            // Get user data from localStorage or API
            const userData = JSON.parse(localStorage.getItem('user')) || {
                name: 'Admin User',
                email: 'admin@telecallai.com',
                role: 'Administrator',
                memberSince: 'January 2024',
                lastLogin: new Date().toLocaleString()
            };

            // Update profile display
            document.getElementById('profileName').textContent = userData.name || 'Admin User';
            document.getElementById('userEmail').textContent = userData.email || 'admin@telecallai.com';
            document.getElementById('memberSince').textContent = userData.memberSince || 'January 2024';
            document.getElementById('lastLogin').textContent = userData.lastLogin || 'Just now';
            document.getElementById('accountStatus').textContent = 'Active';

            // Update avatar with user initials
            const avatar = document.getElementById('profileAvatar');
            const name = userData.name || 'Admin User';
            const initials = name.split(' ').map(n => n[0]).join('').toUpperCase();
            avatar.innerHTML = initials || '<i class="fas fa-user"></i>';

        } catch (error) {
            console.error('Error loading profile data:', error);
        }
    }

    async loadStats() {
        try {
            // Fetch stats from API
            const [callLogsResponse, campaignsResponse, transcriptsResponse] = await Promise.all([
                fetch('/api/calllog').then(res => res.json()).catch(() => ({ data: [] })),
                fetch('/api/campaign').then(res => res.json()).catch(() => ({ data: [] })),
                fetch('/api/transcript/debug/all').then(res => res.json()).catch(() => ({ data: [] }))
            ]);

            const totalCalls = callLogsResponse.data?.length || 0;
            const totalCampaigns = campaignsResponse.data?.length || 0;
            const totalTranscripts = transcriptsResponse.data?.length || 0;

            // Calculate success rate
            const successfulCalls = callLogsResponse.data?.filter(call => 
                ['completed', 'success', 'answered'].includes(call.status?.toLowerCase())
            ).length || 0;
            const successRate = totalCalls > 0 ? Math.round((successfulCalls / totalCalls) * 100) : 0;

            // Update stats display
            document.getElementById('totalCalls').textContent = totalCalls;
            document.getElementById('totalCampaigns').textContent = totalCampaigns;
            document.getElementById('totalTranscripts').textContent = totalTranscripts;
            document.getElementById('successRate').textContent = `${successRate}%`;

        } catch (error) {
            console.error('Error loading stats:', error);
            // Set default values
            document.getElementById('totalCalls').textContent = '0';
            document.getElementById('totalCampaigns').textContent = '0';
            document.getElementById('totalTranscripts').textContent = '0';
            document.getElementById('successRate').textContent = '0%';
        }
    }

    showEditProfileModal() {
        // Simple alert for now - can be expanded to a proper modal
        alert('Edit Profile functionality will be implemented soon!');
    }

    showChangePasswordModal() {
        // Simple alert for now - can be expanded to a proper modal
        alert('Change Password functionality will be implemented soon!');
    }

    async handleLogout() {
        try {
            // Clear local storage
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            
            // Show logout message
            alert('You have been logged out successfully.');
            
            // Redirect to login page
            window.location.href = '/';
        } catch (error) {
            console.error('Error during logout:', error);
            // Force redirect anyway
            window.location.href = '/';
        }
    }
}

// Initialize profile manager when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.profileManager = new ProfileManager();
}); 