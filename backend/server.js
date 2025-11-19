import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import connectDB from "./config/db.js";
import authRoutes from "./routes/authRoutes.js";
import mongoose from "mongoose";
import DriverLog from "./models/DriverLog.js";
import http from "http";
import { Server as SocketIOServer } from "socket.io";

dotenv.config();
connectDB();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use("/api/auth", authRoutes);

const server = http.createServer(app);
const io = new SocketIOServer(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});
app.set("io", io); // app-wide access if needed

// Socket.IO: room join logic for driver/passenger (simple demo)
io.on("connection", (socket) => {
  socket.on("joinDriverRoom", ({ driverId }) => {
    if (driverId) {
      socket.join(`driver_${driverId}`);
    }
  });
  socket.on("joinPassengerRoom", ({ driverId }) => {
    if (driverId) {
      socket.join(`passenger_${driverId}`);
    }
  });
});

// --- Simple role middleware ---
function allowRole(...allowedRoles) {
  return (req, res, next) => {
    // For demo: user is assumed on req.user, as set by JWT auth middleware
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ message: "Forbidden" });
    }
    next();
  };
}

// Example auth middleware (mocked): real app should verify JWT
app.use((req, res, next) => {
  // For testing you can use: req.user = { id: 'DRIVERID', role: 'Driver' };
  // Parse from Authorization header if implemented.
  next();
});

// Add DriverLog through ML server POST
app.post("/api/driver/logs/add", async (req, res) => {
  try {
    const { driverId, eventType, confidence } = req.body;
    if (!driverId || !eventType || typeof confidence !== "number") {
      return res.status(400).json({ message: "Missing required fields" });
    }
    const log = await DriverLog.create({ driverId, eventType, confidence });

    // Emit drowsiness alert to driver's room
    io.to(`driver_${driverId}`).emit("drowsinessAlert", {
      driverId,
      eventType,
      confidence,
      timestamp: log.timestamp
    });

    res.status(201).json({ success: true, log });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

// Helper: relay ML alert to driver/passenger rooms + store log
app.post("/ml/alert", async (req, res) => {
  const { driverId, type } = req.body;
  if (!driverId || !["normal","critical","clear"].includes(type)) {
    return res.status(400).json({ success: false, message: "Missing/invalid fields" });
  }
  // Event mapping
  let driverEvt, passengerEvt;
  let logType = null;
  if (type === "normal") {
    driverEvt = "driver_alert_normal";
    passengerEvt = "passenger_alert_normal";
    logType = "normal";
  } else if (type === "critical") {
    driverEvt = "driver_alert_critical";
    passengerEvt = "passenger_alert_critical";
    logType = "critical";
  } else if (type === "clear") {
    driverEvt = "driver_alert_clear";
    passengerEvt = "passenger_alert_clear";
  }
  // Broadcast via Socket.IO
  if (driverEvt)
    io.to(`driver_${driverId}`).emit(driverEvt, { driverId, type });
  if (passengerEvt)
    io.to(`passenger_${driverId}`).emit(passengerEvt, { driverId, type });
  // Store log (for normal & critical only)
  if (logType) {
    try {
      await DriverLog.create({ driverId, eventType: logType, timestamp: new Date() });
    } catch(e){
      console.error("DB log error:", e);
    }
  }
  res.json({ success: true });
});

// For dev only: patch user before GET logs so allowRole passes
app.get('/api/driver/logs/:driverId', (req, res, next) => {
  req.user = { id: req.params.driverId, role: 'Driver' };
  next();
}, allowRole('Driver', 'Passenger'), async (req, res) => {
  try {
    const { driverId } = req.params;
    if (!driverId) {
      return res.status(400).json({ message: "Missing driverId param" });
    }
    const logs = await DriverLog.find({ driverId }).sort({ timestamp: -1 });
    res.json({ logs });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

// Add placeholder for GET logs by driverId (will implement separately)

// Update listen to use Socket.IO server
const PORT = process.env.PORT || 5000;
server.listen(PORT, '0.0.0.0', () => console.log(`Server running on http://0.0.0.0:${PORT}`));
