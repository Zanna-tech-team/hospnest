import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { StaffRole } from "./team.functions";

export type PharmacyInventoryItem = {
  id: string;
  drugId: string;
  genericName: string;
  brandName: string | null;
  dosageForm: string | null;
  strength: string | null;
  batchNumber: string;
  unitPrice: number;
  quantityInStock: number;
  reorderLevel: number;
  expiryDate: string | null;
  isLowStock: boolean;
  isNearExpiry: boolean; // within 90 days
  isExpired: boolean;
  daysToExpiry: number | null;
  createdAt: string;
};

export type StockMovementItem = {
  id: string;
  inventoryId: string | null;
  drugName: string;
  movementType: "restock" | "dispense" | "adjustment" | "return" | "expired";
  quantityChange: number;
  previousStock: number;
  newStock: number;
  reason: string | null;
  performedByName: string | null;
  createdAt: string;
};

export type PharmacyInventoryResponse = {
  inventory: PharmacyInventoryItem[];
  recentMovements: StockMovementItem[];
  availableFormulary: Array<{
    id: string;
    genericName: string;
    brandName: string | null;
    dosageForm: string | null;
    strength: string | null;
  }>;
  counts: {
    totalDrugs: number;
    totalUnits: number;
    lowStock: number;
    nearExpiry: number;
    expired: number;
  };
  activeHospitalId: string;
  hospitalName: string;
  callerRole: StaffRole;
  canManagePharmacy: boolean;
};

async function writeAuditEntry(
  supabase: { from: (t: string) => any },
  entry: {
    hospital_id: string;
    accessor_id: string;
    accessor_role: StaffRole;
    patient_id?: string;
    encounter_id?: string;
    action: "READ" | "WRITE" | "BREAK_GLASS_OVERRIDE" | "EXPORT";
    justification?: string | null;
  },
) {
  try {
    await supabase.from("record_audit_logs").insert({
      hospital_id: entry.hospital_id,
      accessor_id: entry.accessor_id,
      accessor_role: entry.accessor_role,
      patient_id: entry.patient_id || "00000000-0000-0000-0000-000000000000",
      encounter_id: entry.encounter_id || null,
      action: entry.action,
      justification: entry.justification || null,
    });
  } catch (err) {
    console.warn("Audit log notice:", err);
  }
}

/**
 * Calculates days to expiry.
 */
function getDaysToExpiry(expiryDate: string | null): number | null {
  if (!expiryDate) return null;
  try {
    const exp = new Date(expiryDate).getTime();
    const now = new Date().getTime();
    const diffDays = Math.ceil((exp - now) / (1000 * 60 * 60 * 24));
    return diffDays;
  } catch {
    return null;
  }
}

/**
 * Loads Pharmacy medication inventory, stock warnings, recent audit movements, and formulary options.
 */
