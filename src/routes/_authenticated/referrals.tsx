import { createFileRoute, Navigate } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/referrals")({
  component: ReferralsAliasPage,
});

function ReferralsAliasPage() {
  return <Navigate to="/transfers" replace />;
}
