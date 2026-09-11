import React, {
  useCallback,
  useEffect,
  useState,
} from "react";

import api from "../api.js";
import { useAuth } from "../auth/AuthContext.jsx";

const NEXT_STATUS = {
  pending_slot: null,
  scheduled: "inspected",
  inspected: "accepted",
  accepted: "paid",
  rejected: null,
  paid: null,
};

const NEXT_LABEL = {
  scheduled: "Mark Inspected",
  inspected: "Accept Produce",
  accepted: "Mark Paid",
};

const STATUS_LABELS = {
  pending_slot: "Pending Slot",
  scheduled: "In Review",
  inspected: "Inspected",
  accepted: "Approved",
  rejected: "Rejected",
  paid: "Paid",
};

export default function AdminPage() {
  const {
    token,
    user,
  } = useAuth();

  const [orders, setOrders] =
    useState([]);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const [busyId, setBusyId] =
    useState("");

  const [paymentQr, setPaymentQr] =
    useState(null);

  const [paymentBusyId, setPaymentBusyId] =
    useState("");

  const load = useCallback(
    async () => {
      setError("");

      try {
        const data =
          await api.allOrders(
            token
          );

        setOrders(
          data.orders || []
        );
      } catch (err) {
        setError(
          err.message ||
            "Failed to load orders"
        );
      } finally {
        setLoading(false);
      }
    },
    [token]
  );

  useEffect(() => {
    load();

    const interval =
      setInterval(
        load,
        5000
      );

    return () =>
      clearInterval(
        interval
      );
  }, [load]);

  async function advance(order) {
    const next =
      NEXT_STATUS[
        order.status
      ];

    if (!next) return;

    // Payment is intentionally a separate QR flow.
    if (order.status === "accepted") {
      return createPaymentQr(order);
    }

    setBusyId(order.id);

    try {
      await api.updateOrderStatus(
        order.id,
        next,
        token
      );

      await load();
    } catch (err) {
      setError(
        err.message ||
          "Failed to update status"
      );
    } finally {
      setBusyId("");
    }
  }

  async function createPaymentQr(order) {
    setPaymentBusyId(order.id);
    setError("");

    try {
      const data =
        await api.createPaymentSession(
          order.id,
          token
        );

      const appOrigin =
        import.meta.env.VITE_PUBLIC_APP_URL ||
        window.location.origin;

      const paymentUrl =
        `${appOrigin}/payment/${order.id}?token=${encodeURIComponent(data.token)}`;

      // QR image is generated from the portal URL. The amount is never
      // taken from the QR itself; the payment portal fetches it from the server.
      const qrImage =
        `https://quickchart.io/qr?text=${encodeURIComponent(paymentUrl)}&size=320&margin=2`;

      setPaymentQr({
        order,
        paymentUrl,
        qrImage,
        expiresAt: data.expiresAt,
      });
    } catch (err) {
      setError(
        err.message ||
          "Failed to generate payment QR"
      );
    } finally {
      setPaymentBusyId("");
    }
  }

  async function reject(order) {
    setBusyId(order.id);

    try {
      await api.updateOrderStatus(
        order.id,
        "rejected",
        token
      );

      await load();
    } catch (err) {
      setError(
        err.message ||
          "Failed to reject order"
      );
    } finally {
      setBusyId("");
    }
  }

  const isMaster =
    user?.role ===
    "master_admin";

  const title = isMaster
    ? "Master Admin Dashboard"
    : `${user?.name || "Center"} Dashboard`;

  const subtitle = isMaster
    ? "All procurement centers"
    : `Only orders booked at your center`;

  return (
    <main className="status-page">

      <div className="status-header">

        <div>
          <h2>
            {title}
          </h2>

          <p
            style={{
              marginTop: 4,
              opacity: 0.7,
            }}
          >
            {subtitle}
          </p>
        </div>

        <button
          className="refresh-btn"
          onClick={load}
          type="button"
        >
          Refresh
        </button>

      </div>

      {loading && (
        <p className="status-empty">
          Loading orders…
        </p>
      )}

      {error && (
        <p className="auth-error">
          {error}
        </p>
      )}

      {!loading &&
        orders.length === 0 && (
          <p className="status-empty">
            No farmer requests found.
          </p>
        )}

      <div className="admin-table">

        {orders.map(
          (order) => (
            <div
              className="admin-row"
              key={order.id}
            >

              <div className="admin-row-main">

                <div>
                  <strong>
                    {order.farmerName}
                  </strong>

                  {" "}

                  <span>
                    ({order.farmerPhone})
                  </span>
                </div>

                <div className="status-crops">

                  {order.items
                    .map(
                      (it) =>
                        `${it.cropName} (${it.quantity}kg)`
                    )
                    .join(", ")}

                  {" — ₹"}

                  {Number(
                    order.finalAmount
                  ).toFixed(2)}

                </div>

                <div className="status-crops">

                  {order.appointment ? (
                    <>
                      {order.appointment.centerName}

                      {" · "}

                      {order.appointment.date}

                      {" · "}

                      {order.appointment.slot}
                    </>
                  ) : (
                    "No slot booked yet"
                  )}

                </div>

              </div>

              <div className="admin-row-actions">

                <span
                  className={`status-badge status-${order.status}`}
                >
                  {STATUS_LABELS[
                    order.status
                  ] ||
                    order.status}
                </span>

                {NEXT_STATUS[
                  order.status
                ] && (
                  <button
                    className="admin-action-btn"
                    disabled={
                      busyId ===
                      order.id
                    }
                    onClick={() =>
                      advance(order)
                    }
                    type="button"
                  >
                    {paymentBusyId === order.id
                      ? "Generating QR…"
                      : order.status === "accepted"
                        ? "Mark Paid"
                        : NEXT_LABEL[order.status]}
                  </button>
                )}

                {[
                  "scheduled",
                  "inspected",
                ].includes(
                  order.status
                ) && (
                  <button
                    className="admin-action-btn admin-reject-btn"
                    disabled={
                      busyId ===
                      order.id
                    }
                    onClick={() =>
                      reject(order)
                    }
                    type="button"
                  >
                    Reject
                  </button>
                )}

              </div>

            </div>
          )
        )}

      </div>

      {paymentQr && (
        <div
          className="payment-qr-overlay"
          onClick={() => setPaymentQr(null)}
        >
          <div
            className="payment-qr-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="payment-qr-close"
              type="button"
              onClick={() => setPaymentQr(null)}
              aria-label="Close"
            >
              ×
            </button>

            <h3>Payment QR Code</h3>
            <p className="payment-qr-subtitle">
              Ask the farmer to scan this QR code to open the secure payment portal.
            </p>

            <div className="payment-qr-amount">
              ₹{Number(paymentQr.order.finalAmount).toFixed(2)}
            </div>
            <div className="payment-qr-fixed">
              Fixed payable amount
            </div>

            <img
              src={paymentQr.qrImage}
              alt="Payment portal QR code"
              className="payment-qr-image"
            />

            <p className="payment-qr-expiry">
              QR valid for 15 minutes
            </p>

            <a
              className="payment-portal-link"
              href={paymentQr.paymentUrl}
              target="_blank"
              rel="noreferrer"
            >
              Open payment portal
            </a>

            <button
              className="admin-action-btn"
              type="button"
              onClick={() => setPaymentQr(null)}
            >
              Close
            </button>
          </div>
        </div>
      )}

    </main>
  );
}