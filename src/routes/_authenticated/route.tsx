import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { AuthProvider } from "@/contexts/AuthContext";
import { AppShell } from "@/components/layout/AppShell";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) {
      throw redirect({
        to: "/auth",
        search: { next: undefined, invite: undefined, email: undefined, tab: undefined },
      });
    }
    return { user: data.user };
  },
  component: () => (
    <AuthProvider>
      <AppShell>
        <Outlet />
      </AppShell>
    </AuthProvider>
  ),
});
