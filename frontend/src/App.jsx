// src/App.jsx

import React, { useEffect, useState } from "react";
import "./App.css";
import api from "./api.js";
import { useLanguage } from "./i18/LanguageContext.jsx";
import { AuthProvider, useAuth } from "./auth/AuthContext.jsx";
import AuthScreen from "./components/AuthScreen.jsx";
import LanguageScreen from "./components/LanguageScreen.jsx";
import StatusPage from "./components/StatusPage.jsx";
import AdminPage from "./components/AdminPage.jsx";
import Notifications from "./components/Notifications.jsx";

/* =========================================================
   CROP CARD
========================================================= */

function CropCard({
  crop,
  quantity,
  onQuantityChange,
  type,
  onTypeChange,
  selected,
}) {
  const { t } = useLanguage();

  const cropKey = {
    "crop-rice": "rice",
    "crop-wheat": "wheat",
    "crop-corn": "corn",
    "crop-potato": "potato",
  }[crop.id];

  const displayName = cropKey ? t(cropKey) : crop.name;

  return (
    <div className={`crop-card ${selected ? "selected-crop" : ""}`}>
      <div className="crop-name">{displayName}</div>

      <img
        src={crop.image}
        alt={displayName}
        className="crop-image"
      />

      <select
        className="select-type"
        value={type}
        onChange={(e) =>
          onTypeChange(crop.id, e.target.value)
        }
      >
        <option value="loose">
          {t("looseUnprocessed")}
        </option>

        <option value="packaged">
          {t("packagedLabelled")}
        </option>
      </select>

      <div className="price-box">
        <span>
          ₹ {crop.price} {t("per1Kg")}
        </span>

        <small>
          {t("excludingGst")}
        </small>
      </div>

      <input
        className="kg-input"
        type="number"
        min="0"
        step="0.01"
        value={quantity || ""}
        placeholder={t("amountInKg")}
        onChange={(e) =>
          onQuantityChange(
            crop.id,
            e.target.value
          )
        }
      />
    </div>
  );
}

/* =========================================================
   CENTER BOOKING
========================================================= */

