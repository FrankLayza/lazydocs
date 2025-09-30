// Import the features object from web-features
import { features } from "web-features";

// ==========================
// Quick test of feature data
// ==========================

// Option A: See how many features are available
// console.log("Total features available:", Object.keys(features).length);

// Option B: Preview the first 10 feature keys
console.log("First 10 features:", Object.keys(features).slice(0, 10));

// ==========================
// Check specific features
// ==========================

const list = [
  "abortable-fetch",      // fetch with abort support
  "css-grid-layout",      // CSS Grid
  "websockets",           // WebSockets API
  "service-workers",      // Service workers
  "flexbox",              // CSS Flexbox
  "css-custom-properties" // CSS variables
];

// Loop through each and print baseline info
for (const f of list) {
  if (features[f]) {
    console.log(
      `${f} → baseline: ${features[f].status.baseline}, support: ${features[f].status.support}`
    );
  } else {
    console.log(`${f} → not found in features`);
  }
}
