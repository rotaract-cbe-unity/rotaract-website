/* ============================================================
   ROTARACT CLUB OF COIMBATORE UNITY - THEME MANAGEMENT
   Light/Dark Theme | Adaptive Logos | System Preference
   Icon Refresh | Smooth Transitions | Bug-Free
   ============================================================ */

const Theme = {
    // ============================================================
    // CONFIGURATION
    // ============================================================
    storageKey: 'rotaract_unity_theme',
    current: 'light',
    initialized: false,

    // Default logo URLs (updated from Supabase settings when loaded)
    logos: {
        colour: 'https://res.cloudinary.com/duoy1cje9/image/upload/v1783501797/unity_standard_colour_mkz1k7.png',
        white: 'https://res.cloudinary.com/duoy1cje9/image/upload/v1783501798/unity_standard_white_bzcxtn.png',
        black: 'https://res.cloudinary.com/duoy1cje9/image/upload/v1783501798/unity_standard_black_jwjihq.png'
    },

    // ============================================================
    // INITIALIZATION
    // ============================================================
    init() {
        if (this.initialized) return;
        this.initialized = true;

        // Detect and apply theme
        this.detectTheme();
        this.apply(this.current, false);

        // Bind all events
        this.bindEvents();

        // Watch for App settings to load
        this.watchForSettings();

        // Schedule multiple logo updates to catch late-loading elements
        this.scheduleLogoUpdate();
    },

    /**
     * Detect user's preferred theme
     */
    detectTheme() {
        try {
            const saved = localStorage.getItem(this.storageKey);
            if (saved === 'light' || saved === 'dark') {
                this.current = saved;
                return;
            }

            // Check system preference
            if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
                this.current = 'dark';
                return;
            }

            this.current = 'light';
        } catch (err) {
            console.warn('Theme detection error:', err);
            this.current = 'light';
        }
    },

    // ============================================================
    // EVENT BINDINGS
    // ============================================================
    bindEvents() {
        // Bind existing toggle buttons
        this.bindToggleButton('themeToggle');
        this.bindToggleButton('adminThemeToggle');

        // System theme change listener
        this.bindSystemThemeListener();

        // Keyboard shortcut: Ctrl/Cmd + Shift + T
        document.addEventListener('keydown', (e) => {
            if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 't') {
                e.preventDefault();
                this.toggle();
            }
        });

        // Observe DOM for dynamically added toggle buttons and logos
        this.observeElements();
    },

    /**
     * Bind theme toggle button with duplicate prevention
     */
    bindToggleButton(id) {
        const btn = document.getElementById(id);
        if (btn && !btn.hasAttribute('data-theme-bound')) {
            btn.setAttribute('data-theme-bound', 'true');
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.toggle();
            });
        }
    },

    /**
     * Observe DOM for dynamically added theme elements
     */
    observeElements() {
        if (typeof MutationObserver === 'undefined') return;

        try {
            let debounceTimer = null;

            const observer = new MutationObserver((mutations) => {
                let shouldUpdate = false;

                for (const mutation of mutations) {
                    if (mutation.addedNodes.length > 0) {
                        for (const node of mutation.addedNodes) {
                            if (node.nodeType === 1) {
                                // Check for theme toggle buttons or logos
                                if (node.id === 'themeToggle' || node.id === 'adminThemeToggle' ||
                                    (node.querySelector && (
                                        node.querySelector('#themeToggle') ||
                                        node.querySelector('#adminThemeToggle') ||
                                        node.querySelector('[data-theme-logo]')
                                    ))) {
                                    shouldUpdate = true;
                                    break;
                                }
                            }
                        }
                    }
                    if (shouldUpdate) break;
                }

                if (shouldUpdate) {
                    clearTimeout(debounceTimer);
                    debounceTimer = setTimeout(() => {
                        this.bindToggleButton('themeToggle');
                        this.bindToggleButton('adminThemeToggle');
                        this.updateLogos(this.current);
                    }, 100);
                }
            });

            observer.observe(document.body, {
                childList: true,
                subtree: true
            });
        } catch (err) {
            console.warn('MutationObserver error:', err);
        }
    },

    /**
     * Listen to system theme changes
     */
    bindSystemThemeListener() {
        if (!window.matchMedia) return;

        try {
            const mq = window.matchMedia('(prefers-color-scheme: dark)');
            const handler = (e) => this.handleSystemChange(e);

            if (mq.addEventListener) {
                mq.addEventListener('change', handler);
            } else if (mq.addListener) {
                // Legacy Safari support
                mq.addListener(handler);
            }
        } catch (err) {
            console.warn('System theme listener error:', err);
        }
    },

    /**
     * Handle OS theme changes (only if user hasn't set manual preference)
     */
    handleSystemChange(e) {
        try {
            const hasManualPreference = localStorage.getItem(this.storageKey);
            if (!hasManualPreference) {
                this.apply(e.matches ? 'dark' : 'light', true);
            }
        } catch (err) {
            console.warn('System change handler error:', err);
        }
    },

    /**
     * Watch for App settings to load and update logo URLs
     */
    watchForSettings() {
        let attempts = 0;
        const maxAttempts = 30;

        const check = () => {
            attempts++;

            if (typeof App !== 'undefined' && App.settings && Object.keys(App.settings).length > 0) {
                this.updateLogosFromSettings();
                return;
            }

            if (attempts < maxAttempts) {
                setTimeout(check, 500);
            }
        };

        setTimeout(check, 500);
    },

    /**
     * Update internal logo URLs from App settings (Supabase)
     */
    updateLogosFromSettings() {
        if (typeof App === 'undefined' || !App.settings) return;

        const s = App.settings;
        let changed = false;

        if (s.colour_logo && s.colour_logo !== this.logos.colour) {
            this.logos.colour = s.colour_logo;
            changed = true;
        }
        if (s.white_logo && s.white_logo !== this.logos.white) {
            this.logos.white = s.white_logo;
            changed = true;
        }
        if (s.black_logo && s.black_logo !== this.logos.black) {
            this.logos.black = s.black_logo;
            changed = true;
        }

        if (changed) {
            this.updateLogos(this.current);
        }
    },

    /**
     * Schedule logo updates at multiple intervals to catch late loading
     */
    scheduleLogoUpdate() {
        [100, 500, 1000, 2000, 3000].forEach(delay => {
            setTimeout(() => this.updateLogos(this.current), delay);
        });
    },

    // ============================================================
    // THEME OPERATIONS
    // ============================================================

    /**
     * Toggle between light and dark themes
     */
    toggle() {
        const newTheme = this.current === 'light' ? 'dark' : 'light';
        this.apply(newTheme, true);
        this.savePreference(newTheme);

        // Show toast
        if (typeof App !== 'undefined' && App.toast) {
            App.toast(
                `Switched to ${newTheme === 'dark' ? 'Dark' : 'Light'} theme`,
                'info',
                2000
            );
        }
    },

    /**
     * Set specific theme
     */
    set(theme, save = true) {
        if (theme !== 'light' && theme !== 'dark') {
            console.warn('Invalid theme:', theme);
            return;
        }
        this.apply(theme, true);
        if (save) this.savePreference(theme);
    },

    /**
     * Apply theme to document
     */
    apply(theme, withTransition = true) {
        this.current = theme;

        if (withTransition) {
            this.addTransition();
        }

        // Set theme attribute
        document.documentElement.setAttribute('data-theme', theme);

        // Update all logos
        this.updateLogos(theme);

        // Update mobile browser UI
        this.updateMetaThemeColor(theme);

        // Update favicon
        this.updateFavicon(theme);

        // Refresh icons (feather-icons sometimes need re-rendering after theme change)
        this.refreshIcons();

        // Notify other components
        this.notifyChange(theme);

        if (withTransition) {
            setTimeout(() => this.removeTransition(), 400);
        }
    },

    /**
     * Refresh feather icons after theme change
     */
    refreshIcons() {
        try {
            if (typeof feather !== 'undefined') {
                feather.replace();
            }

            // Trigger icon size fixes
            setTimeout(() => {
                if (typeof App !== 'undefined' && App.fixIconSizes) {
                    App.fixIconSizes();
                }
                if (typeof Auth !== 'undefined' && Auth.fixAdminIconSizes) {
                    Auth.fixAdminIconSizes();
                }
            }, 100);
        } catch (err) {
            console.warn('Refresh icons error:', err);
        }
    },

    /**
     * Save user preference
     */
    savePreference(theme) {
        try {
            localStorage.setItem(this.storageKey, theme);
        } catch (err) {
            console.warn('Failed to save theme preference:', err);
        }
    },

    /**
     * Clear saved preference (revert to system default)
     */
    clearPreference() {
        try {
            localStorage.removeItem(this.storageKey);
            this.detectTheme();
            this.apply(this.current, true);
        } catch (err) {
            console.warn('Failed to clear theme preference:', err);
        }
    },

    // ============================================================
    // LOGO MANAGEMENT (data-theme-logo attribute)
    // ============================================================

    /**
     * Update ALL logos with data-theme-logo attribute based on theme
     *
     * Values:
     * - "adaptive" : White on dark, Colour on light (DEFAULT for most)
     * - "white"    : Always white (dark backgrounds - footer, sidebar)
     * - "black"    : Always black (very light backgrounds)
     * - "colour"   : Always colour (neutral backgrounds)
     */
    updateLogos(theme) {
        const isDark = theme === 'dark';

        // Get latest logo URLs from settings
        this.updateLogosFromSettings();

        try {
            // Find all elements with data-theme-logo attribute
            const logoElements = document.querySelectorAll('[data-theme-logo]');

            logoElements.forEach(el => {
                if (el.tagName !== 'IMG') return;

                const type = el.getAttribute('data-theme-logo') || 'adaptive';
                const newSrc = this.getLogoUrl(type, isDark);

                if (newSrc && el.src !== newSrc) {
                    // Preload to prevent flash
                    const preloader = new Image();
                    preloader.onload = () => {
                        el.src = newSrc;
                    };
                    preloader.onerror = () => {
                        // Fallback to colour logo if load fails
                        el.src = this.logos.colour;
                    };
                    preloader.src = newSrc;
                }
            });
        } catch (err) {
            console.warn('Update logos error:', err);
        }
    },

    /**
     * Get appropriate logo URL based on type and theme
     */
    getLogoUrl(type, isDark) {
        switch (type) {
            case 'white':
                return this.logos.white;
            case 'black':
                return this.logos.black;
            case 'colour':
                return this.logos.colour;
            case 'adaptive':
            default:
                return isDark ? this.logos.white : this.logos.colour;
        }
    },

    /**
     * Manually set logo on a specific element
     */
    setLogo(elementOrId, type = 'adaptive') {
        const el = typeof elementOrId === 'string'
            ? document.getElementById(elementOrId)
            : elementOrId;

        if (!el || el.tagName !== 'IMG') return;

        const isDark = this.current === 'dark';
        const newSrc = this.getLogoUrl(type, isDark);

        if (newSrc && el.src !== newSrc) {
            el.src = newSrc;
            el.setAttribute('data-theme-logo', type);
        }
    },

    /**
     * Force refresh all logos
     */
    refreshLogos() {
        this.updateLogos(this.current);
    },

    // ============================================================
    // META & VISUAL UPDATES
    // ============================================================

    /**
     * Update mobile browser theme-color meta tag
     */
    updateMetaThemeColor(theme) {
        try {
            const themeColor = theme === 'dark' ? '#050914' : '#1a56db';

            // Standard theme-color
            let meta = document.querySelector('meta[name="theme-color"]');
            if (!meta) {
                meta = document.createElement('meta');
                meta.name = 'theme-color';
                document.head.appendChild(meta);
            }
            meta.content = themeColor;

            // Apple mobile web app
            let appleMeta = document.querySelector('meta[name="apple-mobile-web-app-status-bar-style"]');
            if (!appleMeta) {
                appleMeta = document.createElement('meta');
                appleMeta.name = 'apple-mobile-web-app-status-bar-style';
                document.head.appendChild(appleMeta);
            }
            appleMeta.content = theme === 'dark' ? 'black-translucent' : 'default';

            // MS Tile color
            let msMeta = document.querySelector('meta[name="msapplication-TileColor"]');
            if (!msMeta) {
                msMeta = document.createElement('meta');
                msMeta.name = 'msapplication-TileColor';
                document.head.appendChild(msMeta);
            }
            msMeta.content = themeColor;
        } catch (err) {
            console.warn('Meta update error:', err);
        }
    },

    /**
     * Update favicon
     */
    updateFavicon(theme) {
        try {
            const favicons = document.querySelectorAll('link[rel*="icon"]');
            favicons.forEach(favicon => {
                if (this.logos.colour && favicon.href !== this.logos.colour) {
                    favicon.href = this.logos.colour;
                }
            });
        } catch (err) {
            // Silent fail
        }
    },

    // ============================================================
    // SMOOTH TRANSITIONS
    // ============================================================

    /**
     * Add smooth transition CSS during theme switch
     */
    addTransition() {
        if (document.getElementById('theme-transition-style')) return;

        const style = document.createElement('style');
        style.id = 'theme-transition-style';
        style.textContent = `
            *,
            *::before,
            *::after {
                transition: background-color 0.35s ease,
                            border-color 0.35s ease,
                            color 0.35s ease,
                            fill 0.35s ease,
                            stroke 0.35s ease,
                            box-shadow 0.35s ease,
                            filter 0.35s ease !important;
            }
        `;
        document.head.appendChild(style);
    },

    /**
     * Remove transition style after animation completes
     */
    removeTransition() {
        const style = document.getElementById('theme-transition-style');
        if (style) style.remove();
    },

    // ============================================================
    // EVENT NOTIFICATION
    // ============================================================

    /**
     * Dispatch custom event for other components to listen
     */
    notifyChange(theme) {
        try {
            const event = new CustomEvent('themeChange', {
                detail: {
                    theme,
                    isDark: theme === 'dark',
                    logos: this.logos
                },
                bubbles: true
            });
            document.dispatchEvent(event);
            window.dispatchEvent(event);
        } catch (err) {
            // Silent fail for old browsers
        }
    },

    // ============================================================
    // PUBLIC UTILITIES
    // ============================================================

    /**
     * Get current theme
     */
    getCurrent() {
        return this.current;
    },

    /**
     * Check if dark theme is active
     */
    isDark() {
        return this.current === 'dark';
    },

    /**
     * Check if light theme is active
     */
    isLight() {
        return this.current === 'light';
    },

    /**
     * Get appropriate logo URL for a given context
     */
    getLogoForContext(context) {
        const isDark = this.current === 'dark';
        switch (context) {
            case 'nav':
            case 'hero':
            case 'modal':
            case 'avatar':
            case 'adaptive':
                return isDark ? this.logos.white : this.logos.colour;
            case 'footer':
            case 'sidebar':
            case 'dark-bg':
                return this.logos.white;
            case 'light-bg':
                return this.logos.black;
            case 'colour':
                return this.logos.colour;
            default:
                return this.logos.colour;
        }
    },

    /**
     * Get all current logo URLs
     */
    getLogos() {
        return { ...this.logos };
    }
};

