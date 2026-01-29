'use client';

import CreatePollDialog from '@/components/polls/CreatePollDialog';
import DesignatePollCreatorsDialog from '@/components/polls/DesignatePollCreatorsDialog';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { RefreshCw } from 'lucide-react';

export default function PollsHeader({
  loading,
  buildingName,
  canCreate,
  buildingId,
  onCreated,
  onRefresh,
}) {
  return (
    <Card>
      <CardHeader className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="space-y-1">
          <CardTitle>Polls & Votes</CardTitle>
          <CardDescription>
            {buildingName
              ? `Building: ${buildingName}`
              : 'View and participate in building polls.'}
          </CardDescription>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={onRefresh} disabled={loading}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>

          {canCreate ? (
            <DesignatePollCreatorsDialog
              buildingId={buildingId}
              canDesignate={canCreate}
              trigger={
                <Button type="button" variant="outline" disabled={loading}>
                  Manage poll creators
                </Button>
              }
            />
          ) : null}

          {canCreate ? (
            <CreatePollDialog buildingId={buildingId} onCreated={onCreated} />
          ) : null}
        </div>
      </CardHeader>
    </Card>
  );
}
