import { MapContainer, TileLayer, CircleMarker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";

// access: "student" = students can park, "staff" = restricted (faculty/employee/reserved)
// open counts are fake for now — firebase comes next
const lots = [
  {
    id: "gate6-garage",
    name: "Gate 6 Garage",
    type: "garage",
    access: "student",
    label: "student parking",
    open: 40,
    lat: 40.72325,
    lng: -73.797472,
  },
  {
    id: "gate6",
    name: "Gate 6 Lot",
    type: "lot",
    access: "student",
    label: "student parking",
    open: 10,
    lat: 40.7215,
    lng: -73.797333,
  },
  {
    id: "gate6-staff",
    name: "Gate 6 Staff Lot",
    type: "lot",
    access: "staff",
    label: "faculty, employee & reserved only",
    open: 6,
    lat: 40.721028,
    lng: -73.796222,
  },
  {
    id: "gate1",
    name: "Gate 1 Lot",
    type: "lot",
    access: "student",
    label: "student parking",
    open: 0,
    lat: 40.721,
    lng: -73.792389,
  },
  {
    id: "gate4",
    name: "Gate 4 Lot",
    type: "lot",
    access: "student",
    label: "student parking",
    open: 15,
    lat: 40.724972,
    lng: -73.792972,
  },
  {
    id: "gate2-employee",
    name: "Gate 2 Employee Lot",
    type: "lot",
    access: "staff",
    label: "employee only",
    open: 4,
    lat: 40.722528,
    lng: -73.791028,
  },
  {
    id: "gate2-faculty",
    name: "Gate 2 Faculty Lot",
    type: "lot",
    access: "staff",
    label: "faculty only",
    open: 3,
    lat: 40.722778,
    lng: -73.792444,
  },
  {
    id: "gate2-student",
    name: "Gate 2 Student Lot",
    type: "lot",
    access: "student",
    label: "student parking",
    open: 8,
    lat: 40.722111,
    lng: -73.792944,
  },
];

function markerColor(lot) {
  if (lot.access === "staff") return "gray";
  return lot.open > 0 ? "green" : "red";
}

export default function App() {
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