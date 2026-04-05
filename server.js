const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");

const app = express();

// ✅ Middlewares
app.use(express.json());
app.use(cors());

// 🔍 Request Logger (VERY IMPORTANT)
app.use((req, res, next) => {
  console.log(`📡 ${req.method} ${req.url}`);
  next();
});

// ✅ MongoDB Connection
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("✅ MongoDB Connected"))
  .catch(err => console.error("❌ MongoDB Error:", err));

// ✅ Schema
const DataSchema = new mongoose.Schema({
  waterLevel: Number,
  vibration: String,
  gateStatus: String,
  timestamp: { type: Date, default: Date.now }
});

const Data = mongoose.model("Data", DataSchema);

// ✅ POST /update (ESP32 will hit this)
app.post("/update", async (req, res) => {
  try {
    console.log("📥 Incoming Data:", req.body);

    const { waterLevel, vibration, gateStatus } = req.body;

    // 🔒 Validation
    if (waterLevel === undefined) {
      return res.status(400).json({ error: "waterLevel is required" });
    }

    const data = new Data({
      waterLevel,
      vibration,
      gateStatus
    });

    await data.save();

    res.status(200).json({
      message: "✅ Data saved successfully",
      savedData: data
    });

  } catch (error) {
    console.error("❌ Error saving data:", error);
    res.status(500).json({ error: error.message });
  }
});

// ✅ GET /latest (Frontend uses this)
app.get("/latest", async (req, res) => {
  try {
    const latest = await Data.findOne().sort({ timestamp: -1 });

    if (!latest) {
      return res.status(404).json({ message: "No data found" });
    }

    res.json(latest);

  } catch (error) {
    console.error("❌ Error fetching latest:", error);
    res.status(500).json({ error: error.message });
  }
});

// ✅ TEST route (for manual testing)
app.get("/test", async (req, res) => {
  try {
    const data = new Data({
      waterLevel: Math.floor(Math.random() * 100),
      vibration: "SAFE",
      gateStatus: "CLOSED"
    });

    await data.save();

    res.json({
      message: "✅ Test data saved",
      data
    });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ✅ Health check (optional but useful)
app.get("/", (req, res) => {
  res.send("🚀 Dam Monitoring API is running");
});

// ✅ Server Start
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});