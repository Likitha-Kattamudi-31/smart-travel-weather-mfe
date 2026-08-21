import './index.css';

import { useEffect, useState } from 'react';
import type {
  DestinationSelectedEventDetail,
  WeatherUpdatedEventDetail,
} from '@smart-travel/shared-types';
import { destination$ } from '@smart-travel/shared-state';

interface GeocodingResponse {
  results?: Array<{
    latitude: number;
    longitude: number;
  }>;
}

interface ForecastResponse {
  current?: {
    temperature_2m: number;
    weather_code: number;
    relative_humidity_2m: number;
    wind_speed_10m: number;
    apparent_temperature: number;
  };
}

interface WeatherResult {
  temperature: number;
  weatherCode: number;
  humidity: number;
  wind: number;
  feelsLike: number;
}

type WeatherStatus = 'idle' | 'loading' | 'success' | 'error';

function describeWeather(code: number) {
  if (code === 0) return 'Clear sky';
  if (code <= 3) return 'Partly cloudy';
  if (code <= 48) return 'Foggy';
  if (code <= 67) return 'Rain showers';
  if (code <= 77) return 'Snow';
  if (code <= 82) return 'Rain showers';
  return 'Thunderstorm';
}

function isGoodForOutdoor(code: number) {
  return code <= 3;
}

function App() {
  const [selectedDestination, setSelectedDestination] =
    useState<DestinationSelectedEventDetail | null>(null);
  const [weather, setWeather] = useState<WeatherResult | null>(null);
  const [weatherStatus, setWeatherStatus] = useState<WeatherStatus>('idle');
  const [weatherError, setWeatherError] = useState<string | null>(null);

  useEffect(() => {
    const subscription = destination$.subscribe((destination) => {
      setSelectedDestination(destination);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!selectedDestination) {
      setWeather(null);
      setWeatherStatus('idle');
      setWeatherError(null);
      return;
    }

    const controller = new AbortController();
    let isActive = true;

    const fetchWeather = async () => {
      setWeather(null);
      setWeatherStatus('loading');
      setWeatherError(null);

      try {
        const geocodingResponse = await fetch(
          `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(
            selectedDestination.name
          )}&count=1&language=en&format=json`,
          { signal: controller.signal }
        );

        if (!geocodingResponse.ok) {
          throw new Error('Unable to find the destination coordinates.');
        }

        const geocodingData =
          (await geocodingResponse.json()) as GeocodingResponse;
        const location = geocodingData.results?.[0];

        if (!location) {
          throw new Error('No coordinates found for this destination.');
        }

        const forecastResponse = await fetch(
          `https://api.open-meteo.com/v1/forecast?latitude=${location.latitude}&longitude=${location.longitude}&current=temperature_2m,weather_code,relative_humidity_2m,wind_speed_10m,apparent_temperature&timezone=auto`,
          { signal: controller.signal }
        );

        if (!forecastResponse.ok) {
          throw new Error('Unable to fetch the weather.');
        }

        const forecastData = (await forecastResponse.json()) as ForecastResponse;

        if (!forecastData.current) {
          throw new Error('Weather data is unavailable.');
        }

        if (isActive) {
          const weatherResult = {
            temperature: forecastData.current.temperature_2m,
            weatherCode: forecastData.current.weather_code,
            humidity: forecastData.current.relative_humidity_2m,
            wind: forecastData.current.wind_speed_10m,
            feelsLike: forecastData.current.apparent_temperature,
          };
          setWeather(weatherResult);
          setWeatherStatus('success');
          window.dispatchEvent(
            new CustomEvent<WeatherUpdatedEventDetail>('weather-updated', {
              detail: {
                temperature: weatherResult.temperature,
                weatherCondition: describeWeather(weatherResult.weatherCode),
                weatherCode: weatherResult.weatherCode,
                isGoodForOutdoor: isGoodForOutdoor(weatherResult.weatherCode),
              },
            })
          );
        }
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') {
          return;
        }

        if (isActive) {
          setWeatherStatus('error');
          setWeatherError(
            error instanceof Error ? error.message : 'Unable to load the weather.'
          );
        }
      }
    };

    void fetchWeather();

    return () => {
      isActive = false;
      controller.abort();
    };
  }, [selectedDestination]);

  return (
    <main className="weather-mfe">
      <div className="weather-mfe__head"><div><p className="weather-mfe__eyebrow">LIVE CONDITIONS</p><h2>Weather overview</h2></div><span className="weather-mfe__source">Open-Meteo</span></div>

        {!selectedDestination && <p>No destination selected yet.</p>}

        {selectedDestination && (
          <>
            <p className="weather-mfe__location">{selectedDestination.name}, {selectedDestination.country}</p>

            {weatherStatus === 'loading' && <p>Loading weather...</p>}

            {weatherStatus === 'error' && <p className="weather-mfe__error">{weatherError}</p>}

            {weatherStatus === 'success' && weather && (
              <div className="weather-mfe__data"><strong>{Math.round(weather.temperature)}&deg;C</strong><span>{describeWeather(weather.weatherCode)}</span><div className="weather-mfe__stats"><div><small>Humidity</small><b>{weather.humidity}%</b></div><div><small>Wind</small><b>{Math.round(weather.wind)} km/h</b></div><div><small>Feels like</small><b>{Math.round(weather.feelsLike)}&deg;C</b></div></div></div>
            )}
          </>
        )}
    </main>
  );
}

export default App;