export const getPharmacyInventory = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input?: {
      hospitalId?: string | undefined;
    }) => {
      return {
        hospitalId: input?.hospitalId ? String(input.hospitalId).trim() : undefined,
      };
    },
  )
  .handler(async ({ context, data: input }): Promise<PharmacyInventoryResponse> => {
    const { supabase, userId } = context;

    const { data: roleRows, error: roleError } = await supabase
      .from("user_roles")
      .select("role, hospital_id, hospitals(id, name)")
      .eq("user_id", userId)
      .eq("is_active", true);

    if (roleError) throw new Error(roleError.message);

    const roles = (roleRows ?? []).filter((r: any) => r.hospital_id && r.role !== "patient");
    if (roles.length === 0) throw new Error("Hospital staff access required.");

    const matchedRole = input?.hospitalId
      ? roles.find((r: any) => r.hospital_id === input.hospitalId) || roles[0]
      : roles[0];

    const activeHospitalId = matchedRole?.hospital_id || "";
    const hospitalName = (matchedRole as any)?.hospitals?.name || "Hospital";
    const callerRole = (matchedRole?.role as StaffRole) || "pharmacist";
    const canManagePharmacy = ["pharmacist", "hospital_admin", "super_admin", "doctor"].includes(callerRole);

    // 1. Fetch hospital inventory items
    const { data: inventoryRows, error: invError } = await supabase
      .from("hospital_inventory")
      .select(`
        id, drug_id, batch_number, unit_price, quantity_in_stock, reorder_level, expiry_date, created_at,
        drug:drug_id(
          id, generic_name, brand_name, dosage_form, strength
        )
      `)
      .eq("hospital_id", activeHospitalId)
      .order("quantity_in_stock", { ascending: true });

    if (invError) throw new Error(invError.message);

    const counts = {
      totalDrugs: 0,
      totalUnits: 0,
      lowStock: 0,
      nearExpiry: 0,
      expired: 0,
    };

    const inventory: PharmacyInventoryItem[] = (inventoryRows ?? []).map((row: any) => {
      const d = row.drug;
      const qty = Number(row.quantity_in_stock) || 0;
      const reorder = Number(row.reorder_level) || 10;
      const days = getDaysToExpiry(row.expiry_date);

      const isLowStock = qty <= reorder;
      const isExpired = days !== null && days <= 0;
      const isNearExpiry = days !== null && days > 0 && days <= 90;

      counts.totalDrugs++;
      counts.totalUnits += qty;
      if (isLowStock) counts.lowStock++;
      if (isNearExpiry) counts.nearExpiry++;
      if (isExpired) counts.expired++;

      return {
        id: row.id,
        drugId: row.drug_id,
        genericName: d?.generic_name || "Medication",
        brandName: d?.brand_name || null,
        dosageForm: d?.dosage_form || null,
        strength: d?.strength || null,
        batchNumber: row.batch_number,
        unitPrice: Number(row.unit_price) || 0,
        quantityInStock: qty,
        reorderLevel: reorder,
        expiryDate: row.expiry_date,
        isLowStock,
        isNearExpiry,
        isExpired,
        daysToExpiry: days,
        createdAt: row.created_at,
      };
    });

    // 2. Fetch recent stock movements
    let recentMovements: StockMovementItem[] = [];
    try {
      const { data: moveRows } = await (supabase as any)
        .from("stock_movements")
        .select(`
          id, inventory_id, movement_type, quantity_change, previous_stock, new_stock, reason, created_at,
          drug:drug_id(generic_name, brand_name),
          staff:performed_by(full_name)
        `)
        .eq("hospital_id", activeHospitalId)
        .order("created_at", { ascending: false })
        .limit(20);

      recentMovements = (moveRows ?? []).map((m: any) => ({
        id: m.id,
        inventoryId: m.inventory_id,
        drugName: m.drug?.brand_name ? `${m.drug.brand_name} (${m.drug.generic_name})` : m.drug?.generic_name || "Medication",
        movementType: m.movement_type,
        quantityChange: m.quantity_change,
        previousStock: m.previous_stock,
        newStock: m.new_stock,
        reason: m.reason,
        performedByName: m.staff?.full_name || null,
        createdAt: m.created_at,
      }));
    } catch {
      // If table recently migrated
    }

    // 3. Fetch formulary list for adding new drugs
    const { data: formularyRows } = await supabase
      .from("drug_catalog")
      .select("id, generic_name, brand_name, dosage_form, strength")
      .order("generic_name", { ascending: true });

    const availableFormulary = (formularyRows ?? []).map((f: any) => ({
      id: f.id,
      genericName: f.generic_name,
      brandName: f.brand_name,
      dosageForm: f.dosage_form,
      strength: f.strength,
    }));

    await writeAuditEntry(supabase, {
      hospital_id: activeHospitalId,
      accessor_id: userId,
      accessor_role: callerRole,
      action: "READ",
      justification: `Accessed pharmacy inventory list (${inventory.length} drugs, ${counts.lowStock} low stock)`,
    });

    return {
      inventory,
      recentMovements,
      availableFormulary,
      counts,
      activeHospitalId,
      hospitalName,
      callerRole,
      canManagePharmacy,
    };
  });

/**
 * Adds a new medication into the hospital inventory or restocks an existing one.
 */
