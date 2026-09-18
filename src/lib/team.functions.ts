import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type StaffRole =
  | "super_admin"
  | "hospital_admin"
  | "doctor"
  | "nurse"
  | "lab_tech"
  | "pharmacist";

export type WeeklyShift = {
  id?: string | undefined;
  dayOfWeek: number; // 0=Sun, 1=Mon, ..., 6=Sat
  startTimeStr: string; // "08:00"
  endTimeStr: string; // "16:00"
  departmentId?: string | null | undefined;
  isActive?: boolean | undefined;
};

export type TeamMember = {
  id: string;
  userId: string | null;
  fullName: string;
  staffIdCode: string;
  role: StaffRole;
  departmentId: string | null;
  departmentName: string | null;
  medicalLicenseNumber: string | null;
  specialization: string | null;
  phone: string | null;
  isActive: boolean;
  isPending: boolean;
  isOnShift: boolean;
  inviteToken?: string | null | undefined;
  email?: string | null | undefined;
  createdAt: string;
};

const SYSTEM_AUDIT_PATIENT_ID = "00000000-0000-0000-0000-000000000000";

async function assertHospitalAdmin(
  supabase: { from: (t: string) => any },
  userId: string,
  hospitalId: string,
): Promise<StaffRole> {
  const { data, error } = await supabase
    .from("user_roles")
    .select("role, hospital_id")
    .eq("user_id", userId)
    .eq("is_active", true);

  if (error) throw new Error(error.message);

  const rows = (data ?? []) as { role: StaffRole | "patient"; hospital_id: string | null }[];
  const isSuper = rows.some((r) => r.role === "super_admin");
  if (isSuper) return "super_admin";

  const isAdmin = rows.some((r) => r.hospital_id === hospitalId && r.role === "hospital_admin");
  if (!isAdmin) {
    throw new Error("Only hospital administrators can perform this action.");
  }
  return "hospital_admin";
}

async function writeAuditEntry(
  supabase: { from: (t: string) => any },
  entry: {
    hospital_id: string;
    accessor_id: string;
    accessor_role: StaffRole;
    patient_id?: string | undefined;
    action: "READ" | "WRITE" | "BREAK_GLASS_OVERRIDE" | "EXPORT";
    justification?: string | null | undefined;
  },
) {
  try {
    await supabase.from("record_audit_logs").insert({
      hospital_id: entry.hospital_id,
      accessor_id: entry.accessor_id,
      accessor_role: entry.accessor_role,
      patient_id: entry.patient_id || SYSTEM_AUDIT_PATIENT_ID,
      action: entry.action,
      justification: entry.justification || null,
    });
  } catch (err) {
    console.warn("Audit logging non-fatal error:", err);
  }
}

/**
 * Loads team roster, pending invitations, caller's permissions, and active on-shift statuses.
 */
