import { Router } from "express";
import bcrypt from "bcryptjs";
import crypto from "crypto";

import { readDb, withDb } from "../db.js";
import { signToken } from "../utils/tokens.js";
import {
  requireAuth,
  requireRole,
} from "../middleware/auth.js";

const router = Router();

function publicUser(user) {
  const {
    passwordHash,
    ...rest
  } = user;

  return rest;
}

/*
=========================================================
FARMER REGISTRATION
=========================================================
*/

router.post("/register", (req, res) => {
  const {
    name,
    phone,
    password,
  } = req.body || {};

  if (!name || !phone || !password) {
    return res.status(400).json({
      error:
        "name, phone and password are required",
    });
  }

  if (password.length < 6) {
    return res.status(400).json({
      error:
        "Password must be at least 6 characters",
    });
  }

  const db = readDb();

  const exists = db.users.find(
    (u) => u.phone === phone
  );

  if (exists) {
    return res.status(409).json({
      error:
        "An account with this phone number already exists",
    });
  }

  const user = {
    id: crypto.randomUUID(),
    name,
    phone,
    passwordHash:
      bcrypt.hashSync(password, 10),

    role: "farmer",

    createdAt:
      new Date().toISOString(),
  };

  withDb((data) => {
    data.users.push(user);
  });

  const token = signToken(user);

  res.status(201).json({
    token,
    user: publicUser(user),
  });
});

/*
=========================================================
LOGIN
=========================================================
FARMER:
phone + password

STAFF / CENTER ADMIN / MASTER ADMIN:
staffId + password
=========================================================
*/

router.post("/login", (req, res) => {
  const {
    phone,
    staffId,
    password,
    userType,
  } = req.body || {};

  if (!password) {
    return res.status(400).json({
      error: "Password is required",
    });
  }

  /*
  =======================================================
  STAFF LOGIN
  =======================================================
  */

  if (userType === "staff") {
    if (!staffId) {
      return res.status(400).json({
        error: "Staff ID is required",
      });
    }

    const db = readDb();

    const user = db.users.find(
      (u) =>
        u.staffId &&
        u.staffId.toUpperCase() ===
          staffId.toUpperCase() &&
        (
          u.role === "staff" ||
          u.role === "center_admin" ||
          u.role === "master_admin"
        )
    );

    if (
      !user ||
      !bcrypt.compareSync(
        password,
        user.passwordHash
      )
    ) {
      return res.status(401).json({
        error:
          "Invalid Staff ID or password",
      });
    }

    const token = signToken(user);

    return res.json({
      token,
      user: publicUser(user),
    });
  }

  /*
  =======================================================
  FARMER LOGIN
  =======================================================
  */

  if (!phone) {
    return res.status(400).json({
      error: "Mobile number is required",
    });
  }

  const db = readDb();

  const user = db.users.find(
    (u) => u.phone === phone
  );

  if (
    !user ||
    !bcrypt.compareSync(
      password,
      user.passwordHash
    )
  ) {
    return res.status(401).json({
      error:
        "Invalid phone number or password",
    });
  }

  const token = signToken(user);

  return res.json({
    token,
    user: publicUser(user),
  });
});

/*
=========================================================
CURRENT USER
=========================================================
*/

router.get(
  "/me",
  requireAuth,
  (req, res) => {
    const db = readDb();

    const user = db.users.find(
      (u) => u.id === req.user.id
    );

    if (!user) {
      return res.status(404).json({
        error: "User not found",
      });
    }

    res.json({
      user: publicUser(user),
    });
  }
);

/*
=========================================================
MASTER ADMIN:
CREATE CENTER ADMIN
=========================================================
*/

router.post(
  "/center-admin",
  requireAuth,
  requireRole("master_admin"),
  (req, res) => {
    const {
      name,
      phone,
      password,
      centerId,
    } = req.body || {};

    if (
      !name ||
      !phone ||
      !password ||
      !centerId
    ) {
      return res.status(400).json({
        error:
          "name, phone, password and centerId are required",
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        error:
          "Password must be at least 6 characters",
      });
    }

    const db = readDb();

    const center = db.centers.find(
      (c) => c.id === centerId
    );

    if (!center) {
      return res.status(404).json({
        error: "Center not found",
      });
    }

    const existingUser =
      db.users.find(
        (u) => u.phone === phone
      );

    if (existingUser) {
      return res.status(409).json({
        error:
          "An account with this phone number already exists",
      });
    }

    const existingCenterAdmin =
      db.users.find(
        (u) =>
          u.role === "center_admin" &&
          u.centerId === centerId
      );

    if (existingCenterAdmin) {
      return res.status(409).json({
        error:
          "This center already has an admin",
      });
    }

    const user = {
      id: crypto.randomUUID(),
      name,
      phone,
      passwordHash:
        bcrypt.hashSync(password, 10),
      role: "center_admin",
      centerId,
      createdAt:
        new Date().toISOString(),
    };

    withDb((data) => {
      data.users.push(user);
    });

    res.status(201).json({
      user: publicUser(user),
      center: {
        id: center.id,
        name: center.name,
      },
    });
  }
);

export default router;