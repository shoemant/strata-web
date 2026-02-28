'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

export function VisibilityDialog({
  open,
  folder,
  onClose,
  supabase,
  buildingId,
}) {
  const [restricted, setRestricted] = useState(false);

  const [roles, setRoles] = useState([]); // ['owner','tenant','manager']
  const [units, setUnits] = useState([]); // [{id, label, unit_number}]
  const [selectedUnits, setSelectedUnits] = useState([]); // ['uuid', ...]

  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);

  const anySelection = useMemo(
    () => roles.length > 0 || selectedUnits.length > 0,
    [roles, selectedUnits]
  );

  // Load current ACL + units
  useEffect(() => {
    if (!open || !folder) return;

    (async () => {
      setLoading(true);
      try {
        // load current ACL
        const { data: acl, error: aclErr } = await supabase
          .from('document_acl')
          .select('principal_type, principal_value, permission')
          .eq('document_id', folder.id);

        if (aclErr) {
          console.error('Error fetching ACL:', aclErr);
          setRestricted(false);
          setRoles([]);
          setSelectedUnits([]);
        } else {
          const rows = acl || [];
          const roleRows = rows
            .filter((r) => r.principal_type === 'role')
            .map((r) => r.principal_value);

          const unitRows = rows
            .filter((r) => r.principal_type === 'unit')
            .map((r) => r.principal_value);

          setRoles(roleRows);
          setSelectedUnits(unitRows);

          // ✅ Default open if ACL is empty
          // load is_restricted flag
          const { data: docRow, error: docErr } = await supabase
            .from('documents')
            .select('is_restricted')
            .eq('id', folder.id)
            .single();

          if (docErr) {
            console.error('Error fetching document is_restricted:', docErr);
            setRestricted(false);
          } else {
            setRestricted(Boolean(docRow?.is_restricted));
          }
        }

        // load all units for this building
        const { data: unitsData, error: unitsErr } = await supabase
          .from('units')
          .select('id, label, unit_number')
          .eq('building_id', buildingId)
          .order('unit_number', { ascending: true });

        if (unitsErr) {
          console.error('Error fetching units:', unitsErr);
          setUnits([]);
        } else {
          setUnits(unitsData || []);
        }
      } finally {
        setLoading(false);
      }
    })();
  }, [open, folder?.id, supabase, buildingId]);

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

    setSaving(true);
    try {
      // 1) update is_restricted flag
      const { error: updErr } = await supabase
        .from('documents')
        .update({ is_restricted: restricted })
        .eq('id', folder.id);

      if (updErr) {
        console.error('Error updating is_restricted:', updErr);
        alert('Failed to update visibility (flag step).');
        return;
      }

      // 2) clear ACL rows always
      const { error: delErr } = await supabase
        .from('document_acl')
        .delete()
        .eq('document_id', folder.id);

      if (delErr) {
        console.error('Error clearing ACL:', delErr);
        alert('Failed to update visibility (clear step).');
        return;
      }

      // 3) if NOT restricted => default open, done
      if (!restricted) {
        onClose();
        return;
      }

      // 4) restricted ON: inserts are OPTIONAL
      // If none selected => managers-only (because is_restricted=true and ACL empty)
      const inserts = [
        ...roles.map((role) => ({
          document_id: folder.id,
          principal_type: 'role',
          principal_value: role,
          permission: 'viewer',
        })),
        ...selectedUnits.map((unitId) => ({
          document_id: folder.id,
          principal_type: 'unit',
          principal_value: unitId,
          permission: 'viewer',
        })),
      ];

      if (inserts.length) {
        const { error: insErr } = await supabase
          .from('document_acl')
          .insert(inserts);

        if (insErr) {
          console.error('Error inserting ACL:', insErr);
          alert('Failed to update visibility (insert step).');
          return;
        }
      }

      onClose();
    } finally {
      setSaving(false);
    }
  };

  // When switching restricted OFF, clear selections (optional but reduces confusion)
  const handleSetRestricted = (value) => {
    setRestricted(value);
    if (!value) {
      setRoles([]);
      setSelectedUnits([]);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Visibility: {folder?.title}</DialogTitle>
          <DialogDescription>
            Default is <b>Visible to everyone in this building</b>. Turn on
            Restricted to limit access.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="text-sm text-muted-foreground">Loading…</div>
        ) : (
          <div className="space-y-4">
            {/* Mode */}
            <div className="space-y-2">
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="visMode"
                  checked={!restricted}
                  onChange={() => handleSetRestricted(false)}
                />
                <div>
                  <div className="font-medium">Visible to everyone</div>
                  <div className="text-xs text-muted-foreground">
                    Owners and tenants can see this folder (building-wide).
                  </div>
                </div>
              </label>

              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="visMode"
                  checked={restricted}
                  onChange={() => handleSetRestricted(true)}
                />
                <div>
                  <div className="font-medium">Restricted</div>
                  <div className="text-xs text-muted-foreground">
                    Only selected roles/units can view. (Managers still always
                    have access.)
                  </div>
                </div>
              </label>
            </div>

            {/* Restrictions */}
            {restricted && (
              <div className="space-y-4 rounded-md border p-3">
                {/* Roles */}
                <div>
                  <h4 className="font-medium mb-2">Allow by role</h4>
                  {['owner', 'tenant'].map((role) => (
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
                  <h4 className="font-medium mb-2">Allow by unit</h4>
                  {units.length === 0 ? (
                    <div className="text-sm text-muted-foreground">
                      No units found for this building.
                    </div>
                  ) : (
                    <div className="max-h-52 overflow-auto space-y-1 pr-1">
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
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        <div className="flex justify-end gap-2 mt-4">
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving || loading}>
            {saving ? 'Saving…' : 'Save'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