export const getTeamContext = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input?: { hospitalId?: string | undefined }) => {
    return { hospitalId: input?.hospitalId ? String(input.hospitalId) : undefined };
  })
  .handler(async ({ context, data: input }) => {
    const { supabase, userId } = context;

    // 1. Fetch user's hospitals
    const { data: roleRows, error: roleError } = await supabase
      .from("user_roles")
      .select("role, hospital_id, hospitals(id, name, slug)")
      .eq("user_id", userId)
      .eq("is_active", true);

    if (roleError) throw new Error(roleError.message);

    const workplaces = (roleRows ?? [])
      .filter((r: any) => r.hospital_id && r.role !== "patient")
      .map((r: any) => ({
        hospitalId: r.hospital_id as string,
        name: (r.hospitals?.name as string) ?? "Hospital",
        role: r.role as StaffRole,
      }));

    if (workplaces.length === 0) {
      return {
        workplaces: [],
        activeHospitalId: "",
        isAdmin: false,
        departments: [],
        members: [] as TeamMember[],
      };
    }

    const activeHospitalId =
      input?.hospitalId && workplaces.some((w) => w.hospitalId === input.hospitalId)
        ? input.hospitalId
        : workplaces[0]?.hospitalId || "";

    const callerRole = workplaces.find((w) => w.hospitalId === activeHospitalId)?.role || "doctor";
    const isSuper = workplaces.some((w) => w.role === "super_admin");
    const isAdmin = isSuper || callerRole === "hospital_admin";

    // 2. Fetch departments
    const { data: depts } = await supabase
      .from("departments")
      .select("id, name, hospital_id")
      .eq("hospital_id", activeHospitalId);

    const departments = (depts ?? []) as { id: string; name: string; hospital_id: string }[];
    const deptMap = new Map<string, string>();
    departments.forEach((d) => deptMap.set(d.id, d.name));

    // 3. Fetch staff members
    const { data: staffRows, error: staffError } = await supabase
      .from("staff")
      .select("id, user_id, hospital_id, department_id, full_name, staff_id_code, medical_license_number, specialization, phone, is_active, created_at")
      .eq("hospital_id", activeHospitalId)
      .order("created_at", { ascending: false });

    if (staffError) throw new Error(staffError.message);

    // 4. Fetch user_roles for this hospital to map roles to staff
    const { data: userRoleRows } = await supabase
      .from("user_roles")
      .select("user_id, role, is_active")
      .eq("hospital_id", activeHospitalId);

    const roleMap = new Map<string, StaffRole>();
    (userRoleRows ?? []).forEach((ur: any) => {
      if (ur.user_id && ur.role !== "patient") {
        roleMap.set(ur.user_id, ur.role as StaffRole);
      }
    });

    // 5. Fetch weekly shifts & active date-time shifts to determine who is currently on shift
    const now = new Date();
    const currentDayOfWeek = now.getDay(); // 0-6
    const currentTimeStr = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;

    const { data: weeklyShifts } = await supabase
      .from("staff_weekly_shifts")
      .select("staff_id, day_of_week, start_time_str, end_time_str, is_active")
      .eq("hospital_id", activeHospitalId)
      .eq("is_active", true)
      .eq("day_of_week", currentDayOfWeek);

    const onShiftStaffSet = new Set<string>();

    (weeklyShifts ?? []).forEach((ws: any) => {
      const start = ws.start_time_str.slice(0, 5);
      const end = ws.end_time_str.slice(0, 5);
      if (start <= end) {
        if (currentTimeStr >= start && currentTimeStr <= end) {
          onShiftStaffSet.add(ws.staff_id);
        }
      } else {
        // Over-night shift (e.g. 20:00 - 08:00)
        if (currentTimeStr >= start || currentTimeStr <= end) {
          onShiftStaffSet.add(ws.staff_id);
        }
      }
    });

    // Also check active specific date-time schedules
    const { data: dateSchedules } = await supabase
      .from("staff_schedules")
      .select("staff_id, start_time, end_time")
      .eq("hospital_id", activeHospitalId)
      .lte("start_time", now.toISOString())
      .gte("end_time", now.toISOString());

    (dateSchedules ?? []).forEach((ds: any) => {
      onShiftStaffSet.add(ds.staff_id);
    });

    const members: TeamMember[] = (staffRows ?? []).map((s: any) => {
      const derivedRole = s.user_id ? roleMap.get(s.user_id) : undefined;
      let fallbackRole: StaffRole = "doctor";
      if (s.staff_id_code?.startsWith("NUR-")) fallbackRole = "nurse";
      else if (s.staff_id_code?.startsWith("LAB-")) fallbackRole = "lab_tech";
      else if (s.staff_id_code?.startsWith("PHM-")) fallbackRole = "pharmacist";
      else if (s.staff_id_code?.startsWith("ADM-")) fallbackRole = "hospital_admin";

      const role = derivedRole || fallbackRole;
      const isClinician = role === "doctor" || role === "nurse";
      const isOnShift = isClinician ? onShiftStaffSet.has(s.id) : false;

      return {
        id: s.id,
        userId: s.user_id,
        fullName: s.full_name,
        staffIdCode: s.staff_id_code,
        role,
        departmentId: s.department_id,
        departmentName: s.department_id ? deptMap.get(s.department_id) || null : null,
        medicalLicenseNumber: s.medical_license_number,
        specialization: s.specialization,
        phone: s.phone,
        isActive: Boolean(s.is_active),
        isPending: !s.user_id,
        isOnShift,
        createdAt: s.created_at,
      };
    });

    // 6. Fetch pending invitations if any
    try {
      const { data: invites } = await supabase
        .from("staff_invitations")
        .select("id, email, full_name, role, department_id, staff_id_code, token, status, created_at")
        .eq("hospital_id", activeHospitalId)
        .eq("status", "pending")
        .order("created_at", { ascending: false });

      if (invites && invites.length > 0) {
        invites.forEach((inv: any) => {
          const alreadyInStaff = members.some(
            (m) => m.staffIdCode === inv.staff_id_code || m.fullName === inv.full_name,
          );
          if (!alreadyInStaff) {
            members.push({
              id: inv.id,
              userId: null,
              fullName: inv.full_name,
              staffIdCode: inv.staff_id_code || "PENDING",
              role: inv.role as StaffRole,
              departmentId: inv.department_id,
              departmentName: inv.department_id ? deptMap.get(inv.department_id) || null : null,
              medicalLicenseNumber: null,
              specialization: null,
              phone: null,
              isActive: true,
              isPending: true,
              isOnShift: false,
              inviteToken: inv.token,
              email: inv.email,
              createdAt: inv.created_at,
            });
          } else {
            const match = members.find((m) => m.staffIdCode === inv.staff_id_code || m.fullName === inv.full_name);
            if (match) {
              match.inviteToken = inv.token;
              match.email = inv.email;
              match.isPending = true;
            }
          }
        });
      }
    } catch {
      // staff_invitations fallback
    }

    // Write READ audit log
    await writeAuditEntry(supabase, {
      hospital_id: activeHospitalId,
      accessor_id: userId,
      accessor_role: callerRole,
      action: "READ",
      justification: "Staff roster and active shift statuses viewed",
    });

    return {
      workplaces,
      activeHospitalId,
      isAdmin,
      departments,
      members,
    };
  });