export const addOrRestockMedication = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: {
      hospitalId?: string | undefined;
      drugId: string;
      batchNumber: string;
      unitPrice: number;
      quantityToAdd: number;
      reorderLevel?: number | undefined;
      expiryDate?: string | undefined;
      reason?: string | undefined;
    }) => {
      if (!input.drugId) throw new Error("Select a drug from the catalog.");
      if (!input.batchNumber) throw new Error("Batch number is required.");
      if (input.unitPrice < 0) throw new Error("Unit price cannot be negative.");
      if (input.quantityToAdd <= 0) throw new Error("Quantity must be greater than zero.");
      return {
        hospitalId: input.hospitalId ? String(input.hospitalId).trim() : undefined,
        drugId: String(input.drugId).trim(),
        batchNumber: String(input.batchNumber).trim(),
        unitPrice: Number(input.unitPrice) || 0,
        quantityToAdd: Math.max(1, Number(input.quantityToAdd) || 1),
        reorderLevel: input.reorderLevel !== undefined ? Number(input.reorderLevel) : 20,
        expiryDate: input.expiryDate ? String(input.expiryDate).trim() : null,
        reason: input.reason ? String(input.reason).trim() : "Pharmacy restock received",
      };
    },
  )
  .handler(async ({ context, data: input }) => {
    const { supabase, userId } = context;

    const { data: roleRows } = await supabase
      .from("user_roles")
      .select("role, hospital_id")
      .eq("user_id", userId)
      .eq("is_active", true);

    const roles = (roleRows ?? []).filter((r: any) => r.hospital_id && r.role !== "patient");
    if (roles.length === 0) throw new Error("Unauthorized.");

    const matchedRole = input.hospitalId
      ? roles.find((r: any) => r.hospital_id === input.hospitalId) || roles[0]
      : roles[0];

    const activeHospitalId = matchedRole?.hospital_id || "";
    const callerRole = (matchedRole?.role as StaffRole) || "pharmacist";

    const { data: staffRow } = await supabase
      .from("staff")
      .select("id, full_name")
      .eq("user_id", userId)
      .eq("hospital_id", activeHospitalId)
      .maybeSingle();

    // Check if inventory row already exists for this hospital & drug
    const { data: existingRow } = await supabase
      .from("hospital_inventory")
      .select("id, quantity_in_stock")
      .eq("hospital_id", activeHospitalId)
      .eq("drug_id", input.drugId)
      .maybeSingle();

    let inventoryId: string;
    let prevStock = 0;
    let newStock = input.quantityToAdd;

    if (existingRow) {
      inventoryId = existingRow.id;
      prevStock = existingRow.quantity_in_stock || 0;
      newStock = prevStock + input.quantityToAdd;

      const { error: updateErr } = await supabase
        .from("hospital_inventory")
        .update({
          batch_number: input.batchNumber,
          unit_price: input.unitPrice,
          quantity_in_stock: newStock,
          reorder_level: input.reorderLevel ?? 20,
          expiry_date: input.expiryDate,
        })
        .eq("id", existingRow.id);

      if (updateErr) throw new Error(updateErr.message);
    } else {
      const { data: inserted, error: insertErr } = await supabase
        .from("hospital_inventory")
        .insert({
          hospital_id: activeHospitalId,
          drug_id: input.drugId,
          batch_number: input.batchNumber,
          unit_price: input.unitPrice,
          quantity_in_stock: input.quantityToAdd,
          reorder_level: input.reorderLevel ?? 20,
          expiry_date: input.expiryDate,
        })
        .select("id")
        .single();

      if (insertErr) throw new Error(insertErr.message);
      inventoryId = inserted.id;
    }

    // Insert stock movement record
    try {
      await (supabase as any).from("stock_movements").insert({
        hospital_id: activeHospitalId,
        inventory_id: inventoryId,
        drug_id: input.drugId,
        movement_type: "restock",
        quantity_change: input.quantityToAdd,
        previous_stock: prevStock,
        new_stock: newStock,
        reason: input.reason,
        performed_by: staffRow?.id || null,
      });
    } catch {
      // Logging fallback
    }

    await writeAuditEntry(supabase, {
      hospital_id: activeHospitalId,
      accessor_id: userId,
      accessor_role: callerRole,
      action: "WRITE",
      justification: `Restocked inventory (+${input.quantityToAdd} units, batch ${input.batchNumber}) by ${staffRow?.full_name || "Staff"}`,
    });

    return { success: true, newStock };
  });

/**
 * Adjusts inventory stock (for write-offs, damaged items, expired disposals, or physical counts).
 */
