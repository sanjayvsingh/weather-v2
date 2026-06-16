/**
 * Weather App
 * Fetches data from api.php, renders UI, and handles interactions
 */

const API_BASE = './api.php';
let currentData = {};
let forecastData = {};
let hourlyData = {};
let alertsData = {};
let aqiData = {};
let hourlyChart = null;

const weatherConditionMap = {
    // Thunderstorm (2xx)
    2: 'thunderstorm',
    // Drizzle (3xx)
    3: 'rain',
    // Rain (5xx)
    5: 'rain',
    // Snow (6xx)
    6: 'snow',
    // Atmosphere (7xx)
    7: 'fog',
    // Clear (800)
    800: 'clear',
    // Clouds (80x)
    801: 'cloudy',
    802: 'cloudy',
    803: 'cloudy',
    804: 'cloudy',
};

// Initialize on page load
document.addEventListener('DOMContentLoaded', async () => {
    const { lat, lon } = await resolveLocation();

    if (!lat || !lon) {
        showError('Could not determine location');
        return;
    }

    setupSearchForm();

    // Fetch current conditions first and render immediately
    try {
        const current = await fetch(`${API_BASE}?action=weather&lat=${lat}&lon=${lon}`).then(r => r.json());
        if (current.error) throw new Error(current.error);
        currentData = current;
        renderCurrentHero();
        renderCurrentDetails();
        updateBackground();
    } catch (error) {
        console.error('Failed to fetch current weather:', error);
    }

    // Fetch remaining data in parallel and render as available
    Promise.all([
        fetch(`${API_BASE}?action=forecast&lat=${lat}&lon=${lon}`).then(r => r.json()).then(data => {
            forecastData = data;
            renderForecast();
            renderMoonPhase();
        }),
        fetch(`${API_BASE}?action=hourly&lat=${lat}&lon=${lon}`).then(r => r.json()).then(data => {
            hourlyData = data;
            renderHourlyChart();
        }),
        fetch(`${API_BASE}?action=alerts&lat=${lat}&lon=${lon}`).then(r => r.json()).then(data => {
            alertsData = data;
            renderAlerts();
        }),
        fetch(`${API_BASE}?action=aqi&lat=${lat}&lon=${lon}`).then(r => r.json()).then(data => {
            aqiData = data;
            renderAQI();
        })
    ]).catch(error => console.error('Error fetching additional data:', error));
});

/**
 * Resolve location from URL params or geolocation
 */
async function resolveLocation() {
    const params = new URLSearchParams(window.location.search);

    // Check for explicit lat/lon
    if (params.has('lat') && params.has('lon')) {
        return {
            lat: parseFloat(params.get('lat')),
            lon: parseFloat(params.get('lon'))
        };
    }

    // Check for address to geocode
    if (params.has('loc')) {
        const location = params.get('loc');
        try {
            const response = await fetch(`${API_BASE}?action=geocode&q=${encodeURIComponent(location)}`);
            const data = await response.json();
            if (data.error) throw new Error(data.error);
            return { lat: data.lat, lon: data.lon };
        } catch (error) {
            console.error('Geocoding failed:', error);
            return getGeolocation();
        }
    }

    // Fall back to browser geolocation
    return getGeolocation();
}

/**
 * Request browser geolocation
 */
function getGeolocation() {
    return new Promise((resolve) => {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    resolve({
                        lat: position.coords.latitude,
                        lon: position.coords.longitude
                    });
                },
                (error) => {
                    // Default to Toronto if geolocation fails
                    console.warn('Geolocation failed, using default location');
                    resolve({ lat: 43.7806, lon: -79.3503 });
                }
            );
        } else {
            resolve({ lat: 43.7806, lon: -79.3503 });
        }
    });
}


/**
 * Main render function
 */
function render() {
    renderAlerts();
    renderCurrentHero();
    renderCurrentDetails();
    renderAQI();
    renderHourlyChart();
    renderForecast();
    renderMoonPhase();
    updateBackground();
}

/**
 * Render alerts
 */
function renderAlerts() {
    const container = document.querySelector('.alerts-container');
    if (!alertsData.data || alertsData.data.length === 0) {
        container.innerHTML = '';
        return;
    }

    const html = alertsData.data.map(alert => {
        const start = new Date(alert.start * 1000).toLocaleString();
        const end = new Date(alert.end * 1000).toLocaleString();
        return `
            <div class="alert">
                <div class="alert-title">${alert.event}</div>
                <div class="alert-period">From ${alert.sender_name}</div>
                <div class="alert-period">${start} to ${end}</div>
                <div class="alert-description">${alert.description}</div>
            </div>
        `;
    }).join('');

    container.innerHTML = html;
}

