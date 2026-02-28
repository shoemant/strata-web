'use client';

import React, { useState, useEffect } from 'react'; // ✅ this line fixes it
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

export function VisibilityDialog({
  open,
  folder,
  onClose,
  supabase,
  buildingId,
}) {
  const [roles, setRoles] = useState([]);
  const [units, setUnits] = useState([]);
  const [selectedUnits, setSelectedUnits] = useState([]);

  // Load roles + units for building
  useEffect(() => {
    if (open && folder) {
      (async () => {
        // load current visibility
        const { data: vis, error: visErr } = await supabase
          .from('document_visibility')
          .select('role, unit_id')
          .eq('document_id', folder.id);

        if (visErr) {
          console.error('Error fetching visibility:', visErr);
          setRoles([]);
          setSelectedUnits([]);
        } else {
          const safeVis = vis || [];
          setRoles(safeVis.filter((v) => v.role).map((v) => v.role));
          setSelectedUnits(
            safeVis.filter((v) => v.unit_id).map((v) => v.unit_id)
          );
        }

        // load all units for this building
        const { data: unitsData, error: unitsErr } = await supabase
          .from('units')
          .select('id, label, unit_number')
          .eq('building_id', buildingId);

        console.log('unitsData', unitsData, 'unitsErr', unitsErr);
        if (unitsErr) {
          console.error('Error fetching units:', unitsErr);
        }

        setUnits(unitsData || []); // safe default
      })();
    }
  }, [open, folder, supabase, buildingId]);

  const toggleRole = (role) => {
    setRoles((prev) =>
      prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role]
    );
  };

  const toggleUnit = (unitId) => {
    setSelectedUnits((prev) =>
      prev.includes(unitId)
        ? prev.filter((u) => u !== unitId)
        : [...prev, unitId]
    );
  };

  const handleSave = async () => {
    if (!folder) return;

    // wipe old
    await supabase
      .from('document_visibility')
      .delete()
      .eq('document_id', folder.id);

    const inserts = [
      ...roles.map((role) => ({ document_id: folder.id, role })),
      ...selectedUnits.map((unit_id) => ({ document_id: folder.id, unit_id })),
    ];

    if (inserts.length) {
      await supabase.from('document_visibility').insert(inserts);
    }

    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Set Visibility for {folder?.title}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Roles */}
          <div>
            <h4 className="font-medium mb-2">By Role</h4>
            {['manager', 'owner', 'tenant'].map((role) => (
              <label key={role} className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={roles.includes(role)}
                  onChange={() => toggleRole(role)}
                />
                {role}
              </label>
            ))}
          </div>

          {/* Units */}
          <div>
            <h4 className="font-medium mb-2">By Unit</h4>
            {units.map((u) => (
              <label key={u.id} className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={selectedUnits.includes(u.id)}
                  onChange={() => toggleUnit(u.id)}
                />
                Unit {u.unit_number || u.label}
              </label>
            ))}
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-4">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave}>Save</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
