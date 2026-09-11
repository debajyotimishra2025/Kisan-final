import { Router } from "express";
import { readDb } from "../db.js";

const router = Router();

router.get("/", (req, res) => {
  const db = readDb();
  res.json({ crops: db.crops });
});

export default router;
