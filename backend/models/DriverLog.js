import mongoose from "mongoose";

const driverLogSchema = new mongoose.Schema({
  driverId: { type: String, required: true },
  eventType: { type: String, enum: ["drowsy"], required: true },
  confidence: { type: Number, required: true },
  timestamp: { type: Date, default: Date.now }
});

export default mongoose.model("DriverLog", driverLogSchema);
