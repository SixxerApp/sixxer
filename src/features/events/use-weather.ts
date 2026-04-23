// Open-Meteo powered weather hook. Completely free tier, no API key, generous
// rate limits. Two-step flow:
//   1. Geocode the free-text location → { lat, lon } via geocoding-api.open-meteo.com
//   2. Fetch the daily forecast for the event date via api.open-meteo.com
//
// Results are cached in localStorage so repeated visits to the same event don't
// re-hit the network, and geocodes are cached across events that share a
// location string. Everything is best-effort: if anything fails (no location,
// out of forecast window, network error) we simply return null and the UI hides
// the weather row. We never surface an error to the user — weather is sugar.
//
// Forecast window: Open-Meteo gives up to 16 days ahead and 3 months back.
// We only query when the event is within 14 days (future) for signal quality.

import * as React from "react";

export interface WeatherForecast {
  date: string; // ISO yyyy-mm-dd
  tempMinC: number;
  tempMaxC: number;
  precipChance: number; // 0-100
  weatherCode: number; // WMO weather code
  icon: string; // single emoji or short label
}

interface GeocodeEntry {
  lat: number;
  lon: number;
  cachedAt: number;
}

const GEO_CACHE_KEY = "sixxer.weather.geo.v1";
const FORECAST_CACHE_KEY = "sixxer.weather.forecast.v1";
const CACHE_TTL_MS = 6 * 60 * 60_000; // 6h — forecasts move, geocodes don't, but keep uniform
const MAX_DAYS_AHEAD = 14;

export function useWeather(
  location: string | null | undefined,
  startsAt: string | null | undefined,
) {
  const [forecast, setForecast] = React.useState<WeatherForecast | null>(null);

  React.useEffect(() => {
    if (!location || !startsAt) {
      setForecast(null);
      return;
    }
    const eventDate = new Date(startsAt);
    if (Number.isNaN(eventDate.getTime())) {
      setForecast(null);
      return;
    }
    const now = new Date();
    const daysAhead = Math.floor((eventDate.getTime() - now.getTime()) / 86_400_000);
    if (daysAhead < -1 || daysAhead > MAX_DAYS_AHEAD) {
      setForecast(null);
      return;
    }

    let cancelled = false;
    void (async () => {
      try {
        const geo = await geocode(location);
        if (!geo || cancelled) return;

        const dateKey = eventDate.toISOString().slice(0, 10);
        const cacheKey = `${geo.lat.toFixed(3)},${geo.lon.toFixed(3)}|${dateKey}`;
        const cached = readForecastCache(cacheKey);
        if (cached) {
          if (!cancelled) setForecast(cached);
          return;
        }

        const url =
          `https://api.open-meteo.com/v1/forecast` +
          `?latitude=${geo.lat}&longitude=${geo.lon}` +
          `&daily=temperature_2m_min,temperature_2m_max,precipitation_probability_max,weathercode` +
          `&start_date=${dateKey}&end_date=${dateKey}` +
          `&timezone=auto`;
        const response = await fetch(url);
        if (!response.ok) return;
        const data = (await response.json()) as {
          daily?: {
            time: string[];
            temperature_2m_min: number[];
            temperature_2m_max: number[];
            precipitation_probability_max: number[];
            weathercode: number[];
          };
        };
        const daily = data.daily;
        if (!daily || !daily.time?.length) return;

        const result: WeatherForecast = {
          date: daily.time[0],
          tempMinC: daily.temperature_2m_min[0],
          tempMaxC: daily.temperature_2m_max[0],
          precipChance: daily.precipitation_probability_max[0] ?? 0,
          weatherCode: daily.weathercode[0] ?? 0,
          icon: iconForCode(daily.weathercode[0] ?? 0),
        };
        writeForecastCache(cacheKey, result);
        if (!cancelled) setForecast(result);
      } catch {
        // Swallow — weather is a nice-to-have.
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [location, startsAt]);

  return forecast;
}

async function geocode(location: string): Promise<{ lat: number; lon: number } | null> {
  const key = location.trim().toLowerCase();
  if (!key) return null;
  const cache = readGeoCache();
  const hit = cache[key];
  if (hit && Date.now() - hit.cachedAt < 30 * 24 * 60 * 60_000) {
    return { lat: hit.lat, lon: hit.lon };
  }
  try {
    const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(location)}&count=1&format=json`;
    const response = await fetch(url);
    if (!response.ok) return null;
    const data = (await response.json()) as {
      results?: Array<{ latitude: number; longitude: number }>;
    };
    const first = data.results?.[0];
    if (!first) return null;
    const entry: GeocodeEntry = {
      lat: first.latitude,
      lon: first.longitude,
      cachedAt: Date.now(),
    };
    cache[key] = entry;
    writeGeoCache(cache);
    return { lat: entry.lat, lon: entry.lon };
  } catch {
    return null;
  }
}

function readGeoCache(): Record<string, GeocodeEntry> {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(GEO_CACHE_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as Record<string, GeocodeEntry>;
  } catch {
    return {};
  }
}

function writeGeoCache(cache: Record<string, GeocodeEntry>): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(GEO_CACHE_KEY, JSON.stringify(cache));
  } catch {
    // Storage may be full or blocked — non-fatal.
  }
}

function readForecastCache(key: string): WeatherForecast | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(FORECAST_CACHE_KEY);
    if (!raw) return null;
    const all = JSON.parse(raw) as Record<string, { value: WeatherForecast; cachedAt: number }>;
    const hit = all[key];
    if (!hit) return null;
    if (Date.now() - hit.cachedAt > CACHE_TTL_MS) return null;
    return hit.value;
  } catch {
    return null;
  }
}

function writeForecastCache(key: string, value: WeatherForecast): void {
  if (typeof window === "undefined") return;
  try {
    const raw = window.localStorage.getItem(FORECAST_CACHE_KEY);
    const all = raw
      ? (JSON.parse(raw) as Record<string, { value: WeatherForecast; cachedAt: number }>)
      : {};
    all[key] = { value, cachedAt: Date.now() };
    window.localStorage.setItem(FORECAST_CACHE_KEY, JSON.stringify(all));
  } catch {
    // Non-fatal.
  }
}

// WMO weather interpretation codes → single-glyph display. Deliberately coarse
// — "clouds vs rain vs thunder" is the question every player actually asks.
function iconForCode(code: number): string {
  if (code === 0) return "☀️";
  if (code === 1 || code === 2) return "🌤";
  if (code === 3) return "☁️";
  if (code === 45 || code === 48) return "🌫";
  if (code >= 51 && code <= 57) return "🌦";
  if (code >= 61 && code <= 67) return "🌧";
  if (code >= 71 && code <= 77) return "🌨";
  if (code >= 80 && code <= 82) return "🌧";
  if (code >= 85 && code <= 86) return "🌨";
  if (code >= 95) return "⛈";
  return "🌤";
}
