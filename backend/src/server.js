import "dotenv/config";
import express from "express";
import cors from "cors";

import authRoutes from "./routes/auth.routes.js";
import cropsRoutes from "./routes/crops.routes.js";
import centersRoutes from "./routes/centers.routes.js";
import ordersRoutes from "./routes/orders.routes.js";
import appointmentsRoutes from "./routes/appointments.routes.js";
import notificationsRoutes from "./routes/notifications.routes.js";

import { readDb } from "./db.js";

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

// Make sure the DB file + seed data exist as soon as the server boots.
readDb();

app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    time: new Date().toISOString(),
  });
});

app.use("/api/auth", authRoutes);
app.use("/api/crops", cropsRoutes);
app.use("/api/centers", centersRoutes);
app.use("/api/orders", ordersRoutes);
app.use("/api/appointments", appointmentsRoutes);
app.use("/api/notifications", notificationsRoutes);

app.use((req, res) => {
  res.status(404).json({
    error: "Not found",
  });
});

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error(err);

  res.status(500).json({
    error: "Internal server error",
  });
});

app.listen(PORT, () => {
  console.log(
    `KISAN backend listening on http://localhost:${PORT}`
  );
});