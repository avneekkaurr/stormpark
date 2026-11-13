import { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, ZoomControl } from "react-leaflet";
import L from "leaflet";
import { ref, onValue, update, serverTimestamp } from "firebase/database";
import { onAuthStateChanged, signInWithPopup, signOut } from "firebase/auth";
import { db, auth, googleProvider } from "./firebase";
import "leaflet/dist/leaflet.css";

// "student parking" -> "Student parking"
function capitalize(text = "") {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function spotsText(open) {
  if (open <= 0) return "Full";
  return `${open} ${open === 1 ? "spot" : "spots"} open`;
}

// the little number bubble on the map
function lotIcon(lot) {
  let cls = "pin-open";
  let text = lot.open;
  if (lot.access === "staff") {
    cls = "pin-staff";
    text = "🔒";
  } else if (lot.open <= 0) {
    cls = "pin-full";
    text = "0";
  }
  return L.divIcon({
    className: "lot-icon",
    html: `<div class="lot-pin ${cls}">${text}</div>`,
    iconSize: [56, 48],
    iconAnchor: [28, 24],
    popupAnchor: [0, -20],
  });
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
  const firstName = user?.displayName?.split(" ")[0];

  return (
    <div className="app" style={{ position: "relative", height: "100vh", width: "100%" }}>
      {/* header */}
      <div className="header">
        <div className="brand">
          <div className="logo">
  <span className="logo-emoji">⛈️</span>
  <span>SP</span>
</div>
          <div>
            <h1>StormPark</h1>
            <p>Live campus parking</p>
          </div>
        </div>

        {user ? (
          <div className="user">
            {parkedLot && <span className="parked-chip">🚗 {parkedLot.name}</span>}
            {user.photoURL && (
              <img className="avatar" src={user.photoURL} alt="" referrerPolicy="no-referrer" />
            )}
            <span className="user-name">Hi, {firstName}!</span>
            <button className="btn btn-soft" onClick={() => signOut(auth)}>
              Sign out
            </button>
          </div>
        ) : (
          <button className="btn btn-primary" onClick={() => signInWithPopup(auth, googleProvider)}>
            Sign in with Google
          </button>
        )}
      </div>

      {/* legend */}
      <div className="legend">
        <div><span className="dot" style={{ background: "#2fbf71" }} />Spots open</div>
        <div><span className="dot" style={{ background: "#e8484f" }} />Full</div>
        <div><span className="dot" style={{ background: "#a0a4ab" }} />Faculty / staff only</div>
      </div>

      <MapContainer
        center={[40.7228, -73.7945]}
        zoom={17}
        zoomControl={false}
        style={{ height: "100%", width: "100%" }}
      >
        <TileLayer
          attribution="&copy; OpenStreetMap contributors"
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <ZoomControl position="bottomright" />

        {lots.map((lot) => (
          <Marker key={lot.id} position={[lot.lat, lot.lng]} icon={lotIcon(lot)}>
            <Popup>
              <div className="popup-title">{lot.name}</div>
              <div className="popup-sub">
                {capitalize(lot.type)} · {capitalize(lot.label)}
              </div>

              {lot.access === "staff" ? (
                <div className="popup-note">Not available for student parking.</div>
              ) : (
                <>
                  <div className={`popup-count ${lot.open > 0 ? "open" : "full"}`}>
                    {spotsText(lot.open)}
                  </div>

                  {!user ? (
                    <div className="popup-note">Sign in to update this lot.</div>
                  ) : !myCheckin ? (
                    <button
                      className="btn btn-primary"
                      onClick={() => park(lot)}
                      disabled={lot.open <= 0}
                    >
                      I parked here
                    </button>
                  ) : myCheckin.lotId === lot.id ? (
                    <button className="btn btn-soft" onClick={() => leave(lot)}>
                      I left
                    </button>
                  ) : (
                    <div className="popup-note">You're parked at {parkedLot?.name}.</div>
                  )}
                </>
              )}
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}