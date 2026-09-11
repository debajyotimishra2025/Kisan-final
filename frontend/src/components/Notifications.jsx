import React, { useEffect, useState } from "react";
import api from "../api.js";
import { useAuth } from "../auth/AuthContext.jsx";

export default function Notifications() {
    const { token } = useAuth();

    const [notifications, setNotifications] =
        useState([]);

    const [loading, setLoading] =
        useState(true);

    const [error, setError] =
        useState("");

    useEffect(() => {
        if (!token) return;

        setLoading(true);

        api.notifications(token)
            .then((data) => {
                setNotifications(
                    data.notifications || []
                );
            })
            .catch((err) => {
                console.error(err);
                setError(
                    err.message ||
                    "Failed to load notifications"
                );
            })
            .finally(() => {
                setLoading(false);
            });
    }, [token]);

    async function markAsRead(notificationId) {
        try {
            await api.markNotificationRead(
                notificationId,
                token
            );

            setNotifications((prev) =>
                prev.map((notification) =>
                    notification.id ===
                        notificationId
                        ? {
                            ...notification,
                            read: true,
                        }
                        : notification
                )
            );
        } catch (err) {
            console.error(err);
        }
    }

    if (loading) {
        return (
            <div className="status-empty">
                Loading notifications...
            </div>
        );
    }

    if (error) {
        return (
            <div className="status-empty">
                {error}
            </div>
        );
    }

    return (
        <main
            style={{
                padding: "30px",
                maxWidth: "900px",
                margin: "0 auto",
            }}
        >
            <div
                style={{
                    background: "#B84A4D",
                    borderRadius: "18px",
                    padding: "20px",
                    marginBottom: "20px",
                }}
            >
                <h2
                    style={{
                        color: "#FFFFFF",
                        margin: 0,
                        fontSize: "28px",
                    }}
                >
                    Notifications
                </h2>
            </div>

            {notifications.length === 0 ? (
                <div
                    style={{
                        background: "#FBF7EE",
                        borderRadius: "16px",
                        padding: "35px",
                        textAlign: "center",
                        color: "#475569",
                    }}
                >
                    No notifications yet.
                </div>
            ) : (
                <div
                    style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: "12px",
                    }}
                >
                    {notifications.map(
                        (notification) => (
                            <div
                                key={notification.id}
                                style={{
                                    background:
                                        notification.read
                                            ? "#FBF7EE"
                                            : "#F4EFE3",

                                    borderRadius: "14px",
                                    padding: "18px",

                                    border: notification.read
                                        ? "1px solid #F1E8D8"
                                        : "2px solid #B84A4D",

                                    cursor:
                                        notification.read
                                            ? "default"
                                            : "pointer",
                                }}
                                onClick={() =>
                                    !notification.read &&
                                    markAsRead(
                                        notification.id
                                    )
                                }
                            >
                                <div
                                    style={{
                                        display: "flex",
                                        justifyContent:
                                            "space-between",
                                        alignItems:
                                            "flex-start",
                                        gap: "15px",
                                    }}
                                >
                                    <div>
                                        <h3
                                            style={{
                                                margin:
                                                    "0 0 7px",
                                                color:
                                                    "#7A3436",
                                                fontSize:
                                                    "18px",
                                            }}
                                        >
                                            {notification.title ||
                                                "Notification"}
                                        </h3>

                                        <p
                                            style={{
                                                margin: 0,
                                                color:
                                                    "#475569",
                                                fontSize:
                                                    "15px",
                                                lineHeight:
                                                    "1.5",
                                            }}
                                        >
                                            {notification.message}
                                        </p>

                                        {notification.createdAt && (
                                            <small
                                                style={{
                                                    display:
                                                        "block",
                                                    marginTop:
                                                        "10px",
                                                    color:
                                                        "#64748B",
                                                }}
                                            >
                                                {new Date(
                                                    notification.createdAt
                                                ).toLocaleString()}
                                            </small>
                                        )}
                                    </div>

                                    {!notification.read && (
                                        <span
                                            style={{
                                                background:
                                                    "#B84A4D",
                                                color:
                                                    "#FFFFFF",
                                                borderRadius:
                                                    "12px",
                                                padding:
                                                    "4px 9px",
                                                fontSize:
                                                    "11px",
                                                fontWeight:
                                                    "bold",
                                                whiteSpace:
                                                    "nowrap",
                                            }}
                                        >
                                            NEW
                                        </span>
                                    )}
                                </div>
                            </div>
                        )
                    )}
                </div>
            )}
        </main>
    );
}