import { useEffect, useState, useRef } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Hotel } from "@/data/hotels";
import { useCurrency } from "@/context/CurrencyContext";

// Fix default Leaflet icon paths (broken by bundlers)
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

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
  const prevHotelsRef = useRef<string>("");

  useEffect(() => {
    // Guard: only run if map is ready and hotels actually changed
    if (!map) return;

    const hotelsKey = hotels.map(h => h.id).join(",");
    if (hotelsKey === prevHotelsRef.current) return;
    prevHotelsRef.current = hotelsKey;

    const valid = hotels.filter(hasValidCoords);
    if (!valid.length) return;

    // Delay to allow the DOM to fully layout the map container before calculating bounds
    const timer = setTimeout(() => {
      try {
        map.invalidateSize();
        if (valid.length === 1) {
          map.setView(valid[0].coords, 12);
        } else {
          const bounds = L.latLngBounds(valid.map((h) => h.coords));
          map.fitBounds(bounds, { padding: [40, 40], maxZoom: 10 });
        }
      } catch (e) {
        console.warn("HotelMap FitBounds error:", e);
      }
    }, 250);

    return () => clearTimeout(timer);
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
  // Track if map has been initialized to prevent duplicate initialization
  const mapInitializedRef = useRef(false);

  // Only render markers for hotels with valid coordinates
  const mappableHotels = hotels.filter(hasValidCoords);

  if (mappableHotels.length === 0) {
    return (
      <div className={className} style={{ height, width: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "hsl(30 12% 96%)" }}>
        <div style={{ textAlign: "center", color: "hsl(25 15% 38%)", padding: "1rem" }}>
          <div style={{ fontSize: 28, marginBottom: 8 }}>📍</div>
          <p style={{ fontSize: 13, fontWeight: 600 }}>No location data</p>
          <p style={{ fontSize: 11, marginTop: 4 }}>Add coordinates in admin to show hotels on map</p>
        </div>
      </div>
    );
  }

  return (
    <div className={className} style={{ height, width: "100%" }}>
      {/*
        CRITICAL: Do NOT use a dynamic key on MapContainer.
        A key change destroys + remounts the map, which causes the
        '_leaflet_pos' crash when Leaflet tries to access the old
        DOM node during the unmount/remount cycle.
        Instead, FitBounds handles view updates reactively.
      */}
      <MapContainer
        center={mappableHotels[0].coords}
        zoom={4}
        scrollWheelZoom={false}
        style={{ height: "100%", width: "100%", background: "hsl(30 12% 96%)" }}
        whenReady={() => { mapInitializedRef.current = true; }}
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