/**
 * Gets a specific staff member's full profile and weekly schedule.
 */
export const getStaffProfileAndSchedule = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { hospitalId: string; staffId: string }) => {
    const hospitalId = String(input?.hospitalId ?? "").trim();
    const staffId = String(input?.staffId ?? "").trim();
    if (!hospitalId || !staffId) throw new Error("Hospital ID and Staff ID are required.");
    return { hospitalId, staffId };
  })
  .handler(async ({ context, data: input }) => {
    const { supabase, userId } = context;

    // 1. Check if caller belongs to hospital
    const { data: userRole } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .eq("hospital_id", input.hospitalId)
      .eq("is_active", true)
      .maybeSingle();

    const callerRole = (userRole?.role as StaffRole) || "doctor";
    const isAdmin = callerRole === "hospital_admin" || callerRole === "super_admin";

    // 2. Fetch staff profile
    const { data: staff, error: staffError } = await supabase
      .from("staff")
      .select("id, user_id, hospital_id, department_id, full_name, staff_id_code, medical_license_number, specialization, phone, is_active, created_at, departments(name)")
      .eq("id", input.staffId)
      .eq("hospital_id", input.hospitalId)
      .single();

    if (staffError || !staff) throw new Error("Staff member not found.");

    const isSelf = staff.user_id === userId;
    if (!isAdmin && !isSelf) {
      throw new Error("You do not have permission to view this staff profile.");
    }

    // 3. Fetch weekly shifts
    const { data: shifts } = await supabase
      .from("staff_weekly_shifts")
      .select("id, day_of_week, start_time_str, end_time_str, department_id, is_active")
      .eq("staff_id", input.staffId)
      .eq("hospital_id", input.hospitalId)
      .order("day_of_week", { ascending: true })
      .order("start_time_str", { ascending: true });

    // 4. Calculate if on shift right now
    const now = new Date();
    const currentDay = now.getDay();
    const currentTimeStr = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;

    let isOnShift = false;
    (shifts ?? []).forEach((s: any) => {
      if (s.is_active && s.day_of_week === currentDay) {
        const start = s.start_time_str.slice(0, 5);
        const end = s.end_time_str.slice(0, 5);
        if (start <= end) {
          if (currentTimeStr >= start && currentTimeStr <= end) isOnShift = true;
        } else {
          if (currentTimeStr >= start || currentTimeStr <= end) isOnShift = true;
        }
      }
    });

    // Write READ audit log
    await writeAuditEntry(supabase, {
      hospital_id: input.hospitalId,
      accessor_id: userId,
      accessor_role: callerRole,
      action: "READ",
      justification: `Profile & schedule viewed for ${staff.full_name} (${staff.staff_id_code})`,
    });

    return {
      staff: {
        id: staff.id,
        userId: staff.user_id,
        fullName: staff.full_name,
        staffIdCode: staff.staff_id_code,
        departmentId: staff.department_id,
        departmentName: staff.departments?.name ?? null,
        medicalLicenseNumber: staff.medical_license_number,
        specialization: staff.specialization,
        phone: staff.phone,
        isActive: Boolean(staff.is_active),
        isOnShift,
      },
      shifts: (shifts ?? []).map((s: any) => ({
        id: s.id,
        dayOfWeek: s.day_of_week,
        startTimeStr: s.start_time_str.slice(0, 5),
        endTimeStr: s.end_time_str.slice(0, 5),
        departmentId: s.department_id,
        isActive: s.is_active,
      })) as WeeklyShift[],
      canEdit: isAdmin,
    };
  });

/**
 * Updates a staff member's profile details. Only admins can execute.
 */
export const updateStaffProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: {
      hospitalId: string;
      staffId: string;
      fullName: string;
      staffIdCode: string;
      departmentId?: string | undefined;
      phone?: string | undefined;
      specialization?: string | undefined;
      medicalLicenseNumber?: string | undefined;
    }) => {
      const hospitalId = String(input?.hospitalId ?? "").trim();
      const staffId = String(input?.staffId ?? "").trim();
      const fullName = String(input?.fullName ?? "").trim();
      const staffIdCode = String(input?.staffIdCode ?? "").trim();

      if (!hospitalId || !staffId) throw new Error("Hospital ID and Staff ID are required.");
      if (!fullName) throw new Error("Full name is required.");
      if (!staffIdCode) throw new Error("Staff ID code is required.");

      return {
        hospitalId,
        staffId,
        fullName,
        staffIdCode,
        departmentId: input.departmentId?.trim() || undefined,
        phone: input.phone?.trim() || undefined,
        specialization: input.specialization?.trim() || undefined,
        medicalLicenseNumber: input.medicalLicenseNumber?.trim() || undefined,
      };
    },
  )
  .handler(async ({ context, data: input }) => {
    const { supabase, userId } = context;

    // Verify caller is admin
    const callerRole = await assertHospitalAdmin(supabase, userId, input.hospitalId);

    const { error: updateError } = await supabase
      .from("staff")
      .update({
        full_name: input.fullName,
        staff_id_code: input.staffIdCode,
        department_id: input.departmentId || null,
        phone: input.phone || null,
        specialization: input.specialization || null,
        medical_license_number: input.medicalLicenseNumber || null,
      })
      .eq("id", input.staffId)
      .eq("hospital_id", input.hospitalId);

    if (updateError) throw new Error(updateError.message);

    // Write WRITE audit log
    await writeAuditEntry(supabase, {
      hospital_id: input.hospitalId,
      accessor_id: userId,
      accessor_role: callerRole,
      action: "WRITE",
      justification: `Staff profile updated for ${input.fullName} (${input.staffIdCode})`,
    });

    return { success: true };
  });

