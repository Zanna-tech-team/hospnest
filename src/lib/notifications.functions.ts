import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";

export interface HospitalNotificationItem {
  id: string;
  category: "critical_panic" | "stat_imaging" | "news2_deterioration" | "queue_overdue" | "low_stock" | "transfer";
  severity: "critical" | "urgent" | "info";
  title: string;
  message: string;
  timestamp: string;
  routeHref: string;
  isRead: boolean;
  metadata?: Record<string, any>;
}

export const getHospitalLiveNotifications = createServerFn({ method: "GET" })
  .validator(
    z.object({
      hospitalId: z.string().optional(),
    })
  )
  .handler(async ({ data }): Promise<{ notifications: HospitalNotificationItem[]; unreadCount: number }> => {
    try {
      const hospitalId = data.hospitalId;
      if (!hospitalId) {
        return { notifications: [], unreadCount: 0 };
      }

      const notifications: HospitalNotificationItem[] = [];

      // 1. Check for Pending STAT Radiology / Imaging Orders
      const { data: statImaging } = await supabase
        .from("radiology_requests")
        .select("id, study_type, clinical_indication, priority, created_at, patients(full_name)")
        .eq("hospital_id", hospitalId)
        .eq("priority", "stat")
        .eq("status", "requested")
        .order("created_at", { ascending: false })
        .limit(5);

      if (statImaging) {
        for (const req of statImaging) {
          const pName = (req as any).patients?.full_name || "Patient";
          notifications.push({
            id: `stat-img-${req.id}`,
            category: "stat_imaging",
            severity: "critical",
            title: `STAT Imaging: ${req.study_type}`,
            message: `Immediate ${req.study_type} requested for ${pName}. Indication: ${req.clinical_indication || "Emergency clinical scan"}`,
            timestamp: req.created_at,
            routeHref: `/radiology?requestId=${req.id}`,
            isRead: false,
            metadata: { requestId: req.id },
          });
        }
      }

      // 2. Check for Low Stock Drugs (< 15 units remaining)
      const { data: lowStockDrugs } = await supabase
        .from("inventory_items")
        .select("id, name, generic_name, current_stock, minimum_stock")
        .eq("hospital_id", hospitalId)
        .lt("current_stock", 15)
        .order("current_stock", { ascending: true })
        .limit(5);

      if (lowStockDrugs) {
        for (const drug of lowStockDrugs) {
          notifications.push({
            id: `low-stock-${drug.id}`,
            category: "low_stock",
            severity: drug.current_stock <= 5 ? "critical" : "urgent",
            title: `Low Pharmacy Stock: ${drug.name}`,
            message: `${drug.name} (${drug.generic_name || "Medication"}) is down to ${drug.current_stock} units. Reorder required immediately.`,
            timestamp: new Date().toISOString(),
            routeHref: `/pharmacy/inventory`,
            isRead: false,
            metadata: { drugId: drug.id },
          });
        }
      }

      // 3. Check for Pending Inpatient Admissions
      const { data: urgentAdmissions } = await supabase
        .from("inpatient_admissions")
        .select("id, admission_type, provisional_diagnosis, created_at, patients(full_name)")
        .eq("hospital_id", hospitalId)
        .eq("status", "active")
        .eq("admission_type", "emergency")
        .order("created_at", { ascending: false })
        .limit(4);

      if (urgentAdmissions) {
        for (const adm of urgentAdmissions) {
          const pName = (adm as any).patients?.full_name || "Inpatient";
          notifications.push({
            id: `adm-emg-${adm.id}`,
            category: "critical_panic",
            severity: "urgent",
            title: `Emergency Inpatient Admission`,
            message: `${pName} admitted via Emergency for ${adm.provisional_diagnosis || "Acute Clinical Management"}.`,
            timestamp: adm.created_at,
            routeHref: `/admissions`,
            isRead: false,
            metadata: { admissionId: adm.id },
          });
        }
      }

      // 4. Check for Pending Inter-Hospital Transfers
      const { data: pendingTransfers } = await supabase
        .from("patient_transfers")
        .select("id, transfer_reason, urgency, created_at, destination_hospital_name, patients(full_name)")
        .or(`source_hospital_id.eq.${hospitalId},destination_hospital_id.eq.${hospitalId}`)
        .eq("status", "pending")
        .order("created_at", { ascending: false })
        .limit(4);

      if (pendingTransfers) {
        for (const tr of pendingTransfers) {
          const pName = (tr as any).patients?.full_name || "Patient";
          notifications.push({
            id: `tr-pending-${tr.id}`,
            category: "transfer",
            severity: tr.urgency === "emergency" ? "critical" : "urgent",
            title: `Inter-Hospital Transfer: ${tr.urgency.toUpperCase()}`,
            message: `Transfer for ${pName}. Reason: ${tr.transfer_reason || "Specialized tertiary care"}.`,
            timestamp: tr.created_at,
            routeHref: `/transfers`,
            isRead: false,
            metadata: { transferId: tr.id },
          });
        }
      }

      // Sort notifications by timestamp descending
      notifications.sort(
        (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );

      return {
        notifications,
        unreadCount: notifications.length,
      };
    } catch (err: any) {
      console.error("[getHospitalLiveNotifications] error:", err);
      return { notifications: [], unreadCount: 0 };
    }
  });