/**
 * Render current conditions hero
 */
function renderCurrentHero() {
    const current = currentData.data[0];
    if (!current) return;

    const { temp, feels_like, weather } = current;
    const cityName = currentData.timezone ? currentData.timezone.split('/').pop() : 'Unknown Location';
    const icon = getWeatherIcon(weather[0].icon);

    const html = `
        <div class="current-icon">
            <img src="${icon}" alt="${weather[0].description}">
        </div>
        <div class="current-info">
            <h1>${cityName}</h1>
            <div class="current-description">${capitalize(weather[0].description)}</div>
            <div class="current-temp">${Math.round(temp)}°C</div>
        </div>
    `;

    document.querySelector('.current-hero').innerHTML = html;
}

/**
 * Render current detail cards
 */
function renderCurrentDetails() {
    const current = currentData.data[0];
    if (!current) return;

    const { temp, feels_like, humidity, wind_speed, wind_deg, wind_gust, visibility, dew_point, sunrise, sunset, uvi } = current;
    const sunriseTime = new Date(sunrise * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const sunsetTime = new Date(sunset * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    // Convert wind speed m/s to km/h
    const windSpeedKmh = (wind_speed * 3.6).toFixed(1);
    const windGustKmh = wind_gust ? (wind_gust * 3.6).toFixed(1) : null;

    // Wind direction
    const windDir = getWindDirection(wind_deg);

    // UV index label
    const uviLabel = getUVILabel(uvi);

    const html = `
        <div class="detail-card">
            <div class="detail-label">Feels Like</div>
            <div class="detail-value">${Math.round(feels_like)}°C</div>
        </div>
        <div class="detail-card">
            <div class="detail-label">Humidity</div>
            <div class="detail-value">${Math.round(humidity)}%</div>
        </div>
        <div class="detail-card">
            <div class="detail-label">Wind</div>
            <div class="detail-value">${windSpeedKmh} km/h</div>
            <div class="detail-subvalue">${windDir}${windGustKmh ? ` (gust: ${windGustKmh})` : ''}</div>
        </div>
        <div class="detail-card">
            <div class="detail-label">UV Index</div>
            <div class="detail-value ${`uvi-${uviLabel.toLowerCase().replace(' ', '-')}`}">${uvi.toFixed(1)}</div>
            <div class="detail-subvalue">${uviLabel}</div>
        </div>
        <div class="detail-card">
            <div class="detail-label">Dew Point</div>
            <div class="detail-value">${Math.round(dew_point)}°C</div>
        </div>
        <div class="detail-card">
            <div class="detail-label">Visibility</div>
            <div class="detail-value">${(visibility / 1000).toFixed(1)} km</div>
        </div>
        <div class="detail-card">
            <div class="detail-label">Sunrise</div>
            <div class="detail-value">${sunriseTime}</div>
        </div>
        <div class="detail-card">
            <div class="detail-label">Sunset</div>
            <div class="detail-value">${sunsetTime}</div>
        </div>
    `;

    document.querySelector('.current-details').innerHTML = html;
}

/**
 * Render AQI card
 */
function renderAQI() {
    if (!aqiData.list || !aqiData.list[0]) {
        document.querySelector('.aqi-card').innerHTML = '';
        return;
    }

    const aqi = aqiData.list[0];
    const aqiValue = aqi.main.aqi;
    const aqiLabels = ['Good', 'Fair', 'Moderate', 'Poor', 'Very Poor'];
    const aqiLabel = aqiLabels[aqiValue - 1] || 'Unknown';

    const components = aqi.components;

    const html = `
        <div class="aqi-value">${aqiValue}</div>
        <div class="aqi-label">${aqiLabel}</div>
        <div class="aqi-bar"></div>
        <div class="pollutants">
            <div class="pollutant">
                <div class="pollutant-label">PM2.5</div>
                <div class="pollutant-value">${(components.pm2_5 || 0).toFixed(1)}</div>
            </div>
            <div class="pollutant">
                <div class="pollutant-label">PM10</div>
                <div class="pollutant-value">${(components.pm10 || 0).toFixed(1)}</div>
            </div>
            <div class="pollutant">
                <div class="pollutant-label">O₃</div>
                <div class="pollutant-value">${(components.o3 || 0).toFixed(1)}</div>
            </div>
            <div class="pollutant">
                <div class="pollutant-label">NO₂</div>
                <div class="pollutant-value">${(components.no2 || 0).toFixed(1)}</div>
            </div>
        </div>
    `;

    document.querySelector('.aqi-card').innerHTML = html;
}

/**
 * Render hourly chart with Chart.js
 */
function renderHourlyChart() {
    if (!hourlyData.data || hourlyData.data.length === 0) return;

    const data = hourlyData.data.slice(0, 48); // First 48 records = ~12 hours at 15-min intervals

    const labels = data.map(hour => {
        const date = new Date(hour.dt * 1000);
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    });

    const temperatures = data.map(hour => Math.round(hour.temp));
    // OWM 4.0 doesn't include rain/snow in 15-min data, only pop
    const popValues = data.map(hour => Math.round((hour.pop || 0) * 100));

    const ctx = document.getElementById('hourlyChart').getContext('2d');

    // Destroy existing chart if it exists
    if (hourlyChart) {
        hourlyChart.destroy();
    }

    // Determine text color based on current background condition
    const condition = document.body.getAttribute('data-condition') || 'clear-day';
    const darkConditions = ['clear-night', 'cloudy-night', 'rain', 'thunderstorm'];
    const textColor = darkConditions.includes(condition) ? '#f0f0f0' : '#1a1a1a';
    const gridColor = darkConditions.includes(condition) ? 'rgba(240, 240, 240, 0.1)' : 'rgba(0, 0, 0, 0.1)';

    hourlyChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Temperature (°C)',
                    data: temperatures,
                    borderColor: '#FF6B6B',
                    backgroundColor: 'rgba(255, 107, 107, 0.1)',
                    borderWidth: 2.5,
                    fill: true,
                    tension: 0.4,
                    pointRadius: 1,
                    pointBackgroundColor: '#FF6B6B',
                    yAxisID: 'y',
                },
                {
                    label: 'Precipitation Probability (%)',
                    data: popValues,
                    type: 'bar',
                    backgroundColor: 'rgba(93, 173, 226, 0.4)',
                    borderColor: '#5DADE2',
                    borderWidth: 0,
                    yAxisID: 'y1',
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            interaction: {
                mode: 'index',
                intersect: false
            },
            plugins: {
                legend: {
                    display: true,
                    labels: {
                        color: textColor,
                        boxWidth: 12,
                        padding: 15
                    }
                },
                filler: {
                    propagate: true
                }
            },
            scales: {
                y: {
                    type: 'linear',
                    display: true,
                    position: 'left',
                    title: {
                        display: true,
                        text: 'Temperature (°C)',
                        color: '#FF6B6B'
                    },
                    ticks: {
                        color: textColor
                    },
                    grid: {
                        color: gridColor
                    }
                },
                y1: {
                    type: 'linear',
                    display: true,
                    position: 'right',
                    title: {
                        display: true,
                        text: 'Precipitation (%)',
                        color: '#5DADE2'
                    },
                    ticks: {
                        color: textColor
                    },
                    grid: {
                        drawOnChartArea: false
                    }
                },
                x: {
                    ticks: {
                        color: textColor
                    },
                    grid: {
                        color: gridColor
                    }
                }
            }
        }
    });
}