/**
 * Sets weekly shift schedule for a staff member and populates active duty slots.
 */
export const updateStaffShifts = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: {
      hospitalId: string;
      staffId: string;
      shifts: Array<{
        dayOfWeek: number;
        startTimeStr: string;
        endTimeStr: string;
        departmentId?: string | undefined;
      }>;
    }) => {
      const hospitalId = String(input?.hospitalId ?? "").trim();
      const staffId = String(input?.staffId ?? "").trim();
      if (!hospitalId || !staffId) throw new Error("Hospital ID and Staff ID are required.");

      const shifts = (input?.shifts ?? []).map((s) => ({
        dayOfWeek: Number(s.dayOfWeek),
        startTimeStr: String(s.startTimeStr).slice(0, 5),
        endTimeStr: String(s.endTimeStr).slice(0, 5),
        departmentId: s.departmentId?.trim() || undefined,
      }));

      return { hospitalId, staffId, shifts };
    },
  )
  .handler(async ({ context, data: input }) => {
    const { supabase, userId } = context;

    // Verify caller is admin
    const callerRole = await assertHospitalAdmin(supabase, userId, input.hospitalId);

    // 1. Clear existing weekly shifts for this staff
    await supabase
      .from("staff_weekly_shifts")
      .delete()
      .eq("staff_id", input.staffId)
      .eq("hospital_id", input.hospitalId);

    // 2. Insert new weekly shifts
    if (input.shifts.length > 0) {
      const rows = input.shifts.map((s) => ({
        hospital_id: input.hospitalId,
        staff_id: input.staffId,
        day_of_week: s.dayOfWeek,
        start_time_str: s.startTimeStr,
        end_time_str: s.endTimeStr,
        department_id: s.departmentId || null,
        is_active: true,
      }));

      const { error: insertError } = await supabase.from("staff_weekly_shifts").insert(rows);
      if (insertError) throw new Error(insertError.message);
    }

    // 3. Generate active date-time schedules for the next 14 days in staff_schedules
    // This immediately satisfies the existing database RLS `is_on_active_shift` function!
    try {
      const now = new Date();
      const futureSchedules: any[] = [];

      for (let dayOffset = 0; dayOffset < 14; dayOffset++) {
        const targetDate = new Date(now.getTime() + dayOffset * 24 * 60 * 60 * 1000);
        const dayOfWeek = targetDate.getDay();

        const matchingShifts = input.shifts.filter((s) => s.dayOfWeek === dayOfWeek);
        for (const s of matchingShifts) {
          const startParts = s.startTimeStr.split(":");
          const endParts = s.endTimeStr.split(":");
          const startH = Number(startParts[0] ?? 0);
          const startM = Number(startParts[1] ?? 0);
          const endH = Number(endParts[0] ?? 0);
          const endM = Number(endParts[1] ?? 0);

          const startDateTime = new Date(targetDate);
          startDateTime.setHours(startH, startM, 0, 0);

          const endDateTime = new Date(targetDate);
          endDateTime.setHours(endH, endM, 0, 0);
          if (endH < startH || (endH === startH && endM < startM)) {
            // Over-night shift
            endDateTime.setDate(endDateTime.getDate() + 1);
          }

          futureSchedules.push({
            hospital_id: input.hospitalId,
            staff_id: input.staffId,
            department_id: s.departmentId || null,
            shift_name: `Weekly Shift (Day ${dayOfWeek})`,
            start_time: startDateTime.toISOString(),
            end_time: endDateTime.toISOString(),
          });
        }
      }

      // Remove future generated schedules for this staff and insert fresh window
      await supabase
        .from("staff_schedules")
        .delete()
        .eq("staff_id", input.staffId)
        .eq("hospital_id", input.hospitalId)
        .gte("start_time", now.toISOString());

      if (futureSchedules.length > 0) {
        await supabase.from("staff_schedules").insert(futureSchedules);
      }
    } catch (schedErr) {
      console.warn("Schedule projection notice:", schedErr);
    }

    // Write WRITE audit log
    await writeAuditEntry(supabase, {
      hospital_id: input.hospitalId,
      accessor_id: userId,
      accessor_role: callerRole,
      action: "WRITE",
      justification: `Shift schedule updated for staff ${input.staffId} (${input.shifts.length} shifts assigned)`,
    });

    return { success: true, shiftsCount: input.shifts.length };
  });

/**
 * Invites a new staff member and creates their roster and invitation record.
 */
