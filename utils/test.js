const obj = { x: 1, y: 2 };
console.log(obj.x);
console.log(obj["y"]);
function myFunc() {}
const arr = [1, 2];
console.log(arr.length);
myFunc();

fetch("https://example.com");
localStorage.setItem("x", "y");
Array.prototype.includes.call([1, 2, 3], 2);
navigator.serviceWorker.register("/sw.js");
WebSocket;

// Limited availability features
const signal1 = new AbortSignal();
const signal2 = new AbortSignal();
const combinedSignal = AbortSignal.any([signal1, signal2]); // Low support
const str = "Hello \uD800"; // Invalid Unicode
console.log(str.isWellFormed()); // Low support

// Newly available features
const numbers = [1, 2, 3, 4];
const lastEven = numbers.findLast(n => n % 2 === 0); // Newly available
requestIdleCallback(() => console.log("Idle task")); // Newly available