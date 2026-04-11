const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");

const app = express();
app.use(express.json());
app.use(cors());

mongoose.connect(process.env.MONGO_URI);

// 🔥 FAST CACHE
let latestWaterLevel = 0;
let systemMode = "AUTO";
let manualGate = "CLOSED";
let lastGateState = "CLOSED";

const Data = mongoose.model("Data", new mongoose.Schema({
  device: { type: String, unique: true },
  waterLevel: Number,
  vibration: String,
  temperature: Number,
  timestamp: { type: Date, default: Date.now }
}));

// UPDATE
app.post("/update", async (req, res) => {
  const { device, waterLevel } = req.body;

  if (device === "water") {
    latestWaterLevel = waterLevel; // ⚡ instant access
  }

  await Data.findOneAndUpdate(
    { device },
    { ...req.body, timestamp: new Date() },
    { upsert: true }
  );

  res.json({ message: "Updated" });
});

// DASHBOARD
app.get("/dashboard", async (req, res) => {

  let gateStatus;

  if (systemMode === "AUTO") {
    if (latestWaterLevel >= 80) lastGateState = "OPEN";
    else if (latestWaterLevel < 70) lastGateState = "CLOSED";

    gateStatus = lastGateState;
  } else {
    gateStatus = manualGate;
  }

  res.json({
    waterLevel: latestWaterLevel,
    vibration: "SAFE",
    temperature: 25,
    gateStatus,
    mode: systemMode
  });
});

// CONTROL
app.get("/control", (req, res) => {

  let gateStatus;

  if (systemMode === "AUTO") {
    if (latestWaterLevel >= 80) lastGateState = "OPEN";
    else if (latestWaterLevel < 70) lastGateState = "CLOSED";

    gateStatus = lastGateState;
  } else {
    gateStatus = manualGate;
  }

  res.json({ gateStatus });
});

app.post("/mode", (req, res) => {
  systemMode = req.body.mode;
  res.json({ ok: true });
});

app.post("/gate", (req, res) => {
  manualGate = req.body.status;
  res.json({ ok: true });
});

app.listen(3000, () => console.log("🚀 Fast Server Running"));