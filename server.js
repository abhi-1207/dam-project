const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");

const app = express();
app.use(express.json());
app.use(cors());

mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB Connected"))
  .catch(err => console.log(err));

// 🔥 GLOBAL STATE
let systemMode = "AUTO";
let manualGate = "CLOSED";

// ✅ Schema
const DataSchema = new mongoose.Schema({
  device: String,
  waterLevel: Number,
  vibration: String,
  temperature: Number,
  humidity: Number,
  gateStatus: String,
  timestamp: { type: Date, default: Date.now }
});

const Data = mongoose.model("Data", DataSchema);

// ✅ Update from ESP
app.post("/update", async (req, res) => {
  const data = new Data(req.body);
  await data.save();
  res.json({ message: "Saved" });
});

// ✅ Dashboard API
app.get("/dashboard", async (req, res) => {
  const water = await Data.findOne({ device: "water" }).sort({ timestamp: -1 });
  const vib = await Data.findOne({ device: "vibration" }).sort({ timestamp: -1 });
  const dht = await Data.findOne({ device: "dht" }).sort({ timestamp: -1 });

  res.json({
    waterLevel: water?.waterLevel || 0,
    vibration: vib?.vibration || "SAFE",
    temperature: dht?.temperature || 0,
    humidity: dht?.humidity || 0,
    gateStatus: water?.gateStatus || "CLOSED",
    mode: systemMode
  });
});

// ✅ Mode control
app.post("/mode", (req, res) => {
  systemMode = req.body.mode;
  res.send("Mode updated");
});

// ✅ Gate control
app.post("/gate", (req, res) => {
  manualGate = req.body.status;
  res.send("Gate updated");
});

// ✅ ESP control fetch
app.get("/control", (req, res) => {
  res.json({
    mode: systemMode,
    manualGate
  });
});

app.listen(3000, () => console.log("Server running"));