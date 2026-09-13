import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export interface HospitalNotificationItem {
  id: string;
  category: "critical_panic" | "stat_imaging" | "news2_deterioration" | "queue_overdue" | "low_stock" | "transfer";
  severity: "critical" | "urgent" | "info";
  title: string;
  message: string;
  timestamp: string;
  routeHref: string;
  isRead: boolean;
  metadata?: Record<string, any> | undefined;
}

const patientName = (p: any, fallback: string) =>
  p ? `${p.first_name ?? ""} ${p.last_name ?? ""}`.trim() || fallback : fallback;

export const getHospitalLiveNotifications = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    z.object({
      hospitalId: z.string().optional(),
    }),
  )
  .handler(async ({ context, data }): Promise<{ notifications: HospitalNotificationItem[]; unreadCount: number }> => {
    const supabase: any = context.supabase;
    try {
      const hospitalId = data.hospitalId;
      if (!hospitalId) {
        return { notifications: [], unreadCount: 0 };
      }

      const notifications: HospitalNotificationItem[] = [];

      // 1. Pending STAT imaging studies
      const { data: statImaging } = await supabase
        .from("radiology_studies")
        .select("id, modality, body_part, clinical_indication, priority, created_at, patient:patient_id (first_name, last_name)")
        .eq("hospital_id", hospitalId)
        .eq("priority", "stat")
        .eq("status", "scheduled")
        .order("created_at", { ascending: false })
        .limit(5);

      for (const req of statImaging ?? []) {
        const pName = patientName(req.patient, "Patient");
        const studyLabel = `${String(req.modality ?? "").toUpperCase()} ${req.body_part ?? ""}`.trim();
        notifications.push({
          id: `stat-img-${req.id}`,
          category: "stat_imaging",
          severity: "critical",
          title: `STAT Imaging: ${studyLabel}`,
          message: `Immediate ${studyLabel} requested for ${pName}. Indication: ${req.clinical_indication || "Emergency clinical scan"}`,
          timestamp: req.created_at,
          routeHref: `/radiology?requestId=${req.id}`,
          isRead: false,
          metadata: { requestId: req.id },
        });
      }

      // 2. Low pharmacy stock
      const { data: lowStockDrugs } = await supabase
        .from("hospital_inventory")
        .select("id, quantity_in_stock, reorder_level, drug:drug_id (generic_name, brand_name)")
        .eq("hospital_id", hospitalId)
        .lt("quantity_in_stock", 15)
        .order("quantity_in_stock", { ascending: true })
        .limit(5);

      for (const item of lowStockDrugs ?? []) {
        const name = item.drug?.brand_name || item.drug?.generic_name || "Medication";
        notifications.push({
          id: `low-stock-${item.id}`,
          category: "low_stock",
          severity: item.quantity_in_stock <= 5 ? "critical" : "urgent",
          title: `Low Pharmacy Stock: ${name}`,
          message: `${name} (${item.drug?.generic_name || "Medication"}) is down to ${item.quantity_in_stock} units. Reorder required immediately.`,
          timestamp: new Date().toISOString(),
          routeHref: `/pharmacy/inventory`,
          isRead: false,
          metadata: { inventoryId: item.id },
        });
      }

      // 3. Emergency inpatient admissions
      const { data: urgentAdmissions } = await supabase
        .from("admissions")
        .select("id, admission_type, admission_reason, created_at, patient:patient_id (first_name, last_name)")
        .eq("hospital_id", hospitalId)
        .eq("status", "active")
        .eq("admission_type", "emergency")
        .order("created_at", { ascending: false })
        .limit(4);

      for (const adm of urgentAdmissions ?? []) {
        const pName = patientName(adm.patient, "Inpatient");
        notifications.push({
          id: `adm-emg-${adm.id}`,
          category: "critical_panic",
          severity: "urgent",
          title: `Emergency Inpatient Admission`,
          message: `${pName} admitted via Emergency for ${adm.admission_reason || "Acute Clinical Management"}.`,
          timestamp: adm.created_at,
          routeHref: `/admissions`,
          isRead: false,
          metadata: { admissionId: adm.id },
        });
      }

      // 4. Pending inter-hospital transfers
      const { data: pendingTransfers } = await supabase
        .from("patient_transfers")
        .select("id, reason_for_transfer, priority, created_at, patient:patient_id (first_name, last_name)")
        .or(`referring_hospital_id.eq.${hospitalId},receiving_hospital_id.eq.${hospitalId}`)
        .eq("status", "pending")
        .order("created_at", { ascending: false })
        .limit(4);

      for (const tr of pendingTransfers ?? []) {
        const pName = patientName(tr.patient, "Patient");
        const priority = String(tr.priority ?? "routine");
        notifications.push({
          id: `tr-pending-${tr.id}`,
          category: "transfer",
          severity: priority === "emergency" ? "critical" : "urgent",
          title: `Inter-Hospital Transfer: ${priority.toUpperCase()}`,
          message: `Transfer for ${pName}. Reason: ${tr.reason_for_transfer || "Specialized tertiary care"}.`,
          timestamp: tr.created_at,
          routeHref: `/transfers`,
          isRead: false,
          metadata: { transferId: tr.id },
        });
      }

      notifications.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

      return {
        notifications,
        unreadCount: notifications.length,
      };
    } catch (err: any) {
      console.error("[getHospitalLiveNotifications] error:", err);
      return { notifications: [], unreadCount: 0 };
    }
  });
