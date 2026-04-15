import React, { useState } from "react";
import { CloudUpload, CheckCircle2, Circle } from "lucide-react";
import { Layout } from "@/components/Layout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export function Upload() {
  const [isDragging, setIsDragging] = useState(false);
  const [filesDetected, setFilesDetected] = useState(false);

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
    // Simulate detecting files
    setFilesDetected(true);
  };

  const handleUploadClick = () => {
    // Simulate detecting files on click
    setFilesDetected(true);
  };

  return (
    <Layout>
      <div className="flex-1 flex flex-col py-12 px-6" data-testid="page-upload">
        <div className="max-w-[640px] w-full mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white" data-testid="page-heading">Build a Core Sheet</h1>
            <p className="text-slate-500 dark:text-slate-400 mt-2" data-testid="page-subheading">Upload the 5 source files from fiscal.ai for any ticker</p>
          </div>

          <div 
            className={`w-full rounded-xl border-2 border-dashed p-12 flex flex-col items-center justify-center transition-all duration-150 cursor-pointer ${
              isDragging || filesDetected
                ? "border-[#0D9488] bg-teal-50/50 dark:bg-teal-900/10" 
                : "border-slate-300 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/20 hover:border-[#0D9488] hover:bg-teal-50/30 dark:hover:border-teal-700"
            }`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={handleUploadClick}
            data-testid="drop-zone"
          >
            <div className={`p-4 rounded-full mb-4 ${isDragging || filesDetected ? "bg-teal-100 dark:bg-teal-900/50 text-[#0D9488]" : "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400"}`}>
              <CloudUpload className="h-8 w-8" />
            </div>
            <p className="text-lg font-medium text-slate-900 dark:text-slate-200">Drop your fiscal.ai files here</p>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">or click to browse</p>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-6 font-medium">.xlsx files only</p>
          </div>

          {filesDetected && (
            <div className="mt-8 animate-in fade-in slide-in-from-bottom-4 duration-300">
              <Card className="rounded-xl shadow-sm border-slate-200 dark:border-slate-800">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-medium text-slate-500 dark:text-slate-400">Detected Ticker:</span>
                      <Badge className="bg-[#0D9488] hover:bg-teal-700 rounded-full px-3 py-1 font-semibold" data-testid="detected-ticker">ADBE</Badge>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-medium text-slate-500 dark:text-slate-400">Company Type:</span>
                      <Badge variant="outline" className="rounded-full px-3 py-1 font-medium border-slate-200 dark:border-slate-700" data-testid="detected-type">Software</Badge>
                    </div>
                  </div>

                  <div className="space-y-4 mb-8">
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-3">
                        <CheckCircle2 className="h-5 w-5 text-green-500" />
                        <span className="font-medium text-slate-900 dark:text-slate-200">Income Statement</span>
                      </div>
                      <span className="text-xs text-slate-500 dark:text-slate-400 ml-8">ADBE_Income_Statement_FY24.xlsx</span>
                    </div>
                    
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-3">
                        <CheckCircle2 className="h-5 w-5 text-green-500" />
                        <span className="font-medium text-slate-900 dark:text-slate-200">Cash Flow Statement</span>
                      </div>
                      <span className="text-xs text-slate-500 dark:text-slate-400 ml-8">ADBE_Cash_Flow_FY24.xlsx</span>
                    </div>
                    
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-3">
                        <CheckCircle2 className="h-5 w-5 text-green-500" />
                        <span className="font-medium text-slate-900 dark:text-slate-200">Balance Sheet</span>
                      </div>
                      <span className="text-xs text-slate-500 dark:text-slate-400 ml-8">ADBE_Balance_Sheet_FY24.xlsx</span>
                    </div>
                    
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-3">
                        <CheckCircle2 className="h-5 w-5 text-green-500" />
                        <span className="font-medium text-slate-900 dark:text-slate-200">Ratios</span>
                      </div>
                      <span className="text-xs text-slate-500 dark:text-slate-400 ml-8">ADBE_Ratios_FY24.xlsx</span>
                    </div>
                    
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-3">
                        <Circle className="h-5 w-5 text-slate-300 dark:text-slate-600" />
                        <span className="font-medium text-slate-500 dark:text-slate-400">Segments & KPIs</span>
                      </div>
                      <span className="text-xs text-slate-400 dark:text-slate-500 ml-8 italic">Missing file</span>
                    </div>
                  </div>

                  <Button 
                    className="w-full rounded-xl h-12 text-base font-medium bg-[#0D9488] hover:bg-teal-700 text-white disabled:bg-slate-100 disabled:text-slate-400 dark:disabled:bg-slate-800 dark:disabled:text-slate-500 transition-all duration-150" 
                    disabled={true} // 4 out of 5 detected for demo
                    data-testid="btn-build-core-sheet"
                  >
                    Build Core Sheet
                  </Button>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
