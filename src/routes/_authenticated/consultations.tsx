import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useTransition, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  Bot,
  Check,
  CheckCircle2,
  Clock,
  FileCheck,
  FileText,
  FlaskConical,
  Heart,
  History,
  Info,
  Loader2,
  Lock,
  Pill,
  Plus,
  Receipt,
  RefreshCw,
  Search,
  Send,
  ShieldAlert,
  Sparkles,
  Stethoscope,
  Trash2,
  User,
  UserCheck,
  Wand2,
  Zap,
} from "lucide-react";
import { useAppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  getConsultationQueue,
  getEncounterWorkspace,
  claimEncounter,
  saveConsultationNotes,
  signAndLockConsultationNotes,
  addClinicalAmendment,
  orderLabTest,
  orderPrescription,
  finishConsultation,
  COMMON_DIAGNOSES,
  type ConsultationQueueItem,
  type DiagnosisItem,
  type SystematicPhysicalExam,
  type ClinicalAmendmentItem,
} from "@/lib/consultations.functions";
import {
  generateAiEncounterSummary,
  type AiCopilotResult,
} from "@/lib/ai-copilot.functions";
import {
  getPatientImagingStudies,
  orderImagingStudy,
  type RadiologyStudyItem,
  type ImagingModality,
} from "@/lib/radiology.functions";
import { MedicalImageViewerModal } from "@/components/radiology/MedicalImageViewerModal";
import { UploadImagingModal } from "@/components/radiology/UploadImagingModal";
import { PrintableDocumentModal } from "@/components/clinical-docs/PrintableDocumentModal";
import { DischargeSummaryDocument } from "@/components/clinical-docs/DischargeSummaryDocument";
import { RadiologyReportDocument } from "@/components/clinical-docs/RadiologyReportDocument";
import { MedicalFitnessDocument } from "@/components/clinical-docs/MedicalFitnessDocument";
import { ReferralLetterDocument } from "@/components/clinical-docs/ReferralLetterDocument";
import { SickLeaveDocument } from "@/components/clinical-docs/SickLeaveDocument";
import { useVoiceDictation } from "@/hooks/useVoiceDictation";
import { toast } from "sonner";
import {
  Camera,
  Eye,
  FileImage,
  Image as ImageIcon,
  Printer,
  Mic,
  MicOff,
  Copy,
  ShieldCheck,
  FileCheck2,
  FileSpreadsheet,
  KeyRound,
  CornerDownRight,
  Unlock,
  Award,
  CheckCircle,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/consultations")({
  head: () => ({
    meta: [
      { title: "Doctor Consultations Workspace — HospNest" },
      { name: "description", content: "Clinical consultations queue, patient workspace, SOAP notes, ICD-10 diagnosis, lab orders, and e-prescribing." },
    ],
  }),
  component: ConsultationsPage,
});

type TabFilter = "all" | "my_patients" | "waiting";

