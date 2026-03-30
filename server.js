const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");

const app = express();
app.use(express.json());
app.use(cors());

// ✅ FIXED: use environment variable
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("✅ MongoDB Connected"))
  .catch(err => console.log(err));

// Schema
const DataSchema = new mongoose.Schema({
  waterLevel: Number,
  vibration: String,
  gateStatus: String,
  timestamp: { type: Date, default: Date.now }
});

const Data = mongoose.model("Data", DataSchema);

// POST
app.post("/update", async (req, res) => {
  const data = new Data(req.body);
  await data.save();
  res.send("Saved");
});

// GET latest
app.get("/latest", async (req, res) => {
  const latest = await Data.findOne().sort({ timestamp: -1 });
  res.json(latest);
});

// TEST
app.get("/test", async (req, res) => {
  const data = new Data({
    waterLevel: 80,
    vibration: "SAFE",
    gateStatus: "CLOSED"
  });

  await data.save();
  res.send("Test data saved");
});

// ✅ FIXED: dynamic port for Render
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));