export const inviteStaffMember = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: {
      hospitalId: string;
      fullName: string;
      email: string;
      role: StaffRole;
      departmentId?: string | undefined;
      staffIdCode?: string | undefined;
      phone?: string | undefined;
      specialization?: string | undefined;
      medicalLicenseNumber?: string | undefined;
    }) => {
      const hospitalId = String(input?.hospitalId ?? "").trim();
      const fullName = String(input?.fullName ?? "").trim();
      const email = String(input?.email ?? "").trim().toLowerCase();
      const role = String(input?.role ?? "").trim() as StaffRole;

      if (!hospitalId) throw new Error("Hospital ID is required.");
      if (!fullName) throw new Error("Full name is required.");
      if (!email || !email.includes("@")) throw new Error("A valid work email is required.");
      if (!role) throw new Error("A staff role must be chosen.");

      return {
        hospitalId,
        fullName,
        email,
        role,
        departmentId: input.departmentId?.trim() || undefined,
        staffIdCode: input.staffIdCode?.trim() || undefined,
        phone: input.phone?.trim() || undefined,
        specialization: input.specialization?.trim() || undefined,
        medicalLicenseNumber: input.medicalLicenseNumber?.trim() || undefined,
      };
    },
  )
  .handler(async ({ context, data: input }) => {
    const { supabase, userId } = context;

    // Verify admin privileges
    const callerRole = await assertHospitalAdmin(supabase, userId, input.hospitalId);

    // Generate clean staff ID code if not provided
    const prefix =
      input.role === "doctor"
        ? "DOC"
        : input.role === "nurse"
        ? "NUR"
        : input.role === "lab_tech"
        ? "LAB"
        : input.role === "pharmacist"
        ? "PHM"
        : "ADM";

    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const staffIdCode = input.staffIdCode || `${prefix}-${randomSuffix}`;

    // Generate secure invite token
    const token = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);

    // 1. Create or upsert staff table record
    const { data: staffRow, error: staffError } = await supabase
      .from("staff")
      .insert({
        hospital_id: input.hospitalId,
        department_id: input.departmentId || null,
        full_name: input.fullName,
        staff_id_code: staffIdCode,
        medical_license_number: input.medicalLicenseNumber || null,
        specialization: input.specialization || null,
        phone: input.phone || null,
        is_active: true,
      })
      .select("id")
      .single();

    if (staffError) {
      if (staffError.message.includes("staff_id_code")) {
        const fallbackCode = `${prefix}-${Date.now().toString().slice(-4)}`;
        const { error: retryError } = await supabase
          .from("staff")
          .insert({
            hospital_id: input.hospitalId,
            department_id: input.departmentId || null,
            full_name: input.fullName,
            staff_id_code: fallbackCode,
            medical_license_number: input.medicalLicenseNumber || null,
            specialization: input.specialization || null,
            phone: input.phone || null,
            is_active: true,
          })
          .select("id")
          .single();
        if (retryError) throw new Error(retryError.message);
      } else {
        throw new Error(staffError.message);
      }
    }

    // 2. Insert staff_invitations record
    try {
      await supabase.from("staff_invitations").insert({
        hospital_id: input.hospitalId,
        department_id: input.departmentId || null,
        email: input.email,
        full_name: input.fullName,
        role: input.role,
        staff_id_code: staffIdCode,
        token,
        status: "pending",
        invited_by: userId,
      });
    } catch {
      // In case migrations are executing asynchronously
    }

    // 3. Write WRITE audit log
    await writeAuditEntry(supabase, {
      hospital_id: input.hospitalId,
      accessor_id: userId,
      accessor_role: callerRole,
      action: "WRITE",
      justification: `Staff invited: ${input.fullName} (${input.role}, ${input.email})`,
    });

    return {
      success: true,
      token,
      staffIdCode,
      inviteUrl: `/auth?invite=${token}&email=${encodeURIComponent(input.email)}&hospital=${input.hospitalId}`,
    };
  });

/**
 * Toggles a staff member's active status (activate/deactivate).
 */
export const toggleStaffStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { hospitalId: string; staffId: string; isActive: boolean }) => {
    const hospitalId = String(input?.hospitalId ?? "").trim();
    const staffId = String(input?.staffId ?? "").trim();
    if (!hospitalId || !staffId) throw new Error("Hospital ID and Staff ID are required.");
    return { hospitalId, staffId, isActive: Boolean(input.isActive) };
  })
  .handler(async ({ context, data: input }) => {
    const { supabase, userId } = context;

    // Verify admin privileges
    const callerRole = await assertHospitalAdmin(supabase, userId, input.hospitalId);

    // Fetch staff to know user_id
    const { data: staff, error: fetchError } = await supabase
      .from("staff")
      .select("id, user_id, full_name, staff_id_code")
      .eq("id", input.staffId)
      .eq("hospital_id", input.hospitalId)
      .single();

    if (fetchError || !staff) throw new Error("Staff member not found.");

    // Update staff table
    const { error: updateError } = await supabase
      .from("staff")
      .update({ is_active: input.isActive })
      .eq("id", input.staffId)
      .eq("hospital_id", input.hospitalId);

    if (updateError) throw new Error(updateError.message);

    // Also update user_roles if linked
    if (staff.user_id) {
      await supabase
        .from("user_roles")
        .update({ is_active: input.isActive })
        .eq("user_id", staff.user_id)
        .eq("hospital_id", input.hospitalId);
    }

    // Write WRITE audit log
    await writeAuditEntry(supabase, {
      hospital_id: input.hospitalId,
      accessor_id: userId,
      accessor_role: callerRole,
      action: "WRITE",
      justification: `Staff member ${staff.full_name} (${staff.staff_id_code}) set to ${
        input.isActive ? "ACTIVE" : "INACTIVE"
      }`,
    });

    return { success: true, isActive: input.isActive };
  });

