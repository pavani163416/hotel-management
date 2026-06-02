import { useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Hotel } from "@/context/HotelsContext";

const goldIcon = L.divIcon({
  className: "luxe-marker",
  html: `<div style="width:28px;height:28px;border-radius:50% 50% 50% 0;background:hsl(34 22% 57%);transform:rotate(-45deg);border:2px solid #fff;box-shadow:0 4px 10px hsl(60 14% 8% / 0.25);display:flex;align-items:center;justify-content:center;"><div style="width:8px;height:8px;border-radius:50%;background:#fff;transform:rotate(45deg);"></div></div>`,
  iconSize: [28, 28],
  iconAnchor: [14, 28],
  popupAnchor: [0, -28],
});

const FitBounds = ({ hotels }: { hotels: Hotel[] }) => {
  const map = useMap();
  useEffect(() => {
    // Filter out hotels with invalid or default [0, 0] coordinates
    const validHotels = hotels.filter((h) => h.coords && (h.coords[0] !== 0 || h.coords[1] !== 0));
    if (!validHotels.length) return;
    const bounds = L.latLngBounds(validHotels.map((h) => h.coords as [number, number]));
    map.fitBounds(bounds, { padding: [30, 30], maxZoom: 6 });
  }, [hotels, map]);
  return null;
};

interface Props {
  hotels: Hotel[];
  height?: string;
  className?: string;
}

const HotelMap = ({ hotels, height = "100%", className }: Props) => {
  const validHotels = hotels.filter((h) => h.coords && (h.coords[0] !== 0 || h.coords[1] !== 0));

  return (
    <div className={className} style={{ height, width: "100%" }}>
      <MapContainer center={[20, 0]} zoom={2} scrollWheelZoom={false}
        style={{ height: "100%", width: "100%", borderRadius: "0.75rem", background: "hsl(30 12% 96%)" }}>
        <TileLayer 
          attribution='&copy; Google Maps' 
          url="https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}" 
        />
        <FitBounds hotels={hotels} />
        {validHotels.map((h) => (
          <Marker key={h.id} position={h.coords as [number, number]} icon={goldIcon}>
            <Popup>
              <div style={{ minWidth: 180, color: "#1e293b" }}>
                <img src={h.img} alt={h.name} style={{ width: "100%", height: 90, objectFit: "cover", borderRadius: 6, marginBottom: 6 }} />
                <div style={{ fontWeight: 600, color: "#0f172a", fontSize: 13 }}>{h.name}</div>
                <div style={{ color: "#475569", fontSize: 11 }}>{h.location}</div>
                <div style={{ marginTop: 4, fontSize: 12, color: "#0f172a" }}>Rooms: <strong>{h.rooms}</strong></div>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
};

export default HotelMap;
