// lib/laneNotes.js

let memory = {};

export function getLaneNote(origin, dest, equipment) {
  const key = `${origin}-${dest}-${equipment}`;
  return memory[key] || "";
}

export function saveLaneNote(origin, dest, equipment, note) {
  const key = `${origin}-${dest}-${equipment}`;
  memory[key] = note;
}
