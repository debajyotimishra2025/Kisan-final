import { Router } from "express";
import crypto from "crypto";

import {
  readDb,
  withDb,
} from "../db.js";

import {
  requireAuth,
  requireRole,
} from "../middleware/auth.js";

const router = Router();

const GST_RATE = 0;

const ALLOWED_STATUSES = [
  "pending_slot",
  "scheduled",
  "inspected",
  "accepted",
  "rejected",
  "paid",
];

/*
=========================================================
ENRICH ORDER
=========================================================
Adds appointment + center information.
*/

function enrich(order, db) {
  const appointment =
    db.appointments.find(
      (a) => a.orderId === order.id
    ) || null;

  const center = appointment
    ? db.centers.find(
        (c) =>
          c.id === appointment.centerId
      )
    : null;

  return {
    ...order,

    appointment: appointment
      ? {
          ...appointment,
          centerName:
            center?.name || null,
        }
      : null,
  };
}

/*
=========================================================
CREATE ORDER
=========================================================
Farmer only.
*/

router.post(
  "/",
  requireAuth,
  requireRole("farmer"),
  (req, res) => {
    const { items } =
      req.body || {};

    if (
      !Array.isArray(items) ||
      items.length === 0
    ) {
      return res.status(400).json({
        error:
          "items array is required",
      });
    }

    const db = readDb();

    const lineItems = [];
    let gross = 0;

    for (const item of items) {
      const crop =
        db.crops.find(
          (c) =>
            c.id === item.cropId
        );

      const quantity =
        Number(item.quantity);

      if (
        !crop ||
        !quantity ||
        quantity <= 0
      ) {
        return res.status(400).json({
          error:
            `Invalid item: ${JSON.stringify(item)}`,
        });
      }

      const lineTotal =
        crop.price * quantity;

      gross += lineTotal;

      lineItems.push({
        cropId: crop.id,
        cropName: crop.name,
        pricePerKg: crop.price,
        quantity,
        type:
          item.type ===
          "packaged"
            ? "packaged"
            : "loose",
        lineTotal,
      });
    }

    const gstAmount =
      gross *
      (GST_RATE / 100);

    const finalAmount =
      gross + gstAmount;

    const order = {
      id: crypto.randomUUID(),
      userId: req.user.id,
      items: lineItems,
      gross,
      gstRate: GST_RATE,
      gstAmount,
      finalAmount,
      status: "pending_slot",
      createdAt:
        new Date().toISOString(),
    };

    /*
    =====================================================
    SAVE ORDER + CREATE NOTIFICATION
    =====================================================
    */

    withDb((data) => {
      data.orders.push(order);

      if (!Array.isArray(data.notifications)) {
        data.notifications = [];
      }

      data.notifications.push({
        id: crypto.randomUUID(),
        userId: req.user.id,
        title: "Crop Request Submitted",
        message:
          "Your crop request has been submitted successfully. Please select a procurement center and appointment slot.",
        read: false,
        createdAt:
          new Date().toISOString(),
        orderId: order.id,
      });
    });

    const updatedDb = readDb();

    res.status(201).json({
      order: enrich(
        order,
        updatedDb
      ),
    });
  }
);

/*
=========================================================
FARMER'S OWN ORDERS
=========================================================
*/

router.get(
  "/me",
  requireAuth,
  requireRole("farmer"),
  (req, res) => {
    const db = readDb();

    const orders =
      db.orders
        .filter(
          (o) =>
            o.userId ===
            req.user.id
        )
        .sort(
          (a, b) =>
            new Date(
              b.createdAt
            ) -
            new Date(
              a.createdAt
            )
        )
        .map((o) =>
          enrich(o, db)
        );

    res.json({ orders });
  }
);

/*
=========================================================
ADMIN ORDER ACCESS
=========================================================
MASTER ADMIN:
    sees EVERYTHING

CENTER ADMIN:
    sees ONLY orders booked at
    their assigned center

PENDING SLOT ORDERS:
    are not shown to center admins
    because no center has been selected yet.
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

    let orders =
      db.orders.slice();

    /*
    ---------------------------------------------
    CENTER ADMIN FILTER
    ---------------------------------------------
    */

    if (
      req.user.role ===
      "center_admin"
    ) {
      if (!req.user.centerId) {
        return res.status(403).json({
          error:
            "This center admin is not assigned to a center",
        });
      }

      orders =
        orders.filter(
          (order) => {
            const appointment =
              db.appointments.find(
                (a) =>
                  a.orderId ===
                  order.id
              );

            return (
              appointment &&
              appointment.centerId ===
                req.user.centerId
            );
          }
        );
    }

    orders.sort(
      (a, b) =>
        new Date(
          b.createdAt
        ) -
        new Date(
          a.createdAt
        )
    );

    const result =
      orders.map((order) => {
        const farmer =
          db.users.find(
            (u) =>
              u.id ===
              order.userId
          );

        return {
          ...enrich(
            order,
            db
          ),

          farmerName:
            farmer
              ? farmer.name
              : "Unknown",

          farmerPhone:
            farmer
              ? farmer.phone
              : null,
        };
      });

    res.json({
      orders: result,
    });
  }
);


