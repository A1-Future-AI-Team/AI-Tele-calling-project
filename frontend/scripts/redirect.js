// Redirect /logs to /call-logs.html for legacy support
if (window.location.pathname === '/logs') {
    window.location.replace('/call-logs.html');
} 