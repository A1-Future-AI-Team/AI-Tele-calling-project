// Redirect /logs to /call-logs for legacy support
if (window.location.pathname === '/logs') {
    window.location.replace('/call-logs');
} 