/**
 * Allows a newly authenticated user to claim an invitation by token.
 */
export const claimStaffInvitation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { token: string }) => {
    const token = String(input?.token ?? "").trim();
    if (!token) throw new Error("Invitation token is required.");
    return { token };
  })
  .handler(async ({ context, data: input }) => {
    const { supabase, userId } = context;

    // Find invitation
    const { data: invite, error: inviteError } = await supabase
      .from("staff_invitations")
      .select("id, hospital_id, department_id, email, full_name, role, staff_id_code, status")
      .eq("token", input.token)
      .eq("status", "pending")
      .single();

    if (inviteError || !invite) {
      throw new Error("Invitation is invalid, expired, or already used.");
    }

    // Assign role in user_roles
    const { error: roleError } = await supabase.from("user_roles").upsert(
      {
        user_id: userId,
        hospital_id: invite.hospital_id,
        role: invite.role,
        is_active: true,
      },
      { onConflict: "user_id,hospital_id,role" },
    );

    if (roleError) throw new Error(roleError.message);

    // Link staff row if staff_id_code exists
    if (invite.staff_id_code) {
      await supabase
        .from("staff")
        .update({ user_id: userId, is_active: true })
        .eq("hospital_id", invite.hospital_id)
        .eq("staff_id_code", invite.staff_id_code);
    }

    // Mark invitation accepted
    await supabase
      .from("staff_invitations")
      .update({ status: "accepted" })
      .eq("id", invite.id);

    return {
      success: true,
      hospitalId: invite.hospital_id,
      role: invite.role,
    };
  });

export type StaffJoinRequestItem = {
  id: string;
  hospitalId: string;
  hospitalName?: string | undefined;
  userId: string | null;
  fullName: string;
  email: string;
  phone: string | null;
  requestedRole: StaffRole;
  medicalLicenseNumber: string | null;
  specialization: string | null;
  departmentId: string | null;
  departmentName?: string | null | undefined;
  status: "pending" | "approved" | "rejected";
  createdAt: string;
};

/**
 * Allows a doctor, nurse, lab tech, pharmacist, or clerk to submit a join request to an existing hospital.
 */