export const adjustInventoryStock = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: {
      hospitalId?: string | undefined;
      inventoryId: string;
      drugId: string;
      newQuantity: number;
      movementType: "adjustment" | "expired" | "return";
      reason: string;
    }) => {
      if (!input.inventoryId || !input.drugId) throw new Error("Missing inventory details.");
      if (input.newQuantity < 0) throw new Error("Quantity cannot be negative.");
      if (!input.reason) throw new Error("A reason is required for stock adjustment.");
      return {
        hospitalId: input.hospitalId ? String(input.hospitalId).trim() : undefined,
        inventoryId: String(input.inventoryId).trim(),
        drugId: String(input.drugId).trim(),
        newQuantity: Number(input.newQuantity),
        movementType: input.movementType || "adjustment",
        reason: String(input.reason).trim(),
      };
    },
  )
  .handler(async ({ context, data: input }) => {
    const { supabase, userId } = context;

    const { data: roleRows } = await supabase
      .from("user_roles")
      .select("role, hospital_id")
      .eq("user_id", userId)
      .eq("is_active", true);

    const roles = (roleRows ?? []).filter((r: any) => r.hospital_id && r.role !== "patient");
    if (roles.length === 0) throw new Error("Unauthorized.");

    const matchedRole = input.hospitalId
      ? roles.find((r: any) => r.hospital_id === input.hospitalId) || roles[0]
      : roles[0];

    const activeHospitalId = matchedRole?.hospital_id || "";
    const callerRole = (matchedRole?.role as StaffRole) || "pharmacist";

    const { data: staffRow } = await supabase
      .from("staff")
      .select("id, full_name")
      .eq("user_id", userId)
      .eq("hospital_id", activeHospitalId)
      .maybeSingle();

    const { data: currentInv } = await supabase
      .from("hospital_inventory")
      .select("quantity_in_stock")
      .eq("id", input.inventoryId)
      .single();

    const prevStock = currentInv?.quantity_in_stock || 0;
    const diff = input.newQuantity - prevStock;

    const { error: updateErr } = await supabase
      .from("hospital_inventory")
      .update({
        quantity_in_stock: input.newQuantity,
      })
      .eq("id", input.inventoryId);

    if (updateErr) throw new Error(updateErr.message);

    try {
      await (supabase as any).from("stock_movements").insert({
        hospital_id: activeHospitalId,
        inventory_id: input.inventoryId,
        drug_id: input.drugId,
        movement_type: input.movementType,
        quantity_change: diff,
        previous_stock: prevStock,
        new_stock: input.newQuantity,
        reason: input.reason,
        performed_by: staffRow?.id || null,
      });
    } catch {
      // Fallback
    }

    await writeAuditEntry(supabase, {
      hospital_id: activeHospitalId,
      accessor_id: userId,
      accessor_role: callerRole,
      action: "WRITE",
      justification: `Adjusted inventory stock from ${prevStock} to ${input.newQuantity} (Reason: ${input.reason})`,
    });

    return { success: true, newStock: input.newQuantity };
  });

// ============================================================
// DISPENSING WORKBENCH SERVER FUNCTIONS (Prompt 12)
// ============================================================

export type PharmacyPrescriptionItem = {
  id: string;
  drugId: string;
  drugName: string;
  genericName: string;
  brandName: string | null;
  dosageForm: string | null;
  strength: string | null;
  dosage: string | null;
  frequency: string | null;
  duration: string | null;
  quantityPrescribed: number;
  quantityDispensed: number;
  dispensedAt: string | null;
  dispensedByName: string | null;
  dispenseNotes: string | null;
  // Inventory linkage
  inventoryId: string | null;
  stockAvailable: number;
  unitPrice: number;
  batchNumber: string | null;
  expiryDate: string | null;
  isOutOfStock: boolean;
  isLowStock: boolean;
};

export type PharmacyDispensingPrescription = {
  id: string;
  encounterId: string;
  encounterDate: string;
  queueNumber: number | null;
  encounterStatus: string;
  patientId: string;
  patientName: string;
  patientNin: string | null;
  patientAge: number | null;
  patientGender: string | null;
  patientPhone: string | null;
  allergies: string[];
  chronicConditions: string[];
  doctorId: string | null;
  doctorName: string | null;
  status: "pending" | "dispensed" | "partially_dispensed" | "cancelled";
  notes: string | null;
  createdAt: string;
  items: PharmacyPrescriptionItem[];
  totalPrescribedItems: number;
  totalDispensedItems: number;
  hasOutOfStockItem: boolean;
};

export type PharmacyDispensingQueueResponse = {
  prescriptions: PharmacyDispensingPrescription[];
  counts: {
    pending: number;
    partiallyDispensed: number;
    dispensedToday: number;
    outOfStockCount: number;
    total: number;
  };
  activeHospitalId: string;
  hospitalName: string;
  callerRole: StaffRole;
  canDispense: boolean;
};

function maskNin(nin: string | null): string | null {
  if (!nin) return null;
  if (nin.length <= 4) return "****";
  return `${nin.slice(0, 3)}*****${nin.slice(-3)}`;
}

function calculateAge(dob: string | null): number | null {
  if (!dob) return null;
  const birth = new Date(dob);
  const now = new Date();
  let age = now.getFullYear() - birth.getFullYear();
  const m = now.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) {
    age--;
  }
  return age;
}

/**
 * Loads Pharmacy dispensing queue of pending and active prescriptions.
 */
