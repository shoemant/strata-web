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

export default function RewardsCard() {
  return (
    <Card className="rounded-xl border-purple-500/20 shadow-sm hover:shadow-md transition-shadow bg-gradient-to-br from-purple-500/5 to-background">
      <CardHeader>
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-purple-500/10">
            <Gift className="h-4 w-4 text-purple-600 dark:text-purple-400" />
          </div>
          <div>
            <CardTitle className="text-xl">Offers </CardTitle>
            <CardDescription>Exclusive discounts for residents</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="group rounded-xl border border-purple-500/20 p-4 hover:border-purple-500/40 hover:bg-purple-500/5 transition-all">
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-1.5 flex-1">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                <p className="font-semibold text-foreground">SparkleClean</p>
                <Badge className="bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/20">
                  15% off
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                Professional condo cleaning services
              </p>
              <p className="text-xs text-purple-600 dark:text-purple-400 font-medium">
                Valid for residents • Limited time offer
              </p>
            </div>
          </div>
        </div>
        <div className="group rounded-xl border border-orange-500/20 p-4 hover:border-orange-500/40 hover:bg-orange-500/5 transition-all">
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-1.5 flex-1">
              <div className="flex items-center gap-2">
                <Gift className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                <p className="font-semibold text-foreground">Joe's Café</p>
                <Badge className="bg-orange-500/10 text-orange-700 dark:text-orange-300 border-orange-500/20">
                  Free coffee
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                Free coffee with breakfast purchase
              </p>
              <p className="text-xs text-orange-600 dark:text-orange-400 font-medium">
                2 blocks away • Show resident ID
              </p>
            </div>
          </div>
        </div>
      </CardContent>
      <CardFooter className="flex justify-end pt-4 border-t">
        <Button variant="outline" disabled className="gap-2 bg-transparent">
          <Sparkles className="h-4 w-4" />
          View All Offers
        </Button>
      </CardFooter>
    </Card>
  );
}