/**
 * Render 10-day forecast cards
 */
function renderForecast() {
    if (!forecastData.data || forecastData.data.length === 0) {
        document.querySelector('.forecast-container').innerHTML = '';
        return;
    }

    const html = forecastData.data.slice(0, 10).map(day => {
        const date = new Date(day.dt * 1000);
        const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const dayName = `${dayNames[date.getDay()]} ${monthNames[date.getMonth()]} ${date.getDate()}`;

        // Extract weather from hourly data for this day since daily doesn't include it
        const dayStart = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime() / 1000;
        const dayWeather = hourlyData.data?.find(h => Math.floor(h.dt / 86400) === Math.floor(dayStart / 86400))?.weather?.[0];
        const icon = dayWeather ? getWeatherIcon(dayWeather.icon) : 'https://openweathermap.org/img/wn/09d@2x.png';
        const description = dayWeather ? dayWeather.description : 'unknown';

        const high = Math.round(day.temp.max);
        const low = Math.round(day.temp.min);
        const rain = day.rain ? day.rain.toFixed(1) : '0.0';
        const snow = day.snow ? day.snow.toFixed(1) : '0.0';

        let precip = '';
        if (day.rain && parseFloat(rain) > 0) precip += `Rain: ${rain}mm`;
        if (day.snow && parseFloat(snow) > 0) precip += `${precip ? ' ' : ''}Snow: ${snow}mm`;

        return `
            <div class="forecast-card">
                <div class="forecast-day">${dayName}</div>
                <div class="forecast-icon">
                    <img src="${icon}" alt="${description}">
                </div>
                <div class="forecast-temps">
                    <span class="forecast-high">${high}°</span>
                    <span class="forecast-low">${low}°</span>
                </div>
                ${precip ? `<div class="forecast-precip">${precip}</div>` : ''}
            </div>
        `;
    }).join('');

    document.querySelector('.forecast-container').innerHTML = html;
}