// ============================================================
// IMMEDIATE INITIALIZATION (Prevents Flash of Wrong Theme)
// ============================================================
(function() {
    try {
        const saved = localStorage.getItem('rotaract_unity_theme');
        let initialTheme = 'light';

        if (saved === 'light' || saved === 'dark') {
            initialTheme = saved;
        } else if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
            initialTheme = 'dark';
        }

        document.documentElement.setAttribute('data-theme', initialTheme);

        // Update meta theme-color immediately to prevent flash
        const themeColor = initialTheme === 'dark' ? '#050914' : '#1a56db';

        let meta = document.querySelector('meta[name="theme-color"]');
        if (!meta) {
            meta = document.createElement('meta');
            meta.name = 'theme-color';
            document.head.appendChild(meta);
        }
        meta.content = themeColor;
    } catch (err) {
        // Silent fail - default light theme applies
    }
})();

// ============================================================
// DOM READY INITIALIZATION
// ============================================================
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => Theme.init());
} else {
    Theme.init();
}

// Backup initialization on window load
window.addEventListener('load', () => {
    if (!Theme.initialized) {
        Theme.init();
    } else {
        // Refresh logos after full page load
        Theme.refreshLogos();
        Theme.refreshIcons();
    }
});

// ============================================================
// GLOBAL EXPOSURE
// ============================================================
window.Theme = Theme;