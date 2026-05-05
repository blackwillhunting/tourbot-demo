import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import AppCommerce from "./App-Commerce";
import "./index.css";

function Router() {
  const path = window.location.pathname.replace(/\/$/, "") || "/discovery";

  if (path === "/commerce") {
    return <AppCommerce />;
  }

  if (path === "/" || path === "/discovery") {
    return <App />;
  }

  return <App />;
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <Router />
  </React.StrictMode>
);