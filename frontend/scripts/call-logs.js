// Utility to get query param
function getQueryParam(name) {
    const url = new URL(window.location.href);
    return url.searchParams.get(name);
}

let allLogs = [];
let campaigns = [];

function getUniqueCampaigns(logs) {
    const seen = new Set();
    const unique = [];
    logs.forEach(log => {
        const c = log.campaignId;
        if (c && c._id && !seen.has(c._id)) {
            seen.add(c._id);
            unique.push({ _id: c._id, objective: c.objective, language: c.language });
        }
    });
    return unique;
}

function renderCampaignSelector() {
    const selector = document.getElementById('campaignSelector');
    if (!selector) return;
    selector.style.display = 'inline-block';
    selector.innerHTML = '<option value="">All Campaigns</option>' +
        campaigns.map(c => `<option value="${c._id}">${c.objective ? c.objective.slice(0, 48) : c.language}</option>`).join('');
    selector.addEventListener('change', (e) => {
        const selectedId = e.target.value;
        if (!selectedId) {
            renderCallLogs(allLogs);
        } else {
            const filtered = allLogs.filter(log => log.campaignId && log.campaignId._id === selectedId);
            renderCallLogs(filtered);
        }
    });
}

async function fetchCallLogs() {
    const res = await window.api.get('/api/calllog');
    return res.data || [];
}

function createActivityItem(activity) {
    const item = document.createElement('div');
    item.className = 'activity-item';
    item.style.background = '#f5f7ff';
    item.style.borderRadius = '14px';
    item.style.boxShadow = '0 2px 10px rgba(102, 126, 234, 0.06)';
    item.style.padding = '1.1rem 1.5rem 0.7rem 1.5rem';
    item.style.marginBottom = '1.1rem';
    item.style.display = 'flex';
    item.style.flexDirection = 'column';
    item.style.transition = 'box-shadow 0.18s cubic-bezier(.4,2,.6,1)';
    item.onmouseenter = () => { item.style.boxShadow = '0 4px 18px rgba(102,126,234,0.13)'; };
    item.onmouseleave = () => { item.style.boxShadow = '0 2px 10px rgba(102, 126, 234, 0.06)'; };

    // Status badge colors
    const statusMapping = {
        'success': { text: 'SUCCESS', color: '#10b981'},
        'completed': { text: 'COMPLETED', color: '#10b981'},
        'failed': { text: 'FAILED', color: '#ef4444'},
        'busy': { text: 'BUSY', color: '#f59e0b'},
        'pending': { text: 'PENDING', color: '#f59e0b'},
        'in-progress': { text: 'IN PROGRESS', color: '#f59e0b'}
    };
    const statusInfo = statusMapping[(activity.status||'').toLowerCase()] || { text: (activity.status || 'UNKNOWN').toUpperCase(), color: '#64748b', bg: 'rgba(100,116,139,0.10)' };

    // Data extraction
    const contact = activity.contactId || {};
    const campaign = activity.campaignId || {};
    const phone = contact.phone || activity.to || 'Unknown';
    const name = contact.name || 'Unknown';
    let campaignName = campaign.objective || 'Unknown';
    if (campaignName.length > 48) campaignName = campaignName.slice(0, 48) + '...';
    const date = activity.createdAt ? new Date(activity.createdAt).toLocaleString() : 'Unknown';
    const transcriptId = contact.transcriptId;
    const transcriptLink = transcriptId
        ? `<a href="/transcripts/${transcriptId}" class="transcript-link" style="color:#4f46e5;font-weight:500;text-decoration:none;margin-left:1.1em;"><i class="fas fa-file-text"></i> View Transcript</a>`
        : '<span class="transcript-link no-transcript" style="color:#a0aec0;margin-left:1.1em;">No transcript</span>';

    item.innerHTML = `
        <div style="display:flex;align-items:center;justify-content:space-between;gap:0.5rem;width:100%;">
            <div style="flex:1;min-width:160px;max-width:220px;display:flex;align-items:center;gap:0.5em;">
                <span style="font-weight:700;font-size:1.08rem;color:#222;">${phone}</span>
                <span style="font-weight:400;font-size:1.05rem;color:#444;">${name}</span>
            </div>
            <div style="flex:2;text-align:center;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:1.05rem;color:#4f46e5;font-weight:500;">${campaignName}</div>
            <div style="flex:1;min-width:180px;display:flex;align-items:center;justify-content:flex-end;gap:0.7em;">
                <span style="font-size:1.01rem;letter-spacing:0.03em;padding:0.22em 1.1em;border-radius:999px;font-weight:600;background:${statusInfo.bg};color:${statusInfo.color};box-shadow:0 1px 4px 0 ${statusInfo.bg};display:inline-block;">${statusInfo.text}</span>
                ${transcriptLink}
            </div>
        </div>
        <div style="display:flex;justify-content:flex-end;margin-top:0.2rem;">
            <span style="font-size:0.97rem;color:#94a3b8;font-weight:400;letter-spacing:0.01em;">${date}</span>
        </div>
    `;

    setTimeout(() => {
        item.classList.add('fade-in');
    }, Math.random() * 200);

    return item;
}

