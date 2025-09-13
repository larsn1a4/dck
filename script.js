// WordPress Theme and Plugin Detector
class WordPressDetector {
    constructor() {
        this.init();
        this.setupEventListeners();
        this.themeDatabase = this.initializeThemeDatabase();
        this.pluginDatabase = this.initializePluginDatabase();
    }

    init() {
        this.elements = {
            websiteUrl: document.getElementById('websiteUrl'),
            detectBtn: document.getElementById('detectBtn'),
            loadingSection: document.getElementById('loadingSection'),
            resultsSection: document.getElementById('resultsSection'),
            errorSection: document.getElementById('errorSection'),
            themeInfo: document.getElementById('themeInfo'),
            pluginsInfo: document.getElementById('pluginsInfo'),
            technicalInfo: document.getElementById('technicalInfo'),
            pluginCount: document.getElementById('pluginCount'),
            errorMessage: document.getElementById('errorMessage'),
            newSearchBtn: document.getElementById('newSearchBtn'),
            retryBtn: document.getElementById('retryBtn')
        };
    }

    setupEventListeners() {
        this.elements.detectBtn.addEventListener('click', () => this.detectWordPress());
        this.elements.websiteUrl.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.detectWordPress();
        });
        this.elements.newSearchBtn.addEventListener('click', () => this.resetForm());
        this.elements.retryBtn.addEventListener('click', () => this.detectWordPress());
        
        // Example URL buttons
        document.querySelectorAll('.example-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.elements.websiteUrl.value = e.target.dataset.url;
                this.detectWordPress();
            });
        });
    }

    async detectWordPress() {
        const url = this.elements.websiteUrl.value.trim();
        
        if (!url) {
            this.showError('Please enter a website URL');
            return;
        }

        if (!this.isValidUrl(url)) {
            this.showError('Please enter a valid URL (e.g., https://example.com)');
            return;
        }

        this.showLoading();
        
        try {
            const results = await this.analyzeWebsite(url);
            this.displayResults(results);
        } catch (error) {
            console.error('Detection error:', error);
            this.showError('Failed to analyze the website. Please check the URL and try again.');
        }
    }

    async analyzeWebsite(url) {
        const normalizedUrl = this.normalizeUrl(url);
        
        try {
            // Try to fetch the main page
            const response = await this.fetchWithCORS(normalizedUrl);
            const html = await response.text();
            
            // Check if it's a WordPress site
            if (!this.isWordPressSite(html)) {
                throw new Error('This does not appear to be a WordPress website');
            }

            // Extract theme information
            const themeInfo = this.extractThemeInfo(html);
            
            // Extract plugin information
            const pluginsInfo = this.extractPluginInfo(html);
            
            // Extract technical information
            const technicalInfo = this.extractTechnicalInfo(html, response);
            
            return {
                theme: themeInfo,
                plugins: pluginsInfo,
                technical: technicalInfo,
                url: normalizedUrl
            };
        } catch (error) {
            throw new Error(`Unable to analyze website: ${error.message}`);
        }
    }

    isWordPressSite(html) {
        const wordpressIndicators = [
            /wp-content\//i,
            /wp-includes\//i,
            /wp-json\//i,
            /wp-admin\//i,
            /generator.*wordpress/i,
            /wp-content\/themes\//i,
            /wp-content\/plugins\//i
        ];
        
        return wordpressIndicators.some(indicator => indicator.test(html));
    }

    extractThemeInfo(html) {
        const themeInfo = {
            name: 'Unknown',
            version: 'Unknown',
            author: 'Unknown',
            description: 'No description available'
        };

        // Try to extract theme name from various sources
        const themeNamePatterns = [
            /<meta name="generator" content="WordPress [^"]*" \/>/i,
            /wp-content\/themes\/([^\/\?"]+)/i,
            /"template":"([^"]+)"/i,
            /"stylesheet":"([^"]+)"/i
        ];

        for (const pattern of themeNamePatterns) {
            const match = html.match(pattern);
            if (match) {
                themeInfo.name = match[1] || match[0];
                break;
            }
        }

        // Try to get theme info from WordPress API
        const themeSlug = this.extractThemeSlug(html);
        if (themeSlug && this.themeDatabase[themeSlug]) {
            const dbTheme = this.themeDatabase[themeSlug];
            themeInfo.name = dbTheme.name;
            themeInfo.author = dbTheme.author;
            themeInfo.description = dbTheme.description;
            themeInfo.version = dbTheme.version || 'Unknown';
        }

        // Extract version from CSS/JS files
        const versionMatch = html.match(/ver=([0-9.]+)/i);
        if (versionMatch) {
            themeInfo.version = versionMatch[1];
        }

        return themeInfo;
    }

    extractThemeSlug(html) {
        const patterns = [
            /wp-content\/themes\/([^\/\?"]+)/i,
            /"template":"([^"]+)"/i,
            /"stylesheet":"([^"]+)"/i
        ];

        for (const pattern of patterns) {
            const match = html.match(pattern);
            if (match) {
                return match[1].toLowerCase().replace(/[^a-z0-9-]/g, '');
            }
        }
        return null;
    }

    extractPluginInfo(html) {
        const plugins = [];
        
        // Extract plugins from various sources
        const pluginPatterns = [
            /wp-content\/plugins\/([^\/\?"]+)/gi,
            /"plugins":\s*\[(.*?)\]/gi,
            /"active_plugins":\s*\[(.*?)\]/gi
        ];

        const foundPlugins = new Set();

        for (const pattern of pluginPatterns) {
            let match;
            while ((match = pattern.exec(html)) !== null) {
                const pluginPath = match[1];
                if (pluginPath && !pluginPath.includes('..')) {
                    const pluginSlug = pluginPath.split('/')[0];
                    if (pluginSlug && !foundPlugins.has(pluginSlug)) {
                        foundPlugins.add(pluginSlug);
                        
                        const pluginInfo = this.getPluginInfo(pluginSlug);
                        plugins.push(pluginInfo);
                    }
                }
            }
        }

        // Extract from script tags
        const scriptTags = html.match(/<script[^>]*src="[^"]*wp-content\/plugins\/[^"]*"/gi) || [];
        scriptTags.forEach(script => {
            const match = script.match(/wp-content\/plugins\/([^\/\?"]+)/i);
            if (match) {
                const pluginSlug = match[1].split('/')[0];
                if (pluginSlug && !foundPlugins.has(pluginSlug)) {
                    foundPlugins.add(pluginSlug);
                    const pluginInfo = this.getPluginInfo(pluginSlug);
                    plugins.push(pluginInfo);
                }
            }
        });

        return plugins.sort((a, b) => a.name.localeCompare(b.name));
    }

    getPluginInfo(slug) {
        const plugin = this.pluginDatabase[slug] || {
            name: this.formatPluginName(slug),
            version: 'Unknown',
            description: 'Plugin information not available',
            author: 'Unknown'
        };

        return {
            name: plugin.name,
            version: plugin.version,
            description: plugin.description,
            author: plugin.author,
            slug: slug,
            status: 'active'
        };
    }

    formatPluginName(slug) {
        return slug
            .split('-')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
    }

    extractTechnicalInfo(html, response) {
        const technical = {
            wordpressVersion: 'Unknown',
            phpVersion: 'Unknown',
            server: 'Unknown',
            charset: 'Unknown',
            language: 'Unknown'
        };

        // Extract WordPress version
        const wpVersionMatch = html.match(/generator.*wordpress\s+([0-9.]+)/i);
        if (wpVersionMatch) {
            technical.wordpressVersion = wpVersionMatch[1];
        }

        // Extract PHP version from headers
        const phpVersion = response.headers.get('x-powered-by');
        if (phpVersion) {
            technical.phpVersion = phpVersion;
        }

        // Extract server information
        const server = response.headers.get('server');
        if (server) {
            technical.server = server;
        }

        // Extract charset
        const charsetMatch = html.match(/charset=([^"]+)/i);
        if (charsetMatch) {
            technical.charset = charsetMatch[1];
        }

        // Extract language
        const langMatch = html.match(/lang="([^"]+)"/i);
        if (langMatch) {
            technical.language = langMatch[1];
        }

        return technical;
    }

    async fetchWithCORS(url) {
        // Use a CORS proxy for development
        const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`;
        
        try {
            const response = await fetch(proxyUrl);
            const data = await response.json();
            
            if (data.status.http_code !== 200) {
                throw new Error(`HTTP ${data.status.http_code}`);
            }
            
            // Create a mock response object
            return {
                text: () => Promise.resolve(data.contents),
                headers: {
                    get: (name) => {
                        const headers = data.status.response_headers || {};
                        return headers[name.toLowerCase()] || null;
                    }
                }
            };
        } catch (error) {
            // Fallback: try direct fetch (will likely fail due to CORS)
            return fetch(url);
        }
    }

    displayResults(results) {
        this.hideLoading();
        this.hideError();
        
        // Display theme information
        this.displayThemeInfo(results.theme);
        
        // Display plugin information
        this.displayPluginInfo(results.plugins);
        
        // Display technical information
        this.displayTechnicalInfo(results.technical);
        
        this.showResults();
    }

    displayThemeInfo(theme) {
        const themeHtml = `
            <div class="theme-info">
                <div class="theme-item">
                    <span class="theme-label">Theme Name:</span>
                    <span class="theme-value theme-name">${this.escapeHtml(theme.name)}</span>
                </div>
                <div class="theme-item">
                    <span class="theme-label">Version:</span>
                    <span class="theme-value">${this.escapeHtml(theme.version)}</span>
                </div>
                <div class="theme-item">
                    <span class="theme-label">Author:</span>
                    <span class="theme-value">${this.escapeHtml(theme.author)}</span>
                </div>
                <div class="theme-item">
                    <span class="theme-label">Description:</span>
                    <span class="theme-value">${this.escapeHtml(theme.description)}</span>
                </div>
            </div>
        `;
        
        this.elements.themeInfo.innerHTML = themeHtml;
    }

    displayPluginInfo(plugins) {
        this.elements.pluginCount.textContent = `${plugins.length} plugin${plugins.length !== 1 ? 's' : ''}`;
        
        if (plugins.length === 0) {
            this.elements.pluginsInfo.innerHTML = '<p style="text-align: center; color: #666; padding: 20px;">No plugins detected</p>';
            return;
        }

        const pluginsHtml = plugins.map(plugin => `
            <div class="plugin-item">
                <div>
                    <div class="plugin-name">${this.escapeHtml(plugin.name)}</div>
                    <div class="plugin-version">v${this.escapeHtml(plugin.version)}</div>
                </div>
                <span class="plugin-status active">Active</span>
            </div>
        `).join('');

        this.elements.pluginsInfo.innerHTML = pluginsHtml;
    }

    displayTechnicalInfo(technical) {
        const technicalHtml = `
            <div class="tech-item">
                <span class="tech-label">WordPress Version:</span>
                <span class="tech-value">${this.escapeHtml(technical.wordpressVersion)}</span>
            </div>
            <div class="tech-item">
                <span class="tech-label">PHP Version:</span>
                <span class="tech-value">${this.escapeHtml(technical.phpVersion)}</span>
            </div>
            <div class="tech-item">
                <span class="tech-label">Server:</span>
                <span class="tech-value">${this.escapeHtml(technical.server)}</span>
            </div>
            <div class="tech-item">
                <span class="tech-label">Charset:</span>
                <span class="tech-value">${this.escapeHtml(technical.charset)}</span>
            </div>
            <div class="tech-item">
                <span class="tech-label">Language:</span>
                <span class="tech-value">${this.escapeHtml(technical.language)}</span>
            </div>
        `;
        
        this.elements.technicalInfo.innerHTML = technicalHtml;
    }

    showLoading() {
        this.hideAllSections();
        this.elements.loadingSection.classList.remove('hidden');
        this.elements.detectBtn.disabled = true;
        this.elements.detectBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Detecting...';
    }

    hideLoading() {
        this.elements.loadingSection.classList.add('hidden');
        this.elements.detectBtn.disabled = false;
        this.elements.detectBtn.innerHTML = '<i class="fas fa-search"></i> Detect';
    }

    showResults() {
        this.elements.resultsSection.classList.remove('hidden');
    }

    showError(message) {
        this.hideLoading();
        this.hideAllSections();
        this.elements.errorMessage.textContent = message;
        this.elements.errorSection.classList.remove('hidden');
    }

    hideError() {
        this.elements.errorSection.classList.add('hidden');
    }

    hideAllSections() {
        this.elements.loadingSection.classList.add('hidden');
        this.elements.resultsSection.classList.add('hidden');
        this.elements.errorSection.classList.add('hidden');
    }

    resetForm() {
        this.elements.websiteUrl.value = '';
        this.hideAllSections();
        this.elements.websiteUrl.focus();
    }

    isValidUrl(string) {
        try {
            new URL(string);
            return true;
        } catch (_) {
            return false;
        }
    }

    normalizeUrl(url) {
        if (!url.startsWith('http://') && !url.startsWith('https://')) {
            return 'https://' + url;
        }
        return url;
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    initializeThemeDatabase() {
        return {
            'twentytwentyfour': {
                name: 'Twenty Twenty-Four',
                author: 'WordPress.org',
                description: 'The default WordPress theme for 2024',
                version: '1.0'
            },
            'twentytwentythree': {
                name: 'Twenty Twenty-Three',
                author: 'WordPress.org',
                description: 'The default WordPress theme for 2023',
                version: '1.4'
            },
            'twentytwentytwo': {
                name: 'Twenty Twenty-Two',
                author: 'WordPress.org',
                description: 'The default WordPress theme for 2022',
                version: '1.6'
            },
            'astra': {
                name: 'Astra',
                author: 'Brainstorm Force',
                description: 'Fast, beautiful & customizable theme',
                version: '4.6.0'
            },
            'oceanwp': {
                name: 'OceanWP',
                author: 'OceanWP',
                description: 'Extensible WordPress theme',
                version: '3.4.0'
            },
            'generatepress': {
                name: 'GeneratePress',
                author: 'Tom Usborne',
                description: 'Lightweight WordPress theme',
                version: '3.3.0'
            },
            'neve': {
                name: 'Neve',
                author: 'ThemeIsle',
                description: 'Fast, lightweight WordPress theme',
                version: '3.7.0'
            },
            'kadence': {
                name: 'Kadence',
                author: 'Kadence WP',
                description: 'Modern WordPress theme',
                version: '1.1.0'
            }
        };
    }

    initializePluginDatabase() {
        return {
            'elementor': {
                name: 'Elementor',
                version: '3.18.0',
                description: 'The most advanced frontend drag & drop page builder',
                author: 'Elementor.com'
            },
            'woocommerce': {
                name: 'WooCommerce',
                version: '8.5.0',
                description: 'An open-source eCommerce plugin for WordPress',
                author: 'Automattic'
            },
            'yoast-seo': {
                name: 'Yoast SEO',
                version: '21.6',
                description: 'Improve your WordPress SEO',
                author: 'Team Yoast'
            },
            'contact-form-7': {
                name: 'Contact Form 7',
                version: '5.8.0',
                description: 'Just another contact form plugin',
                author: 'Takayuki Miyoshi'
            },
            'akismet': {
                name: 'Akismet Anti-spam',
                version: '5.3.0',
                description: 'Used by millions, Akismet is quite possibly the best way in the world to protect your blog from spam',
                author: 'Automattic'
            },
            'jetpack': {
                name: 'Jetpack',
                version: '12.6',
                description: 'Security, performance, and marketing tools for WordPress',
                author: 'Automattic'
            },
            'wpforms-lite': {
                name: 'WPForms Lite',
                version: '1.8.5',
                description: 'Drag & Drop WordPress Form Builder',
                author: 'WPForms'
            },
            'wp-super-cache': {
                name: 'WP Super Cache',
                version: '1.11.0',
                description: 'Very fast caching plugin for WordPress',
                author: 'Ozh Richard'
            },
            'wordfence': {
                name: 'Wordfence Security',
                version: '7.10.0',
                description: 'Firewall, malware scan, blocking, live traffic, and login security',
                author: 'Wordfence'
            },
            'updraftplus': {
                name: 'UpdraftPlus WordPress Backup Plugin',
                version: '1.23.0',
                description: 'Backup and restore: take backups automatically, manual backups, and restore',
                author: 'UpdraftPlus.Com, DavidAnderson, Rian Rietveld'
            }
        };
    }
}

// Initialize the detector when the page loads
document.addEventListener('DOMContentLoaded', () => {
    new WordPressDetector();
});