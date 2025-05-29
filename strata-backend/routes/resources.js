/**
 * resourceBooking.js
 *
 * This Express router handles resource creation and booking queries for users and buildings.
 * It allows managers to define shared resources (e.g., gyms, meeting rooms) and lets users view their bookings.
 *
 * Routes included:
 * - POST /                    → Creates a new resource
 * - GET /user/:user_id        → Retrieves all bookings for a specific user, including resource and type details
 * - GET /building/:building_id → Retrieves all bookings for a specific building, including resource metadata
 *
 * Dependencies:
 * - Supabase client instance with access to `resources`, `bookings`, and `resource_types` tables
 *
 * Notes:
 * - Bookings are linked to users via `user_id` and to resources via `resource_id`
 * - Resources must belong to a specific `building_id`
 * - Ensure RLS (Row-Level Security) is enforced for each table appropriately
 */

import express from 'express';
import { supabase } from '../lib/supabaseClient.js';

const router = express.Router();

/**
 * POST /
 * Creates a new resource (e.g., gym, meeting room, parking spot).
 *
 * Request body:
 * {
 *   "name": "Meeting Room A",
 *   "type_id": "uuid-of-resource-type",
 *   "location_description": "2nd Floor East Wing",
 *   "is_active": true,
 *   "building_id": "uuid-of-building"
 * }
 *
 * Response:
 * - 201 Created: Resource inserted successfully
 * - 400 Bad Request: Insert failed
 */
router.post('/', async (req, res) => {
  const { name, type_id, location_description, is_active, building_id } =
    req.body;

  const { data, error } = await supabase
    .from('resources')
    .insert([{ name, type_id, location_description, is_active, building_id }]);

  if (error) return res.status(400).json({ error: error.message });

  res.status(201).json(data);
});

/**
 * GET /user/:user_id
 * Retrieves all bookings for a specific user.
 * Includes nested resource metadata and resource type labels.
 *
 * Response:
 * - 200 OK: List of bookings for the user
 * - 500 Internal Server Error: If query fails
 */
router.get('/user/:user_id', async (req, res) => {
  const { user_id } = req.params;

  const { data, error } = await supabase
    .from('bookings')
    .select(
      `
      *,
      resources (
        name,
        location_description,
        type_id,
        resource_types (
          label
        )
      )
    `
    )
    .eq('user_id', user_id);

  if (error) return res.status(500).json({ error: error.message });

  res.json(data);
});

/**
 * GET /building/:building_id
 * Retrieves all bookings for a specific building.
 * Includes nested resource details and resource type labels.
 *
 * Response:
 * - 200 OK: List of bookings for the building
 * - 500 Internal Server Error: If query fails
 */
router.get('/building/:building_id', async (req, res) => {
  const { building_id } = req.params;

  const { data, error } = await supabase
    .from('bookings')
    .select(
      `
      *,
      resources!inner (
        name,
        location_description,
        building_id,
        type_id,
        resource_types (
          label
        )
      )
    `
    )
    .eq('resources.building_id', building_id);

  if (error) return res.status(500).json({ error: error.message });

  res.json(data);
});

export default router;