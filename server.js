const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");

const app = express();
app.use(express.json());
app.use(cors());

// ✅ MongoDB
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("✅ MongoDB Connected"))
  .catch(err => console.log(err));

// 🔥 GLOBAL STATE
let systemMode = "AUTO";
let manualGate = "CLOSED";

// ✅ Schema
const DataSchema = new mongoose.Schema({
  device: String, // "water", "vibration", "dht"
  waterLevel: Number,
  vibration: String,
  temperature: Number,
  gateStatus: String,
  timestamp: { type: Date, default: Date.now }
});

const Data = mongoose.model("Data", DataSchema);

// ===============================
// ✅ ESP UPDATE API
// ===============================
app.post("/update", async (req, res) => {
  try {
    const { device } = req.body;

    if (!device) {
      return res.status(400).json({ error: "device is required" });
    }

    const data = new Data(req.body);
    await data.save();

    res.json({ message: "✅ Data saved" });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// ===============================
// ✅ DASHBOARD DATA
// ===============================
app.get("/dashboard", async (req, res) => {
  try {
    const water = await Data.findOne({ device: "water" }).sort({ timestamp: -1 });
    const vib = await Data.findOne({ device: "vibration" }).sort({ timestamp: -1 });
    const dht = await Data.findOne({ device: "dht" }).sort({ timestamp: -1 });

    let gateStatus;

    // 🔥 FIXED LOGIC
    if (systemMode === "AUTO") {
      gateStatus = water?.waterLevel >= 80 ? "OPEN" : "CLOSED";
    } else {
      gateStatus = manualGate;
    }

    res.json({
      waterLevel: water?.waterLevel || 0,
      vibration: vib?.vibration || "SAFE",
      temperature: dht?.temperature || 0,
      gateStatus: gateStatus,
      mode: systemMode
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ===============================
// ✅ MODE CONTROL
// ===============================
app.post("/mode", (req, res) => {
  systemMode = req.body.mode;
  console.log("Mode:", systemMode);
  res.json({ message: "Mode updated" });
});

// ===============================
// ✅ MANUAL GATE CONTROL
// ===============================
app.post("/gate", (req, res) => {
  manualGate = req.body.status;
  console.log("Manual Gate:", manualGate);
  res.json({ message: "Gate updated" });
});

// ===============================
// ✅ ESP FETCH CONTROL
// ===============================
app.get("/control", async (req, res) => {
  try {
    const water = await Data.findOne({ device: "water" }).sort({ timestamp: -1 });

    let gateStatus;

    if (systemMode === "AUTO") {
      gateStatus = water?.waterLevel >= 80 ? "OPEN" : "CLOSED";
    } else {
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
app.listen(3000, () => console.log("🚀 Server running on port 3000"));