export const submitStaffJoinRequest = createServerFn({ method: "POST" })
  .inputValidator(
    (input: {
      fullName: string;
      email: string;
      password?: string | undefined;
      hospitalId: string;
      requestedRole: StaffRole;
      medicalLicenseNumber?: string | undefined;
      specialization?: string | undefined;
      phone?: string | undefined;
      departmentId?: string | undefined;
    }) => {
      const fullName = String(input?.fullName ?? "").trim();
      if (fullName.length < 2) throw new Error("Please enter your full name.");
      const email = String(input?.email ?? "").trim().toLowerCase();
      if (!email.includes("@")) throw new Error("Please enter a valid work email address.");
      const hospitalId = String(input?.hospitalId ?? "").trim();
      if (!hospitalId) throw new Error("Please select the hospital you wish to join.");
      const requestedRole = input?.requestedRole as StaffRole;
      if (!["doctor", "nurse", "lab_tech", "pharmacist", "hospital_admin"].includes(requestedRole)) {
        throw new Error("Please select a valid staff role.");
      }

      return {
        fullName,
        email,
        password: input?.password ? String(input.password) : undefined,
        hospitalId,
        requestedRole,
        medicalLicenseNumber: input?.medicalLicenseNumber?.trim() || null,
        specialization: input?.specialization?.trim() || null,
        phone: input?.phone?.trim() || null,
        departmentId: input?.departmentId?.trim() || null,
      };
    },
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // 1. Create or lookup auth user
    let userId: string | null = null;
    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
    const existing = existingUsers?.users?.find((u) => u.email?.toLowerCase() === data.email);

    if (existing) {
      userId = existing.id;
    } else if (data.password) {
      const { data: newUser, error: createErr } = await supabaseAdmin.auth.admin.createUser({
        email: data.email,
        password: data.password,
        email_confirm: true,
        user_metadata: { full_name: data.fullName },
      });
      if (createErr) throw new Error(createErr.message);
      userId = newUser.user.id;
    } else {
      throw new Error("Password is required to create your staff account.");
    }

    // 2. Fetch hospital info
    const { data: hosp } = await supabaseAdmin
      .from("hospitals")
      .select("id, name")
      .eq("id", data.hospitalId)
      .single();

    if (!hosp) throw new Error("Selected hospital not found.");

    // 3. Insert or update into staff_join_requests
    const { data: reqRow, error: reqErr } = await supabaseAdmin
      .from("staff_join_requests")
      .insert({
        hospital_id: data.hospitalId,
        user_id: userId,
        full_name: data.fullName,
        email: data.email,
        phone: data.phone,
        requested_role: data.requestedRole,
        medical_license_number: data.medicalLicenseNumber,
        specialization: data.specialization,
        department_id: data.departmentId,
        status: "pending",
      })
      .select()
      .single();

    if (reqErr) throw new Error(reqErr.message);

    // 4. Create pending staff record (is_active = false)
    const rolePrefix = data.requestedRole === "doctor" ? "DOC" : data.requestedRole === "nurse" ? "NUR" : data.requestedRole === "pharmacist" ? "PHM" : data.requestedRole === "lab_tech" ? "LAB" : "STF";
    const staffCode = `${rolePrefix}-PEND-${Math.floor(100 + Math.random() * 900)}`;

    await supabaseAdmin.from("staff").upsert(
      {
        user_id: userId,
        hospital_id: data.hospitalId,
        department_id: data.departmentId,
        full_name: data.fullName,
        staff_id_code: staffCode,
        medical_license_number: data.medicalLicenseNumber,
        specialization: data.specialization,
        phone: data.phone,
        is_active: false,
      },
      { onConflict: "hospital_id,staff_id_code" },
    );

    // 5. Notify Hospital Admins
    try {
      const { createNotificationRecord } = await import("./notifications.functions");
      const { data: admins } = await supabaseAdmin
        .from("user_roles")
        .select("user_id")
        .eq("hospital_id", data.hospitalId)
        .eq("role", "hospital_admin")
        .eq("is_active", true);

      for (const adm of admins ?? []) {
        if (adm.user_id) {
          await createNotificationRecord({
            hospitalId: data.hospitalId,
            userId: adm.user_id,
            title: "New Staff Affiliation Request",
            message: `${data.fullName} has requested to join as a ${data.requestedRole.replace("_", " ")} (${data.specialization || "Clinical Staff"}).`,
            type: "system",
            link: "/team",
          });
        }
      }
    } catch (notifErr) {
      console.warn("Notice for admin notification:", notifErr);
    }

    return {
      success: true,
      requestId: reqRow?.id as string,
      hospitalName: hosp.name as string,
      status: "pending",
      message: `Your application to join ${hosp.name} as a ${data.requestedRole.replace("_", " ")} has been submitted. The Hospital Administrator will review your credentials and activate your account.`,
    };
  });

/**
 * Fetches all pending staff join requests for a hospital (Admin only).
 */
export const getPendingStaffJoinRequests = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input?: { hospitalId?: string | undefined }) => {
    return { hospitalId: input?.hospitalId ? String(input.hospitalId) : undefined };
  })
  .handler(async ({ context, data: input }): Promise<{ requests: StaffJoinRequestItem[] }> => {
    const { supabase, userId } = context;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Check caller hospital access
    let targetHospitalId = input?.hospitalId;
    if (!targetHospitalId) {
      const { data: userRole } = await supabase
        .from("user_roles")
        .select("hospital_id, role")
        .eq("user_id", userId)
        .eq("is_active", true)
        .limit(1)
        .maybeSingle();

      targetHospitalId = userRole?.hospital_id || undefined;
    }

    if (!targetHospitalId) {
      return { requests: [] };
    }

    // Verify admin role
    await assertHospitalAdmin(supabase, userId, targetHospitalId);

    const { data: rows, error } = await supabaseAdmin
      .from("staff_join_requests")
      .select("*, hospitals(name), departments(name)")
      .eq("hospital_id", targetHospitalId)
      .eq("status", "pending")
      .order("created_at", { ascending: false });

    if (error) {
      console.warn("Error fetching pending staff requests:", error);
      return { requests: [] };
    }

    return {
      requests: (rows ?? []).map((r: any) => ({
        id: r.id as string,
        hospitalId: r.hospital_id as string,
        hospitalName: r.hospitals?.name as string,
        userId: r.user_id as string | null,
        fullName: r.full_name as string,
        email: r.email as string,
        phone: r.phone as string | null,
        requestedRole: r.requested_role as StaffRole,
        medicalLicenseNumber: r.medical_license_number as string | null,
        specialization: r.specialization as string | null,
        departmentId: r.department_id as string | null,
        departmentName: r.departments?.name as string | null,
        status: r.status as "pending" | "approved" | "rejected",
        createdAt: r.created_at as string,
      })),
    };
  });

/**
 * Resolves (Approves or Rejects) a staff join request.
 */
