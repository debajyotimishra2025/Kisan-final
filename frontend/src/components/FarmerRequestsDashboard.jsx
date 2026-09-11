import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Search,
  ChevronDown,
  Check,
  X,
  Clock,
  RotateCcw,
  Sprout,
} from "lucide-react";

import api from "../api.js";
import { useAuth } from "../auth/AuthContext.jsx";


/* =========================================================
   STATUS CONFIG
========================================================= */

const STATUS_STYLE = {
  pending_slot: {
    label: "Pending",
    fg: "#8A5A00",
    bg: "#F5ECD9",
    icon: Clock,
  },

  scheduled: {
    label: "In review",
    fg: "#475569",
    bg: "#F5F7F9",
    icon: RotateCcw,
  },

  inspected: {
    label: "In review",
    fg: "#475569",
    bg: "#F5F7F9",
    icon: RotateCcw,
  },

  accepted: {
    label: "Approved",
    fg: "#4F7D63",
    bg: "#EAF3EE",
    icon: Check,
  },

  paid: {
    label: "Approved",
    fg: "#4F7D63",
    bg: "#EAF3EE",
    icon: Check,
  },

  rejected: {
    label: "Rejected",
    fg: "#B84A4D",
    bg: "#F8E8E8",
    icon: X,
  },
};


/* =========================================================
   STATUS PILL
========================================================= */

function StatusPill({ status }) {
  const config =
    STATUS_STYLE[status] || STATUS_STYLE.pending_slot;

  const Icon = config.icon;

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "6px",
        padding: "4px 10px",
        borderRadius: "5px",
        fontSize: "13px",
        fontWeight: 600,
        color: config.fg,
        background: config.bg,
        whiteSpace: "nowrap",
      }}
    >
      <Icon size={13} strokeWidth={2.4} />
      {config.label}
    </span>
  );
}


/* =========================================================
   MAIN DASHBOARD
========================================================= */

