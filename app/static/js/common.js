// common.js
"use strict";
console.info("[Global] common.js loaded.");

// Array of predefined playback speeds
const speeds = [
    0.25, 0.3, 0.35, 0.4, 0.45, 0.5, 0.57, 0.63, 0.7, 0.8,
    0.9, 1.0, 1.1, 1.25, 1.4, 1.5, 1.6, 1.8, 2.0
];

// Finds the closest match for a given speed from the predefined speeds
function findClosestSpeed(speed) {
    const closest = speeds.reduce((prev, curr) =>
        Math.abs(curr - speed) < Math.abs(prev - speed) ? curr : prev
    );
    console.debug(`[Speed] Closest match for ${speed}: ${closest}`);
    return closest;
}

// Exported utilities
export { speeds, findClosestSpeed };

// Event Management
const events = {};

export function trigger(eventName, data) {
    if (!events[eventName]) {
        console.warn(`[Event] No listeners for event "${eventName}".`);
        return;
    }
    events[eventName].forEach(callback => callback(data));
    console.info(`[Event] Triggered: "${eventName}".`);
}

// Add a listener for an event
export function on(eventName, callback) {
    if (!events[eventName]) {
        events[eventName] = [];
    }
    events[eventName].push(callback);
    console.info(`[Event] Listener added for "${eventName}".`);
}