export const getPharmacyDispensingQueue = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input?: {
      hospitalId?: string | undefined;
    }) => {
      return {
        hospitalId: input?.hospitalId ? String(input.hospitalId).trim() : undefined,
      };
    },
  )
  .handler(async ({ context, data: input }): Promise<PharmacyDispensingQueueResponse> => {
    const { supabase, userId } = context;

    const { data: roleRows, error: roleError } = await supabase
      .from("user_roles")
      .select("role, hospital_id, hospitals(id, name)")
      .eq("user_id", userId)
      .eq("is_active", true);

    if (roleError) throw new Error(roleError.message);

    const roles = (roleRows ?? []).filter((r: any) => r.hospital_id && r.role !== "patient");
    if (roles.length === 0) throw new Error("Hospital staff access required.");

    const matchedRole = input?.hospitalId
      ? roles.find((r: any) => r.hospital_id === input.hospitalId) || roles[0]
      : roles[0];

    const activeHospitalId = matchedRole?.hospital_id || "";
    const hospitalName = (matchedRole as any)?.hospitals?.name || "Hospital";
    const callerRole = (matchedRole?.role as StaffRole) || "pharmacist";
    const isClinical = ["doctor", "nurse", "pharmacist", "hospital_admin", "super_admin"].includes(callerRole);
    const canDispense = ["pharmacist", "doctor", "nurse", "hospital_admin", "super_admin"].includes(callerRole);

    // 1. Fetch current hospital inventory map
    const { data: invRows } = await (supabase as any)
      .from("hospital_inventory")
      .select("id, drug_id, quantity_in_stock, unit_price, batch_number, expiry_date, reorder_level")
      .eq("hospital_id", activeHospitalId);

    const inventoryByDrugId: Record<string, any> = {};
    for (const inv of invRows ?? []) {
      // If multiple batches, pick the one with highest stock or latest
      if (!inventoryByDrugId[inv.drug_id] || inv.quantity_in_stock > (inventoryByDrugId[inv.drug_id]?.quantity_in_stock || 0)) {
        inventoryByDrugId[inv.drug_id] = inv;
      }
    }

    // 2. Fetch prescriptions with relations
    const { data: rxRows, error: rxErr } = await (supabase as any)
      .from("prescriptions")
      .select(`
        id, encounter_id, patient_id, doctor_id, status, notes, created_at,
        encounter:encounter_id (id, encounter_status, created_at, appointment:appointment_id (queue_number)),
        patient:patient_id (id, first_name, last_name, nin, date_of_birth, gender, phone, allergies, chronic_conditions),
        doctor:doctor_id (id, full_name),
        prescription_items (
          id, drug_id, dosage, frequency, duration, quantity_prescribed, quantity_dispensed,
          dispensed_at, dispensed_by, dispense_notes,
          dispensed_staff:dispensed_by (full_name),
          drug:drug_id (id, generic_name, brand_name, dosage_form, strength)
        )
      `)
      .eq("hospital_id", activeHospitalId)
      .order("created_at", { ascending: false });

    if (rxErr) throw new Error(rxErr.message);

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    let pendingCount = 0;
    let partiallyDispensedCount = 0;
    let dispensedTodayCount = 0;
    let outOfStockCount = 0;

    const prescriptions: PharmacyDispensingPrescription[] = (rxRows ?? []).map((rx: any) => {
      const patient = rx.patient || {};
      const encounter = rx.encounter || {};
      const doctor = rx.doctor || {};
      const rawItems = rx.prescription_items ?? [];

      let hasOutOfStock = false;
      let totalPrescribed = 0;
      let totalDispensed = 0;

      const items: PharmacyPrescriptionItem[] = rawItems.map((item: any) => {
        const drug = item.drug || {};
        const inv = inventoryByDrugId[item.drug_id] || null;
        const stockAvailable = inv?.quantity_in_stock ?? 0;
        const unitPrice = inv?.unit_price ? Number(inv.unit_price) : 0;
        const reorderLevel = inv?.reorder_level ?? 10;
        
        const isOutOfStock = stockAvailable <= 0;
        const isLowStock = stockAvailable > 0 && stockAvailable <= reorderLevel;

        if (isOutOfStock && item.quantity_dispensed < item.quantity_prescribed) {
          hasOutOfStock = true;
          outOfStockCount++;
        }

        totalPrescribed += Number(item.quantity_prescribed || 0);
        totalDispensed += Number(item.quantity_dispensed || 0);

        const generic = drug.generic_name || "Unknown Drug";
        const brand = drug.brand_name || null;
        const drugName = brand ? `${brand} (${generic})` : generic;

        return {
          id: item.id,
          drugId: item.drug_id,
          drugName,
          genericName: generic,
          brandName: brand,
          dosageForm: drug.dosage_form || null,
          strength: drug.strength || null,
          dosage: item.dosage || null,
          frequency: item.frequency || null,
          duration: item.duration || null,
          quantityPrescribed: Number(item.quantity_prescribed || 0),
          quantityDispensed: Number(item.quantity_dispensed || 0),
          dispensedAt: item.dispensed_at || null,
          dispensedByName: item.dispensed_staff?.full_name || null,
          dispenseNotes: item.dispense_notes || null,
          inventoryId: inv?.id || null,
          stockAvailable,
          unitPrice,
          batchNumber: inv?.batch_number || null,
          expiryDate: inv?.expiry_date || null,
          isOutOfStock,
          isLowStock,
        };
      });

      const rxStatus = rx.status as "pending" | "dispensed" | "partially_dispensed" | "cancelled";
      if (rxStatus === "pending") pendingCount++;
      if (rxStatus === "partially_dispensed") partiallyDispensedCount++;

      const createdAtDate = new Date(rx.created_at);
      if (rxStatus === "dispensed" && createdAtDate >= todayStart) {
        dispensedTodayCount++;
      }

      return {
        id: rx.id,
        encounterId: rx.encounter_id,
        encounterDate: encounter.created_at || rx.created_at,
        queueNumber: (encounter.appointment as any)?.queue_number ?? null,
        encounterStatus: encounter.encounter_status || "active",
        patientId: rx.patient_id,
        patientName: `${patient.first_name || ""} ${patient.last_name || ""}`.trim() || "Unknown Patient",
        patientNin: isClinical ? patient.nin || null : maskNin(patient.nin || null),
        patientAge: calculateAge(patient.date_of_birth),
        patientGender: patient.gender || null,
        patientPhone: patient.phone || null,
        allergies: Array.isArray(patient.allergies) ? patient.allergies : [],
        chronicConditions: Array.isArray(patient.chronic_conditions) ? patient.chronic_conditions : [],
        doctorId: rx.doctor_id || null,
        doctorName: doctor.full_name || null,
        status: rxStatus,
        notes: rx.notes || null,
        createdAt: rx.created_at,
        items,
        totalPrescribedItems: totalPrescribed,
        totalDispensedItems: totalDispensed,
        hasOutOfStockItem: hasOutOfStock,
      };
    });

    await writeAuditEntry(supabase, {
      hospital_id: activeHospitalId,
      accessor_id: userId,
      accessor_role: callerRole,
      action: "READ",
      justification: `Accessed pharmacy dispensing queue (${prescriptions.length} prescriptions listed).`,
    });

    return {
      prescriptions,
      counts: {
        pending: pendingCount,
        partiallyDispensed: partiallyDispensedCount,
        dispensedToday: dispensedTodayCount,
        outOfStockCount,
        total: prescriptions.length,
      },
      activeHospitalId,
      hospitalName,
      callerRole,
      canDispense,
    };
  });