function todayPlus(days) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function CenterBooking({
  pendingOrder,
  onBooked,
}) {
  const { token } = useAuth();
  const { t } = useLanguage();

  const [centers, setCenters] = useState([]);
  const [bookableOrders, setBookableOrders] =
    useState([]);

  const [activeOrderId, setActiveOrderId] =
    useState(
      pendingOrder
        ? pendingOrder.id
        : ""
    );

  const [selectedCenter, setSelectedCenter] =
    useState(null);

  const [date, setDate] =
    useState(todayPlus(1));

  const [slots, setSlots] = useState([]);
  const [loadingSlots, setLoadingSlots] =
    useState(false);

  const [error, setError] = useState("");
  const [booking, setBooking] =
    useState(false);

  useEffect(() => {
    api
      .getCenters()
      .then((data) =>
        setCenters(data.centers)
      )
      .catch((err) =>
        setError(err.message)
      );
  }, []);

  useEffect(() => {
    api
      .myOrders(token)
      .then((data) =>
        setBookableOrders(
          data.orders.filter(
            (o) =>
              o.status ===
              "pending_slot"
          )
        )
      )
      .catch(() => { });
  }, [token]);

  useEffect(() => {
    if (!selectedCenter || !date) {
      setSlots([]);
      return;
    }

    setLoadingSlots(true);

    api
      .getAvailability(
        selectedCenter.id,
        date
      )
      .then((data) =>
        setSlots(data.slots)
      )
      .catch((err) =>
        setError(err.message)
      )
      .finally(() =>
        setLoadingSlots(false)
      );
  }, [selectedCenter, date]);

  async function handleBook(slot) {
    if (!activeOrderId) {
      setError(
        t("chooseOrderForSlot")
      );
      return;
    }

    setError("");
    setBooking(true);

    try {
      await api.bookAppointment(
        {
          orderId: activeOrderId,
          centerId: selectedCenter.id,
          date,
          slot: slot.slot,
        },
        token
      );

      onBooked();
    } catch (err) {
      setError(
        err.message ||
        t("failedToBookSlot")
      );
    } finally {
      setBooking(false);
    }
  }

  return (
    <main>
      <section className="choose-section">
        <div className="choose-box">
          {t("chooseYourCenter")}
        </div>
      </section>

      {bookableOrders.length > 0 && (
        <section
          className="choose-section"
          style={{ marginTop: 0 }}
        >
          <label className="order-picker-label">
            {t("bookingSlotForOrder")}
          </label>

          <select
            className="select-type order-picker"
            value={activeOrderId}
            onChange={(e) =>
              setActiveOrderId(
                e.target.value
              )
            }
          >
            {bookableOrders.map((o) => (
              <option
                key={o.id}
                value={o.id}
              >
                {o.items
                  .map(
                    (it) =>
                      `${it.cropName} (${it.quantity}${t(
                        "kg"
                      )})`
                  )
                  .join(", ")}{" "}
                — ₹
                {o.finalAmount.toFixed(2)}
              </option>
            ))}
          </select>
        </section>
      )}

      {bookableOrders.length === 0 && (
        <p className="status-empty">
          {t("noOrdersAwaitingSlot")}
        </p>
      )}

      <section className="centers-section">
        <div className="centers-container">
          {centers.map((center) => (
            <div
              className={`center-card ${selectedCenter?.id ===
                center.id
                ? "selected-crop"
                : ""
                }`}
              key={center.id}
              onClick={() =>
                setSelectedCenter(
                  center
                )
              }
              style={{
                cursor: "pointer",
              }}
            >
              <div className="card-title">
                {t(
                  `centerNames.${center.id}`
                )}
              </div>

              <div
                className="card-content"
                style={{
                  padding:
                    "14px 18px",
                }}
              >
                <p
                  style={{
                    fontSize: 14,
                    marginBottom: 10,
                  }}
                >
                  {t(
                    `centerAddresses.${center.id}`
                  )}
                </p>

                {selectedCenter?.id ===
                  center.id && (
                    <div
                      className="slot-panel"
                      onClick={(e) =>
                        e.stopPropagation()
                      }
                    >
                      <input
                        className="date-input"
                        type="date"
                        min={todayPlus(0)}
                        value={date}
                        onChange={(e) =>
                          setDate(
                            e.target.value
                          )
                        }
                      />

                      {loadingSlots && (
                        <p className="status-empty">
                          {t(
                            "loadingSlots"
                          )}
                        </p>
                      )}

                      <div className="slot-grid">
                        {slots.map((s) => (
                          <button
                            key={s.slot}
                            type="button"
                            className="slot-btn"
                            disabled={
                              s.available <=
                              0 ||
                              booking
                            }
                            onClick={() =>
                              handleBook(s)
                            }
                            title={`${s.available} ${t(
                              "of"
                            )} ${s.capacity} ${t(
                              "spotsLeft"
                            )}`}
                          >
                            {s.slot}

                            <small>
                              {s.available >
                                0
                                ? `${s.available} ${t(
                                  "left"
                                )}`
                                : t(
                                  "full"
                                )}
                            </small>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
              </div>
            </div>
          ))}
        </div>
      </section>

      {error && (
        <p
          className="auth-error"
          style={{
            margin: "0 28px",
          }}
        >
          {error}
        </p>
      )}
    </main>
  );
}

/* =========================================================
   SELL CROPS
========================================================= */

function SellCrops({
  onFinalized,
  onInfoClick,
}) {
  const { token } = useAuth();
  const { t } = useLanguage();

  const [crops, setCrops] = useState([]);
  const [quantities, setQuantities] =
    useState({});
  const [types, setTypes] = useState({});
  const [error, setError] = useState("");
  const [submitting, setSubmitting] =
    useState(false);

  useEffect(() => {
    api
      .getCrops()
      .then((data) =>
        setCrops(data.crops)
      )
      .catch((err) =>
        setError(err.message)
      );
  }, []);

  function handleQuantityChange(
    cropId,
    value
  ) {
    setQuantities((prev) => ({
      ...prev,
      [cropId]:
        Number(value) || 0,
    }));
  }

  function handleTypeChange(
    cropId,
    value
  ) {
    setTypes((prev) => ({
      ...prev,
      [cropId]: value,
    }));
  }

  const gross = crops.reduce(
    (total, crop) => {
      const quantity =
        Number(
          quantities[crop.id]
        ) || 0;

      return (
        total +
        quantity * crop.price
      );
    },
    0
  );

  const gstRate = 0;

  const gstAmount =
    gross * (gstRate / 100);

  const finalAmount =
    gross + gstAmount;

  const selectedCrops =
    crops.filter(
      (crop) =>
        Number(
          quantities[crop.id]
        ) > 0
    );

  async function handleFinalize() {
    if (
      selectedCrops.length ===
      0
    ) {
      setError(
        t(
          "addQuantityBeforeFinalize"
        )
      );
      return;
    }

    setError("");
    setSubmitting(true);

    try {
      const items =
        selectedCrops.map(
          (crop) => ({
            cropId: crop.id,
            quantity:
              Number(
                quantities[
                crop.id
                ]
              ),
            type:
              types[crop.id] ||
              "loose",
          })
        );

      const data =
        await api.createOrder(
          items,
          token
        );

      onFinalized(data.order);
    } catch (err) {
      setError(
        err.message ||
        t(
          "failedToSubmitOrder"
        )
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="main-container">
      <section className="left-section">
        <div className="choose-box">
          <div className="selected-crops">
            {selectedCrops.length ===
              0 ? (
              <span className="choose-placeholder">
                {t(
                  "chooseYourCrop"
                )}
              </span>
            ) : (
              selectedCrops.map(
                (crop) => (
                  <span
                    className="selected-crop-name"
                    key={crop.id}
                  >
                    {t(
                      crop.id.replace(
                        "crop-",
                        ""
                      )
                    )}
                  </span>
                )
              )
            )}
          </div>
        </div>

        <div className="grand-total">
          <div className="total-heading">
            <span>
              {t("grandTotal")}
            </span>

            <button
              className="info"
              type="button"
              onClick={
                onInfoClick
              }
            >
              i
            </button>
          </div>

          <div className="amount-row">
            <div className="amount-card">
              <div className="amount-title">
                <p>
                  {t("gross")}
                </p>
              </div>

              <div className="amount-value">
                ₹{" "}
                {gross.toFixed(
                  2
                )}
              </div>
            </div>

            <div className="amount-card">
              <div className="amount-title">
                {t("final")}
              </div>

              <div className="amount-value">
                ₹{" "}
                {finalAmount.toFixed(
                  2
                )}
              </div>
            </div>
          </div>

          <div className="gst-info">
            {t("gst")}:{" "}
            {gstRate}%
          </div>

          {error && (
            <div className="finalize-error">
              {error}
            </div>
          )}

          <button
            className="finalize"
            onClick={
              handleFinalize
            }
            disabled={
              submitting
            }
          >
            {submitting
              ? t(
                "submitting"
              )
              : t("finalize")}
          </button>
        </div>
      </section>

      <section className="crop-container">
        {crops.map((crop) => (
          <CropCard
            key={crop.id}
            crop={crop}
            quantity={
              quantities[
              crop.id
              ] || 0
            }
            type={
              types[crop.id] ||
              "loose"
            }
            onQuantityChange={
              handleQuantityChange
            }
            onTypeChange={
              handleTypeChange
            }
            selected={
              Number(
                quantities[
                crop.id
                ]
              ) > 0
            }
          />
        ))}
      </section>
    </main>
  );
}

/* =========================================================
   TAX & POLICY MODAL
========================================================= */

function TaxPolicyModal({
  onClose,
}) {
  const { t } = useLanguage();

  return (
    <div
      className="policy-overlay"
      onClick={onClose}
    >
      <div
        className="policy-modal"
        onClick={(e) =>
          e.stopPropagation()
        }
      >
        <div className="policy-header">
          <div>
            <h2>
              {t("policyTitle")}
            </h2>

            <p>
              {t(
                "policySubtitle"
              )}
            </p>
          </div>

          <button
            className="policy-close"
            onClick={onClose}
          >
            ×
          </button>
        </div>

        <div className="policy-content">
          <section className="policy-section">
            <h3>
              {t(
                "taxGuidelines"
              )}
            </h3>

            <p>
              {t("taxIntro")}
            </p>

            <ul>
              <li>
                {t(
                  "taxBullet1"
                )}
              </li>

              <li>
                {t(
                  "taxBullet2"
                )}
              </li>

              <li>
                {t(
                  "taxBullet3"
                )}
              </li>

              <li>
                {t(
                  "taxBullet4"
                )}
              </li>
            </ul>
          </section>

          <section className="policy-section">
            <h3>
              {t(
                "pricingPolicy"
              )}
            </h3>

            <ul>
              <li>
                {t(
                  "pricingBullet1"
                )}
              </li>

              <li>
                {t(
                  "pricingBullet2"
                )}
              </li>

              <li>
                {t(
                  "pricingBullet3"
                )}
              </li>
            </ul>
          </section>

          <section className="policy-section">
            <h3>
              {t(
                "qualityPolicy"
              )}
            </h3>

            <ul>
              <li>
                {t(
                  "qualityBullet1"
                )}
              </li>

              <li>
                {t(
                  "qualityBullet2"
                )}
              </li>

              <li>
                {t(
                  "qualityBullet3"
                )}
              </li>
            </ul>
          </section>

          <section className="policy-section">
            <h3>
              {t(
                "paymentPolicy"
              )}
            </h3>

            <ul>
              <li>
                {t(
                  "paymentBullet1"
                )}
              </li>

              <li>
                {t(
                  "paymentBullet2"
                )}
              </li>

              <li>
                {t(
                  "paymentBullet3"
                )}
              </li>
            </ul>
          </section>

          <section className="policy-disclaimer">
            <strong>
              {t("disclaimer")}
            </strong>

            <p>
              {t(
                "disclaimerText"
              )}
            </p>
          </section>
        </div>

        <div className="policy-footer">
          <button
            className="policy-ok"
            onClick={onClose}
          >
            {t("iUnderstand")}
          </button>
        </div>
      </div>
    </div>
  );
}

/* =========================================================
   MAIN APP
========================================================= */

function AppShell() {
  const {
    user,
    logout,
    token,
  } = useAuth();

  const { t } = useLanguage();

  // Notification state
  const [notifications, setNotifications] =
    useState([]);

  const isFarmer =
    user?.role === "farmer";

  // Load farmer notifications
  useEffect(() => {
    if (!isFarmer || !token) return;

    api.notifications(token)
      .then((data) => {
        setNotifications(
          data.notifications || []
        );
      })
      .catch((err) => {
        console.error(
          "Failed to load notifications:",
          err
        );
      });
  }, [isFarmer, token]);

  const isAdmin =
    user?.role === "master_admin" ||
    user?.role === "center_admin";

  const [page, setPage] =
    useState(
      isFarmer
        ? "sell"
        : "admin"
    );

  const [
    pendingOrder,
    setPendingOrder,
  ] = useState(null);

  const [
    showPolicy,
    setShowPolicy,
  ] = useState(false);

  return (
    <div className="app">
      <nav className="navbar">

        <div className="logo">
          KISAN
        </div>

        <div className="nav-links">

          {isFarmer && (
            <>
              <button
                type="button"
                onClick={() =>
                  setPage("notifications")
                }
                style={{
                  position: "relative",
                  background: "transparent",
                  border: "none",
                  color: "inherit",
                  fontSize: "22px",
                  cursor: "pointer",
                  padding: "8px 12px",
                }}
                title="Notifications"
              >
                🔔
                {notifications.filter(
                  (notification) => !notification.read
                ).length > 0 && (
                  <span
                    style={{
                      position: "absolute",
                      top: "1px",
                      right: "3px",
                      background: "#B84A4D",
                      color: "#FFFFFF",
                      borderRadius: "50%",
                      minWidth: "18px",
                      height: "18px",
                      fontSize: "11px",
                      fontWeight: "700",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    {notifications.filter(
                      (notification) => !notification.read
                    ).length}
                  </span>
                )}
              </button>

              <button
                className={
                  page === "sell"
                    ? "active"
                    : ""
                }
                onClick={() =>
                  setPage("sell")
                }
              >
                {t("sellCrops")}
              </button>

              <button
                className={
                  page ===
                    "appointment"
                    ? "active"
                    : ""
                }
                onClick={() =>
                  setPage(
                    "appointment"
                  )
                }
              >
                {t(
                  "appointments"
                )}
              </button>

              <button
                className={
                  page === "status"
                    ? "active"
                    : ""
                }
                onClick={() =>
                  setPage("status")
                }
              >
                {t("myStatus")}
              </button>
            </>
          )}

          {isAdmin && (
            <button
              className={
                page === "admin"
                  ? "active"
                  : ""
              }
              onClick={() =>
                setPage("admin")
              }
            >
              {user?.role ===
                "master_admin"
                ? t(
                  "masterDashboard"
                )
                : t(
                  "centerDashboard"
                )}
            </button>
          )}

        </div>

        <div className="username">

          {user?.name}

          {user?.role ===
            "center_admin" && (
              <span
                style={{
                  marginLeft: 8,
                  fontSize: 12,
                  opacity: 0.75,
                }}
              >
                {t("centerAdmin")}
              </span>
            )}

          {user?.role ===
            "master_admin" && (
              <span
                style={{
                  marginLeft: 8,
                  fontSize: 12,
                  opacity: 0.75,
                }}
              >
                {t("masterAdmin")}
              </span>
            )}

          <button
            className="logout-btn"
            onClick={logout}
            type="button"
          >
            Log out
          </button>

        </div>

      </nav>

      {isFarmer &&
        page === "sell" && (
          <SellCrops
            onFinalized={(order) => {
              setPendingOrder(
                order
              );

              setPage(
                "appointment"
              );
            }}
            onInfoClick={() =>
              setShowPolicy(true)
            }
          />
        )}

      {isFarmer &&
        page ===
        "appointment" && (
          <CenterBooking
            pendingOrder={
              pendingOrder
            }
            onBooked={() => {
              setPendingOrder(
                null
              );

              setPage(
                "status"
              );
            }}
          />
        )}

      {isFarmer &&
        page === "status" && (
          <StatusPage />
        )}

      {isFarmer &&
        page === "notifications" && (
          <Notifications />
        )}

      {isAdmin &&
        page === "admin" && (
          <AdminPage />
        )}

      {showPolicy && (
        <TaxPolicyModal
          onClose={() =>
            setShowPolicy(
              false
            )
          }
        />
      )}

      <div className="waves">
        <div className="wave wave-one"></div>
        <div className="wave wave-two"></div>
        <div className="wave wave-three"></div>
        <div className="wave wave-four"></div>
      </div>
    </div>
  );
}

/* =========================================================
   LANGUAGE + AUTH GATE
========================================================= */

function Gate() {
  const {
    user,
    loading,
  } = useAuth();

  const { t } = useLanguage();

  const [
    language,
    setLanguage,
  ] = useState(() =>
    localStorage.getItem(
      "kisan_language"
    )
  );

  function handleLanguageSelect(
    selectedLanguage
  ) {
    localStorage.setItem(
      "kisan_language",
      selectedLanguage
    );

    setLanguage(
      selectedLanguage
    );
  }

  function changeLanguage() {
    localStorage.removeItem(
      "kisan_language"
    );

    setLanguage(null);
  }

  if (!language) {
    return (
      <LanguageScreen
        onSelect={
          handleLanguageSelect
        }
      />
    );
  }

  if (loading) {
    return (
      <div
        className="status-empty"
        style={{
          padding: 60,
        }}
      >
        {t("loading")}
      </div>
    );
  }

  return user ? (
    <AppShell />
  ) : (
    <AuthScreen
      language={language}
      onChangeLanguage={
        changeLanguage
      }
    />
  );
}

/* =========================================================
   QR PAYMENT PORTAL
========================================================= */

function PaymentPortal() {
  const [payment, setPayment] = useState(null);
  const [method, setMethod] = useState("");
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState("");
  const [receipt, setReceipt] = useState(null);

  const parts = window.location.pathname.split("/").filter(Boolean);
  const orderId = parts[1];
  const paymentToken = new URLSearchParams(window.location.search).get("token");

  useEffect(() => {
    if (!orderId || !paymentToken) {
      setError("This payment QR is invalid or incomplete.");
      setLoading(false);
      return;
    }

    api
      .getPaymentPortal(orderId, paymentToken)
      .then((data) => {
        setPayment(data);
        if (data.status === "paid") {
          setReceipt({ transactionId: "Already paid" });
        }
      })
      .catch((err) => setError(err.message || "Unable to open payment portal"))
      .finally(() => setLoading(false));
  }, [orderId, paymentToken]);

  async function payNow() {
    if (!method || !payment) return;

    setPaying(true);
    setError("");

    try {
      const data = await api.completePayment(
        orderId,
        paymentToken,
        method
      );
      setReceipt({ transactionId: data.transactionId });
      setPayment((prev) => ({ ...prev, status: "paid" }));
    } catch (err) {
      setError(err.message || "Payment could not be completed");
    } finally {
      setPaying(false);
    }
  }

  if (loading) {
    return (
      <main className="payment-portal-page">
        <div className="payment-portal-card">
          <p className="payment-portal-loading">Opening secure payment portal…</p>
        </div>
      </main>
    );
  }

  if (error && !payment) {
    return (
      <main className="payment-portal-page">
        <div className="payment-portal-card">
          <div className="payment-portal-brand">KISAN</div>
          <h1>Payment portal unavailable</h1>
          <p className="payment-portal-error">{error}</p>
        </div>
      </main>
    );
  }

  if (receipt) {
    return (
      <main className="payment-portal-page">
        <div className="payment-portal-card payment-success-card">
          <div className="payment-portal-brand">KISAN</div>
          <div className="payment-success-icon">✓</div>
          <h1>Payment successful</h1>
          <p>Your payment of</p>
          <div className="payment-success-amount">
            ₹{Number(payment.amount).toFixed(2)}
          </div>
          <p>has been recorded successfully.</p>
          <div className="payment-receipt">
            <span>Transaction ID</span>
            <strong>{receipt.transactionId}</strong>
          </div>
          <p className="payment-portal-note">
            You can close this page now.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="payment-portal-page">
      <div className="payment-portal-card">
        <div className="payment-portal-brand">KISAN</div>
        <div className="payment-portal-secure">🔒 Secure payment portal</div>

        <h1>Crop Procurement Payment</h1>
        <p className="payment-portal-greeting">
          Hello {payment.farmerName}, your approved procurement amount is fixed below.
        </p>

        <div className="payment-fixed-box">
          <span>Amount to be paid</span>
          <strong>₹{Number(payment.amount).toFixed(2)}</strong>
          <small>This amount is fixed by KISAN and cannot be edited.</small>
        </div>

        <div className="payment-summary">
          {payment.items.map((item, index) => (
            <div key={`${item.cropName}-${index}`}>
              <span>{item.cropName} ({item.quantity} kg)</span>
            </div>
          ))}
          {payment.appointment?.centerName && (
            <div>
              <span>Procurement center</span>
              <strong>{payment.appointment.centerName}</strong>
            </div>
          )}
        </div>

        <h2>Choose payment method</h2>

        <div className="payment-methods">
          {[
            ["upi", "UPI", "Pay using UPI apps"],
            ["card", "Debit / Credit Card", "Visa, Mastercard and more"],
            ["netbanking", "Net Banking", "Pay through your bank"],
          ].map(([value, title, description]) => (
            <button
              key={value}
              type="button"
              className={`payment-method ${method === value ? "selected-payment-method" : ""}`}
              onClick={() => setMethod(value)}
            >
              <strong>{title}</strong>
              <span>{description}</span>
            </button>
          ))}
        </div>

        {error && <p className="payment-portal-error">{error}</p>}

        <button
          className="payment-pay-btn"
          type="button"
          disabled={!method || paying}
          onClick={payNow}
        >
          {paying
            ? "Processing payment…"
            : `Pay ₹${Number(payment.amount).toFixed(2)}`}
        </button>

        <p className="payment-portal-note">
          Demo payment flow: connect a live payment gateway before production use.
        </p>
      </div>
    </main>
  );
}

/* =========================================================
   APP
========================================================= */

export default function App() {
  if (window.location.pathname.startsWith("/payment/")) {
    return <PaymentPortal />;
  }

  return (
    <AuthProvider>
      <Gate />
    </AuthProvider>
  );
}