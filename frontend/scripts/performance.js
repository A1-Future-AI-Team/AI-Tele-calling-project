// Performance Optimizations for Smooth Scrolling and Animations

// Optimize scroll performance
document.addEventListener('DOMContentLoaded', function() {
    // Enable smooth scrolling for all internal links
    const internalLinks = document.querySelectorAll('a[href^="#"]');
    internalLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const targetId = this.getAttribute('href').substring(1);
            const targetElement = document.getElementById(targetId);
            
            if (targetElement) {
                targetElement.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });

    // Optimize scroll performance with throttling
    let ticking = false;
    function updateScroll() {
        ticking = false;
        // Add any scroll-based animations here
    }

    function requestTick() {
        if (!ticking) {
            requestAnimationFrame(updateScroll);
            ticking = true;
        }
    }

    // Throttle scroll events for better performance
    window.addEventListener('scroll', function() {
        requestTick();
    }, { passive: true });

    // Optimize animations with Intersection Observer
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };

    const observer = new IntersectionObserver(function(entries) {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('animate-fade-in');
                observer.unobserve(entry.target);
            }
        });
    }, observerOptions);

    // Observe elements for animation
    const animateElements = document.querySelectorAll('.stat-card, .feature-block, .activity-item, .transcript-card');
    animateElements.forEach(el => {
        observer.observe(el);
    });

    // Optimize hover effects for touch devices
    if ('ontouchstart' in window) {
        const hoverElements = document.querySelectorAll('.btn, .nav-link, .profile-btn, .stat-card, .feature-block, .activity-item, .file-upload-area, .start-campaign-btn, .auth-btn, .social-btn');
        
        hoverElements.forEach(element => {
            element.addEventListener('touchstart', function() {
                this.classList.add('touch-active');
            });
            
            element.addEventListener('touchend', function() {
                setTimeout(() => {
                    this.classList.remove('touch-active');
                }, 150);
            });
        });
    }

    // Optimize form interactions
    const formInputs = document.querySelectorAll('input, textarea, select');
    formInputs.forEach(input => {
        input.addEventListener('focus', function() {
            this.parentElement.classList.add('focused');
        });
        
        input.addEventListener('blur', function() {
            this.parentElement.classList.remove('focused');
        });
    });

    // Optimize button interactions
    const buttons = document.querySelectorAll('.btn, .auth-btn, .start-campaign-btn, .social-btn');
    buttons.forEach(button => {
        button.addEventListener('mousedown', function() {
            this.style.transform = 'scale(0.98) translateZ(0)';
        });
        
        button.addEventListener('mouseup', function() {
            this.style.transform = '';
        });
        
        button.addEventListener('mouseleave', function() {
            this.style.transform = '';
        });
    });

    // Optimize dropdown performance
    const dropdowns = document.querySelectorAll('.profile-dropdown');
    dropdowns.forEach(dropdown => {
        const button = dropdown.querySelector('.profile-btn');
        const menu = dropdown.querySelector('.dropdown-menu');
        
        if (button && menu) {
            button.addEventListener('click', function(e) {
                e.stopPropagation();
                dropdown.classList.toggle('active');
            });
        }
    });

    // Close dropdowns when clicking outside
    document.addEventListener('click', function(e) {
        if (!e.target.closest('.profile-dropdown')) {
            document.querySelectorAll('.profile-dropdown').forEach(dropdown => {
                dropdown.classList.remove('active');
            });
        }
    });

    // Optimize file upload interactions
    const fileUploadAreas = document.querySelectorAll('.file-upload-area');
    fileUploadAreas.forEach(area => {
        area.addEventListener('dragover', function(e) {
            e.preventDefault();
            this.classList.add('dragover');
        });
        
        area.addEventListener('dragleave', function(e) {
            e.preventDefault();
            this.classList.remove('dragover');
        });
        
        area.addEventListener('drop', function(e) {
            e.preventDefault();
            this.classList.remove('dragover');
        });
    });

    // Optimize navigation performance
    const navLinks = document.querySelectorAll('.nav-link');
    navLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            // Remove active class from all nav links
            navLinks.forEach(l => l.classList.remove('active'));
            // Add active class to clicked link
            this.classList.add('active');
        });
    });

    // Optimize loading states
    const loadingButtons = document.querySelectorAll('.auth-btn, .start-campaign-btn');
    loadingButtons.forEach(button => {
        button.addEventListener('click', function() {
            if (!this.disabled) {
                this.classList.add('loading');
                const text = this.querySelector('.btn-text');
                const loader = this.querySelector('.btn-loader');
                
                if (text && loader) {
                    text.style.display = 'none';
                    loader.style.display = 'flex';
                }
            }
        });
    });

    // Optimize for reduced motion preference
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        // Disable animations for users who prefer reduced motion
        document.documentElement.style.setProperty('--transition-fast', '0.01s');
        document.documentElement.style.setProperty('--transition-normal', '0.01s');
        document.documentElement.style.setProperty('--transition-slow', '0.01s');
        
        // Remove animation classes
        document.querySelectorAll('.animate-float, .animate-pulse, .animate-fade-in, .animate-slide-in-right, .animate-slide-in-left, .animate-spin').forEach(el => {
            el.style.animation = 'none';
        });
    }
});

// Optimize window resize performance
let resizeTimeout;
window.addEventListener('resize', function() {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(function() {
        // Handle resize optimizations here
    }, 250);
}, { passive: true });

// Optimize for mobile devices
if (window.innerWidth <= 768) {
    // Reduce animation complexity on mobile
    document.documentElement.style.setProperty('--transition-normal', '0.2s');
    
    // Optimize touch interactions
    document.addEventListener('touchstart', function() {}, { passive: true });
    document.addEventListener('touchmove', function() {}, { passive: true });
    document.addEventListener('touchend', function() {}, { passive: true });
}

// Optimize for low-end devices
if (navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 4) {
    // Reduce visual effects for low-end devices
    document.documentElement.style.setProperty('--transition-normal', '0.15s');
    document.documentElement.style.setProperty('backdrop-filter', 'none');
    
    // Disable complex animations
    document.querySelectorAll('.animate-float').forEach(el => {
        el.style.animation = 'none';
    });
} 