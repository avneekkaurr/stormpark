import { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, ZoomControl } from "react-leaflet";
import L from "leaflet";
import { ref, onValue, update, serverTimestamp } from "firebase/database";
import {
  onAuthStateChanged,
  signInWithPopup,
  signOut,
  deleteUser,
  reauthenticateWithPopup,
} from "firebase/auth";
import { db, auth, googleProvider } from "./firebase";
import "leaflet/dist/leaflet.css";

// "student parking" -> "Student parking"
function capitalize(text = "") {
  return text.charAt(0).toUpperCase() + text.slice(1);
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
  const [showConsent, setShowConsent] = useState(false);

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

  const parkedLot = myCheckin && lots.find((l) => l.id === myCheckin.lotId);
  const firstName = user?.displayName?.split(" ")[0];

  // both changes happen together, or neither does
  function park(lot) {
    update(ref(db), {
      [`lots/${lot.id}/open`]: lot.open - 1,
      [`checkins/${user.uid}`]: { lotId: lot.id, time: serverTimestamp() },
    }).catch((err) => alert("Couldn't check in: " + err.message));
  }

  function checkOut(lot) {
    return update(ref(db), {
      [`lots/${lot.id}/open`]: lot.open + 1,
      [`checkins/${user.uid}`]: null,
    });
  }

  function leave(lot) {
    checkOut(lot).catch((err) => alert("Couldn't check out: " + err.message));
  }

  // user agreed on the consent popup
  async function continueWithGoogle() {
    setShowConsent(false);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err) {
      if (err.code !== "auth/popup-closed-by-user") {
        alert("Couldn't sign in: " + err.message);
      }
    }
  }

  // checks the user out, then deletes their account
  async function deleteMyData() {
    const ok = window.confirm(
      "Delete your StormPark data? This checks you out of any lot and permanently deletes your account."
    );
    if (!ok) return;

    try {
      if (parkedLot) await checkOut(parkedLot);
      await deleteUser(auth.currentUser);
      alert("Your StormPark data has been deleted.");
    } catch (err) {
      // google requires a fresh sign-in before deleting an account
      if (err.code === "auth/requires-recent-login") {
        try {
          await reauthenticateWithPopup(auth.currentUser, googleProvider);
          await deleteUser(auth.currentUser);
          alert("Your StormPark data has been deleted.");
        } catch (err2) {
          alert("Couldn't delete your data: " + err2.message);
        }
      } else {
        alert("Couldn't delete your data: " + err.message);
      }
    }
  }

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
          <button className="btn btn-primary" onClick={() => setShowConsent(true)}>
            Sign in with Google
          </button>
        )}
      </div>

      {/* legend + privacy links */}
      <div className="legend">
        <div><span className="dot" style={{ background: "#2fbf71" }} />Spots open</div>
        <div><span className="dot" style={{ background: "#e8484f" }} />Full</div>
        <div><span className="dot" style={{ background: "#a0a4ab" }} />Faculty / staff only</div>
        <div className="legend-links">
          <a className="text-btn" href="/privacy.html">Privacy</a>
          {user && (
            <button className="text-btn" onClick={deleteMyData}>
              Delete my data
            </button>
          )}
        </div>
      </div>

      {/* consent popup */}
      {showConsent && (
        <div className="modal-backdrop" onClick={() => setShowConsent(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>Before you sign in 👋</h2>
            <p>StormPark uses your Google account so only real students can update lot counts.</p>
            <ul>
              <li>We use your <b>name, email, and profile photo</b> to sign you in.</li>
              <li>We save <b>only your current check-in</b>, and it's deleted when you check out.</li>
              <li>We <b>don't</b> track your location, keep parking history, or sell your data.</li>
              <li>You can delete your data anytime.</li>
            </ul>
            <p>
              Read the full <a className="link" href="/privacy.html" target="_blank">privacy policy</a>.
            </p>
            <div className="modal-actions">
              <button className="btn btn-soft" onClick={() => setShowConsent(false)}>
                Cancel
              </button>
              <button className="btn btn-primary" onClick={continueWithGoogle}>
                Continue with Google
              </button>
            </div>
          </div>
        </div>
      )}

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
                  <div className="popup-count">
                    {lot.open > 0 ? (
                      <>
                        <span className="count-number">{lot.open}</span>{" "}
                        {lot.open === 1 ? "spot" : "spots"} open
                      </>
                    ) : (
                      <span className="count-full">Full</span>
                    )}
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