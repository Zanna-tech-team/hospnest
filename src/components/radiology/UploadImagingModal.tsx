import React, { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  Activity,
  AlertCircle,
  FileImage,
  ImageIcon,
  Plus,
  Upload,
  UploadCloud,
  X,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
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
import { Checkbox } from "@/components/ui/checkbox";
import { uploadImagingStudy, type ImagingModality } from "@/lib/radiology.functions";

interface UploadImagingModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  patientId: string;
  encounterId?: string;
  hospitalId?: string;
  onSuccess?: () => void;
}

const SAMPLE_XRAY_PRESETS = [
  { name: "Chest PA X-Ray", url: "https://images.unsplash.com/photo-1516549655169-df83a0774514?auto=format&fit=crop&w=1200&q=80", modality: "xray", bodyPart: "Chest (PA View)" },
  { name: "Abdominal Ultrasound", url: "https://images.unsplash.com/photo-1530497610245-94d3c16cda28?auto=format&fit=crop&w=1200&q=80", modality: "ultrasound", bodyPart: "Abdomen / Pelvis" },
  { name: "Cranial CT Scan", url: "https://images.unsplash.com/photo-1576091160550-2173dba999ef?auto=format&fit=crop&w=1200&q=80", modality: "ct", bodyPart: "Head / Brain" },
  { name: "Spine / Lumbar X-Ray", url: "https://images.unsplash.com/photo-1579684385127-1ef15d508118?auto=format&fit=crop&w=1200&q=80", modality: "xray", bodyPart: "Lumbar Spine (AP/Lat)" },
];

export function UploadImagingModal({
  open,
  onOpenChange,
  patientId,
  encounterId,
  hospitalId,
  onSuccess,
}: UploadImagingModalProps) {
  const queryClient = useQueryClient();
  const uploadFn = useServerFn(uploadImagingStudy);

  const [modality, setModality] = useState<ImagingModality>("xray");
  const [bodyPart, setBodyPart] = useState("");
  const [clinicalIndication, setClinicalIndication] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [findings, setFindings] = useState("");
  const [impression, setImpression] = useState("");
  const [isCritical, setIsCritical] = useState(false);

  const uploadMutation = useMutation({
    mutationFn: () =>
      uploadFn({
        data: {
          patientId,
          encounterId,
          hospitalId,
          modality,
          bodyPart,
          clinicalIndication: clinicalIndication || undefined,
          imageUrl,
          findings: findings || undefined,
          impression: impression || undefined,
          isCritical,
        },
      }),
    onSuccess: () => {
      toast.success("Radiology study uploaded successfully");
      queryClient.invalidateQueries({ queryKey: ["patient-imaging-studies"] });
      onOpenChange(false);
      onSuccess?.();
      // Reset
      setBodyPart("");
      setClinicalIndication("");
      setImageUrl("");
      setFindings("");
      setImpression("");
      setIsCritical(false);
    },
    onError: (err: Error) => {
      toast.error(err.message || "Failed to upload imaging study");
    },
  });

  const handleApplyPreset = (preset: typeof SAMPLE_XRAY_PRESETS[0]) => {
    setModality(preset.modality as ImagingModality);
    setBodyPart(preset.bodyPart);
    setImageUrl(preset.url);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <span className="flex size-9 items-center justify-center rounded-xl bg-teal-600/10 text-teal-600">
              <UploadCloud className="size-4" />
            </span>
            <div>
              <DialogTitle className="text-base font-bold">Attach Medical Imaging & Radiology Scan</DialogTitle>
              <DialogDescription className="text-xs">
                Upload X-ray, CT scan, MRI, or Ultrasound image attachments to patient record.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!bodyPart || !imageUrl) {
              toast.error("Please provide body part and image URL/file");
              return;
            }
            uploadMutation.mutate();
          }}
          className="space-y-4 text-xs pt-2"
        >
          {/* Quick presets */}
          <div className="rounded-xl bg-muted/50 p-3 space-y-2 border border-border">
            <span className="font-semibold text-muted-foreground block text-[11px]">
              Quick Demo Presets:
            </span>
            <div className="flex flex-wrap gap-1.5">
              {SAMPLE_XRAY_PRESETS.map((p) => (
                <Button
                  key={p.name}
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleApplyPreset(p)}
                  className="h-7 text-[11px] bg-background hover:bg-teal-500/10 hover:border-teal-500/50"
                >
                  <FileImage className="mr-1 size-3 text-teal-600" /> {p.name}
                </Button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Modality</Label>
              <Select value={modality} onValueChange={(v) => setModality(v as ImagingModality)}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder="Select modality" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="xray">X-Ray (Radiography)</SelectItem>
                  <SelectItem value="ct">CT Scan (Computed Tomography)</SelectItem>
                  <SelectItem value="mri">MRI (Magnetic Resonance)</SelectItem>
                  <SelectItem value="ultrasound">Ultrasound (Sonography)</SelectItem>
                  <SelectItem value="mammography">Mammography</SelectItem>
                  <SelectItem value="other">Other Imaging</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Anatomical Body Part *</Label>
              <Input
                value={bodyPart}
                onChange={(e) => setBodyPart(e.target.value)}
                placeholder="e.g. Chest (PA), Lumbar Spine"
                className="h-9 text-xs"
                required
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Scan Image URL / Storage Path *</Label>
            <Input
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              placeholder="https://... or DICOM/JPEG scan URI"
              className="h-9 text-xs font-mono"
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Clinical Indication / Reason for Exam</Label>
            <Input
              value={clinicalIndication}
              onChange={(e) => setClinicalIndication(e.target.value)}
              placeholder="e.g. Chronic cough, rule out rib fracture or consolidation"
              className="h-9 text-xs"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Radiological Findings (Optional)</Label>
            <Textarea
              value={findings}
              onChange={(e) => setFindings(e.target.value)}
              placeholder="Describe radiological findings observed on the scan..."
              className="text-xs min-h-[60px]"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Diagnostic Impression (Optional)</Label>
            <Input
              value={impression}
              onChange={(e) => setImpression(e.target.value)}
              placeholder="e.g. Clear lung fields, no acute cardiopulmonary pathology"
              className="h-9 text-xs"
            />
          </div>

          <div className="flex items-center space-x-2 pt-1">
            <Checkbox
              id="criticalFlag"
              checked={isCritical}
              onCheckedChange={(c) => setIsCritical(Boolean(c))}
            />
            <Label htmlFor="criticalFlag" className="text-xs font-semibold text-rose-600 cursor-pointer">
              Mark as Critical / Red-Flag Urgent Finding
            </Label>
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="text-xs"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={uploadMutation.isPending}
              className="bg-teal-600 hover:bg-teal-700 text-white font-semibold text-xs gap-1"
            >
              {uploadMutation.isPending ? "Uploading..." : "Save Imaging Study"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
