import { useEffect, useState } from "react";
import { MapContainer, TileLayer, CircleMarker, Popup } from "react-leaflet";
import { ref, onValue, runTransaction } from "firebase/database";
import { onAuthStateChanged, signInWithPopup, signOut } from "firebase/auth";
import { db, auth, googleProvider } from "./firebase";
import "leaflet/dist/leaflet.css";

function markerColor(lot) {
  if (lot.access === "staff") return "gray";
  return lot.open > 0 ? "green" : "red";
}

// "i parked" = -1 open spot, "i left" = +1 open spot
function changeCount(lotId, delta) {
  runTransaction(ref(db, `lots/${lotId}/open`), (current) => {
    const next = (current ?? 0) + delta;
    return next < 0 ? undefined : next; // undefined = cancel
  }).catch((err) => console.error("update blocked:", err.message));
}

export default function App() {
  const [lots, setLots] = useState([]);
  const [user, setUser] = useState(null);

  // live lot data
  useEffect(() => {
    return onValue(ref(db, "lots"), (snapshot) => {
      const data = snapshot.val() || {};
      setLots(Object.entries(data).map(([id, lot]) => ({ id, ...lot })));
    });
  }, []);

  // who's signed in
  useEffect(() => onAuthStateChanged(auth, setUser), []);

  return (
    <div style={{ position: "relative", height: "100vh", width: "100%" }}>
      <div
        style={{
          position: "absolute", top: 10, right: 10, zIndex: 1000,
          background: "white", color: "black", padding: "8px 12px",
          borderRadius: 8, boxShadow: "0 1px 4px rgba(0,0,0,0.3)",
        }}
      >
        {user ? (
          <>
            {user.displayName}{" "}
            <button onClick={() => signOut(auth)}>sign out</button>
          </>
        ) : (
          <button onClick={() => signInWithPopup(auth, googleProvider)}>
            sign in with google
          </button>
        )}
      </div>

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
              {lot.access === "student" && (
                <div style={{ marginTop: 8 }}>
                  {user ? (
                    <>
                      <button onClick={() => changeCount(lot.id, -1)} disabled={lot.open <= 0}>
                        i parked
                      </button>{" "}
                      <button onClick={() => changeCount(lot.id, 1)}>i left</button>
                    </>
                  ) : (
                    <i>sign in to update</i>
                  )}
                </div>
              )}
            </Popup>
          </CircleMarker>
        ))}
      </MapContainer>
    </div>
  );
}