/**
 * Dispenses prescription items, decrements hospital inventory, creates stock movement records,
 * and posts medication charges to the encounter invoice.
 */
export const dispensePrescriptionOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: {
      hospitalId?: string | undefined;
      prescriptionId: string;
      encounterId: string;
      patientId: string;
      items: Array<{
        itemId: string;
        drugId: string;
        quantityToDispense: number;
        dispenseNotes?: string | undefined;
      }>;
    }) => {
      if (!input.prescriptionId) throw new Error("Prescription ID is required.");
      if (!input.encounterId) throw new Error("Encounter ID is required.");
      if (!input.patientId) throw new Error("Patient ID is required.");
      if (!Array.isArray(input.items) || input.items.length === 0) {
        throw new Error("No items provided for dispensing.");
      }
      return {
        hospitalId: input.hospitalId ? String(input.hospitalId).trim() : undefined,
        prescriptionId: String(input.prescriptionId).trim(),
        encounterId: String(input.encounterId).trim(),
        patientId: String(input.patientId).trim(),
        items: input.items.map((i) => ({
          itemId: String(i.itemId).trim(),
          drugId: String(i.drugId).trim(),
          quantityToDispense: Number(i.quantityToDispense) || 0,
          dispenseNotes: i.dispenseNotes ? String(i.dispenseNotes).trim() : undefined,
        })),
      };
    },
  )
  .handler(async ({ context, data: input }) => {
    const { supabase, userId } = context;

    const { data: roleRows } = await supabase
      .from("user_roles")
      .select("role, hospital_id")
      .eq("user_id", userId)
      .eq("is_active", true);

    const roles = (roleRows ?? []).filter((r: any) => r.hospital_id && r.role !== "patient");
    if (roles.length === 0) throw new Error("Unauthorized.");

    const matchedRole = input.hospitalId
      ? roles.find((r: any) => r.hospital_id === input.hospitalId) || roles[0]
      : roles[0];

    const activeHospitalId = matchedRole?.hospital_id || "";
    const callerRole = (matchedRole?.role as StaffRole) || "pharmacist";

    const allowedRoles = ["pharmacist", "doctor", "nurse", "hospital_admin", "super_admin"];
    if (!allowedRoles.includes(callerRole)) {
      throw new Error("Only pharmacists, clinicians, or administrators can dispense medications.");
    }

    const { data: staffRow } = await supabase
      .from("staff")
      .select("id, full_name")
      .eq("user_id", userId)
      .eq("hospital_id", activeHospitalId)
      .maybeSingle();

    // 1. Fetch current prescription items
    const { data: currentItems, error: itemsFetchErr } = await (supabase as any)
      .from("prescription_items")
      .select("id, drug_id, quantity_prescribed, quantity_dispensed, dispense_notes, drug:drug_id(generic_name, brand_name, strength)")
      .eq("prescription_id", input.prescriptionId);

    if (itemsFetchErr) throw new Error(itemsFetchErr.message);

    const itemMap = new Map<string, any>((currentItems ?? []).map((ci: any) => [ci.id, ci]));

    let totalMedCharges = 0;
    const billedLineItems: Array<{
      service_type: string;
      description: string;
      quantity: number;
      unit_price: number;
      total_price: number;
    }> = [];

    // 2. Process each item dispense
    for (const itemInput of input.items) {
      const existingItem = itemMap.get(itemInput.itemId);
      if (!existingItem) continue;

      const qtyToDispense = itemInput.quantityToDispense;
      if (qtyToDispense <= 0) {
        // If 0 dispensed, we may just update notes if provided
        if (itemInput.dispenseNotes) {
          await (supabase as any)
            .from("prescription_items")
            .update({
              dispense_notes: itemInput.dispenseNotes,
            })
            .eq("id", itemInput.itemId);
        }
        continue;
      }

      // Fetch matching hospital inventory
      const { data: invRow } = await (supabase as any)
        .from("hospital_inventory")
        .select("id, quantity_in_stock, unit_price")
        .eq("hospital_id", activeHospitalId)
        .eq("drug_id", itemInput.drugId)
        .maybeSingle();

      const currentStock = invRow?.quantity_in_stock ?? 0;
      const unitPrice = invRow?.unit_price ? Number(invRow.unit_price) : 0;

      if (qtyToDispense > currentStock) {
        throw new Error(
          `Cannot dispense ${qtyToDispense} units for ${existingItem.drug?.generic_name || "item"}: only ${currentStock} in stock.`
        );
      }

      const newStock = currentStock - qtyToDispense;

      // Decrement inventory stock
      if (invRow?.id) {
        await (supabase as any)
          .from("hospital_inventory")
          .update({
            quantity_in_stock: newStock,
          })
          .eq("id", invRow.id);

        // Record stock movement
        try {
          await (supabase as any).from("stock_movements").insert({
            hospital_id: activeHospitalId,
            inventory_id: invRow.id,
            drug_id: itemInput.drugId,
            movement_type: "dispense",
            quantity_change: -qtyToDispense,
            previous_stock: currentStock,
            new_stock: newStock,
            reason: `Prescription dispense (Rx #${input.prescriptionId.slice(0, 8)})${
              itemInput.dispenseNotes ? ` — ${itemInput.dispenseNotes}` : ""
            }`,
            performed_by: staffRow?.id || null,
          });
        } catch (mErr) {
          console.warn("Stock movement insertion fallback:", mErr);
        }
      }

      // Update prescription item record
      const updatedTotalDispensed = Number(existingItem.quantity_dispensed || 0) + qtyToDispense;
      await (supabase as any)
        .from("prescription_items")
        .update({
          quantity_dispensed: updatedTotalDispensed,
          dispensed_by: staffRow?.id || null,
          dispensed_at: new Date().toISOString(),
          dispense_notes: itemInput.dispenseNotes || existingItem.dispense_notes || null,
        })
        .eq("id", itemInput.itemId);

      // Accumulate billing
      const itemTotal = qtyToDispense * unitPrice;
      totalMedCharges += itemTotal;

      const drugName = existingItem.drug?.brand_name
        ? `${existingItem.drug.brand_name} (${existingItem.drug.generic_name})`
        : existingItem.drug?.generic_name || "Medication";

      billedLineItems.push({
        service_type: "pharmacy",
        description: `Medication: ${drugName} ${existingItem.drug?.strength || ""} (Qty: ${qtyToDispense})`,
        quantity: qtyToDispense,
        unit_price: unitPrice,
        total_price: itemTotal,
      });
    }

    // 3. Re-evaluate overall prescription status
    const { data: refreshedItems } = await (supabase as any)
      .from("prescription_items")
      .select("quantity_prescribed, quantity_dispensed")
      .eq("prescription_id", input.prescriptionId);

    const allItems = refreshedItems ?? [];
    const allFullyDispensed =
      allItems.length > 0 &&
      allItems.every((i: any) => Number(i.quantity_dispensed || 0) >= Number(i.quantity_prescribed || 0));

    const finalStatus = allFullyDispensed ? "dispensed" : "partially_dispensed";

    await (supabase as any)
      .from("prescriptions")
      .update({
        status: finalStatus,
      })
      .eq("id", input.prescriptionId);

    // 4. Update or Create Invoice and Billing Line Items
    if (totalMedCharges > 0 && billedLineItems.length > 0) {
      let invoiceId: string | null = null;
      const { data: existingInv } = await (supabase as any)
        .from("invoices")
        .select("id, total_amount, patient_payable_amount")
        .eq("encounter_id", input.encounterId)
        .maybeSingle();

      if (existingInv) {
        invoiceId = existingInv.id;
        await (supabase as any)
          .from("invoices")
          .update({
            total_amount: Number(existingInv.total_amount || 0) + totalMedCharges,
            patient_payable_amount: Number(existingInv.patient_payable_amount || 0) + totalMedCharges,
          })
          .eq("id", invoiceId);
      } else {
        const { data: newInv, error: invErr } = await (supabase as any)
          .from("invoices")
          .insert({
            encounter_id: input.encounterId,
            hospital_id: activeHospitalId,
            patient_id: input.patientId,
            total_amount: totalMedCharges,
            patient_payable_amount: totalMedCharges,
            status: "pending",
          })
          .select("id")
          .single();

        if (!invErr && newInv) {
          invoiceId = newInv.id;
        }
      }

      if (invoiceId) {
        for (const line of billedLineItems) {
          try {
            await (supabase as any).from("billing_line_items").insert({
              invoice_id: invoiceId,
              service_type: line.service_type,
              description: line.description,
              quantity: line.quantity,
              unit_price: line.unit_price,
              total_price: line.total_price,
            });
          } catch (lineErr) {
            console.warn("Line item insert notice:", lineErr);
          }
        }
      }
    }

    // 5. Check if encounter can advance
    const { data: encounterRow } = await (supabase as any)
      .from("encounters")
      .select("id, encounter_status")
      .eq("id", input.encounterId)
      .single();

    if (encounterRow && ["pharmacy_pending", "awaiting_services"].includes(encounterRow.encounter_status)) {
      // Check if all lab orders are completed
      const { data: pendingLabs } = await (supabase as any)
        .from("lab_orders")
        .select("id")
        .eq("encounter_id", input.encounterId)
        .in("status", ["ordered", "sample_collected", "processing"]);

      // Check if other prescriptions exist and are pending
      const { data: otherPendingRxs } = await (supabase as any)
        .from("prescriptions")
        .select("id")
        .eq("encounter_id", input.encounterId)
        .eq("status", "pending");

      if ((pendingLabs ?? []).length === 0 && (otherPendingRxs ?? []).length === 0) {
        await (supabase as any)
          .from("encounters")
          .update({
            encounter_status: "closed",
            closed_at: new Date().toISOString(),
          })
          .eq("id", input.encounterId);
      }
    }

    // 6. Audit logging
    await writeAuditEntry(supabase, {
      hospital_id: activeHospitalId,
      accessor_id: userId,
      accessor_role: callerRole,
      patient_id: input.patientId,
      encounter_id: input.encounterId,
      action: "WRITE",
      justification: `Dispensed prescription #${input.prescriptionId.slice(0, 8)} (${finalStatus}). Medication charges added: ₦${totalMedCharges.toLocaleString()}`,
    });

    return {
      success: true,
      prescriptionStatus: finalStatus,
      chargesAdded: totalMedCharges,
    };
  });

