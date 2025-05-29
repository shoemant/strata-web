/**
 * resourceTypes.js
 *
 * This Express router manages the creation, retrieval, update, and deletion of resource types.
 * Resource types represent categories like "Gym", "Meeting Room", or "Parking Spot"
 * that managers can define and assign to specific resources.
 *
 * Routes included:
 * - GET    /resource-types           → Retrieve all resource types
 * - POST   /resource-types           → Create a new resource type
 * - PUT    /resource-types/:id       → Update an existing resource type by ID
 * - DELETE /resource-types/:id       → Delete a resource type by ID
 *
 * Dependencies:
 * - Supabase client with access to the `resource_types` table
 *
 * Notes:
 * - The `created_by` field should reference the manager (user_id) who created the type.
 * - Role-based restrictions (e.g. only managers can POST/PUT/DELETE) should be enforced at the route or RLS level.
 */

const express = require('express');
const router = express.Router();
const { supabase } = require('../lib/supabaseClient');

/**
 * GET /
 * Retrieves all available resource types.
 *
 * Response:
 * - 200 OK: Array of resource type objects
 * - 500 Internal Server Error: If query fails
 */
router.get('/', async (req, res) => {
    const { data, error } = await supabase.from('resource_types').select('*');

    if (error) {
        return res.status(500).json({ error: error.message });
    }

    res.json(data);
});

/**
 * POST /
 * Creates a new resource type.
 *
 * Request body:
 * {
 *   "name": "Gym",
 *   "description": "Fitness facility available for all tenants",
 *   "created_by": "manager-uuid"
 * }
 *
 * Response:
 * - 201 Created: New resource type inserted
 * - 400 Bad Request: Missing required fields or Supabase error
 */
router.post('/', async (req, res) => {
    const { name, description, created_by } = req.body;

    if (!name || !created_by) {
        return res.status(400).json({ error: 'Missing name or created_by' });
    }

    const { data, error } = await supabase
        .from('resource_types')
        .insert([{ name, description, created_by }]);

    if (error) {
        return res.status(400).json({ error: error.message });
    }

    res.status(201).json(data);
});

/**
 * PUT /:id
 * Updates an existing resource type by ID.
 *
 * Request body:
 * {
 *   "name": "Updated Name",
 *   "description": "Updated Description"
 * }
 *
 * Response:
 * - 200 OK: Updated resource type
 * - 400 Bad Request: Supabase update failed
 */
router.put('/:id', async (req, res) => {
    const { id } = req.params;
    const { name, description } = req.body;

    const { data, error } = await supabase
        .from('resource_types')
        .update({ name, description })
        .eq('id', id);

    if (error) {
        return res.status(400).json({ error: error.message });
    }

    res.json(data);
});

/**
 * DELETE /:id
 * Deletes a resource type by ID.
 *
 * Response:
 * - 200 OK: Success message and deleted object
 * - 400 Bad Request: Supabase deletion failed
 */
router.delete('/:id', async (req, res) => {
    const { id } = req.params;

    const { data, error } = await supabase
        .from('resource_types')
        .delete()
        .eq('id', id);

    if (error) {
        return res.status(400).json({ error: error.message });
    }

    res.json({ message: 'Deleted successfully', data });
});

module.exports = router;