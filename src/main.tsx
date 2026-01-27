import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { clearAllAuthData } from "./lib/sessionOnlyStorage";

// Clear all auth data on app load to ensure fresh login required
// This prevents sessions from persisting after app/browser is closed
clearAllAuthData();

createRoot(document.getElementById("root")!).render(<App />);
