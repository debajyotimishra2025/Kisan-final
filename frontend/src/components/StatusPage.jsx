import React, { useCallback, useEffect, useState } from "react";
import api from "../api.js";
import { useAuth } from "../auth/AuthContext.jsx";
import { useLanguage } from "../i18/LanguageContext.jsx";

const STATUS_STEPS = ["pending_slot", "scheduled", "inspected", "accepted", "paid"];

function cropLabel(t, item) {
  const keys = {
    "crop-rice": "rice",
    "crop-wheat": "wheat",
    "crop-corn": "corn",
    "crop-potato": "potato",
  };
  return keys[item.cropId] ? t(keys[item.cropId]) : item.cropName;
}

function centerLabel(t, appointment) {
  return t(`centerNames.${appointment.centerId}`) || appointment.centerName;
}

function statusLabel(t, status) {
  const labels = {
    pending_slot: t("awaitingSlotBooking"),
    scheduled: t("slotBookedAwaitingInspection"),
    inspected: t("inspectedDecisionPending"),
    accepted: t("acceptedForProcurement"),
    rejected: t("rejected"),
    paid: t("paymentSettled"),
  };
  return labels[status] || status;
}

function StatusBadge({ status, t }) {
  return <span className={`status-badge status-${status}`}>{statusLabel(t, status)}</span>;
}

function ProgressTrack({ status, t }) {
  if (status === "rejected") {
    return <div className="progress-track progress-rejected">{t("rejectedDuringInspection")}</div>;
  }
  const currentIndex = STATUS_STEPS.indexOf(status);
  return (
    <div className="progress-track">
      {STATUS_STEPS.map((step, i) => (
        <div key={step} className={`progress-dot ${i <= currentIndex ? "done" : ""}`} title={statusLabel(t, step)} />
      ))}
    </div>
  );
}

export default function StatusPage() {
  const { token } = useAuth();
  const { t } = useLanguage();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setError("");
    try {
      const data = await api.myOrders(token);
      setOrders(data.orders);
    } catch (err) {
      setError(err.message || t("failedToLoadOrders"));
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    load();
    const interval = setInterval(load, 8000); // poll so status updates by staff show up
    return () => clearInterval(interval);
  }, [load]);

  return (
    <main className="status-page">
      <div className="status-header">
        <h2>{t("yourProcurementStatus")}</h2>
        <button className="refresh-btn" onClick={load} type="button">
          {t("refresh")}
        </button>
      </div>

      {loading && <p className="status-empty">{t("loadingOrders")}</p>}
      {error && <p className="auth-error">{error}</p>}
      {!loading && orders.length === 0 && (
        <p className="status-empty">{t("noCropsSubmitted")}</p>
      )}

      <div className="status-list">
        {orders.map((order) => (
          <div className="status-card" key={order.id}>
            <div className="status-card-top">
              <div className="status-crops">
                {order.items.map((it) => `${cropLabel(t, it)} (${it.quantity}${t("kg")})`).join(", ")}
              </div>
              <StatusBadge status={order.status} t={t} />
            </div>

            <ProgressTrack status={order.status} t={t} />

            <div className="status-card-details">
              <span>{t("finalAmount")} ₹{order.finalAmount.toFixed(2)}</span>
              {order.appointment ? (
                <span>
                  {t("center")}: {centerLabel(t, order.appointment)} · {order.appointment.date} · {order.appointment.slot}
                </span>
              ) : (
                <span>{t("noSlotBooked")}</span>
              )}
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
