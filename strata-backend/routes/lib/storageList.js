// lib/storageList.js
const { joinPath } = require("./storagePaths");

/**
 * Converts Supabase list() output to a UI-friendly model.
 * Note: Supabase folders are "virtual". list() usually returns folders as entries without metadata.
 */
function toItems(entries, currentPrefix) {
  return (entries || []).map((e) => {
    const isDirectory = !e.metadata; // common pattern: files have metadata, folders don't
    const fullPath = joinPath(currentPrefix, e.name);

    return {
      name: e.name,
      isDirectory,
      size: e.metadata?.size ?? 0,
      dateModified: e.updated_at || e.created_at || null,
      fullPath,
    };
  });
}

module.exports = { toItems };
