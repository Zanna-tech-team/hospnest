import React from "react";
import { Link } from "@tanstack/react-router";
import type { PharmacistDashboardData } from "@/lib/role-dashboard.functions";
import {
  Clock,
  AlertTriangle,
  Package,
  CheckCircle2,
  ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface PharmacistDashboardProps {
  data: PharmacistDashboardData;
}

export function PharmacistDashboard({ data }: PharmacistDashboardProps) {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="shadow-soft border-border">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Pending Prescriptions
            </CardTitle>
            <Clock className="size-4 text-amber-600" />
          </CardHeader>
          <CardContent>
            <div className="font-display text-3xl font-bold text-amber-600 dark:text-amber-400">
              {data.pendingPrescriptionsCount}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">Awaiting dispensing</p>
          </CardContent>
        </Card>

        <Card className="shadow-soft border-border">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Low-Stock Drugs
            </CardTitle>
            <AlertTriangle className="size-4 text-rose-600" />
          </CardHeader>
          <CardContent>
            <div className="font-display text-3xl font-bold text-rose-600 dark:text-rose-400">
              {data.lowStockItemsCount}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">Below reorder threshold</p>
          </CardContent>
        </Card>

        <Card className="shadow-soft border-border">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Total Formulary Items
            </CardTitle>
            <Package className="size-4 text-teal-600" />
          </CardHeader>
          <CardContent>
            <div className="font-display text-3xl font-bold text-foreground">
              {data.totalMedicationsCount}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">Active in drug inventory</p>
          </CardContent>
        </Card>

        <Card className="shadow-soft border-border">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Dispensed Today
            </CardTitle>
            <CheckCircle2 className="size-4 text-emerald-600" />
          </CardHeader>
          <CardContent>
            <div className="font-display text-3xl font-bold text-emerald-600 dark:text-emerald-400">
              {data.dispensedTodayCount}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">Prescriptions fulfilled</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-12">
        <div className="space-y-4 lg:col-span-7">
          <Card className="shadow-soft border-border">
            <CardHeader className="flex flex-row items-center justify-between border-b border-border pb-3">
              <CardTitle className="text-base font-bold text-foreground">Pending Prescriptions Queue</CardTitle>
              <Button asChild size="sm" className="h-7 text-xs bg-teal-600 hover:bg-teal-700 text-white font-semibold">
                <Link to="/pharmacy">
                  Dispense Now <ArrowRight className="size-3 ml-1" />
                </Link>
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              {data.pendingQueue.length === 0 ? (
                <div className="p-8 text-center text-xs text-muted-foreground">
                  No prescriptions waiting in dispensing queue.
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {data.pendingQueue.map((rx) => (
                    <div key={rx.prescriptionId} className="flex items-center justify-between p-3.5 hover:bg-muted/30 text-xs">
                      <div>
                        <span className="font-bold text-foreground">{rx.patientName}</span>
                        <p className="text-muted-foreground text-[11px]">
                          {rx.drugsCount} medication(s) prescribed • Ordered {new Date(rx.orderedAt).toLocaleTimeString()}
                        </p>
                      </div>
                      <Button asChild size="sm" variant="outline" className="h-7 text-xs border-border">
                        <Link to="/pharmacy">Dispense</Link>
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4 lg:col-span-5">
          <Card className="shadow-soft border-border">
            <CardHeader className="border-b border-border pb-3 flex flex-row items-center justify-between">
              <CardTitle className="text-base font-bold text-foreground flex items-center gap-1.5">
                <AlertTriangle className="size-4 text-rose-600" /> Low Stock Warnings
              </CardTitle>
              <Button asChild size="sm" variant="ghost" className="h-7 text-xs">
                <Link to="/pharmacy/inventory">Inventory</Link>
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              {data.lowStockAlerts.length === 0 ? (
                <div className="p-6 text-center text-xs text-muted-foreground italic">
                  All inventory items are sufficiently stocked.
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {data.lowStockAlerts.map((item) => (
                    <div key={item.medicationId} className="p-3 text-xs flex items-center justify-between">
                      <div>
                        <span className="font-semibold text-foreground">{item.drugName}</span>
                        <p className="text-[11px] text-muted-foreground">Reorder level: {item.reorderLevel}</p>
                      </div>
                      <span className="rounded bg-rose-500/10 px-2 py-0.5 font-bold text-rose-700 dark:text-rose-300">
                        {item.currentStock} left
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
