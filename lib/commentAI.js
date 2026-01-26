// lib/commentAI.js

export function suggestComment({ equipment, origin_state, dest_state }) {
  const eq = equipment.toUpperCase();
  const comment = [];

  if (eq === "RF") comment.push("Temp controlled freight");
  if (eq === "FD") comment.push("48ft flatbed available");
  if (["CA", "NY", "NJ"].includes(origin_state)) comment.push("Port pickup possible");
  if (["TX", "FL", "GA"].includes(dest_state)) comment.push("Strong reload potential");

  return comment.join(". ");
}
