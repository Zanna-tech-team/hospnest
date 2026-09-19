import React from "react";
import { Link } from "@tanstack/react-router";
import type { LabTechDashboardData } from "@/lib/role-dashboard.functions";
import {
  Clock,
  FlaskConical,
  CheckCircle2,
  Activity,
  ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface LabTechDashboardProps {
  data: LabTechDashboardData;
}

export function LabTechDashboard({ data }: LabTechDashboardProps) {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="shadow-soft border-border">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Orders Requested
            </CardTitle>
            <Clock className="size-4 text-amber-600" />
          </CardHeader>
          <CardContent>
            <div className="font-display text-3xl font-bold text-amber-600 dark:text-amber-400">
              {data.requestedCount}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">Awaiting sample collection</p>
          </CardContent>
        </Card>

        <Card className="shadow-soft border-border">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              In Progress / Testing
            </CardTitle>
            <FlaskConical className="size-4 text-teal-600" />
          </CardHeader>
          <CardContent>
            <div className="font-display text-3xl font-bold text-foreground">
              {data.inProgressCount}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">Samples undergoing analysis</p>
          </CardContent>
        </Card>

        <Card className="shadow-soft border-border">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Completed Today
            </CardTitle>
            <CheckCircle2 className="size-4 text-emerald-600" />
          </CardHeader>
          <CardContent>
            <div className="font-display text-3xl font-bold text-emerald-600 dark:text-emerald-400">
              {data.completedTodayCount}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">Results published to doctors</p>
          </CardContent>
        </Card>

        <Card className="shadow-soft border-border">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Avg Turnaround
            </CardTitle>
            <Activity className="size-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="font-display text-3xl font-bold text-foreground">
              {data.avgTurnaroundHours} hrs
            </div>
            <p className="mt-1 text-xs text-muted-foreground">Within clinical target</p>
          </CardContent>
        </Card>
      </div>

      {/* Lab Worklist */}
      <Card className="shadow-soft border-border">
        <CardHeader className="flex flex-row items-center justify-between border-b border-border pb-3">
          <div>
            <CardTitle className="text-base font-bold text-foreground">Diagnostic Lab Workbench Queue</CardTitle>
            <CardDescription className="text-xs">Ordered investigations awaiting processing and result entry.</CardDescription>
          </div>
          <Button asChild size="sm" className="h-7 text-xs bg-teal-600 hover:bg-teal-700 text-white font-semibold">
            <Link to="/lab">
              Open Lab Workbench <ArrowRight className="size-3 ml-1" />
            </Link>
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-muted/50 text-muted-foreground font-semibold border-b border-border">
                <tr>
                  <th className="p-3">Patient</th>
                  <th className="p-3">Test Name</th>
                  <th className="p-3">Sample Type</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Ordered At</th>
                  <th className="p-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {data.activeWorklist.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-muted-foreground">
                      No pending lab orders.
                    </td>
                  </tr>
                ) : (
                  data.activeWorklist.map((order) => (
                    <tr key={order.orderId} className="hover:bg-muted/30">
                      <td className="p-3 font-bold text-foreground">{order.patientName}</td>
                      <td className="p-3 font-semibold text-foreground">{order.testName}</td>
                      <td className="p-3 text-muted-foreground">{order.sampleType || "Blood"}</td>
                      <td className="p-3">
                        <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-bold uppercase text-amber-700 dark:text-amber-300">
                          {order.status}
                        </span>
                      </td>
                      <td className="p-3 text-muted-foreground font-mono">
                        {new Date(order.orderedAt).toLocaleTimeString()}
                      </td>
                      <td className="p-3 text-right">
                        <Button asChild size="sm" variant="outline" className="h-6 text-[11px] border-border">
                          <Link to="/lab">Process Test</Link>
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
