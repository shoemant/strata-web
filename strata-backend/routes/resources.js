/**
 * routes/resource.js
 *
 * Express router for:
 *   • Creating / editing resources (manager-only)
 *   • Listing a user’s bookings
 *   • Listing a building’s bookings
 *   • Returning open slots for a resource + day
 *   • Inserting a slot booking
 *
 * Uses the new tables:
 *   resources, resource_types, resource_slot_bookings
 * And the RPC:
 *   fn_get_available_slots(resource_id, date, user_id)
 */

const express = require('express');
const { supabase } = require('../lib/supabaseClient');
const router = express.Router();

/*---------------------------------------------------
  MANAGER — create a resource
  POST /
---------------------------------------------------*/
router.post('/', async (req, res) => {
  const {
    name,
    type_id,
    location_description,
    is_active = true,
    building_id,
    booking_interval_minutes = 60,
    total_spots = 1,
    max_slots_per_user_per_day = null,
  } = req.body;

  const { data, error } = await supabase
    .from('resources')
    .insert([
      {
        name,
        type_id,
        location_description,
        is_active,
        building_id,
        booking_interval_minutes,
        total_spots,
        max_slots_per_user_per_day,
      },
    ])
    .select(); // return row

  if (error) return res.status(400).json({ error: error.message });
  res.status(201).json(data[0]);
});

/*---------------------------------------------------
  USER — all their bookings
  GET /user/:user_id
---------------------------------------------------*/
router.get('/user/:user_id', async (req, res) => {
  const { user_id } = req.params;

  const { data, error } = await supabase
    .from('resource_slot_bookings')
    .select(
      `
        id,
        booking_date,
        time_label,
        resources (
          id, name, location_description,
          resource_types ( name )
        )
      `
    )
    .eq('user_id', user_id)
    .order('booking_date', { ascending: false });

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

/*---------------------------------------------------
  BUILDING — all bookings in a building
  GET /building/:building_id
---------------------------------------------------*/
router.get('/building/:building_id', async (req, res) => {
  const { building_id } = req.params;

  const { data, error } = await supabase
    .from('resource_slot_bookings')
    .select(
      `
        id,
        booking_date,
        time_label,
        user_id,
        resources!inner (
          id, name, location_description, building_id,
          resource_types ( name )
        )
      `
    )
    .eq('resources.building_id', building_id);

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

/*---------------------------------------------------
  SLOTS for a resource + date
  GET /:resource_id/slots?date=YYYY-MM-DD&user=uuid
---------------------------------------------------*/
router.get('/:resource_id/slots', async (req, res) => {
  const { resource_id } = req.params;
  const { date, user } = req.query;

  const { data, error } = await supabase.rpc('fn_get_available_slots', {
    p_resource: resource_id,
    p_date: date,
    p_user: user,
  });

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

/*---------------------------------------------------
  BOOK a slot
  POST /book
  { resource_id, start_at, end_at, user_id }
---------------------------------------------------*/
router.post('/book', async (req, res) => {
  const { resource_id, start_at, end_at, user_id } = req.body;

  const { error } = await supabase
    .from('resource_slot_bookings')
    .insert([
      {
        slot_id: resource_id,
        user_id,
        booking_date: start_at.slice(0, 10),
        time_label: start_at.slice(11, 16),
      },
    ]);

  if (error) return res.status(400).json({ error: error.message });
  res.status(201).json({ ok: true });
});

module.exports = router;
