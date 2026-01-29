import React, { useEffect, useState } from "react";
import {
  MapContainer,
  TileLayer,
  CircleMarker,
  Popup,
  useMapEvents,
} from "react-leaflet"; // Change Rectangle to Polygon
import Slider from "rc-slider";
import "rc-slider/assets/index.css";
import {
  Thermometer,
  Droplets,
  Wind,
  Cloud,
  RefreshCw,
  MapPin,
  Sun,
  CloudRain,
  CloudSnow,
  Clock,
} from "lucide-react";
import { fetchWeatherData, GRID_CONFIG } from "./weatherService"; // Import GRID_CONFIG
import { CONFIG } from "./constants";
import WeatherHeatmap from "./WeatherHeatmap";
import "./App.css";

// Delhi Boundaries to restrict view
const DELHI_BOUNDS = [
  [28.35, 76.7], // South West
  [28.95, 77.45], // North East
];

function App() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [param, setParam] = useState("aqi");
  const [hour, setHour] = useState(new Date().getHours());

  

  // State for the Selected Location Popup
  const [selectedLoc, setSelectedLoc] = useState(null);

  const currentHour = new Date().getHours();
  const dateStr = new Date().toLocaleDateString("en-US", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });

  const getSliderMarks = () => {
    const marks = {};
    // Always show start
    marks[0] = { style: { color: "#94a3b8" }, label: "12 AM" };

    // Only add marks if they are well behind current time (buffer of 2 hours)
    if (currentHour >= 8)
      marks[6] = { style: { color: "#94a3b8" }, label: "6 AM" };
    if (currentHour >= 14)
      marks[12] = { style: { color: "#94a3b8" }, label: "12 PM" };
    if (currentHour >= 20)
      marks[18] = { style: { color: "#94a3b8" }, label: "6 PM" };

    // Always show 'Now'
    marks[currentHour] = {
      style: {
        color: "#3b82f6",
        fontWeight: "bold",
        transform: "translateX(-50%)", // Center align the "Now" label
      },
      label: "Now",
    };

    return marks;
  };

  const loadData = () => {
    setLoading(true);
    fetchWeatherData().then((res) => {
      setData(res);
      setLoading(false);
    });
  };

  useEffect(() => {
    loadData();
  }, []);

  // Helper to get specific value from data point
  const getVal = (pt, type) => {
    if (!pt?.hourly) return 0;
    const val = pt.hourly[type === "wind" ? "windSpeed" : type][hour];
    return type === "wind" ? (val / 1.609).toFixed(1) : val; // km/h -> mph
  };

  const legendValue = selectedLoc ? getVal(selectedLoc.weather, param) : "---";

  const getTimeString = () => {
    const timeStr = new Date().toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    });
    return `${timeStr}`;
  };

  // Helper to format the coordinate/time string for popup
  const getMetaString = (lat, lon) => {
    const timeStr = new Date().toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    });
    const fullDate = new Date().toLocaleDateString("en-US", {
      month: "2-digit",
      day: "2-digit",
      year: "numeric",
    });
    return `${lat.toFixed(2)}°N, ${lon.toFixed(2)}°E | ${timeStr}`;
  };

  // Helper to pick dynamic weather icon based on data
  const getWeatherIcon = (temp, rain) => {
    if (rain > 0) return <CloudRain size={32} />;
    if (temp < 10) return <CloudSnow size={32} />;
    if (temp > 25) return <Sun size={32} />;
    return <Cloud size={32} />;
  };

  const MapClickHandler = () => {
    useMapEvents({
      click: async (e) => {
        const { lat, lng } = e.latlng;

        // 1. Find Nearest Weather Point (Nearest Neighbor)
        let closestPoint = null;
        let minDistance = Infinity;

        data.forEach((pt) => {
          const dist = Math.sqrt(
            Math.pow(pt.lat - lat, 2) + Math.pow(pt.lon - lng, 2),
          );
          if (dist < minDistance) {
            minDistance = dist;
            closestPoint = pt;
          }
        });

        if (!closestPoint) return;

        // 2. Set temporary state while we fetch the name
        setSelectedLoc({
          lat,
          lon: lng,
          name: "Loading...",
          weather: closestPoint, // Use data from the nearest grid point
        });

        // 3. Reverse Geocode (Fetch Name)
        try {
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=14`,
          );
          const json = await response.json();

          // Try to find the most relevant name (suburb > neighbourhood > city)
          const addr = json.address;
          const locName =
            addr.suburb ||
            addr.neighbourhood ||
            addr.residential ||
            addr.city_district ||
            addr.town ||
            "Delhi Region";

          setSelectedLoc((prev) => ({ ...prev, name: locName }));
        } catch (error) {
          console.error("Geocoding failed", error);
          setSelectedLoc((prev) => ({ ...prev, name: "Unknown Location" }));
        }
      },
    });
    return null;
  };

  return (
    <div className="dashboard">
      {/* 1. HEADER PANEL */}
      <div className="panel header-panel">
        <div className="header-title">
          <div className="icon-box">
            <MapPin size={20} color="#3b82f6" />
          </div>
          <div>
            {/* Renamed to Delhi and added Live Time */}
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '16px' }}>
              <h1>Delhi</h1>
              <span style={{ fontSize: '17px', color: '#3b82f6', fontFamily: 'monospace' }}>
                {getTimeString()}
              </span>
            </div>
            <p>Real-time weather visualization</p>
          </div>
        </div>
        <div className="refresh-btn" onClick={loadData}>
          <RefreshCw size={18} className={loading ? "spin" : ""} />
        </div>
      </div>

      {/* 2. SIDEBAR */}
      <div className="panel sidebar">
        {[
          { id: "temp", icon: Thermometer, label: "Temperature" },
          { id: "humidity", icon: Droplets, label: "Humidity" },
          { id: "wind", icon: Wind, label: "Wind" },
          { id: "aqi", icon: Cloud, label: "Air Quality" },
        ].map((item) => (
          <button
            key={item.id}
            className={`nav-btn ${param === item.id ? "active" : ""}`}
            onClick={() => setParam(item.id)}
          >
            <item.icon size={20} />
            <span>{item.label}</span>
          </button>
        ))}
      </div>

      {/* 3. LEGEND PANEL */}
      <div className="panel legend-panel">
        <div className="legend-header">
          <h3>{CONFIG[param].label}</h3>
          <span className="unit-badge">
            {legendValue} {CONFIG[param].unit}
          </span>
        </div>
        <div
          className="gradient-bar"
          style={{ background: CONFIG[param].gradient }}
        ></div>
        <div
          className={`legend-labels ${param === "aqi" ? "grid-labels" : "flex-labels"}`}
        >
          {param === "aqi"
            ? CONFIG.aqi.labels.map((l, i) => (
                <div key={i} className="label-item">
                  <span
                    className="dot"
                    style={{ background: CONFIG.aqi.colors[i] }}
                  ></span>
                  {l}
                </div>
              ))
            : CONFIG[param].stops.map((s) => <span key={s}>{s}</span>)}
        </div>
      </div>

      {/* 4. BOTTOM PANEL */}
      <div className="panel bottom-panel">
        <div className="time-header">
          <div className="time-title">
            <Clock size={16} className="clock-icon-svg" />
            <span>Timeline</span>
          </div>
          <div className="current-time-display">
            <span className="time-value">{hour}:00</span>
            <span className="period">{hour >= 12 ? "PM" : "AM"}</span>
            <span className="date-sep">|</span>
            <span className="date-sub">{dateStr}</span>
          </div>
        </div>
        <div className="slider-container">
          <Slider
            min={0}
            max={currentHour}
            value={hour}
            onChange={setHour}
            marks={getSliderMarks()} // Using new dynamic marks
            trackStyle={{ backgroundColor: "#3b82f6", height: 4 }}
            handleStyle={{
              borderColor: "#3b82f6",
              backgroundColor: "#1e293b",
              opacity: 1,
              width: 16,
              height: 16,
              marginTop: -6,
              boxShadow: "0 0 0 4px rgba(59, 130, 246, 0.3)",
            }}
            railStyle={{ backgroundColor: "rgba(255,255,255,0.1)", height: 4 }}
            dotStyle={{ display: "none" }} // Hide dots for cleaner look
          />
        </div>
      </div>

      {/* 5. MAP LAYER */}
      <MapContainer
        center={[28.61, 77.23]}
        zoom={10}
        minZoom={10} // Lock Zoom Out
        maxBounds={DELHI_BOUNDS} // Lock Panning
        maxBoundsViscosity={1.0} // Sticky bounds
        zoomControl={false}
        className="map-container"
      >
        <TileLayer url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png" />

        {/* THE SMOOTH HEATMAP VISUALS */}
        {!loading && (
          <WeatherHeatmap
            data={data}
            param={param}
            hour={hour}
            config={GRID_CONFIG}
          />
        )}

        {/* 1. ENABLE CLICKS EVERYWHERE */}
        <MapClickHandler />

        {/* 2. RENDER POPUP IF LOCATION SELECTED */}
        {selectedLoc && (
          <Popup
            position={[selectedLoc.lat, selectedLoc.lon]}
            onClose={() => setSelectedLoc(null)}
            closeButton={true}
            className="custom-popup"
          >
            <div className="popup-card">
              <div className="popup-header">
                {/* DYNAMIC NAME DISPLAYED HERE */}
                <h2>{selectedLoc.name}</h2>
              </div>
              <div className="popup-meta">
                {getMetaString(selectedLoc.lat, selectedLoc.lon)}
              </div>

              <div className="popup-main">
                <div className="weather-icon-large">
                  {getWeatherIcon(getVal(selectedLoc.weather, "temp"), 0)}
                </div>
                <div className="temp-display">
                  <span className="temp-value">
                    {Math.round(getVal(selectedLoc.weather, "temp"))} °C
                  </span>
                  <span className="temp-label">Temperature</span>
                </div>
              </div>

              <div className="popup-grid">
                <div className="grid-item">
                  <span className="grid-label">Humidity</span>
                  <span className="grid-value">
                    {getVal(selectedLoc.weather, "humidity")}%
                  </span>
                </div>
                <div className="grid-item">
                  <span className="grid-label">Wind Speed</span>
                  <span className="grid-value">
                    {getVal(selectedLoc.weather, "wind")} mph
                  </span>
                </div>
                <div className="grid-item">
                  <span className="grid-label">Air Quality</span>
                  <span className="grid-value">
                    {getVal(selectedLoc.weather, "aqi")}
                  </span>
                </div>
                <div className="grid-item">
                  <span className="grid-label">Precipitation</span>
                  <span className="grid-value">0%</span>
                </div>
              </div>
            </div>
          </Popup>
        )}
      </MapContainer>
    </div>
  );
}

export default App;
