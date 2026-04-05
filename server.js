const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");

const app = express();
app.use(express.json());
app.use(cors());

// ==========================
// ✅ MongoDB Connection
// ==========================
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("✅ MongoDB Connected"))
  .catch(err => console.log("❌ DB Error:", err));

// ==========================
// 🔥 GLOBAL STATE
// ==========================
let systemMode = "AUTO";       // AUTO / MANUAL
let manualGate = "CLOSED";     // OPEN / CLOSED

// ==========================
// ✅ Schema
// ==========================
const DataSchema = new mongoose.Schema({
  device: String, // water | vibration | dht
  waterLevel: Number,
  vibration: String,
  temperature: Number,
  gateStatus: String,
  timestamp: { type: Date, default: Date.now }
});

const Data = mongoose.model("Data", DataSchema);


// ==========================
// ✅ ESP UPDATE (STRICT)
// ==========================
app.post("/update", async (req, res) => {
  try {
    const { device } = req.body;

    if (!device) {
      return res.status(400).json({ error: "Device required" });
    }

    let dataObj = { device };

    // 🔵 WATER ESP
    if (device === "water") {
      const { waterLevel, gateStatus } = req.body;

      if (waterLevel === undefined) {
        return res.status(400).json({ error: "waterLevel required" });
      }

      dataObj.waterLevel = waterLevel;
      dataObj.gateStatus = gateStatus || "CLOSED";
    }

    // 🟡 VIBRATION ESP
    else if (device === "vibration") {
      const { vibration } = req.body;

      if (!vibration) {
        return res.status(400).json({ error: "vibration required" });
      }

      dataObj.vibration = vibration;
    }

    // 🟢 DHT ESP (TEMP ONLY)
    else if (device === "dht") {
      const { temperature } = req.body;

      if (temperature === undefined) {
        return res.status(400).json({ error: "temperature required" });
      }

      dataObj.temperature = temperature;
    }

    else {
      return res.status(400).json({ error: "Invalid device" });
    }

    const data = new Data(dataObj);
    await data.save();

    console.log("📥 Saved:", dataObj);

    res.json({ success: true });

  } catch (err) {
    console.error("❌ Error:", err);
    res.status(500).json({ error: err.message });
  }
});


// ==========================
// ✅ DASHBOARD API
// ==========================
app.get("/dashboard", async (req, res) => {
  try {
    const water = await Data.findOne({ device: "water" }).sort({ timestamp: -1 });
    const vib   = await Data.findOne({ device: "vibration" }).sort({ timestamp: -1 });
    const dht   = await Data.findOne({ device: "dht" }).sort({ timestamp: -1 });

    // 🔥 FINAL GATE STATUS
    let gate;

    if (systemMode === "AUTO") {
      gate = water?.waterLevel >= 80 ? "OPEN" : "CLOSED";
    } else {
      gate = manualGate;
    }

    res.json({
      waterLevel: water?.waterLevel || 0,
      vibration: vib?.vibration || "SAFE",
      temperature: dht?.temperature || 0,
      gateStatus: gate,
      mode: systemMode
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// ==========================
// ✅ MODE CONTROL
// ==========================
app.post("/mode", (req, res) => {
  const { mode } = req.body;

  if (!mode) {
    return res.status(400).json({ error: "Mode required" });
  }

  systemMode = mode;
  console.log("⚙️ Mode:", mode);

  res.json({ success: true });
});


// ==========================
// ✅ MANUAL GATE CONTROL
// ==========================
app.post("/gate", async (req, res) => {
  try {
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({ error: "Gate status required" });
    }

    manualGate = status;

    console.log("🚪 Manual Gate:", status);

    // 🔥 Save to DB
    const data = new Data({
      device: "water",
      gateStatus: status
    });

    await data.save();

    res.json({
      success: true,
      gateStatus: status
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// ==========================
// ✅ ESP CONTROL API
// ==========================
app.get("/control", async (req, res) => {
  try {
    const water = await Data.findOne({ device: "water" }).sort({ timestamp: -1 });

    let gate;

    if (systemMode === "AUTO") {
      gate = water?.waterLevel >= 80 ? "OPEN" : "CLOSED";
    } else {
      gate = manualGate;
    }

    res.json({
      mode: systemMode,
      gateStatus: gate
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// ==========================
// ✅ HEALTH CHECK
// ==========================
app.get("/", (req, res) => {
  res.send("🚀 Smart Dam Backend Running");
});


// ==========================
app.listen(3000, () => {
  console.log("🚀 Server running on port 3000");
});