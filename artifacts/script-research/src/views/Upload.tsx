"use client";

import React, { useRef, useState } from "react";
import {
  CloudUpload,
  CheckCircle2,
  Circle,
  AlertCircle,
  Loader2,
  Download,
} from "lucide-react";
import { Layout } from "@/components/Layout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface FilesDetected {
  income_statement: boolean;
  cash_flow: boolean;
  balance_sheet: boolean;
  ratios: boolean;
  segments_kpis: boolean;
}

interface UploadResult {
  jobId: number;
  ticker: string;
  exchange: string | null;
  filesDetected: FilesDetected;
}

const FILE_LABELS: { key: keyof FilesDetected; label: string }[] = [
  { key: "income_statement", label: "Income Statement" },
  { key: "cash_flow", label: "Cash Flow Statement" },
  { key: "balance_sheet", label: "Balance Sheet" },
  { key: "ratios", label: "Ratios" },
  { key: "segments_kpis", label: "Segments & KPIs" },
];

const BUILD_STEPS = [
  "Reading uploaded files…",
  "Detecting company type…",
  "Mapping quarterly columns…",
  "Building Core Sheet…",
  "Finalizing Excel file…",
];

export function Upload() {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [result, setResult] = useState<UploadResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fileNames, setFileNames] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Build state
  const [isBuilding, setIsBuilding] = useState(false);
  const [buildStep, setBuildStep] = useState(BUILD_STEPS[0]);
  const [excelBlob, setExcelBlob] = useState<Blob | null>(null);
  const [buildError, setBuildError] = useState<string | null>(null);

  async function uploadFiles(files: File[]) {
    if (files.length === 0) return;
    setIsUploading(true);
    setError(null);
    setResult(null);
    setFileNames(files.map((f) => f.name));

    const formData = new FormData();
    for (const file of files) {
      formData.append("files", file);
    }

    try {
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? `Upload failed (${res.status})`);
      } else {
        setResult(data as UploadResult);
      }
    } catch (e) {
      setError("Network error — could not reach the upload API.");
    } finally {
      setIsUploading(false);
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = Array.from(e.dataTransfer.files).filter((f) =>
      f.name.endsWith(".xlsx"),
    );
    uploadFiles(files);
  };

  const handleClick = () => fileInputRef.current?.click();

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    uploadFiles(files);
    // reset so the same files can be re-selected
    e.target.value = "";
  };

  async function buildCoreSheet() {
    if (!result?.jobId) return;
    setIsBuilding(true);
    setBuildError(null);
    setExcelBlob(null);

    let stepIdx = 0;
    setBuildStep(BUILD_STEPS[0]);
    const interval = setInterval(() => {
      stepIdx = Math.min(stepIdx + 1, BUILD_STEPS.length - 1);
      setBuildStep(BUILD_STEPS[stepIdx]);
    }, 1800);

    try {
      const res = await fetch(`/api/jobs/${result.jobId}/build`, {
        method: "POST",
      });
      clearInterval(interval);
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setBuildError(
          (data as { error?: string }).error ??
            `Build failed (${res.status})`,
        );
        return;
      }
      const blob = await res.blob();
      setExcelBlob(blob);
    } catch {
      clearInterval(interval);
      setBuildError("Network error — could not reach the build API.");
    } finally {
      clearInterval(interval);
      setIsBuilding(false);
    }
  }

  function downloadExcel() {
    if (!excelBlob || !result) return;
    const url = URL.createObjectURL(excelBlob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${result.ticker}_CoreSheet.xlsx`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  const allDetected =
    result !== null && Object.values(result.filesDetected).every(Boolean);

  const hasFiles = result !== null || isUploading;

  return (
    <Layout>
      <div className="flex-1 flex flex-col py-12 px-6" data-testid="page-upload">
        <div className="max-w-[640px] w-full mx-auto">
          <div className="text-center mb-8">
            <h1
              className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white"
              data-testid="page-heading"
            >
              Build a Core Sheet
            </h1>
            <p
              className="text-slate-500 dark:text-slate-400 mt-2"
              data-testid="page-subheading"
            >
              Upload the 5 source files from fiscal.ai for any ticker
            </p>
          </div>

          {/* Drop zone */}
          <div
            className={`w-full rounded-xl border-2 border-dashed p-12 flex flex-col items-center justify-center transition-all duration-150 cursor-pointer ${
              isDragging || hasFiles
                ? "border-[#0D9488] bg-teal-50/50 dark:bg-teal-900/10"
                : "border-slate-300 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/20 hover:border-[#0D9488] hover:bg-teal-50/30 dark:hover:border-teal-700"
            }`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={handleClick}
            data-testid="drop-zone"
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx"
              multiple
              className="hidden"
              onChange={handleFileInput}
            />
            <div
              className={`p-4 rounded-full mb-4 ${
                isDragging || hasFiles
                  ? "bg-teal-100 dark:bg-teal-900/50 text-[#0D9488]"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400"
              }`}
            >
              <CloudUpload className="h-8 w-8" />
            </div>
            {isUploading ? (
              <p className="text-lg font-medium text-slate-900 dark:text-slate-200">
                Uploading…
              </p>
            ) : (
              <>
                <p className="text-lg font-medium text-slate-900 dark:text-slate-200">
                  Drop your fiscal.ai files here
                </p>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                  or click to browse
                </p>
              </>
            )}
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-6 font-medium">
              .xlsx files only · up to 5 files
            </p>
          </div>

          {/* Error */}
          {error && (
            <div className="mt-6 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 dark:bg-red-900/20 p-4 text-sm text-red-700 dark:text-red-400">
              <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Results card */}
          {result && (
            <div className="mt-8 animate-in fade-in slide-in-from-bottom-4 duration-300">
              <Card className="rounded-xl shadow-sm border-slate-200 dark:border-slate-800">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-medium text-slate-500 dark:text-slate-400">
                        Detected Ticker:
                      </span>
                      <Badge
                        className="bg-[#0D9488] hover:bg-teal-700 rounded-full px-3 py-1 font-semibold"
                        data-testid="detected-ticker"
                      >
                        {result.ticker}
                      </Badge>
                    </div>
                    {result.exchange && (
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-medium text-slate-500 dark:text-slate-400">
                          Exchange:
                        </span>
                        <Badge
                          variant="outline"
                          className="rounded-full px-3 py-1 font-medium border-slate-200 dark:border-slate-700"
                          data-testid="detected-exchange"
                        >
                          {result.exchange}
                        </Badge>
                      </div>
                    )}
                  </div>

                  <div className="space-y-4 mb-8">
                    {FILE_LABELS.map(({ key, label }) => {
                      const detected = result.filesDetected[key];
                      const matchedFile = fileNames.find((n) =>
                        n.toLowerCase().includes(label.split(" ")[0].toLowerCase()),
                      );
                      return (
                        <div key={key} className="flex flex-col gap-1">
                          <div className="flex items-center gap-3">
                            {detected ? (
                              <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0" />
                            ) : (
                              <Circle className="h-5 w-5 text-slate-300 dark:text-slate-600 shrink-0" />
                            )}
                            <span
                              className={`font-medium ${
                                detected
                                  ? "text-slate-900 dark:text-slate-200"
                                  : "text-slate-500 dark:text-slate-400"
                              }`}
                            >
                              {label}
                            </span>
                          </div>
                          <span className="text-xs text-slate-400 dark:text-slate-500 ml-8 italic">
                            {detected && matchedFile ? matchedFile : detected ? "Detected" : "Missing file"}
                          </span>
                        </div>
                      );
                    })}
                  </div>

                  {buildError && (
                    <div className="mb-4 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 dark:bg-red-900/20 p-4 text-sm text-red-700 dark:text-red-400">
                      <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
                      <span>{buildError}</span>
                    </div>
                  )}

                  {excelBlob ? (
                    <Button
                      onClick={downloadExcel}
                      className="w-full rounded-xl h-12 text-base font-medium bg-emerald-600 hover:bg-emerald-700 text-white transition-all duration-150"
                      data-testid="btn-download-excel"
                    >
                      <Download className="h-5 w-5 mr-2" />
                      Download Core Sheet (.xlsx)
                    </Button>
                  ) : (
                    <Button
                      onClick={buildCoreSheet}
                      className="w-full rounded-xl h-12 text-base font-medium bg-[#0D9488] hover:bg-teal-700 text-white disabled:bg-slate-100 disabled:text-slate-400 dark:disabled:bg-slate-800 dark:disabled:text-slate-500 transition-all duration-150"
                      disabled={!allDetected || isBuilding}
                      data-testid="btn-build-core-sheet"
                    >
                      {isBuilding ? (
                        <>
                          <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                          {buildStep}
                        </>
                      ) : (
                        "Build Core Sheet"
                      )}
                    </Button>
                  )}

                  {!allDetected && !excelBlob && (
                    <p className="text-xs text-center text-slate-400 mt-3">
                      Upload all 5 files to enable building
                    </p>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