/*
=========================================================
PAYMENT QR SESSION
=========================================================
Creates a short-lived signed token for the payment portal.
The amount is always read from the server-side order and
cannot be changed by the QR URL or the browser.
*/

const PAYMENT_TOKEN_TTL_MS = 15 * 60 * 1000;

function paymentSecret() {
  return process.env.PAYMENT_SECRET || process.env.JWT_SECRET || "change-payment-secret";
}

function createPaymentToken(orderId) {
  const payload = {
    orderId,
    exp: Date.now() + PAYMENT_TOKEN_TTL_MS,
  };

  const encoded = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = crypto
    .createHmac("sha256", paymentSecret())
    .update(encoded)
    .digest("base64url");

  return `${encoded}.${signature}`;
}

function verifyPaymentToken(token, orderId) {
  if (!token || typeof token !== "string") return false;

  const [encoded, signature] = token.split(".");
  if (!encoded || !signature) return false;

  const expected = crypto
    .createHmac("sha256", paymentSecret())
    .update(encoded)
    .digest("base64url");

  if (
    signature.length !== expected.length ||
    !crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expected)
    )
  ) {
    return false;
  }

  try {
    const payload = JSON.parse(
      Buffer.from(encoded, "base64url").toString("utf8")
    );

    return (
      payload.orderId === orderId &&
      Number(payload.exp) > Date.now()
    );
  } catch {
    return false;
  }
}

router.post(
  "/:id/payment-session",
  requireAuth,
  requireRole("master_admin", "center_admin"),
  (req, res) => {
    const db = readDb();
    const order = db.orders.find((o) => o.id === req.params.id);

    if (!order) {
      return res.status(404).json({ error: "Order not found" });
    }

    if (order.status !== "accepted") {
      return res.status(400).json({
        error: "Payment QR can only be generated for an approved order",
      });
    }

    if (req.user.role === "center_admin") {
      const appointment = db.appointments.find(
        (a) => a.orderId === order.id
      );

      if (!appointment || appointment.centerId !== req.user.centerId) {
        return res.status(403).json({
          error: "You can only create payment sessions for your center",
        });
      }
    }

    const token = createPaymentToken(order.id);

    res.json({
      token,
      expiresAt: new Date(Date.now() + PAYMENT_TOKEN_TTL_MS).toISOString(),
      amount: Number(order.finalAmount),
    });
  }
);

/*
=========================================================
PUBLIC PAYMENT PORTAL
=========================================================
The QR token is the authorization. The payable amount is
always returned from the database, never from the client.
*/

router.get(
  "/:id/payment",
  (req, res) => {
    if (!verifyPaymentToken(req.query.token, req.params.id)) {
      return res.status(401).json({ error: "Invalid or expired payment QR" });
    }

    const db = readDb();
    const order = db.orders.find((o) => o.id === req.params.id);

    if (!order) {
      return res.status(404).json({ error: "Order not found" });
    }

    res.json({
      orderId: order.id,
      amount: Number(order.finalAmount),
      status: order.status,
      farmerName: db.users.find((u) => u.id === order.userId)?.name || "Farmer",
      items: order.items.map((item) => ({
        cropName: item.cropName,
        quantity: item.quantity,
      })),
      appointment: enrich(order, db).appointment,
    });
  }
);