export const resolveStaffJoinRequest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: {
      requestId: string;
      hospitalId: string;
      action: "approve" | "reject";
      departmentId?: string | undefined;
      rejectionReason?: string | undefined;
    }) => {
      const requestId = String(input?.requestId ?? "").trim();
      const hospitalId = String(input?.hospitalId ?? "").trim();
      const action = input?.action;
      if (!requestId || !hospitalId) throw new Error("Request ID and Hospital ID are required.");
      if (action !== "approve" && action !== "reject") throw new Error("Invalid action.");

      return {
        requestId,
        hospitalId,
        action: action as "approve" | "reject",
        departmentId: input?.departmentId?.trim() || undefined,
        rejectionReason: input?.rejectionReason?.trim() || undefined,
      };
    },
  )
  .handler(async ({ context, data: input }) => {
    const { supabase, userId } = context;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Verify caller is admin
    const callerRole = await assertHospitalAdmin(supabase, userId, input.hospitalId);

    // Fetch join request
    const { data: reqRow, error: fetchErr } = await supabaseAdmin
      .from("staff_join_requests")
      .select("*")
      .eq("id", input.requestId)
      .eq("hospital_id", input.hospitalId)
      .single();

    if (fetchErr || !reqRow) throw new Error("Join request not found.");
    if (reqRow.status !== "pending") throw new Error(`Request has already been ${reqRow.status}.`);

    if (input.action === "approve") {
      const targetDeptId = input.departmentId || reqRow.department_id || null;
      const rolePrefix = reqRow.requested_role === "doctor" ? "DOC" : reqRow.requested_role === "nurse" ? "NUR" : reqRow.requested_role === "pharmacist" ? "PHM" : reqRow.requested_role === "lab_tech" ? "LAB" : "ADM";
      const staffCode = `${rolePrefix}-${Math.floor(100 + Math.random() * 900)}`;

      // 1. Activate / Upsert user_roles
      if (reqRow.user_id) {
        await supabaseAdmin.from("user_roles").upsert(
          {
            user_id: reqRow.user_id,
            hospital_id: input.hospitalId,
            role: reqRow.requested_role,
            is_active: true,
          },
          { onConflict: "user_id,hospital_id,role" },
        );

        // 2. Upsert / Activate staff record
        await supabaseAdmin.from("staff").upsert(
          {
            user_id: reqRow.user_id,
            hospital_id: input.hospitalId,
            department_id: targetDeptId,
            full_name: reqRow.full_name,
            staff_id_code: staffCode,
            medical_license_number: reqRow.medical_license_number,
            specialization: reqRow.specialization,
            phone: reqRow.phone,
            is_active: true,
          },
          { onConflict: "hospital_id,staff_id_code" },
        );
      }

      // 3. Mark request approved
      await supabaseAdmin
        .from("staff_join_requests")
        .update({
          status: "approved",
          reviewed_by: userId,
          reviewed_at: new Date().toISOString(),
          department_id: targetDeptId,
        })
        .eq("id", input.requestId);

      // 4. Send notification to applicant
      if (reqRow.user_id) {
        try {
          const { createNotificationRecord } = await import("./notifications.functions");
          await createNotificationRecord({
            hospitalId: input.hospitalId,
            userId: reqRow.user_id,
            title: "Staff Affiliation Approved! 🎉",
            message: `Your request to join as a ${reqRow.requested_role.replace("_", " ")} has been approved by the Administrator. You now have full access to your clinical workspaces.`,
            type: "system",
            link: "/dashboard",
          });
        } catch (nErr) {
          console.warn("Applicant notification notice:", nErr);
        }
      }

      // 5. Audit Log
      await writeAuditEntry(supabaseAdmin, {
        hospital_id: input.hospitalId,
        accessor_id: userId,
        accessor_role: callerRole,
        action: "WRITE",
        justification: `Approved staff join request for ${reqRow.full_name} (${reqRow.requested_role}) with ID ${staffCode}`,
      });

      return {
        success: true,
        status: "approved",
        message: `Approved ${reqRow.full_name} as active ${reqRow.requested_role}.`,
      };
    } else {
      // Reject request
      await supabaseAdmin
        .from("staff_join_requests")
        .update({
          status: "rejected",
          rejection_reason: input.rejectionReason || "Application criteria not met.",
          reviewed_by: userId,
          reviewed_at: new Date().toISOString(),
        })
        .eq("id", input.requestId);

      // Notify applicant
      if (reqRow.user_id) {
        try {
          const { createNotificationRecord } = await import("./notifications.functions");
          await createNotificationRecord({
            hospitalId: input.hospitalId,
            userId: reqRow.user_id,
            title: "Staff Join Request Update",
            message: `Your request to join as a ${reqRow.requested_role.replace("_", " ")} was not approved: ${input.rejectionReason || "Please contact the hospital administrator."}`,
            type: "system",
            link: "/auth",
          });
        } catch (nErr) {
          console.warn("Applicant rejection notification notice:", nErr);
        }
      }

      // Audit Log
      await writeAuditEntry(supabaseAdmin, {
        hospital_id: input.hospitalId,
        accessor_id: userId,
        accessor_role: callerRole,
        action: "WRITE",
        justification: `Rejected staff join request for ${reqRow.full_name}: ${input.rejectionReason || "Declined by admin"}`,
      });

      return {
        success: true,
        status: "rejected",
        message: `Join request for ${reqRow.full_name} has been rejected.`,
      };
    }
  });