function ConsultationsPage() {
  const { activeHospitalId } = useAppShell();
  const getQueueFn = useServerFn(getConsultationQueue);
  const getWorkspaceFn = useServerFn(getEncounterWorkspace);
  const claimFn = useServerFn(claimEncounter);
  const saveNotesFn = useServerFn(saveConsultationNotes);
  const orderLabFn = useServerFn(orderLabTest);
  const orderRxFn = useServerFn(orderPrescription);
  const finishConsultationFn = useServerFn(finishConsultation);

  const signFn = useServerFn(signAndLockConsultationNotes);
  const addAmendmentFn = useServerFn(addClinicalAmendment);

  const [filterTab, setFilterTab] = useState<TabFilter>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedEncounterId, setSelectedEncounterId] = useState<string | null>(null);

  // AI Copilot State
  const generateAiFn = useServerFn(generateAiEncounterSummary);
  const [isCopilotOpen, setIsCopilotOpen] = useState(false);
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);
  const [aiResult, setAiResult] = useState<AiCopilotResult | null>(null);

  // Form states for structured clinical consultation
  const [presentingComplaint, setPresentingComplaint] = useState("");
  const [hpi, setHpi] = useState("");
  const [pastMedicalHistory, setPastMedicalHistory] = useState("");
  const [drugHistory, setDrugHistory] = useState("");
  const [allergiesNotes, setAllergiesNotes] = useState("");
  const [reviewOfSystems, setReviewOfSystems] = useState("");

  // Systematic Physical Exam
  const [examCardio, setExamCardio] = useState("");
  const [examResp, setExamResp] = useState("");
  const [examGi, setExamGi] = useState("");
  const [examCns, setExamCns] = useState("");
  const [examMusculo, setExamMusculo] = useState("");
  const [examination, setExamination] = useState("");

  const [isPastHxOpen, setIsPastHxOpen] = useState(false);
  const [isSystematicExamOpen, setIsSystematicExamOpen] = useState(false);

  // Diagnosis & Plan
  const [diagnosisQuery, setDiagnosisQuery] = useState("");
  const [selectedDiagnoses, setSelectedDiagnoses] = useState<DiagnosisItem[]>([]);
  const [customDiagnosis, setCustomDiagnosis] = useState("");
  const [planAndOrders, setPlanAndOrders] = useState("");
  const [psychiatricNotes, setPsychiatricNotes] = useState("");

  // Amendment modal state
  const [isAmendmentModalOpen, setIsAmendmentModalOpen] = useState(false);
  const [amendmentType, setAmendmentType] = useState<"addendum" | "correction" | "late_entry">("addendum");
  const [amendmentReason, setAmendmentReason] = useState("");
  const [amendedNotes, setAmendedNotes] = useState("");

  // Printable Document Modals
  const [isPrintFitnessOpen, setIsPrintFitnessOpen] = useState(false);
  const [fitnessPurpose, setFitnessPurpose] = useState("Pre-Employment Examination");
  const [fitnessStatus, setFitnessStatus] = useState<"fit" | "temporarily_unfit" | "unfit">("fit");

  const [isPrintReferralOpen, setIsPrintReferralOpen] = useState(false);
  const [referralDestination, setReferralDestination] = useState("National Hospital Abuja");
  const [referralSpecialty, setReferralSpecialty] = useState("Consultant Physician / Specialist Unit");
  const [referralReason, setReferralReason] = useState("Tertiary diagnostic evaluation and specialized management");
  const [referralType, setReferralType] = useState<"emergency" | "urgent" | "routine">("routine");

  const [isPrintSickLeaveOpen, setIsPrintSickLeaveOpen] = useState(false);
  const [sickLeaveDuration, setSickLeaveDuration] = useState("3");
  const [sickLeaveStartDate, setSickLeaveStartDate] = useState(new Date().toISOString().slice(0, 10));
  const [sickLeaveType, setSickLeaveType] = useState<"excused_from_duty" | "total_bed_rest" | "light_duty">("excused_from_duty");

  // Voice Dictation Tracking
  const [activeVoiceField, setActiveVoiceField] = useState<"complaint" | "hpi" | "pmhx" | "exam" | "plan" | null>(null);

  const { isListening, toggleListening, stopListening } = useVoiceDictation({
    onResult: (text) => {
      if (activeVoiceField === "complaint") setPresentingComplaint(text);
      else if (activeVoiceField === "hpi") setHpi(text);
      else if (activeVoiceField === "pmhx") setPastMedicalHistory(text);
      else if (activeVoiceField === "exam") setExamination(text);
      else if (activeVoiceField === "plan") setPlanAndOrders(text);
    },
  });

  const handleToggleVoice = (field: "complaint" | "hpi" | "pmhx" | "exam" | "plan") => {
    if (activeVoiceField === field && isListening) {
      stopListening();
      setActiveVoiceField(null);
    } else {
      setActiveVoiceField(field);
      toggleListening();
    }
  };

  // Lab Order Form State
  const [selectedLabTestId, setSelectedLabTestId] = useState("");
  const [labSampleType, setLabSampleType] = useState("Blood");
  const [labNotes, setLabNotes] = useState("");

  // Prescription Form State
  const [selectedDrugId, setSelectedDrugId] = useState("");
  const [rxDosage, setRxDosage] = useState("1 tab");
  const [rxFrequency, setRxFrequency] = useState("twice daily (BD)");
  const [rxDuration, setRxDuration] = useState("5 days");
  const [rxQuantity, setRxQuantity] = useState("10");
  const [rxInstructions, setRxInstructions] = useState("Take after meals");

  const [isPending, startTransition] = useTransition();

  // Queue query
  const {
    data: queueData,
    isLoading: isQueueLoading,
    refetch: refetchQueue,
    isFetching: isQueueFetching,
  } = useQuery({
    queryKey: ["consultation-queue", activeHospitalId],
    queryFn: () => getQueueFn({ data: { hospitalId: activeHospitalId || undefined } }),
    refetchInterval: 12000,
  });

  // Workspace query (when an encounter is opened)
  const {
    data: workspaceData,
    isLoading: isWorkspaceLoading,
    refetch: refetchWorkspace,
  } = useQuery({
    queryKey: ["encounter-workspace", selectedEncounterId, activeHospitalId],
    queryFn: () =>
      selectedEncounterId
        ? getWorkspaceFn({ data: { encounterId: selectedEncounterId, hospitalId: activeHospitalId || undefined } })
        : null,
    enabled: Boolean(selectedEncounterId),
  });

  // Radiology & Medical Imaging Subsystem
  const getImagingFn = useServerFn(getPatientImagingStudies);
  const orderImagingFn = useServerFn(orderImagingStudy);
  const [activeImagingStudy, setActiveImagingStudy] = useState<RadiologyStudyItem | null>(null);
  const [activeReportStudy, setActiveReportStudy] = useState<RadiologyStudyItem | null>(null);
  const [isImageViewerOpen, setIsImageViewerOpen] = useState(false);
  const [isUploadImagingOpen, setIsUploadImagingOpen] = useState(false);
  const [isOrderImagingOpen, setIsOrderImagingOpen] = useState(false);
  const [isPrintDischargeOpen, setIsPrintDischargeOpen] = useState(false);
  const [isPrintRadiologyOpen, setIsPrintRadiologyOpen] = useState(false);

  // Order Imaging form state
  const [orderModality, setOrderModality] = useState<ImagingModality>("xray");
  const [orderBodyPart, setOrderBodyPart] = useState("");
  const [orderIndication, setOrderIndication] = useState("");
  const [orderPriority, setOrderPriority] = useState<"routine" | "urgent" | "stat">("routine");

  const { data: imagingData, refetch: refetchImaging } = useQuery({
    queryKey: ["patient-imaging-studies", workspaceData?.patient?.id, activeHospitalId],
    queryFn: () =>
      workspaceData?.patient?.id
        ? getImagingFn({
            data: {
              patientId: workspaceData.patient.id,
              encounterId: selectedEncounterId || undefined,
              hospitalId: activeHospitalId || undefined,
            },
          })
        : null,
    enabled: Boolean(workspaceData?.patient?.id),
  });

  const handleOpenWorkspace = (encounterId: string) => {
    setSelectedEncounterId(encounterId);
  };

  // Prepopulate form when workspaceData updates
  useMemo(() => {
    if (workspaceData?.encounter) {
      setPresentingComplaint(workspaceData.encounter.chiefComplaint || "");
      if (workspaceData.encounter.pastMedicalHistory) {
        setPastMedicalHistory(workspaceData.encounter.pastMedicalHistory);
      }
      if (workspaceData.encounter.drugHistory) {
        setDrugHistory(workspaceData.encounter.drugHistory);
      }
      if (workspaceData.encounter.allergiesNotes) {
        setAllergiesNotes(workspaceData.encounter.allergiesNotes);
      }
      if (workspaceData.encounter.reviewOfSystems) {
        setReviewOfSystems(workspaceData.encounter.reviewOfSystems);
      }
      if (workspaceData.encounter.physicalExamSystematic) {
        setExamCardio(workspaceData.encounter.physicalExamSystematic.cardiovascular || "");
        setExamResp(workspaceData.encounter.physicalExamSystematic.respiratory || "");
        setExamGi(workspaceData.encounter.physicalExamSystematic.gastrointestinal || "");
        setExamCns(workspaceData.encounter.physicalExamSystematic.centralNervous || "");
        setExamMusculo(workspaceData.encounter.physicalExamSystematic.musculoskeletal || "");
      }
      if (workspaceData.encounter.diagnosis) {
        setCustomDiagnosis(workspaceData.encounter.diagnosis);
      }
      if (workspaceData.encounter.psychiatricNotes) {
        setPsychiatricNotes(workspaceData.encounter.psychiatricNotes);
      }
    }
  }, [workspaceData?.encounter?.id]);

  // Claim patient action
  const handleClaim = (encounterId: string) => {
    startTransition(async () => {
      try {
        const res = await claimFn({
          data: { encounterId, hospitalId: activeHospitalId || undefined },
        });
        if (res.success) {
          toast.success(`You have claimed this patient for consultation.`);
          refetchQueue();
          if (selectedEncounterId === encounterId) {
            refetchWorkspace();
          }
        }
      } catch (err: any) {
        toast.error(err?.message || "Failed to claim patient.");
      }
    });
  };

  // 1-Click Copy Forward from Previous Encounters
  const handleCopyForward = () => {
    if (!workspaceData || workspaceData.pastVisits.length === 0) {
      toast.info("No previous encounter records found for copy-forward.");
      return;
    }
    const lastVisit = workspaceData.pastVisits[0];
    if (lastVisit?.diagnosis && lastVisit.diagnosis !== "Restricted") {
      setCustomDiagnosis(lastVisit.diagnosis);
    }
    if (workspaceData.patient.chronicConditions.length > 0) {
      setPastMedicalHistory(workspaceData.patient.chronicConditions.join("; "));
    }
    if (workspaceData.patient.allergies.length > 0) {
      setAllergiesNotes(workspaceData.patient.allergies.join("; "));
    }
    toast.success("Previous clinical history, chronic conditions & allergies copied forward.");
  };

  // Save consultation notes
  const handleSaveConsultation = () => {
    if (!selectedEncounterId || !workspaceData) return;

    const primaryDiag =
      selectedDiagnoses.length > 0
        ? selectedDiagnoses.map((d) => d.name).join("; ")
        : customDiagnosis;

    if (!primaryDiag.trim()) {
      toast.error("Please specify a primary diagnosis before saving.");
      return;
    }

    startTransition(async () => {
      try {
        const res = await saveNotesFn({
          data: {
            encounterId: selectedEncounterId,
            patientId: workspaceData.patient.id,
            hospitalId: activeHospitalId || undefined,
            presentingComplaint: presentingComplaint || "Routine check-up",
            historyOfPresentingIllness: hpi || undefined,
            pastMedicalHistory: pastMedicalHistory || undefined,
            drugHistory: drugHistory || undefined,
            allergiesNotes: allergiesNotes || undefined,
            reviewOfSystems: reviewOfSystems || undefined,
            physicalExamSystematic: {
              cardiovascular: examCardio || undefined,
              respiratory: examResp || undefined,
              gastrointestinal: examGi || undefined,
              centralNervous: examCns || undefined,
              musculoskeletal: examMusculo || undefined,
            },
            examinationFindings: examination || undefined,
            diagnosis: primaryDiag,
            icd10Codes: selectedDiagnoses.map((d) => d.code),
            planAndOrders: planAndOrders || undefined,
            psychiatricNotes: psychiatricNotes || undefined,
          },
        });

        if (res.success) {
          toast.success("Consultation notes & diagnosis recorded successfully.");
          refetchQueue();
          refetchWorkspace();
        }
      } catch (err: any) {
        toast.error(err?.message || "Failed to save consultation.");
      }
    });
  };

  // Digitally Sign & Lock Consultation Record
  const handleSignAndLock = () => {
    if (!selectedEncounterId || !workspaceData) return;

    const primaryDiag =
      selectedDiagnoses.length > 0
        ? selectedDiagnoses.map((d) => d.name).join("; ")
        : customDiagnosis;

    if (!primaryDiag.trim()) {
      toast.error("Please enter a primary diagnosis before signing.");
      return;
    }

    startTransition(async () => {
      try {
        const res = await signFn({
          data: {
            encounterId: selectedEncounterId,
            patientId: workspaceData.patient.id,
            hospitalId: activeHospitalId || undefined,
            diagnosis: primaryDiag,
            clinicalSummary: presentingComplaint || "Clinical Consultation",
          },
        });

        if (res.success) {
          toast.success("Clinical documentation digitally signed & locked with cryptographic signature hash.");
          refetchWorkspace();
        }
      } catch (err: any) {
        toast.error(err?.message || "Failed to digitally sign notes.");
      }
    });
  };

  // Add Append-Only Clinical Note Amendment
  const handleAddAmendment = () => {
    if (!selectedEncounterId || !workspaceData || !amendedNotes.trim() || !amendmentReason.trim()) {
      toast.error("Please provide both the clinical addendum text and reason for amendment.");
      return;
    }

    startTransition(async () => {
      try {
        const res = await addAmendmentFn({
          data: {
            encounterId: selectedEncounterId,
            patientId: workspaceData.patient.id,
            hospitalId: activeHospitalId || undefined,
            amendmentType,
            amendmentReason,
            amendedNotes,
          },
        });

        if (res.success) {
          toast.success(`Clinical ${amendmentType} recorded in immutable audit ledger.`);
          setIsAmendmentModalOpen(false);
          setAmendedNotes("");
          setAmendmentReason("");
          refetchWorkspace();
        }
      } catch (err: any) {
        toast.error(err?.message || "Failed to record clinical amendment.");
      }
    });
  };

  // Order Lab Test Action
  const handleAddLabOrder = () => {
    if (!selectedEncounterId || !workspaceData || !selectedLabTestId) {
      toast.error("Please select a laboratory investigation.");
      return;
    }

    startTransition(async () => {
      try {
        const res = await orderLabFn({
          data: {
            encounterId: selectedEncounterId,
            patientId: workspaceData.patient.id,
            hospitalId: activeHospitalId || undefined,
            hospitalTestId: selectedLabTestId,
            sampleType: labSampleType,
            clinicalNotes: labNotes || undefined,
          },
        });

        if (res.success) {
          toast.success("Laboratory order placed successfully.");
          setSelectedLabTestId("");
          setLabNotes("");
          refetchWorkspace();
        }
      } catch (err: any) {
        toast.error(err?.message || "Failed to place lab order.");
      }
    });
  };

  // Order Prescription Action
  const handleAddPrescription = () => {
    if (!selectedEncounterId || !workspaceData || !selectedDrugId) {
      toast.error("Please select a medication to prescribe.");
      return;
    }

    startTransition(async () => {
      try {
        const res = await orderRxFn({
          data: {
            encounterId: selectedEncounterId,
            patientId: workspaceData.patient.id,
            hospitalId: activeHospitalId || undefined,
            drugId: selectedDrugId,
            dosage: rxDosage,
            frequency: rxFrequency,
            duration: rxDuration,
            quantity: parseInt(rxQuantity, 10) || 1,
            instructions: rxInstructions || undefined,
          },
        });

        if (res.success) {
          toast.success("Prescription item added successfully.");
          setSelectedDrugId("");
          refetchWorkspace();
        }
      } catch (err: any) {
        toast.error(err?.message || "Failed to add prescription.");
      }
    });
  };

  // Order Diagnostic Imaging Study Action
  const handleOrderImaging = () => {
    if (!selectedEncounterId || !workspaceData || !orderBodyPart.trim() || !orderIndication.trim()) {
      toast.error("Please specify both the body part/region and clinical indication for imaging.");
      return;
    }

    startTransition(async () => {
      try {
        const res = await orderImagingFn({
          data: {
            hospitalId: activeHospitalId || workspaceData.encounter.hospitalId,
            patientId: workspaceData.patient.id,
            encounterId: selectedEncounterId,
            modality: orderModality,
            bodyPart: orderBodyPart.trim(),
            clinicalIndication: orderIndication.trim(),
            priority: orderPriority,
          },
        });

        if (res.success) {
          toast.success(`Ordered ${orderModality.toUpperCase()} (${orderBodyPart}) successfully.`);
          setIsOrderImagingOpen(false);
          setOrderBodyPart("");
          setOrderIndication("");
          setOrderPriority("routine");
          refetchImaging();
        }
      } catch (err: any) {
        toast.error(err?.message || "Failed to order imaging study.");
      }
    });
  };

  // Finish Consultation Action
  const handleFinishConsultation = () => {
    if (!selectedEncounterId || !workspaceData) return;

    startTransition(async () => {
      try {
        const res = await finishConsultationFn({
          data: {
            encounterId: selectedEncounterId,
            patientId: workspaceData.patient.id,
            hospitalId: activeHospitalId || undefined,
          },
        });

        if (res.success) {
          const statusMsg =
            res.nextStatus === "lab_pending"
              ? "Patient routed to Laboratory for investigations."
              : res.nextStatus === "pharmacy_pending"
              ? "Patient routed to Pharmacy for dispensing."
              : "Consultation concluded and visit closed.";

          toast.success(statusMsg);
          setSelectedEncounterId(null);
          refetchQueue();
        }
      } catch (err: any) {
        toast.error(err?.message || "Failed to finish consultation.");
      }
    });
  };

  // Run AI Clinical Copilot
  const handleRunAiCopilot = async () => {
    if (!selectedEncounterId || !workspaceData) return;
    setIsGeneratingAi(true);
    try {
      const primaryDiag =
        selectedDiagnoses.length > 0
          ? selectedDiagnoses.map((d) => d.name).join("; ")
          : customDiagnosis;

      const res = await generateAiFn({
        data: {
          encounterId: selectedEncounterId,
          patientId: workspaceData.patient.id,
          hospitalId: activeHospitalId || undefined,
          patientName: workspaceData.patient.fullName,
          patientAge: workspaceData.patient.age,
          patientGender: workspaceData.patient.gender || undefined,
          allergies: workspaceData.patient.allergies,
          chronicConditions: workspaceData.patient.chronicConditions,
          chiefComplaint: presentingComplaint || workspaceData.encounter.chiefComplaint || "Routine consultation",
          historyOfPresentingIllness: hpi || undefined,
          examinationFindings: examination || undefined,
          provisionalDiagnosis: primaryDiag || undefined,
          vitals: workspaceData.latestVitals ? {
            bodyTemperature: workspaceData.latestVitals.bodyTemperature,
            systolicBp: workspaceData.latestVitals.systolicBp,
            diastolicBp: workspaceData.latestVitals.diastolicBp,
            pulseRate: workspaceData.latestVitals.pulseRate,
            respiratoryRate: workspaceData.latestVitals.respiratoryRate,
            spo2: workspaceData.latestVitals.spo2,
            weightKg: workspaceData.latestVitals.weightKg,
            painScore: workspaceData.latestVitals.painScore,
          } : undefined,
          labOrders: workspaceData.activeLabOrders.map((l) => ({
            testName: l.testName,
            status: l.status,
            sampleType: l.sampleType,
          })),
          prescriptions: workspaceData.activePrescriptions.map((p) => ({
            drugName: p.drugName,
            dosage: p.dosage,
            frequency: p.frequency,
            duration: p.duration,
          })),
        },
      });

      setAiResult(res);
      setIsCopilotOpen(true);
      toast.success("AI Clinical Copilot generated encounter summary.");
    } catch (err: any) {
      toast.error(err?.message || "Failed to generate AI clinical draft.");
    } finally {
      setIsGeneratingAi(false);
    }
  };

  // Apply AI SOAP Draft to form fields
  const handleApplyAiSoap = () => {
    if (!aiResult) return;
    if (!hpi && aiResult.soapSummary.subjective) {
      setHpi(aiResult.soapSummary.subjective);
    }
    if (!examination && aiResult.soapSummary.objective) {
      setExamination(aiResult.soapSummary.objective);
    }
    if (!planAndOrders && aiResult.soapSummary.plan) {
      setPlanAndOrders(aiResult.soapSummary.plan);
    }
    if (selectedDiagnoses.length === 0 && !customDiagnosis && aiResult.differentialDiagnoses.length > 0) {
      const topDx = aiResult.differentialDiagnoses[0]!;
      setSelectedDiagnoses([{
        code: topDx.code,
        name: topDx.name,
        category: "AI Clinical Impression",
      }]);
    }
    setIsCopilotOpen(false);
    toast.success("AI SOAP draft applied to consultation documentation.");
  };

  // Filtered Queue
  const filteredQueue = useMemo(() => {
    if (!queueData?.queue) return [];
    let list = queueData.queue;

    if (filterTab === "my_patients") {
      list = list.filter((item) => item.isClaimedByMe);
    } else if (filterTab === "waiting") {
      list = list.filter((item) => !item.practitionerId);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (item) =>
          item.patient.fullName.toLowerCase().includes(q) ||
          item.patient.nin.toLowerCase().includes(q) ||
          (item.queueNumber && item.queueNumber.toString().includes(q)) ||
          (item.chiefComplaint && item.chiefComplaint.toLowerCase().includes(q)),
      );
    }

    return list;
  }, [queueData?.queue, filterTab, searchQuery]);

  // Filtered ICD-10 diagnoses suggestions
  const diagnosisSuggestions = useMemo(() => {
    if (!diagnosisQuery.trim()) return [];
    const q = diagnosisQuery.toLowerCase();
    return COMMON_DIAGNOSES.filter(
      (d) =>
        (d.name.toLowerCase().includes(q) || d.code.toLowerCase().includes(q)) &&
        !selectedDiagnoses.some((sd) => sd.code === d.code),
    ).slice(0, 6);
  }, [diagnosisQuery, selectedDiagnoses]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 md:px-8 space-y-6">
      {/* Top Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="flex size-9 items-center justify-center rounded-xl bg-teal-500/10 text-teal-600 dark:text-teal-400">
              <Stethoscope className="size-5" />
            </div>
            <h1 className="font-display text-2xl font-bold tracking-tight text-foreground md:text-3xl">
              Doctor Consultation Workspace
            </h1>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Awaiting patients queue, SOAP documentation, ICD-10 diagnosis, e-lab orders, and prescription management.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => refetchQueue()}
            disabled={isQueueFetching}
            className="gap-1.5 border-border"
          >
            <RefreshCw className={`size-3.5 ${isQueueFetching ? "animate-spin" : ""}`} />
            Refresh Queue
          </Button>
          <Button asChild size="sm" variant="secondary" className="gap-1.5">
            <Link to="/triage">
              <Activity className="size-3.5" /> View Triage
            </Link>
          </Button>
        </div>
      </div>

      {/* Main Grid: Left Column Queue / Right Column Workspace */}
      <div className="grid gap-6 lg:grid-cols-12">
        {/* Left Column: Consultations Queue */}
        <div className={`space-y-4 ${selectedEncounterId ? "lg:col-span-4" : "lg:col-span-12"}`}>
          <div className="rounded-2xl border border-border bg-card shadow-soft overflow-hidden">
            {/* Filter Tabs & Search */}
            <div className="border-b border-border p-3.5 space-y-3">
              <div className="flex rounded-lg bg-muted p-1 text-xs">
                {[
                  { id: "all", label: `All Queue (${queueData?.queue.length ?? 0})` },
                  { id: "my_patients", label: `My Patients (${queueData?.queue.filter((i) => i.isClaimedByMe).length ?? 0})` },
                  { id: "waiting", label: `Unassigned (${queueData?.queue.filter((i) => !i.practitionerId).length ?? 0})` },
                ].map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setFilterTab(t.id as TabFilter)}
                    className={`flex-1 rounded-md py-1.5 font-semibold transition-colors ${
                      filterTab === t.id
                        ? "bg-background text-foreground shadow-xs"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>

              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Filter by name, queue #, symptoms..."
                  className="h-8 pl-8 text-xs"
                />
              </div>
            </div>

            {/* Queue List */}
            {isQueueLoading ? (
              <div className="p-8 text-center">
                <Loader2 className="mx-auto size-6 animate-spin text-primary" />
                <p className="mt-2 text-xs text-muted-foreground">Loading queue...</p>
              </div>
            ) : filteredQueue.length === 0 ? (
              <div className="p-8 text-center">
                <CheckCircle2 className="mx-auto size-8 text-emerald-500/70" />
                <p className="mt-2 text-xs text-muted-foreground">No patients awaiting consultation in this tab.</p>
              </div>
            ) : (
              <div className="divide-y divide-border max-h-[720px] overflow-y-auto">
                {filteredQueue.map((item) => {
                  const isSelected = selectedEncounterId === item.encounterId;
                  return (
                    <div
                      key={item.encounterId}
                      onClick={() => handleOpenWorkspace(item.encounterId)}
                      className={`cursor-pointer p-3.5 transition-all hover:bg-muted/40 ${
                        isSelected
                          ? "border-l-4 border-l-teal-600 bg-teal-500/5 dark:bg-teal-950/20"
                          : ""
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="flex size-6 items-center justify-center rounded bg-amber-500/10 font-mono text-xs font-bold text-amber-700 dark:text-amber-400">
                            #{item.queueNumber || "—"}
                          </span>
                          <span className="font-display text-xs font-bold text-foreground hover:underline">
                            {item.patient.fullName}
                          </span>
                        </div>
                        <span className="text-[10px] text-muted-foreground">
                          {new Date(item.checkedInAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </span>
                      </div>

                      <p className="mt-1 line-clamp-1 text-xs text-muted-foreground">
                        <span className="font-medium text-foreground">Complaint: </span>
                        {item.chiefComplaint || "Routine check"}
                      </p>

                      <div className="mt-2 flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-border/40 text-[11px]">
                        <div className="flex items-center gap-1.5">
                          {item.latestVitals?.bodyTemperature && (
                            <span className="rounded bg-muted px-1.5 py-0.2 font-mono text-[10px]">
                              {item.latestVitals.bodyTemperature}°C
                            </span>
                          )}
                          {item.latestVitals?.systolicBp && (
                            <span className="rounded bg-muted px-1.5 py-0.2 font-mono text-[10px]">
                              {item.latestVitals.systolicBp}/{item.latestVitals.diastolicBp}
                            </span>
                          )}
                        </div>

                        {item.practitionerName ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-medium text-teal-600 dark:text-teal-400">
                            <UserCheck className="size-3" /> Dr. {item.practitionerName}
                          </span>
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleClaim(item.encounterId);
                            }}
                            className="h-6 text-[10px] px-2 border-teal-500/40 text-teal-700 dark:text-teal-300"
                          >
                            Claim Patient
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Full Consultation Workspace */}
        {selectedEncounterId ? (
          <div className="space-y-6 lg:col-span-8">
            {isWorkspaceLoading ? (
              <div className="rounded-2xl border border-border bg-card p-16 text-center shadow-soft">
                <Loader2 className="mx-auto size-8 animate-spin text-primary" />
                <p className="mt-3 text-sm text-muted-foreground">Loading patient clinical workspace...</p>
              </div>
            ) : workspaceData ? (
              <>
                {/* Patient Summary Header Banner */}
                <div className="rounded-2xl border border-border bg-card p-5 shadow-soft space-y-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div className="flex size-12 items-center justify-center rounded-xl bg-teal-500/10 text-teal-600 font-display text-lg font-bold">
                        {workspaceData.patient.fullName[0]}
                      </div>
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h2 className="font-display text-lg font-bold text-foreground">
                            {workspaceData.patient.fullName}
                          </h2>
                          <span className="rounded-full bg-secondary px-2 py-0.5 text-xs font-semibold">
                            {workspaceData.patient.age} • {workspaceData.patient.gender}
                          </span>
                          <span className="font-mono text-xs text-muted-foreground">
                            NIN: {workspaceData.patient.nin}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Encounter ID: <span className="font-mono">{workspaceData.encounter.id.slice(0, 8)}</span> • Checked-in: {new Date(workspaceData.encounter.createdAt).toLocaleTimeString()}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setIsUploadImagingOpen(true)}
                        className="gap-1 text-xs border-teal-500/40 hover:bg-teal-500/10 font-semibold"
                      >
                        <Camera className="size-3.5 text-teal-600" /> Attach Scan
                      </Button>

                      {/* Printable Clinical Docs Suite */}
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setIsPrintFitnessOpen(true)}
                        className="gap-1 text-xs font-semibold"
                        title="Certificate of Medical Fitness"
                      >
                        <Award className="size-3.5 text-teal-600" /> Fitness Cert
                      </Button>

                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setIsPrintReferralOpen(true)}
                        className="gap-1 text-xs font-semibold"
                        title="Official Medical Referral Letter"
                      >
                        <Send className="size-3.5 text-teal-600" /> Referral Letter
                      </Button>

                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setIsPrintSickLeaveOpen(true)}
                        className="gap-1 text-xs font-semibold"
                        title="Excused Duty / Sick Leave Certificate"
                      >
                        <FileSpreadsheet className="size-3.5 text-amber-600" /> Sick Note
                      </Button>

                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setIsPrintDischargeOpen(true)}
                        className="gap-1 text-xs font-semibold shadow-xs"
                      >
                        <Printer className="size-3.5 text-teal-600" /> Discharge Summary
                      </Button>

                      {!workspaceData.encounter.practitionerId && (
                        <Button
                          size="sm"
                          onClick={() => handleClaim(workspaceData.encounter.id)}
                          className="gap-1.5 bg-teal-600 hover:bg-teal-700 text-white shadow-sm"
                        >
                          <UserCheck className="size-3.5" /> Claim Patient
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setSelectedEncounterId(null)}
                        className="text-xs"
                      >
                        Close
                      </Button>
                    </div>
                  </div>

                  {/* Clinical Alerts & Latest Vitals Bar */}
                  <div className="grid gap-3 sm:grid-cols-2 pt-3 border-t border-border/70 text-xs">
                    {/* Clinical Tags */}
                    <div className="flex flex-wrap items-center gap-1.5">
                      {workspaceData.patient.bloodGroup && (
                        <span className="inline-flex items-center gap-1 rounded bg-red-500/10 px-2 py-0.5 font-bold text-red-700 dark:text-red-400">
                          <Heart className="size-3 fill-current" /> Blood: {workspaceData.patient.bloodGroup}
                        </span>
                      )}
                      {workspaceData.patient.genotype && (
                        <span className="rounded bg-primary/10 px-2 py-0.5 font-bold text-primary">
                          Genotype: {workspaceData.patient.genotype}
                        </span>
                      )}
                      {workspaceData.patient.allergies.length > 0 ? (
                        <span className="inline-flex items-center gap-1 rounded bg-rose-500/15 px-2 py-0.5 font-bold text-rose-700 dark:text-rose-300">
                          <AlertTriangle className="size-3" /> Allergy: {workspaceData.patient.allergies.join(", ")}
                        </span>
                      ) : (
                        <span className="rounded bg-muted px-2 py-0.5 text-muted-foreground">No Allergies</span>
                      )}
                      {workspaceData.patient.chronicConditions.length > 0 && (
                        <span className="rounded bg-amber-500/15 px-2 py-0.5 font-medium text-amber-800 dark:text-amber-300">
                          Chronic: {workspaceData.patient.chronicConditions.join(", ")}
                        </span>
                      )}
                    </div>

                    {/* Vitals snapshot */}
                    {workspaceData.latestVitals ? (
                      <div className="flex flex-wrap items-center gap-2 font-mono sm:justify-end">
                        <span className="text-muted-foreground font-sans">Triage Vitals:</span>
                        <span className="rounded bg-muted/70 px-1.5 py-0.5">
                          Temp: {workspaceData.latestVitals.bodyTemperature ?? "—"}°C
                        </span>
                        <span className="rounded bg-muted/70 px-1.5 py-0.5">
                          BP: {workspaceData.latestVitals.systolicBp}/{workspaceData.latestVitals.diastolicBp}
                        </span>
                        <span className="rounded bg-muted/70 px-1.5 py-0.5">
                          HR: {workspaceData.latestVitals.pulseRate ?? "—"} bpm
                        </span>
                        <span className="rounded bg-muted/70 px-1.5 py-0.5">
                          SpO2: {workspaceData.latestVitals.spo2 ?? "—"}%
                        </span>
                      </div>
                    ) : (
                      <span className="text-muted-foreground italic sm:text-right">No vitals captured yet.</span>
                    )}
                  </div>
                </div>

                {/* Structured Clinical Encounter Form */}
                <div className="rounded-2xl border border-border bg-card p-6 shadow-soft space-y-5">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-3">
                    <div className="flex items-center gap-2">
                      <FileText className="size-4 text-teal-600" />
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-display text-base font-bold text-foreground">
                            Clinical SOAP Documentation
                          </h3>
                          {workspaceData.encounter.isLocked ? (
                            <Badge className="bg-emerald-600 text-white font-mono text-[10px] gap-1">
                              <ShieldCheck className="size-3" /> Digitally Signed (Locked)
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-[10px] text-muted-foreground">
                              Draft Record
                            </Badge>
                          )}
                        </div>
                        {workspaceData.encounter.digitalSignatureHash && (
                          <p className="font-mono text-[10px] text-muted-foreground mt-0.5">
                            Attribution: {workspaceData.encounter.practitionerName || "Attending Physician"} ({workspaceData.encounter.practitionerLicenseNumber || "MDCN"}) • Hash: {workspaceData.encounter.digitalSignatureHash}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {workspaceData.pastVisits.length > 0 && !workspaceData.encounter.isLocked && (
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={handleCopyForward}
                          className="h-8 gap-1.5 text-xs font-semibold border-teal-500/40 text-teal-700 dark:text-teal-300 hover:bg-teal-500/10"
                        >
                          <Copy className="size-3.5" /> Copy Forward
                        </Button>
                      )}

                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={handleRunAiCopilot}
                        disabled={isGeneratingAi}
                        className="h-8 gap-1.5 border-purple-500/40 bg-purple-500/10 text-purple-700 hover:bg-purple-500/20 dark:text-purple-300 font-semibold text-xs shadow-xs"
                      >
                        {isGeneratingAi ? (
                          <Loader2 className="size-3.5 animate-spin text-purple-600" />
                        ) : (
                          <Sparkles className="size-3.5 text-purple-600 dark:text-purple-400" />
                        )}
                        ✨ AI Copilot
                      </Button>
                    </div>
                  </div>

                  {/* 1. Subjective: Chief Complaint & HPI */}
                  <div className="space-y-3">
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="chief-complaint" className="text-xs font-bold">
                          1. Presenting Complaint (Chief Complaint)
                        </Label>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          onClick={() => handleToggleVoice("complaint")}
                          className={`h-6 text-[11px] px-1.5 gap-1 ${
                            activeVoiceField === "complaint" && isListening
                              ? "bg-rose-500/20 text-rose-600 animate-pulse font-bold"
                              : "text-muted-foreground hover:text-foreground"
                          }`}
                        >
                          {activeVoiceField === "complaint" && isListening ? <MicOff className="size-3" /> : <Mic className="size-3" />}
                          {activeVoiceField === "complaint" && isListening ? "Dictating..." : "Voice Dictate"}
                        </Button>
                      </div>
                      <Input
                        id="chief-complaint"
                        value={presentingComplaint}
                        onChange={(e) => setPresentingComplaint(e.target.value)}
                        disabled={workspaceData.encounter.isLocked}
                        placeholder="e.g. High grade fever, chills, body pains for 3 days"
                        className="h-9 text-xs"
                      />
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="hpi" className="text-xs font-bold">
                          History of Presenting Illness (HPI)
                        </Label>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          onClick={() => handleToggleVoice("hpi")}
                          className={`h-6 text-[11px] px-1.5 gap-1 ${
                            activeVoiceField === "hpi" && isListening
                              ? "bg-rose-500/20 text-rose-600 animate-pulse font-bold"
                              : "text-muted-foreground hover:text-foreground"
                          }`}
                        >
                          {activeVoiceField === "hpi" && isListening ? <MicOff className="size-3" /> : <Mic className="size-3" />}
                          {activeVoiceField === "hpi" && isListening ? "Dictating..." : "Voice Dictate"}
                        </Button>
                      </div>
                      <Textarea
                        id="hpi"
                        value={hpi}
                        onChange={(e) => setHpi(e.target.value)}
                        disabled={workspaceData.encounter.isLocked}
                        placeholder="Onset, character, duration, aggravating/relieving factors, associated symptoms..."
                        rows={3}
                        className="text-xs resize-none"
                      />
                    </div>

                    {/* Expandable Medical History, Drug Hx & Allergies */}
                    <div className="pt-1">
                      <button
                        type="button"
                        onClick={() => setIsPastHxOpen((prev) => !prev)}
                        className="flex w-full items-center justify-between rounded-lg bg-muted/40 px-3 py-2 text-xs font-semibold text-foreground hover:bg-muted/70 transition-colors"
                      >
                        <span className="flex items-center gap-1.5">
                          <History className="size-3.5 text-teal-600" />
                          Past Medical Hx, Drug Hx, Allergies & Review of Systems
                        </span>
                        {isPastHxOpen ? <ChevronUp className="size-3.5" /> : <ChevronDown className="size-3.5" />}
                      </button>

                      {isPastHxOpen && (
                        <div className="mt-2 space-y-3 rounded-xl border border-border bg-muted/20 p-3.5 text-xs">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div className="space-y-1">
                              <Label className="text-[11px] font-semibold">Past Medical History (PMHx)</Label>
                              <Input
                                value={pastMedicalHistory}
                                onChange={(e) => setPastMedicalHistory(e.target.value)}
                                disabled={workspaceData.encounter.isLocked}
                                placeholder="Previous hospitalizations, surgeries, asthma, HTN, DM..."
                                className="h-8 text-xs bg-background"
                              />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-[11px] font-semibold">Current Medications & Drug History</Label>
                              <Input
                                value={drugHistory}
                                onChange={(e) => setDrugHistory(e.target.value)}
                                disabled={workspaceData.encounter.isLocked}
                                placeholder="Antihypertensives, oral hypoglycemics, OTC meds..."
                                className="h-8 text-xs bg-background"
                              />
                            </div>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div className="space-y-1">
                              <Label className="text-[11px] font-semibold text-rose-600">Allergies & Adverse Drug Reactions</Label>
                              <Input
                                value={allergiesNotes}
                                onChange={(e) => setAllergiesNotes(e.target.value)}
                                disabled={workspaceData.encounter.isLocked}
                                placeholder="Penicillin, Sulfa drugs, NSAIDs, Food allergens..."
                                className="h-8 text-xs bg-background"
                              />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-[11px] font-semibold">Review of Systems (ROS)</Label>
                              <Input
                                value={reviewOfSystems}
                                onChange={(e) => setReviewOfSystems(e.target.value)}
                                disabled={workspaceData.encounter.isLocked}
                                placeholder="Cough, dyspnea, nausea, bowel habit, weight loss..."
                                className="h-8 text-xs bg-background"
                              />
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* 2. Objective: Physical Examination */}
                  <div className="space-y-2 pt-2 border-t border-border/70">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="exam-findings" className="text-xs font-bold">
                        2. General Physical Examination Findings
                      </Label>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => handleToggleVoice("exam")}
                        className={`h-6 text-[11px] px-1.5 gap-1 ${
                          activeVoiceField === "exam" && isListening
                            ? "bg-rose-500/20 text-rose-600 animate-pulse font-bold"
                            : "text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        {activeVoiceField === "exam" && isListening ? <MicOff className="size-3" /> : <Mic className="size-3" />}
                        {activeVoiceField === "exam" && isListening ? "Dictating..." : "Voice Dictate"}
                      </Button>
                    </div>
                    <Textarea
                      id="exam-findings"
                      value={examination}
                      onChange={(e) => setExamination(e.target.value)}
                      disabled={workspaceData.encounter.isLocked}
                      placeholder="General state, pallor, icterus, cyanosis, clubbing, pedal edema, lymphadenopathy..."
                      rows={2}
                      className="text-xs resize-none"
                    />

                    {/* Systematic Exam Collapsible */}
                    <div className="pt-1">
                      <button
                        type="button"
                        onClick={() => setIsSystematicExamOpen((prev) => !prev)}
                        className="flex w-full items-center justify-between rounded-lg bg-muted/40 px-3 py-2 text-xs font-semibold text-foreground hover:bg-muted/70 transition-colors"
                      >
                        <span className="flex items-center gap-1.5">
                          <Stethoscope className="size-3.5 text-teal-600" />
                          Systematic Physical Examination (CVS, Resp, GI, CNS, Musculo)
                        </span>
                        {isSystematicExamOpen ? <ChevronUp className="size-3.5" /> : <ChevronDown className="size-3.5" />}
                      </button>

                      {isSystematicExamOpen && (
                        <div className="mt-2 space-y-2.5 rounded-xl border border-border bg-muted/20 p-3.5 text-xs">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                            <div className="space-y-1">
                              <Label className="text-[11px] font-semibold">Cardiovascular System (CVS)</Label>
                              <Input
                                value={examCardio}
                                onChange={(e) => setExamCardio(e.target.value)}
                                disabled={workspaceData.encounter.isLocked}
                                placeholder="Heart sounds S1 S2, no murmurs, JVP not elevated"
                                className="h-8 text-xs bg-background"
                              />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-[11px] font-semibold">Respiratory System</Label>
                              <Input
                                value={examResp}
                                onChange={(e) => setExamResp(e.target.value)}
                                disabled={workspaceData.encounter.isLocked}
                                placeholder="Vesicular breath sounds bilaterally, chest clear"
                                className="h-8 text-xs bg-background"
                              />
                            </div>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                            <div className="space-y-1">
                              <Label className="text-[11px] font-semibold">Abdomen & Gastrointestinal (GI)</Label>
                              <Input
                                value={examGi}
                                onChange={(e) => setExamGi(e.target.value)}
                                disabled={workspaceData.encounter.isLocked}
                                placeholder="Soft, non-tender, no hepatosplenomegaly, bowel sounds active"
                                className="h-8 text-xs bg-background"
                              />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-[11px] font-semibold">Central Nervous System (CNS)</Label>
                              <Input
                                value={examCns}
                                onChange={(e) => setExamCns(e.target.value)}
                                disabled={workspaceData.encounter.isLocked}
                                placeholder="Alert, GCS 15/15, pupils equal and reactive, no focal neurological deficit"
                                className="h-8 text-xs bg-background"
                              />
                            </div>
                          </div>

                          <div className="space-y-1">
                            <Label className="text-[11px] font-semibold">Musculoskeletal & Locomotor</Label>
                            <Input
                              value={examMusculo}
                              onChange={(e) => setExamMusculo(e.target.value)}
                              disabled={workspaceData.encounter.isLocked}
                              placeholder="Full range of joint movements, normal tone and power 5/5"
                              className="h-8 text-xs bg-background"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* 3. Assessment: Diagnosis & ICD-10 Search */}
                  <div className="space-y-3 pt-2 border-t border-border/70">
                    <Label className="text-xs font-bold">
                      3. Assessment & Searchable ICD-10 Diagnosis
                    </Label>

                    {/* Selected Diagnosis Badges */}
                    {selectedDiagnoses.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {selectedDiagnoses.map((d) => (
                          <span
                            key={d.code}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-teal-500/30 bg-teal-500/10 px-2.5 py-1 text-xs font-semibold text-teal-800 dark:text-teal-300"
                          >
                            <span className="font-mono text-[10px] font-bold bg-teal-500/20 px-1 rounded">
                              {d.code}
                            </span>
                            <span>{d.name}</span>
                            {!workspaceData.encounter.isLocked && (
                              <button
                                type="button"
                                onClick={() => setSelectedDiagnoses((prev) => prev.filter((x) => x.code !== d.code))}
                                className="ml-1 text-muted-foreground hover:text-foreground"
                              >
                                ✕
                              </button>
                            )}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* ICD-10 Auto-Suggest Search Input */}
                    {!workspaceData.encounter.isLocked && (
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
                        <Input
                          value={diagnosisQuery}
                          onChange={(e) => setDiagnosisQuery(e.target.value)}
                          placeholder="Search standard ICD-10 catalog (e.g. malaria, hypertension, asthma, B50.9)..."
                          className="h-9 pl-9 text-xs"
                        />

                        {/* Dropdown Suggestions */}
                        {diagnosisSuggestions.length > 0 && (
                          <div className="absolute z-20 mt-1 w-full rounded-xl border border-border bg-card p-1 shadow-lg">
                            {diagnosisSuggestions.map((item) => (
                              <button
                                key={item.code}
                                type="button"
                                onClick={() => {
                                  setSelectedDiagnoses((prev) => [...prev, item]);
                                  setDiagnosisQuery("");
                                }}
                                className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-xs hover:bg-muted transition-colors"
                              >
                                <div>
                                  <span className="font-semibold text-foreground">{item.name}</span>
                                  <span className="ml-2 text-[10px] text-muted-foreground">({item.category})</span>
                                </div>
                                <span className="font-mono text-[10px] font-bold text-teal-600 bg-teal-500/10 px-1.5 py-0.5 rounded">
                                  {item.code}
                                </span>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Custom Diagnosis Input (if not choosing from catalog) */}
                    <div className="space-y-1">
                      <span className="text-[11px] text-muted-foreground">Or free-text custom clinical diagnosis:</span>
                      <Input
                        value={customDiagnosis}
                        onChange={(e) => setCustomDiagnosis(e.target.value)}
                        disabled={workspaceData.encounter.isLocked}
                        placeholder="Custom or unlisted clinical diagnosis"
                        className="h-8 text-xs font-medium"
                      />
                    </div>
                  </div>

                  {/* 4. Plan & Orders */}
                  <div className="space-y-1 pt-2 border-t border-border/70">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="plan" className="text-xs font-bold">
                        4. Management Plan & Patient Instructions
                      </Label>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => handleToggleVoice("plan")}
                        className={`h-6 text-[11px] px-1.5 gap-1 ${
                          activeVoiceField === "plan" && isListening
                            ? "bg-rose-500/20 text-rose-600 animate-pulse font-bold"
                            : "text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        {activeVoiceField === "plan" && isListening ? <MicOff className="size-3" /> : <Mic className="size-3" />}
                        {activeVoiceField === "plan" && isListening ? "Dictating..." : "Voice Dictate"}
                      </Button>
                    </div>
                    <Textarea
                      id="plan"
                      value={planAndOrders}
                      onChange={(e) => setPlanAndOrders(e.target.value)}
                      disabled={workspaceData.encounter.isLocked}
                      placeholder="Clinical management instructions, dietary advice, follow-up timeline..."
                      rows={2}
                      className="text-xs resize-none"
                    />
                  </div>

                  {/* 5. Confidential Psychiatric Notes */}
                  <div className="space-y-1 pt-2 border-t border-border/70">
                    <div className="flex items-center gap-1.5">
                      <Lock className="size-3 text-destructive" />
                      <Label htmlFor="psych-notes" className="text-xs font-bold text-destructive">
                        Confidential Psychiatric / Sensitive Notes (Restricted)
                      </Label>
                    </div>
                    <Textarea
                      id="psych-notes"
                      value={psychiatricNotes}
                      onChange={(e) => setPsychiatricNotes(e.target.value)}
                      disabled={workspaceData.encounter.isLocked}
                      placeholder="Sensitive mental health or psychiatric assessment notes..."
                      rows={2}
                      className="text-xs resize-none border-destructive/30 bg-destructive/5"
                    />
                  </div>

                  {/* 6. Immutable Clinical Amendments & Addenda Ledger */}
                  {workspaceData.amendments && workspaceData.amendments.length > 0 && (
                    <div className="space-y-2 pt-2 border-t border-border/70">
                      <div className="flex items-center gap-2">
                        <History className="size-4 text-amber-600" />
                        <h4 className="text-xs font-bold text-foreground uppercase tracking-wider">
                          Signed Clinical Addenda & Amendments ({workspaceData.amendments.length})
                        </h4>
                      </div>

                      <div className="space-y-2">
                        {workspaceData.amendments.map((am) => (
                          <div
                            key={am.id}
                            className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-3 text-xs space-y-1"
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-amber-900 dark:text-amber-200 capitalize">
                                [{am.amendmentType.toUpperCase()}] • {new Date(am.createdAt).toLocaleString("en-GB")}
                              </span>
                              <span className="font-mono text-[10px] text-muted-foreground">
                                Hash: {am.digitalSignatureHash || "Verified"}
                              </span>
                            </div>
                            <p className="text-[11px] text-muted-foreground font-semibold">
                              Author: {am.authorName} ({am.authorLicense}) • Reason: {am.amendmentReason}
                            </p>
                            <p className="text-foreground whitespace-pre-line pt-1">
                              {am.amendedNotes}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Action Buttons Bar: Save / Sign & Lock / Add Amendment */}
                  <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-border">
                    <div className="flex items-center gap-2">
                      {workspaceData.currentStaffLicenseNumber && (
                        <span className="text-[11px] text-muted-foreground flex items-center gap-1 font-mono">
                          <ShieldCheck className="size-3.5 text-teal-600" />
                          MDCN: {workspaceData.currentStaffLicenseNumber}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      {workspaceData.encounter.isLocked ? (
                        <Button
                          onClick={() => setIsAmendmentModalOpen(true)}
                          size="sm"
                          className="gap-1.5 font-semibold bg-amber-600 hover:bg-amber-700 text-white"
                        >
                          <CornerDownRight className="size-4" /> Add Clinical Addendum
                        </Button>
                      ) : (
                        <>
                          <Button
                            onClick={handleSaveConsultation}
                            disabled={isPending}
                            variant="outline"
                            size="sm"
                            className="gap-2 font-semibold border-teal-600/40 text-teal-700 dark:text-teal-300"
                          >
                            {isPending ? <Loader2 className="size-4 animate-spin" /> : <FileCheck className="size-4" />}
                            Save Progress Notes
                          </Button>

                          <Button
                            onClick={handleSignAndLock}
                            disabled={isPending}
                            size="sm"
                            className="gap-2 font-bold bg-teal-600 hover:bg-teal-700 text-white shadow-sm"
                          >
                            <ShieldCheck className="size-4" /> Sign & Lock Record
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* TWO ORDER PANELS (LAB & PRESCRIPTIONS) */}
                <div className="grid gap-6 md:grid-cols-2">
                  {/* Panel 1: Laboratory Investigations */}
                  <div className="rounded-2xl border border-border bg-card p-5 shadow-soft space-y-4">
                    <div className="flex items-center justify-between border-b border-border pb-2.5">
                      <div className="flex items-center gap-2">
                        <FlaskConical className="size-4 text-primary" />
                        <h4 className="font-display text-sm font-bold text-foreground">
                          Order Lab Investigations
                        </h4>
                      </div>
                      <span className="rounded-full bg-primary/10 px-2 py-0.2 text-[11px] font-semibold text-primary">
                        {workspaceData.activeLabOrders.length} Ordered
                      </span>
                    </div>

                    {/* Add Test Form */}
                    <div className="space-y-3 rounded-xl bg-muted/30 p-3 border border-border/60">
                      <div className="space-y-1">
                        <Label className="text-xs font-semibold">Select Test from Catalog</Label>
                        <Select value={selectedLabTestId} onValueChange={setSelectedLabTestId}>
                          <SelectTrigger className="h-8 text-xs bg-background">
                            <SelectValue placeholder="Choose diagnostic test..." />
                          </SelectTrigger>
                          <SelectContent>
                            {workspaceData.availableLabTests.map((t) => (
                              <SelectItem key={t.id} value={t.id} className="text-xs">
                                {t.name} ({t.code}) — ₦{t.price.toLocaleString()}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1">
                          <Label className="text-[11px] text-muted-foreground">Sample Type</Label>
                          <Input
                            value={labSampleType}
                            onChange={(e) => setLabSampleType(e.target.value)}
                            placeholder="Blood, Urine, Swab"
                            className="h-8 text-xs bg-background"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-[11px] text-muted-foreground">Clinical Indication</Label>
                          <Input
                            value={labNotes}
                            onChange={(e) => setLabNotes(e.target.value)}
                            placeholder="e.g. Febrile illness"
                            className="h-8 text-xs bg-background"
                          />
                        </div>
                      </div>

                      <Button
                        size="sm"
                        onClick={handleAddLabOrder}
                        disabled={isPending || !selectedLabTestId}
                        className="w-full h-8 text-xs gap-1.5"
                      >
                        <Plus className="size-3.5" /> Submit Lab Order
                      </Button>
                    </div>

                    {/* Running List of Ordered Tests */}
                    <div className="space-y-2">
                      <span className="text-xs font-bold text-foreground">Current Lab Orders</span>
                      {workspaceData.activeLabOrders.length === 0 ? (
                        <p className="text-xs text-muted-foreground italic py-1">No lab tests ordered for this encounter.</p>
                      ) : (
                        <div className="space-y-1.5 max-h-48 overflow-y-auto">
                          {workspaceData.activeLabOrders.map((lab) => (
                            <div
                              key={lab.id}
                              className="flex items-center justify-between rounded-lg border border-border bg-background p-2.5 text-xs"
                            >
                              <div>
                                <span className="font-semibold text-foreground">{lab.testName}</span>
                                <span className="ml-1 text-[10px] text-muted-foreground">({lab.sampleType || "Sample"})</span>
                              </div>
                              <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-semibold uppercase text-secondary-foreground">
                                {lab.status}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Panel 2: E-Prescriptions */}
                  <div className="rounded-2xl border border-border bg-card p-5 shadow-soft space-y-4">
                    <div className="flex items-center justify-between border-b border-border pb-2.5">
                      <div className="flex items-center gap-2">
                        <Pill className="size-4 text-emerald-600" />
                        <h4 className="font-display text-sm font-bold text-foreground">
                          Prescribe Medications
                        </h4>
                      </div>
                      <span className="rounded-full bg-emerald-500/10 px-2 py-0.2 text-[11px] font-semibold text-emerald-700 dark:text-emerald-300">
                        {workspaceData.activePrescriptions.length} Prescribed
                      </span>
                    </div>

                    {/* Add Medication Form */}
                    <div className="space-y-3 rounded-xl bg-muted/30 p-3 border border-border/60">
                      <div className="space-y-1">
                        <Label className="text-xs font-semibold">Select Drug from Formulary</Label>
                        <Select value={selectedDrugId} onValueChange={setSelectedDrugId}>
                          <SelectTrigger className="h-8 text-xs bg-background">
                            <SelectValue placeholder="Choose medication..." />
                          </SelectTrigger>
                          <SelectContent>
                            {workspaceData.availableDrugs.map((d) => (
                              <SelectItem key={d.id} value={d.id} className="text-xs">
                                {d.genericName} {d.strength ? `(${d.strength})` : ""} {d.brandName ? `• ${d.brandName}` : ""}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1">
                          <Label className="text-[11px] text-muted-foreground">Dosage</Label>
                          <Input
                            value={rxDosage}
                            onChange={(e) => setRxDosage(e.target.value)}
                            placeholder="e.g. 1 tab, 500mg"
                            className="h-8 text-xs bg-background"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-[11px] text-muted-foreground">Frequency</Label>
                          <Input
                            value={rxFrequency}
                            onChange={(e) => setRxFrequency(e.target.value)}
                            placeholder="e.g. TDS (3x daily)"
                            className="h-8 text-xs bg-background"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1">
                          <Label className="text-[11px] text-muted-foreground">Duration</Label>
                          <Input
                            value={rxDuration}
                            onChange={(e) => setRxDuration(e.target.value)}
                            placeholder="e.g. 5 days, 1 week"
                            className="h-8 text-xs bg-background"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-[11px] text-muted-foreground">Total Quantity</Label>
                          <Input
                            type="number"
                            value={rxQuantity}
                            onChange={(e) => setRxQuantity(e.target.value)}
                            placeholder="10"
                            className="h-8 text-xs bg-background font-mono"
                          />
                        </div>
                      </div>

                      <div className="space-y-1">
                        <Label className="text-[11px] text-muted-foreground">Patient Instructions</Label>
                        <Input
                          value={rxInstructions}
                          onChange={(e) => setRxInstructions(e.target.value)}
                          placeholder="e.g. Take with plenty of water after meals"
                          className="h-8 text-xs bg-background"
                        />
                      </div>

                      <Button
                        size="sm"
                        onClick={handleAddPrescription}
                        disabled={isPending || !selectedDrugId}
                        className="w-full h-8 text-xs gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
                      >
                        <Plus className="size-3.5" /> Add Prescription
                      </Button>
                    </div>

                    {/* Running List of Prescriptions */}
                    <div className="space-y-2">
                      <span className="text-xs font-bold text-foreground">Current Prescriptions</span>
                      {workspaceData.activePrescriptions.length === 0 ? (
                        <p className="text-xs text-muted-foreground italic py-1">No medications prescribed for this encounter.</p>
                      ) : (
                        <div className="space-y-1.5 max-h-48 overflow-y-auto">
                          {workspaceData.activePrescriptions.map((rx) => (
                            <div
                              key={rx.id}
                              className="rounded-lg border border-border bg-background p-2.5 text-xs space-y-1"
                            >
                              <div className="flex items-center justify-between">
                                <span className="font-semibold text-foreground">{rx.drugName}</span>
                                <span className="font-mono text-[11px] font-bold text-muted-foreground">Qty: {rx.quantityPrescribed}</span>
                              </div>
                              <p className="text-[11px] text-muted-foreground">
                                {rx.dosage} • {rx.frequency} ({rx.duration})
                              </p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* 6. Medical Imaging & Radiology Section */}
                <div className="rounded-2xl border border-border bg-card p-6 shadow-soft space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-3">
                    <div className="flex items-center gap-2">
                      <ImageIcon className="size-4 text-teal-600" />
                      <div>
                        <h3 className="font-display text-base font-bold text-foreground">
                          Diagnostic Imaging & Radiology Scans
                        </h3>
                        <p className="text-xs text-muted-foreground">
                          View X-rays, CT scans, MRIs, and Ultrasounds with pan, zoom, and negative film contrast.
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        onClick={() => setIsOrderImagingOpen(true)}
                        className="gap-1.5 text-xs font-semibold bg-teal-600 hover:bg-teal-700 text-white"
                      >
                        <Plus className="size-3.5" /> Order Imaging
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setIsUploadImagingOpen(true)}
                        className="gap-1.5 text-xs font-semibold border-teal-500/40 text-teal-700 dark:text-teal-300 hover:bg-teal-500/10"
                      >
                        <Camera className="size-3.5" /> Upload Scan
                      </Button>
                    </div>
                  </div>

                  {(!imagingData?.studies || imagingData.studies.length === 0) ? (
                    <div className="rounded-xl border border-dashed border-border p-6 text-center text-xs text-muted-foreground">
                      No radiological imaging studies recorded for this patient. Click "Order Imaging" or "Upload Scan" to attach an X-ray or ultrasound.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {imagingData.studies.map((study) => (
                        <div
                          key={study.id}
                          className="rounded-xl border border-border bg-muted/20 p-3.5 flex items-start gap-3 hover:border-teal-500/50 hover:bg-teal-500/5 transition-all group"
                        >
                          <div
                            onClick={() => {
                              if (study.imageUrl) {
                                setActiveImagingStudy(study);
                                setIsImageViewerOpen(true);
                              }
                            }}
                            className="relative size-20 shrink-0 rounded-lg overflow-hidden border border-border bg-black cursor-pointer group-hover:scale-105 transition-transform flex items-center justify-center"
                          >
                            {study.imageUrl ? (
                              <>
                                <img
                                  src={study.thumbnailUrl || study.imageUrl}
                                  alt={study.bodyPart}
                                  className="size-full object-cover opacity-90 group-hover:opacity-100"
                                />
                                <span className="absolute bottom-1 right-1 rounded bg-black/80 px-1 py-0.2 font-mono text-[9px] font-bold text-teal-400 uppercase">
                                  {study.modality}
                                </span>
                              </>
                            ) : (
                              <div className="text-center p-1">
                                <FileImage className="size-6 mx-auto text-teal-400/60 mb-1" />
                                <span className="font-mono text-[8px] font-bold text-teal-300 uppercase">PENDING</span>
                              </div>
                            )}
                          </div>

                          <div className="flex-1 space-y-1 text-xs">
                            <div className="flex items-start justify-between gap-1">
                              <span className="font-bold text-foreground group-hover:text-teal-700 dark:group-hover:text-teal-300">
                                {study.bodyPart}
                              </span>
                              {study.isCritical && (
                                <Badge variant="destructive" className="text-[9px] py-0 px-1.5 bg-rose-600 uppercase">
                                  Critical
                                </Badge>
                              )}
                            </div>

                            <p className="text-[11px] text-muted-foreground line-clamp-1">
                              {study.clinicalIndication || "Diagnostic examination"}
                            </p>

                            <p className="text-[10px] text-muted-foreground">
                              {new Date(study.studyDate).toLocaleDateString("en-GB", { dateStyle: "medium" })} • {study.status.toUpperCase()}
                            </p>

                            <div className="pt-1.5 flex flex-wrap items-center gap-1.5">
                              {study.imageUrl && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    setActiveImagingStudy(study);
                                    setIsImageViewerOpen(true);
                                  }}
                                  className="h-6 text-[11px] px-2 gap-1 bg-background hover:bg-teal-500/10 text-teal-700 dark:text-teal-300"
                                >
                                  <Eye className="size-3" /> View Scan
                                </Button>
                              )}
                              {(study.findings || study.impression) && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    setActiveReportStudy(study);
                                    setIsPrintRadiologyOpen(true);
                                  }}
                                  className="h-6 text-[11px] px-2 gap-1 bg-background hover:bg-teal-500/10 text-teal-700 dark:text-teal-300 font-semibold"
                                >
                                  <FileText className="size-3" /> Report
                                </Button>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* CONCLUDE CONSULTATION ACTION BANNER */}
                <div className="rounded-2xl border border-teal-500/30 bg-teal-500/10 p-5 shadow-soft flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h4 className="font-display text-base font-bold text-teal-900 dark:text-teal-200">
                      Finish & Route Consultation
                    </h4>
                    <p className="text-xs text-teal-800/80 dark:text-teal-300/80 mt-0.5 max-w-lg">
                      {workspaceData.activeLabOrders.length > 0
                        ? "Patient has active lab orders and will be routed to the Laboratory department."
                        : workspaceData.activePrescriptions.length > 0
                        ? "Patient has pending prescriptions and will be routed to the Pharmacy."
                        : "No pending orders. Completing will close the encounter and mark visit as completed."}
                    </p>
                  </div>

                  <Button
                    size="default"
                    onClick={handleFinishConsultation}
                    disabled={isPending}
                    className="gap-2 bg-teal-600 hover:bg-teal-700 text-white shadow-md font-bold shrink-0"
                  >
                    {isPending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
                    Finish Consultation
                  </Button>
                </div>

                {/* Patient Visit History */}
                <div className="rounded-2xl border border-border bg-card p-5 shadow-soft space-y-3">
                  <div className="flex items-center gap-2 border-b border-border pb-2.5">
                    <History className="size-4 text-muted-foreground" />
                    <h4 className="font-display text-sm font-bold text-foreground">
                      Previous Visit History & Diagnoses ({workspaceData.pastVisits.length})
                    </h4>
                  </div>

                  {workspaceData.pastVisits.length === 0 ? (
                    <p className="text-xs text-muted-foreground py-2 italic">
                      No previous visits on record for this patient.
                    </p>
                  ) : (
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {workspaceData.pastVisits.map((visit) => (
                        <div
                          key={visit.id}
                          className="rounded-lg border border-border/70 bg-muted/20 p-3 text-xs space-y-1"
                        >
                          <div className="flex items-center justify-between font-medium">
                            <span className="text-foreground font-semibold">
                              {visit.diagnosis || "No diagnosis documented"}
                            </span>
                            <span className="text-muted-foreground text-[11px]">
                              {new Date(visit.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                          <p className="text-muted-foreground text-[11px]">
                            Complaint: {visit.chiefComplaint || "Routine"} • Attended by Dr. {visit.practitionerName || "Attending"}
                          </p>
                          {visit.icd10Codes.length > 0 && (
                            <div className="flex flex-wrap gap-1 pt-1">
                              {visit.icd10Codes.map((code) => (
                                <span key={code} className="rounded bg-muted px-1.5 py-0.2 font-mono text-[10px]">
                                  {code}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            ) : null}
          </div>
        ) : (
          <div className="hidden lg:col-span-8 lg:flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-card/40 p-16 text-center shadow-soft min-h-[500px]">
            <Stethoscope className="size-14 text-muted-foreground/50" />
            <h3 className="mt-4 font-display text-lg font-bold text-foreground">
              Select a Patient from the Queue
            </h3>
            <p className="mt-1 text-xs text-muted-foreground max-w-sm">
              Click on any waiting patient in the left queue to open their clinical consultation workspace, write SOAP notes, order lab investigations, and e-prescribe medications.
            </p>
          </div>
        )}
      </div>

      {/* AI Clinical Copilot Dialog */}
      <Dialog open={isCopilotOpen} onOpenChange={setIsCopilotOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center gap-2 text-purple-600 dark:text-purple-400">
              <Sparkles className="size-5" />
              <DialogTitle className="font-display text-lg font-bold">
                AI Clinical Copilot — Encounter Synthesis & Safety Analysis
              </DialogTitle>
            </div>
            <DialogDescription className="text-xs">
              Review AI-generated SOAP notes, differential diagnoses, clinical red flags, and patient home-care instructions.
            </DialogDescription>
          </DialogHeader>

          {aiResult && (
            <div className="space-y-4 py-2 text-xs">
              {/* Clinical Red Flags */}
              {aiResult.redFlags.length > 0 && (
                <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3.5 space-y-1.5">
                  <div className="flex items-center gap-1.5 font-bold text-rose-700 dark:text-rose-400">
                    <ShieldAlert className="size-4" />
                    <span>Clinical Red Flags & Risk Warnings</span>
                  </div>
                  <ul className="list-disc pl-5 space-y-1 text-rose-800 dark:text-rose-300">
                    {aiResult.redFlags.map((flag, idx) => (
                      <li key={idx}>{flag}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Differential Diagnoses */}
              <div className="rounded-xl border border-border bg-card p-3.5 space-y-2">
                <span className="font-bold text-foreground">Suggested Differential Diagnoses</span>
                <div className="grid gap-2 sm:grid-cols-2">
                  {aiResult.differentialDiagnoses.map((d, idx) => (
                    <div key={idx} className="rounded-lg border border-border/80 bg-muted/30 p-2.5 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-foreground">{d.name}</span>
                        <span className="rounded bg-purple-500/15 px-1.5 py-0.2 font-mono text-[10px] font-bold text-purple-700 dark:text-purple-300">
                          {d.confidence}
                        </span>
                      </div>
                      <p className="text-[11px] text-muted-foreground">{d.rationale}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* SOAP Draft Breakdown */}
              <div className="rounded-xl border border-border bg-muted/20 p-3.5 space-y-3">
                <span className="font-bold text-foreground">Generated SOAP Draft</span>
                <div className="space-y-2">
                  <div className="space-y-1">
                    <span className="font-semibold text-teal-700 dark:text-teal-400">Subjective (S):</span>
                    <p className="rounded bg-background p-2 border border-border/60 text-muted-foreground whitespace-pre-line">
                      {aiResult.soapSummary.subjective}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <span className="font-semibold text-teal-700 dark:text-teal-400">Objective (O):</span>
                    <p className="rounded bg-background p-2 border border-border/60 text-muted-foreground whitespace-pre-line">
                      {aiResult.soapSummary.objective}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <span className="font-semibold text-teal-700 dark:text-teal-400">Assessment (A):</span>
                    <p className="rounded bg-background p-2 border border-border/60 text-muted-foreground whitespace-pre-line">
                      {aiResult.soapSummary.assessment}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <span className="font-semibold text-teal-700 dark:text-teal-400">Plan (P):</span>
                    <p className="rounded bg-background p-2 border border-border/60 text-muted-foreground whitespace-pre-line">
                      {aiResult.soapSummary.plan}
                    </p>
                  </div>
                </div>
              </div>

              {/* Patient Instructions */}
              <div className="rounded-xl border border-border bg-card p-3.5 space-y-1.5">
                <span className="font-bold text-foreground">Patient Home-Care Instructions</span>
                <p className="rounded bg-muted/30 p-2 text-muted-foreground whitespace-pre-line border border-border/60">
                  {aiResult.patientInstructions}
                </p>
              </div>
            </div>
          )}

          <DialogFooter className="gap-2 sm:justify-between">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsCopilotOpen(false)}
            >
              Cancel
            </Button>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                size="sm"
                onClick={handleApplyAiSoap}
                className="gap-1.5 bg-purple-600 hover:bg-purple-700 text-white font-bold"
              >
                <Check className="size-3.5" /> Apply to Consultation Form
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Radiology & Medical Imaging Viewer Modal */}
      <MedicalImageViewerModal
        study={activeImagingStudy}
        open={isImageViewerOpen}
        onOpenChange={setIsImageViewerOpen}
        patientName={workspaceData?.patient?.fullName}
        patientNin={workspaceData?.patient?.nin}
      />

      {/* Upload Imaging Study Modal */}
      {workspaceData?.patient?.id && (
        <UploadImagingModal
          open={isUploadImagingOpen}
          onOpenChange={setIsUploadImagingOpen}
          patientId={workspaceData.patient.id}
          encounterId={selectedEncounterId || undefined}
          hospitalId={activeHospitalId || undefined}
          onSuccess={() => refetchImaging()}
        />
      )}

      {/* Printable Clinical Discharge Summary Modal */}
      {workspaceData && (
        <PrintableDocumentModal
          open={isPrintDischargeOpen}
          onOpenChange={setIsPrintDischargeOpen}
          title="Clinical Discharge & Consultation Summary"
          documentRefCode={`DOC-${workspaceData.encounter.id.slice(0, 8).toUpperCase()}`}
        >
          <DischargeSummaryDocument
            hospital={{
              name: "HospNest Accredited Hospital",
              address: "Tertiary Health Complex",
              state: "Nigeria",
              contactPhone: "+234 800 000 9999",
              licenseNumber: "FMOH-CLIN-001",
            }}
            patient={{
              fullName: workspaceData.patient.fullName,
              nin: workspaceData.patient.nin,
              age: workspaceData.patient.age,
              gender: workspaceData.patient.gender,
              bloodGroup: workspaceData.patient.bloodGroup,
            }}
            discharge={{
              summaryNumber: `DS-${workspaceData.encounter.id.slice(0, 8).toUpperCase()}`,
              admissionDate: workspaceData.encounter.createdAt,
              dischargeDate: new Date().toISOString(),
              wardName: "Consultation Outpatient",
              attendingPhysician: workspaceData.encounter.practitionerName
                ? `Dr. ${workspaceData.encounter.practitionerName}`
                : "Dr. Attending Medical Officer",
              admissionReason: workspaceData.encounter.chiefComplaint || "Medical Consultation",
              primaryDiagnosis: workspaceData.encounter.diagnosis || customDiagnosis || "Clinical Assessment",
              secondaryDiagnoses: selectedDiagnoses.map((d) => d.name),
              hospitalCourseSummary:
                presentingComplaint ||
                workspaceData.encounter.clinicalNotes ||
                "Patient presented for clinical evaluation and diagnostic review. Physical examination conducted and appropriate therapeutic plan initiated.",
              dischargeCondition: "improved",
              dischargeMedications: workspaceData.activePrescriptions.map((rx) => ({
                drugName: rx.drugName,
                dosage: rx.dosage,
                frequency: rx.frequency,
                duration: rx.duration,
                specialInstructions: rx.instructions || undefined,
              })),
              followUpInstructions:
                "Adhere to prescribed medication regimen. Report immediately to emergency unit if symptoms worsen.",
              nextAppointmentDate: "In 2 weeks",
            }}
          />
        </PrintableDocumentModal>
      )}

      {/* Order Imaging Dialog Modal */}
      <Dialog open={isOrderImagingOpen} onOpenChange={setIsOrderImagingOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-foreground font-display">
              <ImageIcon className="size-5 text-teal-600" />
              Order Diagnostic Imaging Study
            </DialogTitle>
            <DialogDescription>
              Request a radiological investigation (X-ray, Ultrasound, CT, MRI) for {workspaceData?.patient?.fullName}.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Modality</Label>
              <Select
                value={orderModality}
                onValueChange={(val: any) => setOrderModality(val)}
              >
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder="Select imaging modality" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="xray" className="text-xs">Plain Radiography (X-Ray)</SelectItem>
                  <SelectItem value="ultrasound" className="text-xs">Ultrasound (Sonography)</SelectItem>
                  <SelectItem value="ct" className="text-xs">Computed Tomography (CT Scan)</SelectItem>
                  <SelectItem value="mri" className="text-xs">Magnetic Resonance Imaging (MRI)</SelectItem>
                  <SelectItem value="mammography" className="text-xs">Mammography</SelectItem>
                  <SelectItem value="other" className="text-xs">Other Diagnostic Imaging</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Body Part / Anatomical Region</Label>
              <Input
                value={orderBodyPart}
                onChange={(e) => setOrderBodyPart(e.target.value)}
                placeholder="e.g. Chest PA & Lateral, Abdomen, Left Knee, Pelvis"
                className="h-9 text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Priority Level</Label>
              <Select
                value={orderPriority}
                onValueChange={(val: any) => setOrderPriority(val)}
              >
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder="Select priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="routine" className="text-xs">Routine (Standard Outpatient)</SelectItem>
                  <SelectItem value="urgent" className="text-xs">Urgent (Within 4-6 Hours)</SelectItem>
                  <SelectItem value="stat" className="text-xs text-rose-600 font-bold">STAT (Immediate / Emergency)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Clinical Indication & Specific Questions</Label>
              <Textarea
                value={orderIndication}
                onChange={(e) => setOrderIndication(e.target.value)}
                placeholder="e.g. Suspected pneumonia; check for consolidation or pleural effusion. R/O pneumothorax."
                rows={3}
                className="text-xs resize-none"
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:justify-between">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsOrderImagingOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleOrderImaging}
              disabled={isPending || !orderBodyPart.trim() || !orderIndication.trim()}
              className="gap-1.5 bg-teal-600 hover:bg-teal-700 text-white font-bold"
            >
              {isPending ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
              Send Imaging Request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Printable Official Diagnostic Imaging Report */}
      {activeReportStudy && (
        <PrintableDocumentModal
          open={isPrintRadiologyOpen}
          onOpenChange={setIsPrintRadiologyOpen}
          title={`Radiology Report — ${activeReportStudy.modality.toUpperCase()}`}
          documentRefCode={`RAD-${activeReportStudy.id.slice(0, 8).toUpperCase()}`}
        >
          <RadiologyReportDocument
            hospital={{
              name: "HospNest Diagnostic Imaging Center",
              address: "Department of Radiology & Medical Imaging",
              state: "Nigeria",
              contactPhone: "+234 800 000 9999",
              licenseNumber: "NNRA-RAD-0441",
            }}
            patient={{
              fullName: workspaceData?.patient?.fullName || "Patient",
              nin: workspaceData?.patient?.nin || "N/A",
              age: workspaceData?.patient?.age || "N/A",
              gender: workspaceData?.patient?.gender || "N/A",
            }}
            study={{
              studyNumber: `RAD-${activeReportStudy.id.slice(0, 8).toUpperCase()}`,
              studyDate: activeReportStudy.studyDate,
              reportDate: activeReportStudy.createdAt,
              modality: activeReportStudy.modality,
              bodyPart: activeReportStudy.bodyPart,
              clinicalIndication: activeReportStudy.clinicalIndication || "Clinical evaluation",
              findings: activeReportStudy.findings || "No formal findings logged yet.",
              impression: activeReportStudy.impression || "Awaiting radiologist review.",
              radiologistNotes: activeReportStudy.radiologistNotes || undefined,
              isCritical: activeReportStudy.isCritical,
              radiologistName: activeReportStudy.radiologistName || "Radiologist On-Duty",
              radiologistLicense: "MDCN/RAD/99824",
              technicianName: activeReportStudy.technicianName || undefined,
              imageUrl: activeReportStudy.imageUrl || undefined,
            }}
          />
        </PrintableDocumentModal>
      )}

      {/* Add Clinical Note Amendment / Addendum Modal */}
      <Dialog open={isAmendmentModalOpen} onOpenChange={setIsAmendmentModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-foreground font-display">
              <CornerDownRight className="size-5 text-amber-600" />
              Add Official Clinical Addendum
            </DialogTitle>
            <DialogDescription>
              Record an immutable amendment or addendum to this locked clinical encounter. Note cannot be erased or overwritten.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2 text-xs">
            <div className="space-y-1.5">
              <Label className="font-semibold">Amendment Classification</Label>
              <Select
                value={amendmentType}
                onValueChange={(val: any) => setAmendmentType(val)}
              >
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="addendum" className="text-xs">Clinical Addendum (Additional Findings / Follow-up Note)</SelectItem>
                  <SelectItem value="correction" className="text-xs">Clinical Correction (Error Correction with Clinical Reason)</SelectItem>
                  <SelectItem value="late_entry" className="text-xs">Late Entry (Delayed Documentation)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="font-semibold">Clinical Justification / Reason for Amendment</Label>
              <Input
                value={amendmentReason}
                onChange={(e) => setAmendmentReason(e.target.value)}
                placeholder="e.g. Received supplementary lab results; amending antimicrobial regimen"
                className="h-9 text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="font-semibold">Addendum Notes & Clinical Observations</Label>
              <Textarea
                value={amendedNotes}
                onChange={(e) => setAmendedNotes(e.target.value)}
                placeholder="Type the formal addendum content to be appended to the patient's permanent record..."
                rows={4}
                className="text-xs resize-none"
              />
            </div>

            <div className="rounded-lg bg-muted/40 p-2.5 border border-border/80 text-[11px] text-muted-foreground flex items-center gap-2">
              <ShieldCheck className="size-4 text-teal-600 shrink-0" />
              <span>
                This entry will be cryptographically attributed to your MDCN practitioner ID and permanently appended to the encounter audit history.
              </span>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:justify-between">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsAmendmentModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleAddAmendment}
              disabled={isPending || !amendedNotes.trim() || !amendmentReason.trim()}
              className="gap-1.5 bg-amber-600 hover:bg-amber-700 text-white font-bold"
            >
              {isPending ? <Loader2 className="size-4 animate-spin" /> : <CornerDownRight className="size-4" />}
              Append Official Addendum
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Printable Certificate of Medical Fitness */}
      {workspaceData && (
        <PrintableDocumentModal
          open={isPrintFitnessOpen}
          onOpenChange={setIsPrintFitnessOpen}
          title="Certificate of Medical Fitness"
          documentRefCode={`FIT-${workspaceData.encounter.id.slice(0, 8).toUpperCase()}`}
        >
          <MedicalFitnessDocument
            hospital={{
              name: "HospNest Accredited Medical Complex",
              address: "Department of Clinical Health & Occupational Medicine",
              state: "Nigeria",
              contactPhone: "+234 800 000 9999",
              licenseNumber: "FMOH-FIT-0091",
            }}
            patient={{
              fullName: workspaceData.patient.fullName,
              nin: workspaceData.patient.nin,
              age: workspaceData.patient.age,
              gender: workspaceData.patient.gender,
            }}
            fitness={{
              certificateNumber: `FIT-${workspaceData.encounter.id.slice(0, 8).toUpperCase()}`,
              examinationDate: workspaceData.encounter.createdAt,
              purpose: fitnessPurpose,
              heightCm: workspaceData.latestVitals?.heightCm || 174,
              weightKg: workspaceData.latestVitals?.weightKg || 70,
              bloodPressure: workspaceData.latestVitals
                ? `${workspaceData.latestVitals.systolicBp}/${workspaceData.latestVitals.diastolicBp} mmHg`
                : "120/80 mmHg",
              pulseRate: workspaceData.latestVitals?.pulseRate || 72,
              visualAcuity: { rightEye: "6/6", leftEye: "6/6" },
              cardiovascularFindings: examCardio || "Normal heart sounds S1 S2. No murmurs.",
              respiratoryFindings: examResp || "Clear breath sounds bilaterally.",
              abdomenHerniaFindings: examGi || "Soft, non-tender. No organomegaly or hernia.",
              cnsFindings: examCns || "Alert, conscious, full locomotor reflexes.",
              fitnessStatus: fitnessStatus,
              examiningPhysician: workspaceData.encounter.practitionerName
                ? `Dr. ${workspaceData.encounter.practitionerName}`
                : "Dr. Medical Examiner",
              physicianRank: workspaceData.encounter.practitionerRank || "Medical Officer",
              physicianLicenseNumber: workspaceData.encounter.practitionerLicenseNumber || "MDCN/R/99214",
              digitalSignatureHash: workspaceData.encounter.digitalSignatureHash || undefined,
            }}
          />
        </PrintableDocumentModal>
      )}

      {/* Printable Official Medical Referral Letter */}
      {workspaceData && (
        <PrintableDocumentModal
          open={isPrintReferralOpen}
          onOpenChange={setIsPrintReferralOpen}
          title="Clinical Referral & Transfer Letter"
          documentRefCode={`REF-${workspaceData.encounter.id.slice(0, 8).toUpperCase()}`}
        >
          <ReferralLetterDocument
            hospital={{
              name: "HospNest Healthcare Facility",
              address: "Clinical Department & Referral Directorate",
              state: "Nigeria",
              contactPhone: "+234 800 000 9999",
              licenseNumber: "FMOH-REF-0012",
            }}
            patient={{
              fullName: workspaceData.patient.fullName,
              nin: workspaceData.patient.nin,
              age: workspaceData.patient.age,
              gender: workspaceData.patient.gender,
              bloodGroup: workspaceData.patient.bloodGroup,
            }}
            referral={{
              referralNumber: `REF-${workspaceData.encounter.id.slice(0, 8).toUpperCase()}`,
              referralDate: workspaceData.encounter.createdAt,
              referralType: referralType,
              receivingFacility: referralDestination,
              receivingSpecialty: referralSpecialty,
              reasonForReferral: referralReason,
              clinicalSummaryAndHistory: [
                `Chief Complaint: ${presentingComplaint || workspaceData.encounter.chiefComplaint || "Clinical evaluation"}`,
                hpi ? `HPI: ${hpi}` : null,
                pastMedicalHistory ? `Past Medical Hx: ${pastMedicalHistory}` : null,
                drugHistory ? `Current Medications: ${drugHistory}` : null,
                examination ? `Physical Exam: ${examination}` : null,
                `Working Diagnosis: ${customDiagnosis || workspaceData.encounter.diagnosis || "Under evaluation"}`,
              ].filter(Boolean).join("\n\n"),
              vitalSignsSummary: workspaceData.latestVitals ? {
                bp: `${workspaceData.latestVitals.systolicBp}/${workspaceData.latestVitals.diastolicBp}`,
                pulse: workspaceData.latestVitals.pulseRate || undefined,
                temp: workspaceData.latestVitals.bodyTemperature || undefined,
                spo2: workspaceData.latestVitals.spo2 || undefined,
                respiratoryRate: workspaceData.latestVitals.respiratoryRate || undefined,
              } : undefined,
              investigationsSummary: workspaceData.activeLabOrders.length > 0
                ? workspaceData.activeLabOrders.map((l) => `${l.testName} (${l.status})`).join("; ")
                : "Awaiting referral center diagnostic workup.",
              treatmentGivenSoFar: workspaceData.activePrescriptions.length > 0
                ? workspaceData.activePrescriptions.map((p) => `${p.drugName} ${p.dosage} ${p.frequency}`).join("; ")
                : "Initial clinical evaluation completed.",
              referringDoctorName: workspaceData.encounter.practitionerName
                ? `Dr. ${workspaceData.encounter.practitionerName}`
                : "Dr. Referring Physician",
              referringDoctorRank: workspaceData.encounter.practitionerRank || "Medical Officer",
              referringDoctorLicenseNumber: workspaceData.encounter.practitionerLicenseNumber || "MDCN/R/99214",
              digitalSignatureHash: workspaceData.encounter.digitalSignatureHash || undefined,
            }}
          />
        </PrintableDocumentModal>
      )}

      {/* Printable Medical Sick Leave / Excused Duty Note */}
      {workspaceData && (
        <PrintableDocumentModal
          open={isPrintSickLeaveOpen}
          onOpenChange={setIsPrintSickLeaveOpen}
          title="Medical Excused Duty Certificate"
          documentRefCode={`MED-${workspaceData.encounter.id.slice(0, 8).toUpperCase()}`}
        >
          <SickLeaveDocument
            hospital={{
              name: "HospNest Clinical Health Complex",
              address: "Occupational Medicine & Employee Health Services",
              state: "Nigeria",
              contactPhone: "+234 800 000 9999",
              licenseNumber: "FMOH-MED-039",
            }}
            patient={{
              fullName: workspaceData.patient.fullName,
              nin: workspaceData.patient.nin,
              age: workspaceData.patient.age,
              gender: workspaceData.patient.gender,
            }}
            sickLeave={{
              certificateNumber: `MED-${workspaceData.encounter.id.slice(0, 8).toUpperCase()}`,
              issueDate: workspaceData.encounter.createdAt,
              startDate: sickLeaveStartDate,
              endDate: new Date(new Date(sickLeaveStartDate).getTime() + (parseInt(sickLeaveDuration, 10) || 3) * 86400000).toISOString().slice(0, 10),
              durationDays: parseInt(sickLeaveDuration, 10) || 3,
              resumeWorkDate: new Date(new Date(sickLeaveStartDate).getTime() + ((parseInt(sickLeaveDuration, 10) || 3) + 1) * 86400000).toISOString().slice(0, 10),
              diagnosisCategory: customDiagnosis || workspaceData.encounter.diagnosis || "Acute Febrile Illness & Physical Exhaustion",
              clinicalJustificationSummary: presentingComplaint || "Patient requires clinical rest and home recovery.",
              excusedDutyType: sickLeaveType,
              attendingPhysician: workspaceData.encounter.practitionerName
                ? `Dr. ${workspaceData.encounter.practitionerName}`
                : "Dr. Attending Medical Officer",
              physicianRank: workspaceData.encounter.practitionerRank || "Medical Officer",
              physicianLicenseNumber: workspaceData.encounter.practitionerLicenseNumber || "MDCN/R/99214",
              digitalSignatureHash: workspaceData.encounter.digitalSignatureHash || undefined,
            }}
          />
        </PrintableDocumentModal>
      )}
    </div>
  );
}
