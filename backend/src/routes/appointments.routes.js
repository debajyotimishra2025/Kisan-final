import { Router } from "express";
import crypto from "crypto";

import {
  readDb,
  writeDb,
  SLOT_TIMES,
} from "../db.js";

import {
  requireAuth,
  requireRole,
} from "../middleware/auth.js";

const router = Router();

/*
=========================================================
FARMER BOOKS APPOINTMENT
=========================================================
*/

router.post(
  "/",
  requireAuth,
  requireRole("farmer"),
  (req, res) => {
    const {
      orderId,
      centerId,
      date,
      slot,
    } = req.body || {};

    if (
      !orderId ||
      !centerId ||
      !date ||
      !slot
    ) {
      return res.status(400).json({
        error:
          "orderId, centerId, date and slot are required",
      });
    }

    if (
      !SLOT_TIMES.includes(
        slot
      )
    ) {
      return res.status(400).json({
        error:
          `slot must be one of: ${SLOT_TIMES.join(", ")}`,
      });
    }

    const db = readDb();

    const order =
      db.orders.find(
        (o) =>
          o.id === orderId &&
          o.userId ===
            req.user.id
      );

    if (!order) {
      return res.status(404).json({
        error:
          "Order not found",
      });
    }

    if (
      order.status !==
      "pending_slot"
    ) {
      return res.status(409).json({
        error:
          "This order already has a booked slot or is no longer bookable",
      });
    }

    const center =
      db.centers.find(
        (c) =>
          c.id === centerId
      );

    if (!center) {
      return res.status(404).json({
        error:
          "Center not found",
      });
    }

    const existingForOrder =
      db.appointments.find(
        (a) =>
          a.orderId ===
          orderId
      );

    if (existingForOrder) {
      return res.status(409).json({
        error:
          "An appointment already exists for this order",
      });
    }

    const capacityPerSlot =
      Math.max(
        1,
        Math.floor(
          center.dailyCapacity /
            SLOT_TIMES.length
        )
      );

    const bookedCount =
      db.appointments.filter(
        (a) =>
          a.centerId ===
            centerId &&
          a.date === date &&
          a.slot === slot &&
          a.status !==
            "cancelled"
      ).length;

    if (
      bookedCount >=
      capacityPerSlot
    ) {
      return res.status(409).json({
        error:
          "This slot is fully booked, please choose another",
      });
    }

    const appointment = {
      id: crypto.randomUUID(),
      orderId,
      userId:
        req.user.id,
      centerId,
      date,
      slot,
      status: "booked",
      createdAt:
        new Date().toISOString(),
    };

    db.appointments.push(
      appointment
    );

    order.status =
      "scheduled";

    order.updatedAt =
      new Date().toISOString();

    writeDb(db);

    res.status(201).json({
      appointment,
      order,
    });
  }
);

/*
=========================================================
FARMER'S OWN APPOINTMENTS
=========================================================
*/

router.get(
  "/me",
  requireAuth,
  requireRole("farmer"),
  (req, res) => {
    const db = readDb();

    const appointments =
      db.appointments
        .filter(
          (a) =>
            a.userId ===
            req.user.id
        )
        .map((a) => ({
          ...a,

          centerName:
            db.centers.find(
              (c) =>
                c.id ===
                a.centerId
            )?.name ||
            null,
        }));

    res.json({
      appointments,
    });
  }
);

/*
=========================================================
ADMIN APPOINTMENTS
=========================================================
MASTER ADMIN:
    sees all

CENTER ADMIN:
    sees only assigned center
=========================================================
*/

router.get(
  "/",
  requireAuth,
  requireRole(
    "master_admin",
    "center_admin"
  ),
  (req, res) => {
    const db = readDb();

    let appointments =
      db.appointments.slice();

    if (
      req.user.role ===
      "center_admin"
    ) {
      appointments =
        appointments.filter(
          (a) =>
            a.centerId ===
            req.user.centerId
        );
    }

    appointments =
      appointments.map(
        (a) => ({
          ...a,

          centerName:
            db.centers.find(
              (c) =>
                c.id ===
                a.centerId
            )?.name ||
            null,

          farmerName:
            db.users.find(
              (u) =>
                u.id ===
                a.userId
            )?.name ||
            "Unknown",

          farmerPhone:
            db.users.find(
              (u) =>
                u.id ===
                a.userId
            )?.phone ||
            null,
        })
      );

    res.json({
      appointments,
    });
  }
);

export default router;