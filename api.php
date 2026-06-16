<?php
/**
 * Weather API Proxy
 *
 * Accepts a GET 'action' parameter and proxies requests to external APIs.
 * Returns JSON. All API keys are kept server-side (config.php).
 */

header('Content-Type: application/json');
require_once 'config.php';

$action = $_GET['action'] ?? '';

try {
    switch ($action) {
        case 'weather':
            echo json_encode(getWeather());
            break;

        case 'forecast':
            echo json_encode(getForecast());
            break;

        case 'hourly':
            echo json_encode(getHourly());
            break;

        case 'alerts':
            echo json_encode(getAlerts());
            break;

        case 'aqi':
            echo json_encode(getAQI());
            break;

        case 'geocode':
            echo json_encode(geocode());
            break;

        default:
            http_response_code(400);
            echo json_encode(['error' => 'Invalid action']);
            break;
    }
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => $e->getMessage()]);
}

/**
 * Current weather from OWM 4.0
 */
function getWeather() {
    $lat = floatval($_GET['lat'] ?? 0);
    $lon = floatval($_GET['lon'] ?? 0);

    if ($lat == 0 && $lon == 0) {
        throw new Exception('lat and lon parameters required');
    }

    $url = sprintf(
        'https://api.openweathermap.org/data/4.0/onecall/current?lat=%f&lon=%f&appid=%s&units=metric',
        $lat,
        $lon,
        OPENWEATHERMAP_KEY
    );

    $response = fetchJson($url);
    return $response;
}

/**
 * 10-day daily forecast from OWM 4.0
 */
function getForecast() {
    $lat = floatval($_GET['lat'] ?? 0);
    $lon = floatval($_GET['lon'] ?? 0);

    if ($lat == 0 && $lon == 0) {
        throw new Exception('lat and lon parameters required');
    }

    $url = sprintf(
        'https://api.openweathermap.org/data/4.0/onecall/timeline/1day?lat=%f&lon=%f&appid=%s&units=metric&cnt=10',
        $lat,
        $lon,
        OPENWEATHERMAP_KEY
    );

    $response = fetchJson($url);

    // Extract alert IDs from the response for later fetching
    if (isset($response['data']) && is_array($response['data'])) {
        $allAlertIds = [];
        foreach ($response['data'] as $day) {
            if (isset($day['alerts']) && is_array($day['alerts'])) {
                foreach ($day['alerts'] as $alert) {
                    if (isset($alert['alert_id'])) {
                        $allAlertIds[] = $alert['alert_id'];
                    }
                }
            }
        }
        $response['_alert_ids'] = array_unique($allAlertIds);
    }

    return $response;
}

/**
 * 15-minute resolution for next 12 hours from OWM 4.0
 */
function getHourly() {
    $lat = floatval($_GET['lat'] ?? 0);
    $lon = floatval($_GET['lon'] ?? 0);

    if ($lat == 0 && $lon == 0) {
        throw new Exception('lat and lon parameters required');
    }

    $url = sprintf(
        'https://api.openweathermap.org/data/4.0/onecall/timeline/15min?lat=%f&lon=%f&appid=%s&units=metric&cnt=50',
        $lat,
        $lon,
        OPENWEATHERMAP_KEY
    );

    $response = fetchJson($url);
    return $response;
}

/**
 * Active weather alerts
 * Fetches alert IDs from forecast, then gets full details for each
 */
function getAlerts() {
    $lat = floatval($_GET['lat'] ?? 0);
    $lon = floatval($_GET['lon'] ?? 0);

    if ($lat == 0 && $lon == 0) {
        throw new Exception('lat and lon parameters required');
    }

    // Get alert IDs from the forecast endpoint
    $url = sprintf(
        'https://api.openweathermap.org/data/4.0/onecall/timeline/1day?lat=%f&lon=%f&appid=%s&units=metric&cnt=1',
        $lat,
        $lon,
        OPENWEATHERMAP_KEY
    );

    $response = fetchJson($url);
    $alerts = [];

    // Collect all unique alert IDs
    $alertIds = [];
    if (isset($response['data']) && is_array($response['data'])) {
        foreach ($response['data'] as $day) {
            if (isset($day['alerts']) && is_array($day['alerts'])) {
                foreach ($day['alerts'] as $alert) {
                    if (isset($alert['alert_id']) && !in_array($alert['alert_id'], $alertIds)) {
                        $alertIds[] = $alert['alert_id'];
                    }
                }
            }
        }
    }

    // Fetch full details for each alert
    foreach ($alertIds as $alertId) {
        $alertUrl = sprintf(
            'https://api.openweathermap.org/data/4.0/onecall/alert/%s?appid=%s',
            urlencode($alertId),
            OPENWEATHERMAP_KEY
        );

        try {
            $alertDetail = fetchJson($alertUrl);
            if (isset($alertDetail['data'])) {
                $alerts[] = $alertDetail['data'];
            }
        } catch (Exception $e) {
            // Skip alerts that fail to fetch
            continue;
        }
    }

    return ['data' => $alerts];
}

/**
 * Air Quality Index from OWM 2.5 Air Pollution API
 */
function getAQI() {
    $lat = floatval($_GET['lat'] ?? 0);
    $lon = floatval($_GET['lon'] ?? 0);

    if ($lat == 0 && $lon == 0) {
        throw new Exception('lat and lon parameters required');
    }

    $url = sprintf(
        'https://api.openweathermap.org/data/2.5/air_pollution?lat=%f&lon=%f&appid=%s',
        $lat,
        $lon,
        OPENWEATHERMAP_KEY
    );

    $response = fetchJson($url);
    return $response;
}

/**
 * Geocode address to lat/lon via MapQuest
 */
function geocode() {
    $location = $_GET['q'] ?? '';

    if (empty($location)) {
        throw new Exception('q parameter (location) required');
    }

    $url = sprintf(
        'https://open.mapquestapi.com/geocoding/v1/address?key=%s&location=%s&maxResults=1',
        MAPQUEST_KEY,
        urlencode($location)
    );

    $response = fetchJson($url);

    // Check if geocoding was successful
    if (!isset($response['info']) || $response['info']['statuscode'] != 0) {
        throw new Exception('Location not found');
    }

    // Extract lat/lon from first result
    if (!isset($response['results'][0]['locations'][0])) {
        throw new Exception('No results found');
    }

    $location = $response['results'][0]['locations'][0];
    return [
        'lat' => $location['latLng']['lat'],
        'lon' => $location['latLng']['lng'],
        'display_name' => $location['adminArea1'] . ', ' . $location['adminArea1'] . ($location['postalCode'] ? ' ' . $location['postalCode'] : '')
    ];
}

/**
 * Helper: Fetch and decode JSON from a URL
 */
function fetchJson($url) {
    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, $url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_TIMEOUT, 10);
    curl_setopt($ch, CURLOPT_USERAGENT, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, true);

    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $error = curl_error($ch);
    curl_close($ch);

    if ($error) {
        throw new Exception('Network error: ' . $error);
    }

    if ($httpCode !== 200) {
        throw new Exception('API error: HTTP ' . $httpCode);
    }

    $decoded = json_decode($response, true);
    if (json_last_error() !== JSON_ERROR_NONE) {
        throw new Exception('Invalid JSON response: ' . json_last_error_msg());
    }

    return $decoded;
}
