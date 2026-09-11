// src/components/AuthScreen.jsx

import React, { useState } from "react";
import { useAuth } from "../auth/AuthContext.jsx";
import { useLanguage } from "../i18/LanguageContext.jsx";

export default function AuthScreen({ onChangeLanguage }) {
  const { t } = useLanguage();
  const { login, register } = useAuth();

  const [mode, setMode] = useState("login");

  // farmer or staff
  const [userType, setUserType] = useState("farmer");

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [staffId, setStaffId] = useState("");
  const [password, setPassword] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const [phoneError, setPhoneError] = useState("");

  // Indian mobile number validation
  function validatePhone(number) {
    return /^[6-9]\d{9}$/.test(number);
  }

  async function handleSubmit(e) {
    e.preventDefault();

    setFormError("");
    setPhoneError("");

    // -----------------------------------------
    // FARMER REGISTRATION
    // -----------------------------------------
    if (mode === "register") {
      if (!validatePhone(phone)) {
        setPhoneError(
          "Please enter a valid 10-digit mobile number"
        );
        return;
      }
    }

    setSubmitting(true);

    try {
      // -----------------------------------------
      // STAFF LOGIN
      // -----------------------------------------
      if (userType === "staff") {
        if (!staffId.trim()) {
          setFormError("Please enter your Staff ID");
          setSubmitting(false);
          return;
        }

        await login(staffId.trim(), password, "staff");
      }

      // -----------------------------------------
      // FARMER LOGIN
      // -----------------------------------------
      else if (mode === "login") {
        await login(phone, password, "farmer");
      }

      // -----------------------------------------
      // FARMER REGISTRATION
      // -----------------------------------------
      else {
        await register(name, phone, password);
      }

    } catch (err) {
      setFormError(
        err.message || t("somethingWentWrong")
      );
    } finally {
      setSubmitting(false);
    }
  }

  function switchUserType(type) {
    setUserType(type);

    setFormError("");
    setPhoneError("");

    // Staff can only login
    if (type === "staff") {
      setMode("login");
    }

    // Clear login fields
    setPhone("");
    setStaffId("");
    setPassword("");
  }

  function switchMode() {
    setFormError("");
    setPhoneError("");

    setMode((currentMode) =>
      currentMode === "login"
        ? "register"
        : "login"
    );
  }

  return (
    <div className="auth-screen">
      <div className="auth-card">

        {/* LOGO */}
        <div className="auth-logo">
          KISAN
        </div>

        {/* SUBTITLE */}
        <p className="auth-subtitle">
          {mode === "register"
            ? t("registerSubtitle")
            : userType === "farmer"
            ? t("loginSubtitle")
            : "Staff Login"}
        </p>

        {/* FARMER / STAFF SWITCH */}
        {mode === "login" && (
          <div
            style={{
              display: "flex",
              width: "100%",
              marginBottom: "20px",
              background: "#FBF7EE",
              borderRadius: "30px",
              padding: "4px",
            }}
          >

            {/* FARMER */}
            <button
              type="button"
              onClick={() =>
                switchUserType("farmer")
              }
              style={{
                flex: 1,
                padding: "10px",
                border: "none",
                borderRadius: "25px",
                cursor: "pointer",
                fontSize: "16px",
                fontWeight: "600",
                background:
                  userType === "farmer"
                    ? "#B84A4D"
                    : "transparent",
                color:
                  userType === "farmer"
                    ? "#FFFFFF"
                    : "#475569",
              }}
            >
              Farmer
            </button>

            {/* STAFF */}
            <button
              type="button"
              onClick={() =>
                switchUserType("staff")
              }
              style={{
                flex: 1,
                padding: "10px",
                border: "none",
                borderRadius: "25px",
                cursor: "pointer",
                fontSize: "16px",
                fontWeight: "600",
                background:
                  userType === "staff"
                    ? "#B84A4D"
                    : "transparent",
                color:
                  userType === "staff"
                    ? "#FFFFFF"
                    : "#475569",
              }}
            >
              Staff
            </button>

          </div>
        )}

        {/* FORM */}
        <form
          onSubmit={handleSubmit}
          className="auth-form"
        >

          {/* FARMER NAME */}
          {mode === "register" && (
            <input
              className="auth-input"
              type="text"
              placeholder={t("fullName")}
              value={name}
              onChange={(e) =>
                setName(e.target.value)
              }
              required
            />
          )}

          {/* STAFF ID */}
          {userType === "staff" &&
            mode === "login" && (
              <input
                className="auth-input"
                type="text"
                placeholder="Staff ID"
                value={staffId}
                onChange={(e) =>
                  setStaffId(
                    e.target.value.toUpperCase()
                  )
                }
                required
              />
            )}

          {/* FARMER MOBILE NUMBER */}
          {userType === "farmer" && (
            <input
              className="auth-input"
              type="tel"
              placeholder={t("phone")}
              value={phone}
              maxLength={10}
              inputMode="numeric"
              onChange={(e) => {
                const value =
                  e.target.value.replace(/\D/g, "");

                setPhone(value);
                setPhoneError("");
              }}
              required
            />
          )}

          {/* PHONE ERROR */}
          {mode === "register" &&
            phoneError && (
              <div className="auth-error">
                {phoneError}
              </div>
            )}

          {/* PASSWORD */}
          <input
            className="auth-input"
            type="password"
            placeholder={t("password")}
            value={password}
            onChange={(e) =>
              setPassword(e.target.value)
            }
            required
            minLength={6}
          />

          {/* GENERAL ERROR */}
          {formError && (
            <div className="auth-error">
              {formError}
            </div>
          )}

          {/* SUBMIT */}
          <button
            className="auth-submit"
            type="submit"
            disabled={submitting}
          >
            {submitting
              ? t("pleaseWait")
              : mode === "login"
              ? "Log In"
              : t("createAccount")}
          </button>

        </form>

        {/* FARMER REGISTRATION */}
        {userType === "farmer" && (
          <button
            type="button"
            className="auth-switch"
            onClick={switchMode}
          >
            {mode === "login"
              ? t("newFarmer")
              : t("alreadyRegistered")}
          </button>
        )}

        {/* CHANGE LANGUAGE */}
        <button
          type="button"
          onClick={onChangeLanguage}
          style={{
            display: "block",
            margin: "18px auto 0",
            background: "transparent",
            border: "none",
            color: "#FFFFFF",
            textDecoration: "underline",
            cursor: "pointer",
            fontSize: "14px",
          }}
        >
          {t("changeLanguage")}
        </button>

      </div>
    </div>
  );
}