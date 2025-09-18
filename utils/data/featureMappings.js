const featureMappings = {
  // Network APIs
  "fetch": "fetch",
  "XMLHttpRequest": "xhr",
  "WebSocket": "websockets",
  "EventSource": "eventsource",
  "navigator.serviceWorker": "service-workers",

  // Storage APIs
  "localStorage": "storage",
  "sessionStorage": "storage",
  "indexedDB": "indexeddb",
  "caches": "cache-api",

  // Promises & Async
  "Promise": "promises",
  "async": "async-functions",
  "await": "async-functions",

  // Arrays & Iterables
  "Array.prototype.find": "array-find",
  "Array.prototype.includes": "array-includes",
  "Array.prototype.flat": "array-flat",
  "Array.prototype.at": "array-at",
  "Array.from": "array-from",

  // Strings
  "String.prototype.includes": "string-includes",
  "String.prototype.replaceAll": "string-replaceall",
  "String.prototype.matchAll": "string-matchall",
  "String.prototype.padStart": "string-padstart-end",

  // Objects
  "Object.entries": "object-entries",
  "Object.values": "object-values",
  "Object.fromEntries": "object-fromentries",
  "Object.hasOwn": "object-hasown",

  // Numbers
  "Number.isNaN": "number-isinan",
  "Number.parseInt": "number-parseint",
  "Math.sign": "math-sign",
  "Math.trunc": "math-trunc",

  // Others
  "URL": "url",
  "URLSearchParams": "urlsearchparams",
  "Intl": "intl",
  "Intl.DateTimeFormat": "intl-datetimeformat",
  "Intl.NumberFormat": "intl-numberformat",
};
module.exports = { featureMappings };
