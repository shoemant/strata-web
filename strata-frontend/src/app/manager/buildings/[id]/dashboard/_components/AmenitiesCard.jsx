'use client';

import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Users, ArrowUpRight, Sparkles } from 'lucide-react';
import Link from 'next/link';

export default function AmenitiesCard({ building, resources = [] }) {
  const buildingHref = (sub) =>
    building ? `/manager/buildings/${building.id}/${sub}` : '#';

  const hasResources = resources.length > 0;

  return (
    <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
      <CardHeader className="flex flex-row items-center justify-between pb-4">
        <div className="flex items-center space-x-2">
          <Users className="h-5 w-5 text-primary" />
          <Link href={buildingHref('resources')} className="hover:underline">
            <CardTitle className="text-xl">Bookings</CardTitle>
          </Link>
        </div>

        <Link href={buildingHref('resources')}>
          <Button variant="ghost" size="sm" disabled={!hasResources}>
            View all <ArrowUpRight className="h-4 w-4 ml-1" />
          </Button>
        </Link>
      </CardHeader>

      <CardContent className="relative space-y-4">
        {hasResources ? (
          // ✅ Carousel when data exists
          <div className="flex space-x-4 overflow-x-auto snap-x snap-mandatory scrollbar-hide pb-2">
            {resources.map((r) => (
              <Link
                key={r.id}
                href={r.href || buildingHref('resources')}
                className="relative min-w-[260px] h-44 rounded-xl bg-cover bg-center snap-start flex-shrink-0 overflow-hidden group shadow-md transition-transform duration-200 hover:scale-[1.03]"
                style={{ backgroundImage: `url(${r.img})` }}
              >
                <div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-black/60 to-transparent pointer-events-none" />

                <div className="relative h-full flex items-end p-4">
                  <h3 className="text-lg font-semibold text-white drop-shadow-xl group-hover:underline">
                    {r.name}
                  </h3>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          // 👇 Aesthetic Empty State
          <div className="flex flex-col items-center justify-center text-center py-10 px-4 border border-dashed border-border rounded-xl bg-muted/30">
            <div className="p-3 rounded-full bg-primary/10 mb-3">
              <Sparkles className="h-5 w-5 text-primary" />
            </div>
            <p className="font-medium text-foreground">No amenities yet</p>
            <p className="text-sm text-muted-foreground max-w-xs mt-1">
              Add shared resources like gyms, rooms, or parking to enable
              bookings.
            </p>

            <Link href={buildingHref('resources')} className="mt-4">
              <Button size="sm">Add first resource</Button>
            </Link>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
