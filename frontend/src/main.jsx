import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./App.css";
import { LanguageProvider } from "./i18/LanguageContext";
import { AuthProvider } from "./auth/AuthContext";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <LanguageProvider>
      <AuthProvider>
        <App />
      </AuthProvider>
    </LanguageProvider>
  </React.StrictMode>
);