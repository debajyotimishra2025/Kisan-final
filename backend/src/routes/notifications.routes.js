import { Router } from "express";
import { readDb, withDb } from "../db.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

router.get("/", requireAuth, (req, res) => {
    const db = readDb();

    const notifications = (db.notifications || [])
        .filter(
            (notification) =>
                notification.userId === req.user.id
        )
        .sort(
            (a, b) =>
                new Date(b.createdAt) -
                new Date(a.createdAt)
        );

    res.json({
        notifications,
    });
});

router.patch(
    "/:notificationId/read",
    requireAuth,
    (req, res) => {
        const { notificationId } = req.params;

        const db = readDb();

        const notification =
            db.notifications.find(
                (n) =>
                    n.id === notificationId &&
                    n.userId === req.user.id
            );

        if (!notification) {
            return res.status(404).json({
                error: "Notification not found",
            });
        }

        withDb((data) => {
            const item = data.notifications.find(
                (n) => n.id === notificationId
            );

            if (item) {
                item.read = true;
            }
        });

        res.json({
            message: "Notification marked as read",
        });
    }
);

export default router;