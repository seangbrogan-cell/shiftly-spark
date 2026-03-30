import * as Sentry from "@sentry/react";
import { BrowserTracing } from "@sentry/tracing";

// Initialize Sentry BEFORE rendering your app
Sentry.init({
  dsn: "https://YOUR_KEY@sentry.io/YOUR_PROJECT_ID", // Get this from sentry.io
  integrations: [
    new BrowserTracing(),
    new Sentry.Replay(),
  ],
  tracesSampleRate: 1.0,
  replaysSessionSampleRate: 0.1,
  environment: "production",
});
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

createRoot(document.getElementById("root")!).render(<App />);