function isMobile() {
    return window.innerWidth <= 600;
}

function createMobileCallLogItem(activity) {
    const item = document.createElement('div');
    item.className = 'call-log-card';

    // Status badge colors
    const statusMapping = {
        'success': { text: 'SUCCESS', color: '#10b981', bg: 'rgba(16,185,129,0.12)' },
        'completed': { text: 'COMPLETED', color: '#10b981', bg: 'rgba(16,185,129,0.12)' },
        'failed': { text: 'FAILED', color: '#ef4444', bg: 'rgba(239,68,68,0.12)' },
        'busy': { text: 'BUSY', color: '#f59e0b', bg: 'rgba(245,158,11,0.12)' },
        'pending': { text: 'PENDING', color: '#f59e0b', bg: 'rgba(245,158,11,0.12)' },
        'in-progress': { text: 'IN PROGRESS', color: '#f59e0b', bg: 'rgba(245,158,11,0.12)' },
        'answered': { text: 'ANSWERED', color: '#10b981', bg: 'rgba(16,185,129,0.12)' },
        'no answer': { text: 'NO ANSWER', color: '#f59e0b', bg: 'rgba(245,158,11,0.12)' }
    };
    const statusKey = (activity.status||'').toLowerCase();
    const statusInfo = statusMapping[statusKey] || { text: (activity.status || 'UNKNOWN').toUpperCase(), color: '#64748b', bg: 'rgba(100,116,139,0.10)' };

    // Data extraction
    const contact = activity.contactId || {};
    const campaign = activity.campaignId || {};
    const phone = contact.phone || activity.to || 'Unknown';
    let campaignName = campaign.objective || 'Unknown';
    if (campaignName.length > 48) campaignName = campaignName.slice(0, 48) + '...';
    const date = activity.createdAt ? new Date(activity.createdAt).toLocaleString() : 'Unknown';
    const duration = activity.duration ? (activity.duration >= 60 ? `${Math.floor(activity.duration/60)}:${('0'+(activity.duration%60)).slice(-2)}` : `0:${('0'+activity.duration).slice(-2)}`) : '';
    const transcriptId = contact.transcriptId;
    const transcript = transcriptId
        ? `<a href="/transcripts/${transcriptId}" class="transcript-link" style="color:#4f46e5;font-weight:500;text-decoration:none;"><i class="fas fa-file-text"></i> View Transcript</a>`
        : '<span class="call-log-transcript">No transcript</span>';

    item.innerHTML = `
        <div class="call-log-main">
            <div class="call-log-row" style="display:flex;align-items:center;justify-content:space-between;width:100%;">
                <span class="call-log-phone">${phone}</span>
                <span class="call-log-status ${statusKey}" style="background:${statusInfo.bg};color:${statusInfo.color};margin-left:1em;white-space:nowrap;">${statusInfo.text}</span>
            </div>
            <div class="call-log-meta" style="display:flex;align-items:center;gap:0.5em;margin-top:0.3em;flex-wrap:wrap;">
                <span class="call-log-campaign">${campaignName}</span>
                <span class="call-log-date">${date}</span>
                ${duration ? `<span class="call-log-duration">${duration}</span>` : ''}
            </div>
            <div class="call-log-transcript" style="margin-top:0.5em;">${!transcriptId ? 'No transcript' : transcript}</div>
        </div>
    `;
    return item;
}

// Patch renderCallLogs to use mobile or desktop rendering
function renderCallLogs(logs) {
    const activityContent = document.getElementById('activityContent');
    if (!activityContent) return;
    if (logs.length === 0) {
        activityContent.innerHTML = `<div class="empty-state"><h3>No Call Logs</h3><p>No calls found.</p></div>`;
        return;
    }
    const activityList = document.createElement('div');
    activityList.className = 'activity-list';
    logs.forEach(log => {
        const item = isMobile() ? createMobileCallLogItem(log) : createActivityItem(log);
        activityList.appendChild(item);
    });
    activityContent.innerHTML = '';
    activityContent.appendChild(activityList);
}

async function initCallLogsPage() {
    allLogs = await fetchCallLogs();
    campaigns = getUniqueCampaigns(allLogs);
    renderCampaignSelector();
    renderCallLogs(allLogs);
}

window.addEventListener('DOMContentLoaded', initCallLogsPage); 