router.post(
  "/:id/payment/complete",
  (req, res) => {
    const { token, method } = req.body || {};

    if (!verifyPaymentToken(token, req.params.id)) {
      return res.status(401).json({ error: "Invalid or expired payment QR" });
    }

    const allowedMethods = ["upi", "card", "netbanking"];
    if (!allowedMethods.includes(method)) {
      return res.status(400).json({ error: "Invalid payment method" });
    }

    const updated = withDb((data) => {
      const order = data.orders.find((o) => o.id === req.params.id);

      if (!order) return null;

      if (order.status === "paid") return order;

      if (order.status !== "accepted") {
        return "INVALID_STATUS";
      }

      order.status = "paid";
      order.payment = {
        method,
        amount: Number(order.finalAmount),
        transactionId: `KISAN-${crypto.randomUUID().slice(0, 8).toUpperCase()}`,
        paidAt: new Date().toISOString(),
      };
      order.updatedAt = new Date().toISOString();

      if (!Array.isArray(data.notifications)) data.notifications = [];

      data.notifications.push({
        id: crypto.randomUUID(),
        userId: order.userId,
        title: "Payment Completed",
        message: `Payment of ₹${Number(order.finalAmount).toFixed(2)} has been completed successfully.`,
        read: false,
        createdAt: new Date().toISOString(),
        orderId: order.id,
        status: "paid",
      });

      return order;
    });

    if (!updated) {
      return res.status(404).json({ error: "Order not found" });
    }

    if (updated === "INVALID_STATUS") {
      return res.status(400).json({ error: "This order is not ready for payment" });
    }

    const db = readDb();
    res.json({
      success: true,
      order: enrich(updated, db),
      transactionId: updated.payment?.transactionId || null,
    });
  }
);

/*
=========================================================
UPDATE ORDER STATUS
=========================================================
MASTER ADMIN:
    can update any order

CENTER ADMIN:
    can update only their own center's orders

ALSO:
    Creates a notification for the farmer
    whenever an important status changes.
=========================================================
*/

router.patch(
  "/:id/status",
  requireAuth,
  requireRole(
    "master_admin",
    "center_admin"
  ),
  (req, res) => {
    const { status } =
      req.body || {};

    if (
      !ALLOWED_STATUSES.includes(
        status
      )
    ) {
      return res.status(400).json({
        error:
          `status must be one of: ${ALLOWED_STATUSES.join(", ")}`,
      });
    }

    const updated =
      withDb((data) => {
        const order =
          data.orders.find(
            (o) =>
              o.id ===
              req.params.id
          );

        if (!order) {
          return null;
        }

        /*
        ---------------------------------------------
        CENTER ADMIN SECURITY CHECK
        ---------------------------------------------
        */

        if (
          req.user.role ===
          "center_admin"
        ) {
          const appointment =
            data.appointments.find(
              (a) =>
                a.orderId ===
                order.id
            );

          if (
            !appointment ||
            appointment.centerId !==
              req.user.centerId
          ) {
            return "FORBIDDEN";
          }
        }

        /*
        ---------------------------------------------
        UPDATE STATUS
        ---------------------------------------------
        */

        const oldStatus =
          order.status;

        order.status =
          status;

        order.updatedAt =
          new Date().toISOString();

        /*
        ---------------------------------------------
        CREATE FARMER NOTIFICATION
        ---------------------------------------------
        */

        if (
          !Array.isArray(
            data.notifications
          )
        ) {
          data.notifications = [];
        }

        /*
        Don't create another notification
        if the admin saves the same status again.
        */

        if (oldStatus !== status) {
          const notificationMessages = {
            scheduled: {
              title:
                "Appointment Scheduled",
              message:
                "Your procurement appointment has been scheduled successfully.",
            },

            inspected: {
              title:
                "Crop Inspection Completed",
              message:
                "Your crop has been inspected. Your request is now under processing.",
            },

            accepted: {
              title:
                "Crop Request Accepted",
              message:
                "Good news! Your crop request has been accepted.",
            },

            rejected: {
              title:
                "Crop Request Rejected",
              message:
                "Your crop request has been rejected. Please check your request details or contact the procurement center.",
            },

            paid: {
              title:
                "Payment Completed",
              message:
                "Your payment has been completed successfully.",
            },
          };

          const notification =
            notificationMessages[
              status
            ];

          if (notification) {
            data.notifications.push({
              id: crypto.randomUUID(),

              userId:
                order.userId,

              title:
                notification.title,

              message:
                notification.message,

              read: false,

              createdAt:
                new Date().toISOString(),

              orderId:
                order.id,

              status,
            });
          }
        }

        return order;
      });

    /*
    ---------------------------------------------
    FORBIDDEN
    ---------------------------------------------
    */

    if (
      updated ===
      "FORBIDDEN"
    ) {
      return res.status(403).json({
        error:
          "You can only update orders belonging to your center",
      });
    }

    /*
    ---------------------------------------------
    ORDER NOT FOUND
    ---------------------------------------------
    */

    if (!updated) {
      return res.status(404).json({
        error:
          "Order not found",
      });
    }

    const db = readDb();

    res.json({
      order: enrich(
        updated,
        db
      ),
    });
  }
);

export default router;