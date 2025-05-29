const express = require('express');
const { supabase } = require('../lib/supabaseClient');

const router = express.Router(); // ✅ You need this line

// POST / - Create new resource
router.post('/', async (req, res) => {
  const { name, type_id, location_description, is_active, building_id } = req.body;

  const { data, error } = await supabase
    .from('resources')
    .insert([{ name, type_id, location_description, is_active, building_id }]);

  if (error) return res.status(400).json({ error: error.message });

  res.status(201).json(data);
});

// GET /user/:user_id - Get bookings for a user
router.get('/user/:user_id', async (req, res) => {
  const { user_id } = req.params;

  const { data, error } = await supabase
    .from('bookings')
    .select(`
      *,
      resources (
        name,
        location_description,
        type_id,
        resource_types (
          label
        )
      )
    `)
    .eq('user_id', user_id);

  if (error) return res.status(500).json({ error: error.message });

  res.json(data);
});

// GET /building/:building_id - Get bookings for a building
router.get('/building/:building_id', async (req, res) => {
  const { building_id } = req.params;

  const { data, error } = await supabase
    .from('bookings')
    .select(`
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
    `)
    .eq('resources.building_id', building_id);

  if (error) return res.status(500).json({ error: error.message });

  res.json(data);
});

module.exports = router;
