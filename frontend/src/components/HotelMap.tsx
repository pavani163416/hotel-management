import { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Hotel } from "@/data/hotels";
import { useCurrency } from "@/context/CurrencyContext";

const goldIcon = L.divIcon({
  className: "luxe-marker",
  html: `<div style="width:28px;height:28px;border-radius:50% 50% 50% 0;background:hsl(34 22% 57%);transform:rotate(-45deg);border:2px solid #fff;box-shadow:0 4px 10px hsl(60 14% 8% / 0.25);display:flex;align-items:center;justify-content:center;"><div style="width:8px;height:8px;border-radius:50%;background:#fff;transform:rotate(45deg);"></div></div>`,
  iconSize: [28, 28],
  iconAnchor: [14, 28],
  popupAnchor: [0, -28],
});

/** A hotel has valid map coords only if both lat and lon are non-zero numbers */
const hasValidCoords = (h: Hotel): boolean => {
  const [lat, lon] = h.coords ?? [0, 0];
  return (
    typeof lat === "number" && !isNaN(lat) && lat !== 0 &&
    typeof lon === "number" && !isNaN(lon) && lon !== 0
  );
};

const FitBounds = ({ hotels }: { hotels: Hotel[] }) => {
  const map = useMap();
  useEffect(() => {
    if (!map) return;
    const valid = hotels.filter(hasValidCoords);
    if (!valid.length) return;
    
    // Delay to ensure map is fully rendered
    const timeoutId = setTimeout(() => {
      try {
        if (valid.length === 1) {
          map.setView(valid[0].coords, 12);
        } else {
          const bounds = L.latLngBounds(valid.map((h) => h.coords));
          map.fitBounds(bounds, { padding: [40, 40], maxZoom: 10 });
        }
      } catch (e) {
        console.error("Error fitting bounds:", e);
      }
    }, 100);
    
    return () => clearTimeout(timeoutId);
  }, [hotels, map]);
  return null;
};

interface Props {
  hotels: Hotel[];
  height?: string;
  onHotelClick?: (id: string) => void;
  className?: string;
}

const HotelMap = ({ hotels, height = "100%", onHotelClick, className }: Props) => {
  const { format } = useCurrency();
  const [tileUrl, setTileUrl] = useState("https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}");
  const [attribution, setAttribution] = useState("&copy; Google Maps");

  // Only render markers for hotels with valid coordinates
  const mappableHotels = hotels.filter(hasValidCoords);

  if (mappableHotels.length === 0) {
    return (
      <div className={className} style={{ height, width: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "hsl(30 12% 96%)", borderRadius: "0.75rem" }}>
        <div style={{ textAlign: "center", color: "hsl(25 15% 38%)", padding: "1rem" }}>
          <div style={{ fontSize: 28, marginBottom: 8 }}>📍</div>
          <p style={{ fontSize: 13, fontWeight: 600 }}>No location data</p>
          <p style={{ fontSize: 11, marginTop: 4 }}>Add coordinates in admin to show hotels on map</p>
        </div>
      </div>
    );
  }

  // Create a stable key based on the hotels to ensure proper re-rendering
  const mapKey = mappableHotels.map(h => h.id).join("-");

  return (
    <div className={className} style={{ height, width: "100%" }}>
      <MapContainer
        key={`map-container-${mapKey}`}
        center={mappableHotels[0].coords}
        zoom={4}
        scrollWheelZoom={false}
        style={{ height: "100%", width: "100%", borderRadius: "0.75rem", background: "hsl(30 12% 96%)" }}
      >
        <TileLayer
          attribution={attribution}
          url={tileUrl}
          eventHandlers={{
            tileerror: () => {
              setTileUrl("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png");
              setAttribution('&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors');
            },
          }}
        />
        <FitBounds hotels={mappableHotels} />
        {mappableHotels.map((h) => (
          <Marker key={h.id} position={h.coords} icon={goldIcon}>
            <Popup>
              <div style={{ minWidth: 180 }}>
                <img
                  src={h.image}
                  alt={h.name}
                  style={{ width: "100%", height: 90, objectFit: "cover", borderRadius: 6, marginBottom: 6 }}
                />
                <div style={{ fontWeight: 600, color: "hsl(60 14% 8%)", fontSize: 13 }}>{h.name}</div>
                <div style={{ color: "hsl(25 15% 38%)", fontSize: 11 }}>{h.location}</div>
                <div style={{ marginTop: 4, fontSize: 12, color: "hsl(60 14% 8%)" }}>
                  ⭐ {h.rating ?? "–"} · <strong>{format(h.pricePerNight)}</strong>/night
                </div>
                {onHotelClick && (
                  <button
                    onClick={() => onHotelClick(h.id)}
                    style={{
                      marginTop: 6, width: "100%", padding: "6px 10px",
                      borderRadius: 6, background: "hsl(37 26% 84%)",
                      color: "hsl(213 14% 31%)", border: "none",
                      fontSize: 12, fontWeight: 600, cursor: "pointer",
                    }}
                  >
                    View Details
                  </button>
                )}
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
};

export default HotelMap;
