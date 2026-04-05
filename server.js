const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");

const app = express();
app.use(express.json());
app.use(cors());

// ===============================
// ✅ MongoDB Connection
// ===============================
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("✅ MongoDB Connected"))
  .catch(err => console.log("❌ DB Error:", err));

// ===============================
// 🔥 GLOBAL STATE
// ===============================
let systemMode = "AUTO";
let manualGate = "CLOSED";
let lastGateState = "CLOSED"; // 🔥 prevents flickering

// ===============================
// ✅ Schema (ONLY LATEST DATA)
// ===============================
const DataSchema = new mongoose.Schema({
  device: { type: String, required: true, unique: true },
  waterLevel: Number,
  vibration: String,
  temperature: Number,
  timestamp: { type: Date, default: Date.now }
});

const Data = mongoose.model("Data", DataSchema);

// ===============================
// ✅ UPDATE FROM ESP (UPSERT)
// ===============================
app.post("/update", async (req, res) => {
  try {
    const { device } = req.body;

    if (!device) {
      return res.status(400).json({ error: "device is required" });
    }

    const updated = await Data.findOneAndUpdate(
      { device },
      { ...req.body, timestamp: new Date() },
      { new: true, upsert: true }
    );

    res.json({
      message: "✅ Updated",
      data: updated
    });

  } catch (err) {
    console.error("❌ Update Error:", err);
    res.status(500).json({ error: err.message });
  }
});

// ===============================
// ✅ DASHBOARD DATA
// ===============================
app.get("/dashboard", async (req, res) => {
  try {
    const water = await Data.findOne({ device: "water" });
    const vib = await Data.findOne({ device: "vibration" });
    const dht = await Data.findOne({ device: "dht" });

    let gateStatus;

    // 🔥 SMART CONTROL (NO FLICKER)
    if (systemMode === "AUTO") {

      if (water?.waterLevel >= 80) {
        lastGateState = "OPEN";
      } else if (water?.waterLevel < 70) {
        lastGateState = "CLOSED";
      }

      gateStatus = lastGateState;

    } else {
      lastGateState = manualGate;
      gateStatus = manualGate;
    }

    res.json({
      waterLevel: water?.waterLevel || 0,
      vibration: vib?.vibration || "SAFE",
      temperature: dht?.temperature || 0,
      gateStatus,
      mode: systemMode
    });

  } catch (err) {
    console.error("❌ Dashboard Error:", err);
    res.status(500).json({ error: err.message });
  }
});

// ===============================
// ✅ MODE CONTROL (AUTO/MANUAL)
// ===============================
app.post("/mode", (req, res) => {
  systemMode = req.body.mode;
  console.log("⚙️ Mode changed:", systemMode);
  res.json({ message: "Mode updated" });
});

// ===============================
// ✅ MANUAL GATE CONTROL
// ===============================
app.post("/gate", (req, res) => {
  manualGate = req.body.status;
  console.log("🚪 Manual Gate:", manualGate);
  res.json({ message: "Gate updated" });
});

// ===============================
// ✅ ESP CONTROL FETCH
// ===============================
app.get("/control", async (req, res) => {
  try {
    const water = await Data.findOne({ device: "water" });

    let gateStatus;

    if (systemMode === "AUTO") {

      if (water?.waterLevel >= 80) {
        lastGateState = "OPEN";
      } else if (water?.waterLevel < 70) {
        lastGateState = "CLOSED";
      }

      gateStatus = lastGateState;

    } else {
      lastGateState = manualGate;
      gateStatus = manualGate;
    }

    res.json({
      mode: systemMode,
      gateStatus
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ===============================
// ✅ HEALTH CHECK
// ===============================
app.get("/", (req, res) => {
  res.send("🚀 Smart Dam Backend Running");
});

// ===============================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Server running on ${PORT}`));