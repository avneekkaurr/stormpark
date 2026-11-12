import { useEffect, useState } from "react";
import { MapContainer, TileLayer, CircleMarker, Popup } from "react-leaflet";
import { ref, onValue } from "firebase/database";
import { db } from "./firebase";
import "leaflet/dist/leaflet.css";

function markerColor(lot) {
  if (lot.access === "staff") return "gray";
  return lot.open > 0 ? "green" : "red";
}

export default function App() {
  const [lots, setLots] = useState([]);

  // listen to /lots in firebase — runs again every time the data changes
  useEffect(() => {
    const unsubscribe = onValue(ref(db, "lots"), (snapshot) => {
      const data = snapshot.val() || {};
      setLots(Object.entries(data).map(([id, lot]) => ({ id, ...lot })));
    });
    return unsubscribe;
  }, []);

  return (
    <div style={{ height: "100vh", width: "100%" }}>
      <MapContainer
        center={[40.7228, -73.7945]}
        zoom={17}
        style={{ height: "100%", width: "100%" }}
      >
        <TileLayer
          attribution="&copy; OpenStreetMap contributors"
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {lots.map((lot) => (
          <CircleMarker
            key={lot.id}
            center={[lot.lat, lot.lng]}
            radius={14}
            pathOptions={{ color: markerColor(lot) }}
          >
            <Popup>
              <b>{lot.name}</b> ({lot.type})
              <br />
              {lot.label}
              <br />
              {lot.open > 0 ? `${lot.open} spots open` : "full"}
            </Popup>
          </CircleMarker>
        ))}
      </MapContainer>
    </div>
  );
}