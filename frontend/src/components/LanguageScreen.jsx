import React from "react";
import { useLanguage } from "../i18/LanguageContext";

export default function LanguageScreen({ onSelect }) {
  const { setLanguage, t } = useLanguage();

  const choose = (language) => {
    setLanguage(language);
    onSelect?.(language);
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        background: "#F5F7F9",
        padding: "20px",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "450px",
          background: "white",
          borderRadius: "20px",
          padding: "35px",
          boxShadow: "0 10px 35px rgba(0,0,0,0.1)",
          textAlign: "center",
        }}
      >
        <h1 style={{ marginBottom: "10px" }}>
          KISAN
        </h1>

        <p style={{ marginBottom: "30px", color: "#475569" }}>
          {t("selectLanguage")}
        </p>

        <button
          onClick={() => choose("en")}
          style={buttonStyle}
        >
          English
        </button>

        <button
          onClick={() => choose("hi")}
          style={buttonStyle}
        >
          हिंदी
        </button>

        <button
          onClick={() => choose("bn")}
          style={buttonStyle}
        >
          বাংলা
        </button>
      </div>
    </div>
  );
}

const buttonStyle = {
  width: "100%",
  padding: "15px",
  marginBottom: "12px",
  borderRadius: "10px",
  border: "1px solid #D7AE5B",
  background: "#FAFBFC",
  color: "#475569",
  cursor: "pointer",
  fontSize: "17px",
  fontWeight: "600",
};