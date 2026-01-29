import React, { useEffect, useRef } from "react";
import { useMap } from "react-leaflet";
import L from "leaflet";
import { getColor } from "./constants";

const WeatherHeatmap = ({ data, param, hour, config }) => {
  const map = useMap();
  const canvasRef = useRef(null);

  // Helper: Convert Hex Color to RGB object for mixing
  const hexToRgb = (hex) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result
      ? {
          r: parseInt(result[1], 16),
          g: parseInt(result[2], 16),
          b: parseInt(result[3], 16),
        }
      : { r: 0, g: 0, b: 0 };
  };

  // Helper: Interpolate between colors
  const interpolateColor = (val, param) => {
    // We use your existing getColor but we need to ensure it returns the
    // smooth gradient color, not just the "step" color.
    // For simplicity in this version, we will sample the exact color
    // from your existing palette logic.
    return hexToRgb(getColor(val, param));
  };

  useEffect(() => {
    if (!data || data.length === 0) return;

    const canvas = L.DomUtil.create("canvas", "leaflet-heatmap-layer");
    canvas.style.position = "absolute";
    canvas.style.pointerEvents = "none"; // Let clicks pass through to map
    canvas.style.zIndex = 500;
    canvas.style.opacity = 0.6; // Global dimming as requested

    // We use a low-res canvas stretched via CSS for performance & smoothing
    const size = 100;
    canvas.width = size;
    canvas.height = size;

    // Add canvas to map overlay pane
    const overlayPane = map.getPanes().overlayPane;
    overlayPane.appendChild(canvas);

    const drawHeatmap = () => {
      if (!map) return;

      // 1. Position Canvas over the map view
      const bounds = map.getBounds();
      const topLeft = map.latLngToLayerPoint(bounds.getNorthWest());
      const sizePx = map.getSize();

      L.DomUtil.setPosition(canvas, topLeft);
      canvas.style.width = `${sizePx.x}px`;
      canvas.style.height = `${sizePx.y}px`;

      const ctx = canvas.getContext("2d");
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const imgData = ctx.createImageData(canvas.width, canvas.height);

      // 2. Prepare Data Points (Pixel Coordinates & Values)
      const points = data.map((pt) => {
        // Project lat/lon to 0-100 canvas space
        const latPct =
          (pt.lat - bounds.getSouth()) /
          (bounds.getNorth() - bounds.getSouth());
        const lonPct =
          (pt.lon - bounds.getWest()) / (bounds.getEast() - bounds.getWest());

        // Flip Lat because canvas Y grows downwards
        const y = (1 - latPct) * canvas.height;
        const x = lonPct * canvas.width;

        let val = pt.hourly[param === "wind" ? "windSpeed" : param][hour];
        if (param === "wind") val = val / 1.609;

        return { x, y, val };
      });

      // 3. IDW Interpolation (The Magic)
      // For every pixel in our 100x100 canvas, calculate weighted average of neighbors
      for (let py = 0; py < canvas.height; py++) {
        for (let px = 0; px < canvas.width; px++) {
          let numerator = 0;
          let denominator = 0;
          let minDist = 9999;
          let closestVal = 0;

          for (let i = 0; i < points.length; i++) {
            const p = points[i];
            // Distance squared (faster)
            const d2 = (px - p.x) ** 2 + (py - p.y) ** 2;

            // Handle exact hit
            if (d2 < 1) {
              numerator = p.val;
              denominator = 1;
              minDist = 0;
              break;
            }

            // Weight = 1 / distance^2
            const weight = 1 / d2;
            numerator += p.val * weight;
            denominator += weight;
          }

          const val = denominator !== 0 ? numerator / denominator : 0;
          const color = interpolateColor(val, param);

          // Draw Pixel
          const index = (py * canvas.width + px) * 4;
          imgData.data[index] = color.r; // R
          imgData.data[index + 1] = color.g; // G
          imgData.data[index + 2] = color.b; // B
          imgData.data[index + 3] = 200; // Alpha (0-255)
        }
      }
      ctx.putImageData(imgData, 0, 0);

      // Apply CSS Blur for extra smoothness (removes pixelation)
      canvas.style.filter = "blur(10px)";
    };

    drawHeatmap();

    // Redraw on zoom/drag
    map.on("moveend", drawHeatmap);
    map.on("zoomend", drawHeatmap);

    return () => {
      map.off("moveend", drawHeatmap);
      map.off("zoomend", drawHeatmap);
      if (overlayPane.contains(canvas)) {
        overlayPane.removeChild(canvas);
      }
    };
  }, [map, data, param, hour]); // Re-run when data changes

  return null;
};

export default WeatherHeatmap;
