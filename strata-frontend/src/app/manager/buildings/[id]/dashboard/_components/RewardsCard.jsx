'use client';

import { Gift, Sparkles } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export default function RewardsCard({ offers = [] }) {
  const hasOffers = offers.length > 0;

  return (
    <Card className="rounded-xl border-purple-500/20 shadow-sm hover:shadow-md transition-shadow bg-gradient-to-br from-purple-500/5 to-background">
      <CardHeader>
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-purple-500/10">
            <Gift className="h-4 w-4 text-purple-600 dark:text-purple-400" />
          </div>
          <div>
            <CardTitle className="text-xl">Offers</CardTitle>
            <CardDescription>Exclusive discounts for residents</CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {hasOffers ? (
          offers.map((offer, index) => (
            <div
              key={index}
              className="group rounded-xl border border-purple-500/20 p-4 hover:border-purple-500/40 hover:bg-purple-500/5 transition-all"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1.5 flex-1">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                    <p className="font-semibold text-foreground">
                      {offer.title}
                    </p>
                    {offer.badge && (
                      <Badge className="bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/20">
                        {offer.badge}
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {offer.description}
                  </p>
                  <p className="text-xs text-purple-600 dark:text-purple-400 font-medium">
                    {offer.meta}
                  </p>
                </div>
              </div>
            </div>
          ))
        ) : (
          // 👇 Aesthetic Empty State
          <div className="flex flex-col items-center justify-center text-center py-10 px-4 border border-dashed border-purple-500/20 rounded-xl bg-purple-500/5">
            <div className="p-3 rounded-full bg-purple-500/10 mb-3">
              <Sparkles className="h-5 w-5 text-purple-500" />
            </div>
            <p className="font-medium text-foreground">No offers yet</p>
            <p className="text-sm text-muted-foreground max-w-xs mt-1">
              We’re working on bringing exclusive deals to your building. Check
              back soon.
            </p>
          </div>
        )}
      </CardContent>

      <CardFooter className="flex justify-end pt-4 border-t">
        <Button
          variant="outline"
          disabled={!hasOffers}
          className="gap-2 bg-transparent"
        >
          <Sparkles className="h-4 w-4" />
          View All Offers
        </Button>
      </CardFooter>
    </Card>
  );
}
