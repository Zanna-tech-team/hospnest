import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export interface HospitalNotificationItem {
  id: string;
  category:
    | "critical_panic"
    | "stat_imaging"
    | "lab_completed"
    | "lab_critical"
    | "radiology_completed"
    | "radiology_critical"
    | "news2_deterioration"
    | "queue_overdue"
    | "low_stock"
    | "transfer"
    | "break_glass_alert"
    | "access_request"
    | "general";
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

/**
 * Creates a notification in the notifications table.
 */
export async function createNotificationRecord(
  supabaseAdmin: any,
  params: {
    recipientUserId: string;
    hospitalId?: string | null;
    type: string;
    priority?: "routine" | "urgent" | "critical";
    title: string;
    body: string;
    linkTarget?: string | null;
    entityReference?: string | null;
    metadata?: Record<string, any>;
  }
) {
  try {
    await supabaseAdmin.from("notifications").insert({
      recipient_user_id: params.recipientUserId,
      hospital_id: params.hospitalId || null,
      type: params.type,
      priority: params.priority || "routine",
      title: params.title,
      body: params.body,
      link_target: params.linkTarget || null,
      entity_reference: params.entityReference || null,
      metadata: params.metadata || {},
      is_read: false,
      created_at: new Date().toISOString(),
    });
  } catch (err) {
    console.error("Failed to create notification record:", err);
  }
}

/**
 * Fetches user notifications from notifications table with real-time support (Prompt 40).
 */
export const getUserNotifications = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .validator(
    z.object({
      hospitalId: z.string().optional(),
      limit: z.number().optional(),
    }).optional()
  )
  .handler(async ({ context, data }): Promise<{ notifications: HospitalNotificationItem[]; unreadCount: number }> => {
    const { supabase, userId } = context;

    try {
      const limit = data?.limit || 30;
      const formattedNotifications: HospitalNotificationItem[] = [];

      // 1. Fetch personal notifications from `notifications` table
      const { data: dbNotifications, error } = await supabase
        .from("notifications")
        .select("*")
        .eq("recipient_user_id", userId)
        .order("created_at", { ascending: false })
        .limit(limit);

      if (error) {
        console.warn("Error fetching user notifications from table:", error);
      }

      (dbNotifications ?? []).forEach((n: any) => {
        let cat: HospitalNotificationItem["category"] = "general";
        if (n.type.includes("lab_result_critical") || n.priority === "critical") cat = "lab_critical";
        else if (n.type.includes("lab_result_completed")) cat = "lab_completed";
        else if (n.type.includes("radiology_critical")) cat = "radiology_critical";
        else if (n.type.includes("radiology_completed")) cat = "radiology_completed";
        else if (n.type.includes("break_glass")) cat = "break_glass_alert";
        else if (n.type.includes("access_request")) cat = "access_request";

        let sev: HospitalNotificationItem["severity"] = "info";
        if (n.priority === "critical") sev = "critical";
        else if (n.priority === "urgent") sev = "urgent";

        formattedNotifications.push({
          id: n.id,
          category: cat,
          severity: sev,
          title: n.title,
          message: n.body,
          timestamp: n.created_at,
          routeHref: n.link_target || "/portal",
          isRead: Boolean(n.is_read),
          metadata: n.metadata,
        });
      });

      // 2. If hospital context provided, also query high-urgency operational alerts
      const hospitalId = data?.hospitalId;
      if (hospitalId) {
        // Pending STAT imaging studies
        const { data: statImaging } = await supabase
          .from("radiology_studies")
          .select("id, modality, body_part, clinical_indication, priority, created_at, patient:patient_id (first_name, last_name)")
          .eq("hospital_id", hospitalId)
          .eq("priority", "stat")
          .eq("status", "scheduled")
          .order("created_at", { ascending: false })
          .limit(4);

        for (const req of statImaging ?? []) {
          const pName = patientName(req.patient, "Patient");
          const studyLabel = `${String(req.modality ?? "").toUpperCase()} ${req.body_part ?? ""}`.trim();
          formattedNotifications.push({
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

        // Low pharmacy stock
        const { data: lowStockDrugs } = await supabase
          .from("hospital_inventory")
          .select("id, quantity_in_stock, reorder_level, drug:drug_id (generic_name, brand_name)")
          .eq("hospital_id", hospitalId)
          .lt("quantity_in_stock", 15)
          .order("quantity_in_stock", { ascending: true })
          .limit(4);

        for (const item of lowStockDrugs ?? []) {
          const name = item.drug?.brand_name || item.drug?.generic_name || "Medication";
          formattedNotifications.push({
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

        // Emergency inpatient admissions
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
          formattedNotifications.push({
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

        // Pending inter-hospital transfers
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
          formattedNotifications.push({
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
      }

      // Sort descending by timestamp
      formattedNotifications.sort(
        (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );

      const unreadCount = formattedNotifications.filter((n) => !n.isRead).length;

      return {
        notifications: formattedNotifications,
        unreadCount,
      };
    } catch (err) {
      console.error("[getUserNotifications] error:", err);
      return { notifications: [], unreadCount: 0 };
    }
  });

/**
 * Marks a single notification as read.
 */
export const markNotificationAsRead = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator(z.object({ notificationId: z.string() }))
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;

    // If it's a UUID from `notifications` table
    if (!data.notificationId.includes("-img-") && !data.notificationId.includes("low-stock-")) {
      await supabase
        .from("notifications")
        .update({ is_read: true, updated_at: new Date().toISOString() })
        .eq("id", data.notificationId)
        .eq("recipient_user_id", userId);
    }

    return { success: true };
  });

/**
 * Marks all notifications as read for current user.
 */
export const markAllNotificationsAsRead = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;

    await supabase
      .from("notifications")
      .update({ is_read: true, updated_at: new Date().toISOString() })
      .eq("recipient_user_id", userId)
      .eq("is_read", false);

    return { success: true };
  });

/** Legacy alias for backwards compatibility */
export const getHospitalLiveNotifications = getUserNotifications;