/**
 * Render moon phase
 */
function renderMoonPhase() {
    if (!forecastData.data || forecastData.data.length === 0) {
        document.querySelector('.moon-section').innerHTML = '';
        return;
    }

    const dayData = forecastData.data[0];
    const moonPhase = dayData.moon_phase || 0;
    const moonrise = dayData.moonrise && dayData.moonrise > 0 ? new Date(dayData.moonrise * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'N/A';
    const moonset = dayData.moonset && dayData.moonset > 0 ? new Date(dayData.moonset * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'N/A';

    // Get moon phase icon (emoji)
    const moonIcon = getMoonPhaseIcon(moonPhase);

    const html = `
        <div class="moon-card">
            <div class="moon-icon">${moonIcon}</div>
            <div class="moon-label">Phase</div>
            <div class="moon-time">${(moonPhase * 100).toFixed(0)}%</div>
        </div>
        <div class="moon-card">
            <div class="moon-label">Moonrise</div>
            <div class="moon-time">${moonrise}</div>
        </div>
        <div class="moon-card">
            <div class="moon-label">Moonset</div>
            <div class="moon-time">${moonset}</div>
        </div>
    `;

    document.querySelector('.moon-section').innerHTML = html;
}

/**
 * Update background based on weather condition
 */
function updateBackground() {
    const current = currentData.data[0];
    if (!current) return;

    const { weather, sunrise, sunset } = current;
    const weatherCode = weather[0].id;
    const firstDigit = Math.floor(weatherCode / 100);

    let condition = weatherConditionMap[weatherCode] || weatherConditionMap[firstDigit] || 'cloudy';

    // Determine day or night
    const now = new Date();
    const sunriseTime = new Date(sunrise * 1000);
    const sunsetTime = new Date(sunset * 1000);

    const isDay = now > sunriseTime && now < sunsetTime;

    if (condition === 'clear') {
        condition = isDay ? 'clear-day' : 'clear-night';
    } else if (condition === 'cloudy') {
        condition = isDay ? 'cloudy-day' : 'cloudy-night';
    } else if (condition === 'rain') {
        condition = isDay ? 'rain' : 'rain'; // Rain looks same day/night
    }

    document.body.setAttribute('data-condition', condition);
}

/**
 * Setup address search form
 */
function setupSearchForm() {
    const form = document.getElementById('locationForm');
    const input = document.getElementById('locationInput');
    const geoButton = document.getElementById('geoButton');

    if (form) {
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            if (input.value.trim()) {
                searchLocation(input.value.trim());
            }
        });
    }

    if (input) {
        input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                if (input.value.trim()) {
                    searchLocation(input.value.trim());
                }
            }
        });
    }

    if (geoButton) {
        geoButton.addEventListener('click', (e) => {
            e.preventDefault();
            getGeolocation().then(({ lat, lon }) => {
                window.location.href = `?lat=${lat}&lon=${lon}`;
            });
        });
    }
}

/**
 * Search for location by address
 */
async function searchLocation(address) {
    if (!address) return;
    window.location.href = `?loc=${encodeURIComponent(address)}`;
}

/**
 * Helper: Get weather icon URL
 */
function getWeatherIcon(iconCode) {
    return `https://openweathermap.org/img/wn/${iconCode}@2x.png`;
}

/**
 * Helper: Get wind direction label
 */
function getWindDirection(degrees) {
    const directions = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
    const index = Math.round(degrees / 22.5) % 16;
    return directions[index];
}

/**
 * Helper: Get UV index label
 */
function getUVILabel(uvi) {
    if (uvi < 3) return 'Low';
    if (uvi < 6) return 'Moderate';
    if (uvi < 8) return 'High';
    if (uvi < 11) return 'Very High';
    return 'Extreme';
}

/**
 * Helper: Get moon phase icon
 */
function getMoonPhaseIcon(phase) {
    // Simplified moon phases: 0=new, 0.25=first quarter, 0.5=full, 0.75=last quarter
    if (phase < 0.125 || phase >= 0.875) return '🌑'; // New
    if (phase < 0.375) return '🌒'; // Waxing crescent
    if (phase < 0.625) return '🌕'; // Full
    if (phase < 0.875) return '🌘'; // Waning crescent
    return '🌕'; // Default to full
}

/**
 * Helper: Capitalize first letter
 */
function capitalize(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Show error message
 */
function showError(message) {
    const container = document.querySelector('.container');
    container.innerHTML = `<div style="padding: 2rem; text-align: center; color: red;"><h1>Error</h1><p>${message}</p></div>`;
}
