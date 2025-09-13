# WordPress Theme & Plugin Detector

A modern, responsive web application that analyzes WordPress websites to detect themes and plugins being used. Built with vanilla HTML, CSS, and JavaScript.

## Features

- **Theme Detection**: Identifies WordPress themes by analyzing HTML source code
- **Plugin Detection**: Discovers active plugins from various sources
- **Technical Information**: Shows WordPress version, PHP version, server details, and more
- **Modern UI**: Beautiful, responsive design with smooth animations
- **CORS Handling**: Uses proxy services to bypass cross-origin restrictions
- **Error Handling**: Comprehensive error handling with user-friendly messages
- **Mobile Responsive**: Works perfectly on desktop, tablet, and mobile devices

## How It Works

The detector analyzes WordPress websites by:

1. **Fetching the website** using CORS proxy services
2. **Identifying WordPress** by looking for characteristic patterns in the HTML
3. **Extracting theme information** from CSS/JS file paths and meta tags
4. **Discovering plugins** by scanning for plugin directory references
5. **Gathering technical details** from HTTP headers and HTML meta tags
6. **Matching against databases** of known themes and plugins for additional information

## Usage

1. Open `index.html` in a web browser
2. Enter a WordPress website URL (e.g., https://example.com)
3. Click "Detect" or press Enter
4. View the detected theme, plugins, and technical information

### Example URLs to Try

- https://wordpress.org
- https://woocommerce.com
- https://elementor.com

## File Structure

```
/
├── index.html          # Main HTML file
├── styles.css          # CSS styles and responsive design
├── script.js           # JavaScript detection logic
└── README.md           # This documentation
```

## Detection Methods

### Theme Detection
- Analyzes `wp-content/themes/` paths in HTML
- Extracts theme names from meta tags
- Matches against a database of popular themes
- Identifies theme versions from CSS/JS file parameters

### Plugin Detection
- Scans for `wp-content/plugins/` references
- Analyzes script and stylesheet sources
- Extracts plugin information from JSON data
- Matches against a database of popular plugins

### Technical Information
- WordPress version from generator meta tags
- PHP version from HTTP headers
- Server information from response headers
- Character encoding and language settings

## Browser Compatibility

- Chrome 60+
- Firefox 55+
- Safari 12+
- Edge 79+

## Limitations

- **CORS Restrictions**: Some websites may block cross-origin requests
- **Plugin Detection**: May not detect all plugins due to optimization techniques
- **Theme Detection**: Custom themes may not be identified if they don't follow standard patterns
- **Rate Limiting**: Some proxy services may have rate limits

## Technical Details

### CORS Handling
The application uses `api.allorigins.win` as a CORS proxy to fetch website content. This allows the detector to work with most WordPress sites without CORS issues.

### Database
Includes built-in databases of popular WordPress themes and plugins with:
- Theme names, authors, descriptions, and versions
- Plugin names, versions, descriptions, and authors
- Easy to extend with additional entries

### Error Handling
Comprehensive error handling for:
- Invalid URLs
- Network connectivity issues
- Non-WordPress websites
- CORS blocking
- Malformed responses

## Customization

### Adding New Themes
Edit the `initializeThemeDatabase()` method in `script.js`:

```javascript
'your-theme-slug': {
    name: 'Your Theme Name',
    author: 'Theme Author',
    description: 'Theme description',
    version: '1.0.0'
}
```

### Adding New Plugins
Edit the `initializePluginDatabase()` method in `script.js`:

```javascript
'your-plugin-slug': {
    name: 'Your Plugin Name',
    version: '1.0.0',
    description: 'Plugin description',
    author: 'Plugin Author'
}
```

## Security Considerations

- All user input is properly escaped to prevent XSS attacks
- URLs are validated before making requests
- No sensitive data is stored or transmitted
- Uses HTTPS for all external requests

## Future Enhancements

- Server-side implementation to avoid CORS issues
- More comprehensive theme and plugin databases
- Historical detection results
- Export functionality for results
- API integration with WordPress.org repository
- Advanced pattern matching for better detection accuracy

## License

This project is open source and available under the MIT License.

## Contributing

Contributions are welcome! Please feel free to submit pull requests or open issues for bugs and feature requests.

## Support

For support or questions, please open an issue in the project repository.