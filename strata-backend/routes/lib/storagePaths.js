// lib/storagePaths.js

function normalizePath(p) {
  if (!p) return "";
  let s = String(p);

  // Remove backslashes (Windows paths)
  s = s.replace(/\\/g, "/");

  // Trim leading/trailing slashes
  s = s.replace(/^\/+|\/+$/g, "");

  // No path traversal
  if (s.includes("..")) {
    throw new Error("Invalid path");
  }

  // Collapse duplicate slashes
  s = s.replace(/\/+/g, "/");

  return s;
}

function buildingRoot(buildingId) {
  if (!buildingId) throw new Error("Missing buildingId");
  return `buildings/${buildingId}/documents`;
}

function joinPath(a, b) {
  const A = normalizePath(a);
  const B = normalizePath(b);
  if (!A) return B;
  if (!B) return A;
  return `${A}/${B}`;
}

module.exports = { normalizePath, buildingRoot, joinPath };
