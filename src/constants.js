export const CONFIG = {
  temp: {
    label: "Temperature",
    unit: "°C",
    stops: [0, 10, 20, 30, 40, 50],
    colors: ["#3b82f6", "#06b6d4", "#22c55e", "#eab308", "#f97316", "#ef4444"], // Blue -> Red
    gradient:
      "linear-gradient(to right, #3b82f6, #06b6d4, #22c55e, #eab308, #f97316, #ef4444)",
  },
  humidity: {
    label: "Humidity",
    unit: "%",
    stops: [20, 40, 60, 80, 100],
    colors: ["#f59e0b", "#84cc16", "#06b6d4", "#3b82f6", "#1e3a8a"], // Dry -> Wet
    gradient:
      "linear-gradient(to right, #f59e0b, #84cc16, #06b6d4, #3b82f6, #1e3a8a)",
  },
  wind: {
    label: "Wind",
    unit: "mph",
    stops: [0, 5, 10, 20, 30],
    colors: ["#a855f7", "#d946ef", "#f472b6", "#fbbf24", "#fef08a"], // Calm -> Windy
    gradient:
      "linear-gradient(to right, #a855f7, #d946ef, #f472b6, #fbbf24, #fef08a)",
  },
  aqi: {
    label: "Air Quality Index",
    unit: "AQI",
    stops: [0, 50, 100, 150, 200, 300],
    labels: [
      "Good",
      "Moderate",
      "Sensitive",
      "Unhealthy",
      "V. Unhealthy",
      "Hazardous",
    ],
    colors: ["#22c55e", "#eab308", "#f97316", "#ef4444", "#a855f7", "#7f1d1d"],
    gradient:
      "linear-gradient(to right, #22c55e, #eab308, #f97316, #ef4444, #a855f7, #7f1d1d)",
  },
};

export const getColor = (val, param) => {
  const cfg = CONFIG[param];
  const stops = cfg.stops;
  const colors = cfg.colors;

  // Find the interval the value falls into
  for (let i = 0; i < stops.length; i++) {
    if (val <= stops[i]) return colors[i];
  }
  return colors[colors.length - 1];
};
