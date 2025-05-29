/**
 * documents.js
 *
 * This Express router handles retrieving and uploading documents related to a strata building.
 * Documents may include bylaws, meeting minutes, insurance certificates, maintenance schedules, etc.
 *
 * Routes included:
 * - GET /documents         → Fetches all documents (no filters applied)
 * - POST /documents        → Uploads a new document to the database
 *
 * Dependencies:
 * - Requires a Supabase client instance (`supabase`) configured with access to the `documents` table.
 *
 * Notes:
 * - Ensure appropriate RLS (Row-Level Security) policies are applied on the `documents` table.
 * - The `uploaded_by` field should contain the user ID of the uploader.
 * - The `building_id` should correspond to the strata building the document is associated with.
 */

const express = require('express');
const { supabase } = require('../lib/supabaseClient'); // Supabase client for backend DB access
const router = express.Router();

/**
 * GET /
 * Fetches all documents from the `documents` table.
 * No filtering is currently applied — returns all records.
 *
 * Response:
 * - 200 OK: Array of document objects
 * - 500 Internal Server Error: If Supabase query fails
 */
router.get('/', async (req, res) => {
  const { data, error } = await supabase.from('documents').select('*');

  if (error) return res.status(500).json({ error: error.message });

  res.json(data);
});

/**
 * POST /
 * Inserts a new document into the `documents` table.
 *
 * Request body:
 * {
 *   "title": "Bylaws 2024",
 *   "category": "Bylaws",
 *   "url": "https://example.com/document.pdf",
 *   "uploaded_by": "user-uuid",
 *   "building_id": "building-uuid"
 * }
 *
 * Response:
 * - 201 Created: Inserted document record
 * - 400 Bad Request: If insertion fails
 */
router.post('/', async (req, res) => {
  const { title, category, url, uploaded_by, building_id } = req.body;

  const { data, error } = await supabase
    .from('documents')
    .insert([{ title, category, url, uploaded_by, building_id }])
    .select('*'); // Forces return of the inserted row

  if (error) {
    console.error('Insert Error:', error);
    return res.status(400).json({ error: error.message });
  }

  console.log('Insert Success:', data);
  return res.status(201).json(data);
});

module.exports = router;
