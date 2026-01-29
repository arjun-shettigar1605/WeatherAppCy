import axios from "axios";

// Delhi Grid Configuration (5x5 grid)
export const GRID_CONFIG = {
  latStart: 28.4,
  latEnd: 28.9,
  lonStart: 76.8,
  lonEnd: 77.35,
  steps: 5,
};

export const fetchWeatherData = async () => {
  const { latStart, latEnd, lonStart, lonEnd, steps } = GRID_CONFIG;
  const lats = [];
  const lons = [];

  // precise math for step sizes
  const latStep = (latEnd - latStart) / steps;
  const lonStep = (lonEnd - lonStart) / steps;

  // Generate grid coordinates
  for (let i = 0; i < steps; i++) {
    for (let j = 0; j < steps; j++) {
      lats.push((latStart + i * latStep).toFixed(4));
      lons.push((lonStart + j * lonStep).toFixed(4));
    }
  }

  const latStr = lats.join(",");
  const lonStr = lons.join(",");

  const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${latStr}&longitude=${lonStr}&hourly=temperature_2m,relative_humidity_2m,wind_speed_10m,wind_direction_10m&timezone=Asia%2FKolkata&forecast_days=1`;
  const airUrl = `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${latStr}&longitude=${lonStr}&hourly=pm2_5,us_aqi&timezone=Asia%2FKolkata&forecast_days=1`;

  try {
    const [weatherRes, airRes] = await Promise.all([
      axios.get(weatherUrl),
      axios.get(airUrl),
    ]);

    return weatherRes.data.map((point, index) => ({
      lat: parseFloat(lats[index]), // Ensure these are numbers for math later
      lon: parseFloat(lons[index]),
      hourly: {
        time: point.hourly.time,
        temp: point.hourly.temperature_2m,
        humidity: point.hourly.relative_humidity_2m,
        windSpeed: point.hourly.wind_speed_10m,
        aqi: airRes.data[index].hourly.us_aqi,
      },
    }));
  } catch (error) {
    console.error("API Error:", error);
    return [];
  }
};
