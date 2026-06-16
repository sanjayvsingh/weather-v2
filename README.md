# Weather App v2

A modern, dynamic weather application with real-time weather conditions, hourly forecasts, 10-day forecasts, and immersive weather-driven backgrounds. Built with vanilla HTML/CSS/JavaScript and a lightweight PHP backend.

## Features

✨ **Dynamic Weather Backgrounds** — Backgrounds and colors change based on weather conditions (clear, cloudy, rain, snow, thunderstorm, fog) and time of day (day/night)

📊 **Current Conditions** — Temperature, feels-like, humidity, wind speed & direction, UV index, dew point, visibility, sunrise/sunset times

📈 **Interactive Hourly Chart** — Chart.js visualization of temperature and precipitation probability for the next 12 hours at 15-minute resolution

📅 **10-Day Forecast** — Daily cards with high/low temperatures, weather icons, precipitation, and more

🌙 **Moon Phase** — Current moon phase with moonrise and moonset times

💨 **Air Quality Index** — AQI value with color coding and pollutant breakdown (PM2.5, PM10, O₃, NO₂, CO, NO₂, SO₂, NH₃)

🔍 **Location Search** — Search by address or use geolocation to find your location automatically

📱 **Fully Responsive** — Mobile-first design works on phones, tablets, and desktops with glassmorphism cards and smooth animations

## Tech Stack

- **Frontend**: Vanilla HTML, CSS (Grid/Flexbox), JavaScript (ES6+)
- **Charts**: Chart.js 4.0+
- **Backend**: PHP (secure API proxy)
- **APIs**: OpenWeatherMap One Call 4.0, MapQuest Geocoding, OpenWeatherMap Air Pollution

## Getting Started

### Prerequisites

- PHP 7.4+ with cURL extension
- Web server (Apache, Nginx, or PHP built-in)
- OpenWeatherMap One Call API 4.0 subscription
- MapQuest API key

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/sanjayvsingh/weather-v2.git
   cd weather-v2
   ```

2. Create `config.php` and add your API keys:
   ```php
   <?php
   define('OPENWEATHERMAP_KEY', 'your-owm-key');
   define('MAPQUEST_KEY', 'your-mapquest-key');
   define('WALKSCORE_KEY', 'optional-key');
   ```

3. Serve locally:
   ```bash
   php -S localhost:8000
   ```

4. Open `http://localhost:8000` and allow geolocation access

### Production Deployment

1. Upload files to your web server
2. Protect `config.php` with `.htaccess`:
   ```apache
   <Files "config.php">
       Deny from all
   </Files>
   ```
3. Set file permissions (644 for files, 755 for directories)

## File Structure

```
weather-v2/
├── index.html          # HTML shell
├── weather.js         # Frontend logic (fetch, render, charts)
├── weather.css        # Responsive styles & animations
├── api.php           # Secure PHP backend proxy
├── config.php        # API keys (gitignored)
├── .gitignore        # Prevents config.php from version control
└── README.md         # This file
```

## Architecture

### Backend: `api.php`

Secure proxy for all external APIs. Accepts a `?action=` parameter:

| Action | Returns |
|--------|---------|
| `weather&lat=X&lon=Y` | Current conditions |
| `forecast&lat=X&lon=Y` | 10-day forecast |
| `hourly&lat=X&lon=Y` | Next 12 hours (15-min resolution) |
| `alerts&lat=X&lon=Y` | Active weather alerts |
| `aqi&lat=X&lon=Y` | Air Quality Index |
| `geocode&q=address` | Address → lat/lon |

All API keys stay server-side. No credentials exposed to client.

### Frontend: `weather.js`

Complete app logic:
1. Resolves location (URL params → geocoding → geolocation → default)
2. Fetches all data in parallel
3. Renders UI dynamically
4. Initializes Chart.js for hourly data
5. Updates background based on weather + time of day

### Styling: `weather.css`

- 8 dynamic color schemes (clear-day, clear-night, cloudy, rain, snow, thunderstorm, fog)
- Glassmorphism cards with `backdrop-filter: blur()`
- Pure CSS animations (rain, snow, stars)
- Mobile-first responsive grid
- Fluid typography with `clamp()`

## Weather Conditions

The app sets a `data-condition` attribute on `<body>` that controls the entire theme:

- `clear-day` / `clear-night` — Bright or dark sky
- `cloudy-day` / `cloudy-night` — Overcast
- `rain` — Muted blue-gray with falling rain
- `thunderstorm` — Very dark with yellow accents
- `snow` — Light blue with snowflakes
- `fog` — Gray

CSS automatically applies background, text color, and animations.

## Configuration

### API Keys

Edit `config.php`:
```php
define('OPENWEATHERMAP_KEY', 'your-key');
define('MAPQUEST_KEY', 'your-key');
```

Never commit `config.php` — it's in `.gitignore`.

### Default Location

Edit `weather.js` (~line 30):
```javascript
return { lat: 43.7806, lon: -79.3503 }; // Toronto
```

### Colors

Edit CSS variables in `weather.css`:
```css
body[data-condition="clear-day"] {
    --bg-gradient: linear-gradient(...);
    --accent: #FF6B6B;
    --card-bg: rgba(255, 255, 255, 0.85);
    --text-color: #1a1a1a;
}
```

## Browser Support

Modern browsers (Chrome 76+, Firefox 72+, Safari 15.2+, Edge 79+)

Requires: ES6, CSS Grid/Flexbox, CSS Custom Properties, `backdrop-filter`, Fetch API

## Performance

- No build tools — pure HTML/CSS/JS
- <50KB total size
- Parallel API calls with `Promise.all()`
- GPU-accelerated CSS animations
- Cached weather icons from OWM CDN

## Migration from v1

Complete rewrite from the original Perl CGI app. Key improvements:

| | v1 (Perl) | v2 (JavaScript) |
|---|-----------|-----------------|
| Backend | Perl CGI | PHP proxy |
| API | OWM 2.5 | OWM 4.0 |
| Hourly | 1h resolution | 15-min (OWM 4.0 feature) |
| Charts | None | Chart.js |
| Backgrounds | Static image | Dynamic animated |
| Responsive | Limited | Full mobile/tablet/desktop |

## Troubleshooting

**"API error: HTTP 401"** — Check your OWM API key

**"Location not found"** — Verify MapQuest key and address

**Blank page** — Check console (F12) for errors, verify PHP is enabled

**Background not animated** — Your browser may not support `backdrop-filter`

## Future Ideas

- Weather alerts (push notifications)
- Historical data (compare years)
- Wind direction compass
- Precipitation radar
- Location favorites
- Dark mode toggle
- PWA installable on mobile

## License

MIT

---

Weather data from [OpenWeatherMap](https://openweathermap.org/)
Geocoding by [MapQuest](https://developer.mapquest.com/)
