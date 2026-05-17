import { useEffect, useRef } from 'react';
import L from 'leaflet';

export function CrimeMap({ incidents, crimeColors }) {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const layerRef = useRef(null);

  useEffect(() => {
    const map = L.map(mapRef.current).setView([40.4406, -79.9959], 12);

    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(map);

    mapInstanceRef.current = map;
    layerRef.current = L.layerGroup().addTo(map);

    return () => {
      map.remove();
      mapInstanceRef.current = null;
      layerRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!layerRef.current) return;

    layerRef.current.clearLayers();

    for (const incident of incidents) {
      if (incident.lat == null || incident.lng == null) continue;

      const color = crimeColors[incident.crimeType] ?? '#6b7280';

      const marker = L.circleMarker([incident.lat, incident.lng], {
        radius: 6,
        color: '#fff',
        weight: 1.5,
        fillColor: color,
        fillOpacity: 0.85,
      });

      marker.bindPopup(`
        <strong>${incident.crimeType}</strong><br />
        ${incident.type}<br />
        ${incident.neighborhood}<br />
        <em>${incident.date}</em>
      `);

      marker.addTo(layerRef.current);
    }
  }, [incidents, crimeColors]);

  return <div ref={mapRef} style={{ height: '400px', width: '100%', borderRadius: '8px' }} />;
}
