import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import AppCommerce from "./App-Commerce";
import AppCarryout from "./App-Carryout";
import LaunchSelector from "./LaunchSelector";
import "./index.css";

function Router() {
  const path = window.location.pathname.replace(/\/$/, "") || "/";

  if (path === "/transactional") {
    return <AppCommerce />;
  }

  if (path === "/carryout") {
    return <AppCarryout />;
  }

  if (path === "/informational") {
    return <App />;
  }

  if (path === "/") {
    return <LaunchSelector />;
  }

  return <LaunchSelector />;
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <Router />
  </React.StrictMode>,
);
