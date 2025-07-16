async function loadTranscript() {
    const urlParams = new URLSearchParams(window.location.search);
    const transcriptId = urlParams.get('id');
    
    console.log('Loading transcript with ID:', transcriptId); // Debug log
    
    if (!transcriptId) {
        showError('No transcript ID provided');
        return;
    }
    
    try {
        const response = await fetch(`/api/transcript/${transcriptId}`);
        console.log('Response status:', response.status); // Debug log
        
        const result = await response.json();
        console.log('Response data:', result); // Debug log
        
        if (!response.ok) {
            throw new Error(result.error || 'Failed to load transcript');
        }
        
        // Handle different response formats
        const transcriptData = result.data || result;
        console.log('Final transcript data to display:', transcriptData);
        
        displayTranscript(transcriptData);
    } catch (error) {
        console.error('Error loading transcript:', error);
        showError(error.message);
    }
}

function displayTranscript(data) {
    const transcript = data;
    
    console.log('Transcript data:', transcript); // Debug log
    
    // Update header information
    document.getElementById('contact-info').textContent = 
        `Contact: ${transcript.contactId?.name || 'Unknown'} (${transcript.contactId?.phone || 'Unknown'})`;
    document.getElementById('campaign-info').textContent = 
        `Campaign: ${transcript.campaignId?.objective || 'Unknown'}`;
    
    // Display transcript entries
    const entriesContainer = document.getElementById('transcript-entries');
    entriesContainer.innerHTML = '';
    
    if (!transcript.entries || transcript.entries.length === 0) {
        entriesContainer.innerHTML = '<p style="text-align: center; color: #64748b;">No conversation entries found</p>';
    } else {
        transcript.entries.forEach(entry => {
            const entryElement = document.createElement('div');
            entryElement.className = `transcript-entry ${entry.from}`;
            
            const avatar = entry.from === 'user' ? 'U' : 'AI';
            const senderName = entry.from === 'user' ? 'User' : 'AI Assistant';
            
            entryElement.innerHTML = `
                <div class="entry-avatar ${entry.from}">${avatar}</div>
                <div class="entry-content">
                    <div class="entry-sender">${senderName}</div>
                    <div class="entry-text">${entry.text}</div>
                    <div class="entry-time">${new Date(entry.timestamp).toLocaleString()}</div>
                </div>
            `;
            
            entriesContainer.appendChild(entryElement);
        });
    }
    
    // Hide loading, show content
    document.getElementById('loading').style.display = 'none';
    document.getElementById('transcript-content').style.display = 'block';
}

function showError(message) {
    document.getElementById('loading').style.display = 'none';
    document.getElementById('error').style.display = 'block';
    document.getElementById('error').innerHTML = `
        <i class="fas fa-exclamation-triangle"></i>
        <p>${message}</p>
        <p style="font-size: 0.9rem; margin-top: 1rem; color: #666;">
            <strong>Debug Info:</strong><br>
            URL: ${window.location.href}<br>
            Transcript ID: ${new URLSearchParams(window.location.search).get('id')}<br>
            <button id="retryBtn" style="margin-top: 0.5rem; padding: 0.5rem 1rem; background: #667eea; color: white; border: none; border-radius: 4px; cursor: pointer;">Retry</button>
        </p>
    `;
    
    // Add event listener to retry button
    document.getElementById('retryBtn').addEventListener('click', loadTranscript);
}

// Profile dropdown functionality
function setupProfileDropdown() {
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
    
    // Logout functionality
    document.getElementById('logoutBtn').addEventListener('click', () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/';
    });
}

// Load transcript when page loads
document.addEventListener('DOMContentLoaded', () => {
    loadTranscript();
    setupProfileDropdown();
}); 