export default function FarmerRequestsDashboard() {
  const { token } = useAuth();

  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("All");
  const [openId, setOpenId] = useState(null);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState("");


  /* =======================================================
     LOAD REAL ORDERS FROM BACKEND
  ======================================================= */

  const loadOrders = useCallback(async () => {
    setError("");

    try {
      const data = await api.allOrders(token);

      setOrders(data.orders || []);
    } catch (err) {
      setError(
        err.message || "Failed to load farmer orders"
      );
    } finally {
      setLoading(false);
    }
  }, [token]);


  /* =======================================================
     LOAD ON PAGE OPEN + AUTO REFRESH
  ======================================================= */

  useEffect(() => {
    loadOrders();

    // Check for new farmer orders every 5 seconds
    const interval = setInterval(() => {
      loadOrders();
    }, 5000);

    return () => clearInterval(interval);
  }, [loadOrders]);


  /* =======================================================
     STATUS COUNTS
  ======================================================= */

  const counts = useMemo(() => {
    return {
      All: orders.length,

      Pending: orders.filter(
        (o) => o.status === "pending_slot"
      ).length,

      "In review": orders.filter(
        (o) =>
          o.status === "scheduled" ||
          o.status === "inspected"
      ).length,

      Approved: orders.filter(
        (o) =>
          o.status === "accepted" ||
          o.status === "paid"
      ).length,

      Rejected: orders.filter(
        (o) => o.status === "rejected"
      ).length,
    };
  }, [orders]);


  /* =======================================================
     FILTER ORDERS
  ======================================================= */

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();

    return orders.filter((order) => {
      const statusLabel =
        STATUS_STYLE[order.status]?.label || "";

      let matchesStatus = true;

      if (filter === "Pending") {
        matchesStatus =
          order.status === "pending_slot";
      }

      if (filter === "In review") {
        matchesStatus =
          order.status === "scheduled" ||
          order.status === "inspected";
      }

      if (filter === "Approved") {
        matchesStatus =
          order.status === "accepted" ||
          order.status === "paid";
      }

      if (filter === "Rejected") {
        matchesStatus =
          order.status === "rejected";
      }

      const cropText = (order.items || [])
        .map((item) => item.cropName)
        .join(" ");

      const searchableText = `
        ${order.farmerName || ""}
        ${order.farmerPhone || ""}
        ${cropText}
        ${order.id || ""}
        ${order.appointment?.centerName || ""}
        ${order.appointment?.date || ""}
      `.toLowerCase();

      const matchesQuery =
        !q || searchableText.includes(q);

      return matchesStatus && matchesQuery;
    });
  }, [orders, filter, query]);


  /* =======================================================
     CHANGE STATUS
  ======================================================= */

  async function updateStatus(order, nextStatus) {
    setBusyId(order.id);
    setError("");

    try {
      await api.updateOrderStatus(
        order.id,
        nextStatus,
        token
      );

      await loadOrders();
    } catch (err) {
      setError(
        err.message || "Failed to update order status"
      );
    } finally {
      setBusyId("");
    }
  }


  /* =======================================================
     NEXT STATUS
  ======================================================= */

  function getNextStatus(status) {
    if (status === "scheduled") {
      return "inspected";
    }

    if (status === "inspected") {
      return "accepted";
    }

    if (status === "accepted") {
      return "paid";
    }

    return null;
  }


  function getNextLabel(status) {
    if (status === "scheduled") {
      return "Mark Inspected";
    }

    if (status === "inspected") {
      return "Accept Produce";
    }

    if (status === "accepted") {
      return "Mark Paid";
    }

    return null;
  }


  /* =======================================================
     FORMAT CROPS
  ======================================================= */

  function getCropText(order) {
    if (!order.items || order.items.length === 0) {
      return "No crop information";
    }

    return order.items
      .map(
        (item) =>
          `${item.cropName} (${item.quantity}kg)`
      )
      .join(", ");
  }


  /* =======================================================
     FORMAT DATE
  ======================================================= */

  function formatDate(date) {
    if (!date) return "-";

    const d = new Date(date);

    if (Number.isNaN(d.getTime())) {
      return date;
    }

    return d.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
    });
  }


  /* =======================================================
     RENDER
  ======================================================= */

  return (
    <div
      style={{
        fontFamily:
          "'IBM Plex Sans', ui-sans-serif, sans-serif",
        background: "#F5F7F9",
        minHeight: "100vh",
        color: "#475569",
        padding: "40px 24px",
      }}
    >

      <div
        style={{
          maxWidth: "1080px",
          margin: "0 auto",
        }}
      >

        {/* =================================================
            HEADER
        ================================================= */}

        <div
          style={{
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "space-between",
            marginBottom: "28px",
            borderBottom: "2px solid #475569",
            paddingBottom: "20px",
            flexWrap: "wrap",
            gap: "12px",
          }}
        >

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "12px",
            }}
          >

            <div
              style={{
                width: "38px",
                height: "38px",
                borderRadius: "8px",
                background: "#475569",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <Sprout
                size={20}
                color="#F5F7F9"
                strokeWidth={2}
              />
            </div>

            <div>

              <h1
                style={{
                  fontFamily:
                    "'Fraunces', Georgia, serif",
                  fontSize: "28px",
                  fontWeight: 600,
                  margin: 0,
                  letterSpacing: "-0.01em",
                }}
              >
                Farmer requests
              </h1>

              <p
                style={{
                  margin: "2px 0 0",
                  fontSize: "14px",
                  color: "#64748B",
                }}
              >
                Live farmer orders from the KISAN system
              </p>

            </div>

          </div>


          {/* COUNTS */}

          <div
            style={{
              display: "flex",
              gap: "18px",
              fontSize: "13px",
              color: "#64748B",
            }}
          >

            {["Pending", "In review", "Approved", "Rejected"].map(
              (status) => {

                const color =
                  status === "Pending"
                    ? "#8A5A00"
                    : status === "In review"
                    ? "#475569"
                    : status === "Approved"
                    ? "#4F7D63"
                    : "#B84A4D";

                return (
                  <div
                    key={status}
                    style={{ textAlign: "right" }}
                  >
                    <div
                      style={{
                        fontSize: "20px",
                        fontWeight: 600,
                        color,
                      }}
                    >
                      {counts[status]}
                    </div>

                    {status}
                  </div>
                );
              }
            )}

          </div>

        </div>


        {/* =================================================
            ERROR
        ================================================= */}

        {error && (
          <div
            style={{
              background: "#F8E8E8",
              color: "#B84A4D",
              border: "1px solid #E8C7C8",
              borderRadius: "7px",
              padding: "10px 14px",
              marginBottom: "15px",
              fontSize: "14px",
            }}
          >
            {error}
          </div>
        )}


        {/* =================================================
            CONTROLS
        ================================================= */}

        <div
          style={{
            display: "flex",
            gap: "10px",
            marginBottom: "18px",
            flexWrap: "wrap",
          }}
        >

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              background: "#FFFFFF",
              border: "1px solid #E2E8F0",
              borderRadius: "7px",
              padding: "8px 12px",
              flex: "1 1 240px",
            }}
          >

            <Search
              size={16}
              color="#94A3B8"
            />

            <input
              value={query}
              onChange={(e) =>
                setQuery(e.target.value)
              }
              placeholder="Search by farmer, crop, phone or ID"
              style={{
                border: "none",
                outline: "none",
                fontSize: "14px",
                width: "100%",
                background: "transparent",
                fontFamily: "inherit",
                color: "#475569",
              }}
            />

          </div>


          <div
            style={{
              display: "flex",
              gap: "6px",
              flexWrap: "wrap",
            }}
          >

            {[
              "All",
              "Pending",
              "In review",
              "Approved",
              "Rejected",
            ].map((status) => (

              <button
                key={status}
                onClick={() => setFilter(status)}
                style={{
                  padding: "8px 14px",
                  borderRadius: "7px",
                  fontSize: "13.5px",
                  fontWeight: 600,
                  border:
                    filter === status
                      ? "1px solid #475569"
                      : "1px solid #E2E8F0",
                  background:
                    filter === status
                      ? "#475569"
                      : "#FFFFFF",
                  color:
                    filter === status
                      ? "#F5F7F9"
                      : "#64748B",
                  cursor: "pointer",
                }}
              >
                {status}
              </button>

            ))}

          </div>


          {/* REFRESH */}

          <button
            onClick={loadOrders}
            disabled={loading}
            style={{
              padding: "8px 14px",
              borderRadius: "7px",
              border: "1px solid #475569",
              background: "#475569",
              color: "#F5F7F9",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            {loading ? "Loading..." : "Refresh"}
          </button>

        </div>


        {/* =================================================
            TABLE
        ================================================= */}

        <div
          style={{
            background: "#FFFFFF",
            border: "1px solid #E2E8F0",
            borderRadius: "9px",
            overflow: "hidden",
          }}
        >

          {/* TABLE HEADER */}

          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "1.4fr 1.7fr 1fr 1fr 1.2fr auto",
              padding: "12px 18px",
              fontSize: "12.5px",
              color: "#94A3B8",
              borderBottom:
                "1px solid #F4EFE3",
              fontWeight: 600,
            }}
          >
            <div>Farmer</div>
            <div>Crop / Order</div>
            <div>Amount</div>
            <div>Submitted</div>
            <div>Status</div>
            <div></div>
          </div>


          {/* LOADING */}

          {loading && orders.length === 0 && (
            <div
              style={{
                padding: "40px 18px",
                textAlign: "center",
                color: "#94A3B8",
                fontSize: "14px",
              }}
            >
              Loading farmer orders...
            </div>
          )}


          {/* NO ORDERS */}

          {!loading && filtered.length === 0 && (
            <div
              style={{
                padding: "40px 18px",
                textAlign: "center",
                color: "#94A3B8",
                fontSize: "14px",
              }}
            >
              No farmer orders match this search.
            </div>
          )}


          {/* ORDERS */}

          {filtered.map((order) => {

            const isOpen =
              openId === order.id;

            const nextStatus =
              getNextStatus(order.status);

            const nextLabel =
              getNextLabel(order.status);

            return (

              <div
                key={order.id}
                style={{
                  borderBottom:
                    "1px solid #F4EFE3",
                }}
              >

                {/* MAIN ROW */}

                <div
                  onClick={() =>
                    setOpenId(
                      isOpen
                        ? null
                        : order.id
                    )
                  }
                  style={{
                    display: "grid",
                    gridTemplateColumns:
                      "1.4fr 1.7fr 1fr 1fr 1.2fr auto",
                    padding: "14px 18px",
                    alignItems: "center",
                    cursor: "pointer",
                    fontSize: "14px",
                  }}
                >

                  {/* FARMER */}

                  <div>

                    <div
                      style={{
                        fontWeight: 600,
                      }}
                    >
                      {order.farmerName}
                    </div>

                    <div
                      style={{
                        fontSize: "12.5px",
                        color: "#94A3B8",
                      }}
                    >
                      {order.farmerPhone}
                    </div>

                  </div>


                  {/* CROPS */}

                  <div>

                    <div>
                      {getCropText(order)}
                    </div>

                    {order.appointment && (
                      <div
                        style={{
                          fontSize: "12px",
                          color: "#94A3B8",
                          marginTop: "4px",
                        }}
                      >
                        {order.appointment.centerName}
                        {" · "}
                        {order.appointment.date}
                        {" · "}
                        {order.appointment.slot}
                      </div>
                    )}

                  </div>


                  {/* AMOUNT */}

                  <div
                    style={{
                      color: "#64748B",
                    }}
                  >
                    ₹
                    {Number(
                      order.finalAmount || 0
                    ).toFixed(2)}
                  </div>


                  {/* DATE */}

                  <div
                    style={{
                      color: "#64748B",
                    }}
                  >
                    {formatDate(
                      order.createdAt ||
                      order.date ||
                      order.created_at
                    )}
                  </div>


                  {/* STATUS */}

                  <div>
                    <StatusPill
                      status={order.status}
                    />
                  </div>


                  {/* ARROW */}

                  <div
                    style={{
                      display: "flex",
                      justifyContent:
                        "flex-end",
                    }}
                  >
                    <ChevronDown
                      size={18}
                      color="#94A3B8"
                      style={{
                        transform: isOpen
                          ? "rotate(180deg)"
                          : "none",
                        transition:
                          "transform 0.15s ease",
                      }}
                    />
                  </div>

                </div>


                {/* =================================================
                    EXPANDED DETAILS
                ================================================= */}

                {isOpen && (

                  <div
                    style={{
                      padding:
                        "4px 18px 22px",
                      background: "#FAFBFC",
                    }}
                  >

                    {/* ORDER INFORMATION */}

                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns:
                          "repeat(3, 1fr)",
                        gap: "10px",
                        marginBottom: "16px",
                      }}
                    >

                      <div>
                        <div
                          style={{
                            fontSize: "12px",
                            color: "#94A3B8",
                          }}
                        >
                          Order ID
                        </div>

                        <strong>
                          {order.id}
                        </strong>
                      </div>


                      <div>
                        <div
                          style={{
                            fontSize: "12px",
                            color: "#94A3B8",
                          }}
                        >
                          Farmer
                        </div>

                        <strong>
                          {order.farmerName}
                        </strong>
                      </div>


                      <div>
                        <div
                          style={{
                            fontSize: "12px",
                            color: "#94A3B8",
                          }}
                        >
                          Phone
                        </div>

                        <strong>
                          {order.farmerPhone}
                        </strong>
                      </div>

                    </div>


                    {/* APPOINTMENT */}

                    <div
                      style={{
                        marginBottom: "16px",
                        padding: "12px",
                        background: "#FFFFFF",
                        border:
                          "1px solid #F4EFE3",
                        borderRadius: "7px",
                      }}
                    >

                      <div
                        style={{
                          fontSize: "12px",
                          color: "#94A3B8",
                          marginBottom: "5px",
                        }}
                      >
                        Appointment
                      </div>

                      {order.appointment ? (

                        <strong>
                          {order.appointment.centerName}
                          {" · "}
                          {order.appointment.date}
                          {" · "}
                          {order.appointment.slot}
                        </strong>

                      ) : (

                        <span
                          style={{
                            color: "#94A3B8",
                          }}
                        >
                          No slot booked yet
                        </span>

                      )}

                    </div>


                    {/* CROP DETAILS */}

                    <div
                      style={{
                        marginBottom: "16px",
                      }}
                    >

                      <div
                        style={{
                          fontSize: "13px",
                          color: "#94A3B8",
                          marginBottom: "8px",
                        }}
                      >
                        Crop details
                      </div>

                      {(order.items || []).map(
                        (item, index) => (

                          <div
                            key={index}
                            style={{
                              display: "flex",
                              justifyContent:
                                "space-between",
                              padding: "8px 10px",
                              background: "#FFFFFF",
                              borderBottom:
                                "1px solid #F4EFE3",
                            }}
                          >

                            <span>
                              {item.cropName}
                            </span>

                            <span>
                              {item.quantity} kg
                            </span>

                          </div>

                        )
                      )}

                    </div>


                    {/* STATUS ACTIONS */}

                    <div
                      style={{
                        display: "flex",
                        gap: "8px",
                        flexWrap: "wrap",
                        alignItems: "center",
                      }}
                    >

                      <span
                        style={{
                          fontSize: "13px",
                          color: "#94A3B8",
                          marginRight: "4px",
                        }}
                      >
                        Staff action:
                      </span>


                      {nextStatus && (

                        <button
                          disabled={
                            busyId === order.id
                          }
                          onClick={(e) => {
                            e.stopPropagation();

                            updateStatus(
                              order,
                              nextStatus
                            );
                          }}
                          style={{
                            padding:
                              "7px 14px",
                            borderRadius: "6px",
                            border:
                              "1px solid #475569",
                            background:
                              "#475569",
                            color:
                              "#F5F7F9",
                            fontWeight: 600,
                            cursor:
                              "pointer",
                          }}
                        >
                          {busyId === order.id
                            ? "Updating..."
                            : nextLabel}
                        </button>

                      )}


                      {[
                        "scheduled",
                        "inspected",
                      ].includes(order.status) && (

                        <button
                          disabled={
                            busyId === order.id
                          }
                          onClick={(e) => {
                            e.stopPropagation();

                            updateStatus(
                              order,
                              "rejected"
                            );
                          }}
                          style={{
                            padding:
                              "7px 14px",
                            borderRadius: "6px",
                            border:
                              "1px solid #B84A4D",
                            background:
                              "#F8E8E8",
                            color:
                              "#B84A4D",
                            fontWeight: 600,
                            cursor:
                              "pointer",
                          }}
                        >
                          Reject
                        </button>

                      )}

                    </div>

                  </div>

                )}

              </div>

            );
          })}

        </div>

      </div>

    </div>
  );
}