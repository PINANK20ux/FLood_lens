import React, { useState } from "react";
import { X, Upload, CheckCircle2, AlertTriangle, Droplets, Camera, ShieldCheck, MapPin } from "lucide-react";
import { useFloodLens } from "../context/FloodLensContext";

export default function ReportModal() {
  const {
    reportModalOpen,
    setReportModalOpen,
    activePinCoords,
    setActivePinCoords,
    submitCitizenReport,
    reportSubmitting,
    reportFeedback,
    setReportFeedback,
    userLocation,
    mapCenter,
  } = useFloodLens();

  const [waterLevel, setWaterLevel] = useState("moderate");
  const [imageBase64, setImageBase64] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [customLat, setCustomLat] = useState("");
  const [customLng, setCustomLng] = useState("");

  if (!reportModalOpen) return null;

  const defaultCoords = userLocation || mapCenter || [20.5937, 78.9629];
  const lat = activePinCoords ? activePinCoords[0] : customLat ? parseFloat(customLat) : defaultCoords[0];
  const lng = activePinCoords ? activePinCoords[1] : customLng ? parseFloat(customLng) : defaultCoords[1];

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      setImagePreview(reader.result);
      setImageBase64(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await submitCitizenReport({
        lat,
        lng,
        water_level: waterLevel,
        image_base64: imageBase64,
      });
    } catch (err) {
      // Feedback is populated in context
    }
  };

  const handleClose = () => {
    setReportModalOpen(false);
    setImagePreview(null);
    setImageBase64(null);
    setReportFeedback(null);
    setActivePinCoords(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink-950/75 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-panel border border-ink-800/10 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 bg-ink-950 text-paper-50 flex items-center justify-between border-b border-ink-800/60">
          <div className="flex items-center gap-2.5">
            <span className="grid place-items-center w-7 h-7 rounded-lg bg-channel-600 text-paper-50">
              <Droplets size={15} strokeWidth={2.2} />
            </span>
            <div>
              <h3 className="font-display text-base text-paper-50 tracking-tight">Report Flood Hazard</h3>
              <p className="text-[11px] font-mono text-ink-300">AI-Verified Citizen Defense</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="w-8 h-8 rounded-full grid place-items-center text-ink-400 hover:text-paper-50 hover:bg-ink-800/60 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form Body */}
        <div className="p-6 overflow-y-auto space-y-5">
          {reportFeedback ? (
            <div className="space-y-4 text-center py-4 animate-fade-in">
              {reportFeedback.status === "verified" ? (
                <div className="space-y-2">
                  <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 grid place-items-center mx-auto">
                    <CheckCircle2 size={28} />
                  </div>
                  <h4 className="font-display text-lg text-ink-950">Hazard Report Verified!</h4>
                  <p className="text-xs text-ink-600 max-w-sm mx-auto leading-relaxed">
                    {reportFeedback.reason || "AI verified flood conditions and flagged nearest road segment."}
                  </p>
                  {reportFeedback.flagged_road_name && (
                    <div className="inline-block bg-paper-100 border border-ink-800/10 rounded-xl px-4 py-2 text-xs text-ink-800">
                      Assigned Road: <strong>{reportFeedback.flagged_road_name}</strong> ·{" "}
                      <span className="text-red-600 font-bold uppercase">{reportFeedback.road_status}</span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="w-12 h-12 rounded-full bg-amber-100 text-amber-600 grid place-items-center mx-auto">
                    <AlertTriangle size={28} />
                  </div>
                  <h4 className="font-display text-lg text-ink-950">Report Logged for Review</h4>
                  <p className="text-xs text-ink-600 max-w-sm mx-auto leading-relaxed">
                    {reportFeedback.reason || "Report saved. AI could not verify visible floodwater."}
                  </p>
                </div>
              )}

              <button
                onClick={handleClose}
                className="rounded-full bg-channel-500 hover:bg-channel-400 text-ink-950 text-xs font-semibold px-6 py-2.5 transition-colors mt-2"
              >
                Close &amp; View on Map
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Location display / pin */}
              <div>
                <label className="block text-xs font-medium text-ink-700 mb-1.5 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <MapPin size={13} className="text-channel-600" /> Geographic Coordinates
                  </span>
                  <span className="text-[10px] text-ink-400 font-mono">
                    [{lat.toFixed(4)}, {lng.toFixed(4)}]
                  </span>
                </label>
                <div className="bg-paper-100 border border-ink-800/10 rounded-xl p-3 text-xs text-ink-600 flex items-center justify-between">
                  <span>Selected Map Pin</span>
                  <span className="font-mono font-semibold text-ink-900">
                    {lat.toFixed(4)} N, {lng.toFixed(4)} E
                  </span>
                </div>
              </div>

              {/* Water Severity */}
              <div>
                <label className="block text-xs font-medium text-ink-700 mb-1.5">
                  Observed Water Severity
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: "low", label: "Low", desc: "Ankle / < 15cm" },
                    { id: "moderate", label: "Moderate", desc: "Knee / Stalling" },
                    { id: "high", label: "Severe", desc: "Waist / Impassable" },
                  ].map((level) => (
                    <button
                      key={level.id}
                      type="button"
                      onClick={() => setWaterLevel(level.id)}
                      className={`p-2.5 rounded-xl border text-left transition-all ${
                        waterLevel === level.id
                          ? "border-channel-500 bg-channel-50/50 shadow-sm"
                          : "border-ink-800/10 bg-white hover:bg-paper-50 text-ink-600"
                      }`}
                    >
                      <div className="text-xs font-semibold text-ink-950">{level.label}</div>
                      <div className="text-[10px] text-ink-400 mt-0.5">{level.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Photo Evidence & YOLO Segmentation */}
              <div>
                <label className="block text-xs font-medium text-ink-700 mb-1.5 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Camera size={13} className="text-channel-600" /> On-Scene Photo (AI Verified)
                  </span>
                  <span className="text-[10px] text-channel-600 font-semibold">YOLOv8 Segmentation</span>
                </label>

                {imagePreview ? (
                  <div className="relative rounded-2xl overflow-hidden border border-ink-800/15 h-44 bg-ink-950">
                    <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => {
                        setImagePreview(null);
                        setImageBase64(null);
                      }}
                      className="absolute top-2 right-2 w-7 h-7 rounded-full bg-ink-950/80 text-white grid place-items-center hover:bg-red-600 transition-colors"
                    >
                      <X size={14} />
                    </button>
                    <div className="absolute bottom-2 left-2 bg-ink-950/80 backdrop-blur-sm text-paper-50 px-2.5 py-1 rounded-md text-[10px] font-mono">
                      Photo ready for neural inspection
                    </div>
                  </div>
                ) : (
                  <label className="flex flex-col items-center justify-center h-32 rounded-2xl border-2 border-dashed border-ink-800/20 bg-paper-50 hover:bg-paper-100 hover:border-channel-400 transition-colors cursor-pointer p-4 text-center">
                    <Upload size={22} className="text-channel-600 mb-1.5" />
                    <span className="text-xs font-semibold text-ink-900">Upload flood photo for verification</span>
                    <span className="text-[11px] text-ink-400 mt-0.5">JPEG, PNG or WebP</span>
                    <input type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
                  </label>
                )}

                <div className="mt-2 text-[10px] font-mono text-ink-500 bg-paper-100 p-2 rounded-xl border border-ink-800/5 flex items-center gap-1.5">
                  <ShieldCheck size={13} className="text-channel-600 shrink-0" />
                  <span><strong>Privacy Guarantee:</strong> Faces and license plates are blurred by AI before any public release.</span>
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={reportSubmitting}
                className="w-full rounded-full bg-channel-500 hover:bg-channel-400 disabled:opacity-50 text-ink-950 text-xs font-semibold py-3 transition-colors shadow-sm mt-2 flex items-center justify-center gap-2"
              >
                {reportSubmitting ? (
                  <span>Analyzing with YOLOv8 Neural Model...</span>
                ) : (
                  <>
                    <ShieldCheck size={16} />
                    <span>Submit Verified Hazard Report</span>
                  </>
                )}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
