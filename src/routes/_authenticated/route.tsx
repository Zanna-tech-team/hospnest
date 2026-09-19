import { createFileRoute, Outlet, redirect, Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { AuthProvider } from "@/contexts/AuthContext";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import { AlertTriangle, RefreshCw } from "lucide-react";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    try {
      const { data, error } = await supabase.auth.getUser();
      if (error || !data?.user) {
        throw redirect({
          to: "/auth",
        });
      }
      return { user: data.user };
    } catch (e: any) {
      if (e?.to || e?.isRedirect) throw e;
      throw redirect({
        to: "/auth",
      });
    }
  },
  errorComponent: ({ error, reset }) => {
    return (
      <div className="flex min-h-[70vh] flex-col items-center justify-center p-6 text-center">
        <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-destructive/10 text-destructive mb-4">
          <AlertTriangle className="size-7" />
        </div>
        <h2 className="text-xl font-bold text-foreground">Workspace Error</h2>
        <p className="mt-2 text-sm text-muted-foreground max-w-md">
          {error?.message || "An unexpected error occurred while loading this workspace module."}
        </p>
        <div className="mt-6 flex gap-3">
          <Button onClick={() => reset()} className="bg-teal-600 hover:bg-teal-700 text-white">
            <RefreshCw className="mr-2 size-4" /> Try Again
          </Button>
          <Button variant="outline" asChild>
            <Link to="/auth">Sign In</Link>
          </Button>
        </div>
      </div>
    );
  },
  component: () => (
    <AuthProvider>
      <AppShell>
        <Outlet />
      </AppShell>
    </AuthProvider>
  ),
});
