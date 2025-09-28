import React, { useState, useEffect } from "react";
import axios from "axios";
import { openDB } from "idb";

const DB_NAME = "child_records";
const STORE_NAME = "records";

async function initDB() {
  return openDB(DB_NAME, 1, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "id", autoIncrement: true });
      }
    },
  });
}

// ✅ Helper to check real internet connectivity
async function checkInternet() {
  try {
    const response = await fetch("https://jsonplaceholder.typicode.com/posts/1", { cache: "no-store" });
    return response.ok;
  } catch {
    return false;
  }
}

function App() {
  const [child, setChild] = useState({
    name: "",
    age: "",
    weight: "",
    height: "",
    parent: "",
    illness: "",
    consent: false,
  });
  const [records, setRecords] = useState([]);
  const [authenticated, setAuthenticated] = useState(false);
  const [otp, setOtp] = useState("");
  const [isOnline, setIsOnline] = useState(true);

  // ✅ Track real online/offline status
  useEffect(() => {
    const updateOnlineStatus = async () => {
      const online = await checkInternet();
      setIsOnline(online);
    };

    updateOnlineStatus(); // run immediately
    const interval = setInterval(updateOnlineStatus, 3000); // check every 3 seconds

    return () => clearInterval(interval);
  }, []);

  // Load records from IndexedDB
  useEffect(() => {
    (async () => {
      const db = await initDB();
      const all = await db.getAll(STORE_NAME);
      setRecords(all);
    })();
  }, []);

  async function saveOffline() {
    if (!child.consent) {
      alert("Parental consent required!");
      return;
    }
    const db = await initDB();
    const record = {
      ...child,
      healthId: "HID-" + Date.now(),
      uploaded: false,
    };
    await db.add(STORE_NAME, record);
    const all = await db.getAll(STORE_NAME);
    setRecords(all);
    alert("Saved offline with Health ID: " + record.healthId);
  }

  async function syncData() {
    if (!authenticated) {
      alert("Please login first!");
      return;
    }

    const online = await checkInternet();
    if (!online) {
      setIsOnline(false);
      alert("No internet connection. Please reconnect and try again."); // only when user clicks Sync
      return;
    }

    const db = await initDB();
    const all = await db.getAll(STORE_NAME);
    for (const rec of all) {
      if (!rec.uploaded) {
        try {
          await axios.post("http://127.0.0.1:8000/upload", rec);
          rec.uploaded = true;
          await db.put(STORE_NAME, rec);
        } catch (e) {
          console.error("Upload failed", e);
          alert("Upload failed. Please check your internet.");
          return;
        }
      }
    }
    setRecords(await db.getAll(STORE_NAME));
    alert("Sync complete!");
  }

  function handleLogin() {
    if (otp === "123456") {
      setAuthenticated(true);
      alert("Authenticated!");
    } else {
      alert("Invalid OTP. Use 123456");
    }
  }

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-bold">Child Health Record Booklet</h1>

      {/* ✅ Offline/Online Banner */}
      {!isOnline ? (
        <div className="bg-red-200 text-red-800 p-2 rounded">
          ⚠️ You are offline. Data will be saved locally until you reconnect.
        </div>
      ) : (
        <div className="bg-green-200 text-green-800 p-2 rounded">
          ✅ Online. You can sync your data now.
        </div>
      )}

      {/* Child Data Form */}
      <div className="space-y-2 border p-4 rounded-lg">
        <h2 className="font-semibold">New Child Record</h2>
        <input
          className="border p-2 w-full"
          placeholder="Child Name"
          onChange={(e) => setChild({ ...child, name: e.target.value })}
        />
        <input
          className="border p-2 w-full"
          placeholder="Age"
          onChange={(e) => setChild({ ...child, age: e.target.value })}
        />
        <input
          className="border p-2 w-full"
          placeholder="Weight (kg)"
          onChange={(e) => setChild({ ...child, weight: e.target.value })}
        />
        <input
          className="border p-2 w-full"
          placeholder="Height (cm)"
          onChange={(e) => setChild({ ...child, height: e.target.value })}
        />
        <input
          className="border p-2 w-full"
          placeholder="Parent/Guardian Name"
          onChange={(e) => setChild({ ...child, parent: e.target.value })}
        />
        <input
          className="border p-2 w-full"
          placeholder="Recent Illness"
          onChange={(e) => setChild({ ...child, illness: e.target.value })}
        />
        <label className="flex items-center space-x-2">
          <input
            type="checkbox"
            onChange={(e) => setChild({ ...child, consent: e.target.checked })}
          />
          <span>Parental Consent</span>
        </label>
        <button
          className="bg-blue-500 text-white px-4 py-2 rounded"
          onClick={saveOffline}
        >
          Save Offline
        </button>
      </div>

      {/* OTP Login */}
      {!authenticated && (
        <div className="space-y-2 border p-4 rounded-lg">
          <h2 className="font-semibold">Login (Mock eSignet)</h2>
          <input
            className="border p-2 w-full"
            placeholder="Enter OTP (123456)"
            onChange={(e) => setOtp(e.target.value)}
          />
          <button
            className="bg-green-500 text-white px-4 py-2 rounded"
            onClick={handleLogin}
          >
            Login
          </button>
        </div>
      )}

      {/* Sync Button */}
      <button
        className={`bg-purple-500 text-white px-4 py-2 rounded ${
          !isOnline ? "opacity-50 cursor-not-allowed" : ""
        }`}
        onClick={syncData}
        disabled={!isOnline}
      >
        Sync Data
      </button>

      {/* Records */}
      <div>
        <h2 className="font-semibold">Saved Records</h2>
        <ul>
          {records.map((r) => (
            <li key={r.id}>
              {r.healthId} - {r.name} ({r.uploaded ? "Uploaded" : "Pending"})
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export default App;
