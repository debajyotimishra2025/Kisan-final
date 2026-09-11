import { Router } from "express";
import { readDb, SLOT_TIMES } from "../db.js";

const router = Router();

router.get("/", (req, res) => {
  const db = readDb();
  res.json({ centers: db.centers });
});

// GET /api/centers/:id/availability?date=YYYY-MM-DD
router.get("/:id/availability", (req, res) => {
  const { id } = req.params;
  const { date } = req.query;

  if (!date) {
    return res.status(400).json({ error: "date query param (YYYY-MM-DD) is required" });
  }

  const db = readDb();
  const center = db.centers.find((c) => c.id === id);
  if (!center) return res.status(404).json({ error: "Center not found" });

  const capacityPerSlot = Math.max(1, Math.floor(center.dailyCapacity / SLOT_TIMES.length));

  const bookedByslot = {};
  for (const appt of db.appointments) {
    if (appt.centerId === id && appt.date === date && appt.status !== "cancelled") {
      bookedByslot[appt.slot] = (bookedByslot[appt.slot] || 0) + 1;
    }
  }

  const slots = SLOT_TIMES.map((slot) => {
    const booked = bookedByslot[slot] || 0;
    return {
      slot,
      capacity: capacityPerSlot,
      booked,
      available: Math.max(0, capacityPerSlot - booked),
    };
  });

  res.json({ center: center.name, date, slots });
});

export default router;
