import { useEffect, useState } from "react";
import { MapContainer, TileLayer, CircleMarker, Popup } from "react-leaflet";
import { ref, onValue, update, serverTimestamp } from "firebase/database";
import { onAuthStateChanged, signInWithPopup, signOut } from "firebase/auth";
import { db, auth, googleProvider } from "./firebase";
import "leaflet/dist/leaflet.css";

function markerColor(lot) {
  if (lot.access === "staff") return "gray";
  return lot.open > 0 ? "green" : "red";
}

// "student parking" -> "Student parking"
function capitalize(text = "") {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function spotsText(open) {
  if (open <= 0) return "Full";
  return `${open} ${open === 1 ? "spot" : "spots"} open`;
}

export default function App() {
  const [lots, setLots] = useState([]);
  const [user, setUser] = useState(null);
  const [myCheckin, setMyCheckin] = useState(null);

  // live lot data
  useEffect(() => {
    return onValue(ref(db, "lots"), (snapshot) => {
      const data = snapshot.val() || {};
      setLots(Object.entries(data).map(([id, lot]) => ({ id, ...lot })));
    });
  }, []);

  // who's signed in
  useEffect(() => onAuthStateChanged(auth, setUser), []);

  // where am i parked?
  useEffect(() => {
    if (!user) {
      setMyCheckin(null);
      return;
    }
    return onValue(ref(db, `checkins/${user.uid}`), (snap) => setMyCheckin(snap.val()));
  }, [user]);

  // both changes happen together, or neither does
  function park(lot) {
    update(ref(db), {
      [`lots/${lot.id}/open`]: lot.open - 1,
      [`checkins/${user.uid}`]: { lotId: lot.id, time: serverTimestamp() },
    }).catch((err) => alert("Couldn't check in: " + err.message));
  }

  function leave(lot) {
    update(ref(db), {
      [`lots/${lot.id}/open`]: lot.open + 1,
      [`checkins/${user.uid}`]: null,
    }).catch((err) => alert("Couldn't check out: " + err.message));
  }

  const parkedLot = myCheckin && lots.find((l) => l.id === myCheckin.lotId);

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
            {user.displayName}
            {parkedLot && <> · Parked at <b>{parkedLot.name}</b></>}{" "}
            <button onClick={() => signOut(auth)}>Sign out</button>
          </>
        ) : (
          <button onClick={() => signInWithPopup(auth, googleProvider)}>
            Sign in with Google
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
              <b>{lot.name}</b> ({capitalize(lot.type)})
              <br />
              {capitalize(lot.label)}
              <br />
              {spotsText(lot.open)}
              {lot.access === "student" && (
                <div style={{ marginTop: 8 }}>
                  {!user ? (
                    <i>Sign in to update.</i>
                  ) : !myCheckin ? (
                    <button onClick={() => park(lot)} disabled={lot.open <= 0}>
                      I parked here
                    </button>
                  ) : myCheckin.lotId === lot.id ? (
                    <button onClick={() => leave(lot)}>I left</button>
                  ) : (
                    <i>You're parked at {parkedLot?.name}.</i>
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