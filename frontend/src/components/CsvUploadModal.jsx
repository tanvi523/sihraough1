import React, { useState, useRef } from 'react';
import { useApp } from '../context/AppContext';
import {
  UploadCloud,
  X,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  Loader2,
  FileText,
  HelpCircle,
  ChevronDown,
  Info,
  Layers,
  ArrowRight,
  Download,
  Calculator,
  ShieldAlert,
  Clock,
  Sparkles
} from 'lucide-react';
import {
  uploadTmsCsv,
  uploadSmmsCsv,
  uploadTdmsCsv,
  uploadMergedCsv,
  uploadBatchCsv,
  getTemplateDownloadUrl
} from '../services/api';

export const CsvUploadModal = () => {
  const { uploadModal, closeUploadModal, refreshStatus, showToast, setActiveTab } = useApp();
  
  // Tabs: 'BATCH' (3-in-1 multi-file) vs 'SINGLE'
  const [uploadMode, setUploadMode] = useState('BATCH');
  
  // Single mode state
  const [selectedFile, setSelectedFile] = useState(null);
  const [targetSystem, setTargetSystem] = useState(uploadModal.targetSystem || 'AUTO');
  
  // Batch 3-in-1 mode states
  const [tmsBatchFile, setTmsBatchFile] = useState(null);
  const [smmsBatchFile, setSmmsBatchFile] = useState(null);
  const [tdmsBatchFile, setTdmsBatchFile] = useState(null);

  const [isUploading, setIsUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState(null);
  const [error, setError] = useState(null);
  const [showReqCols, setShowReqCols] = useState(false);

  const fileInputRef = useRef(null);
  const tmsInputRef = useRef(null);
  const smmsInputRef = useRef(null);
  const tdmsInputRef = useRef(null);

  if (!uploadModal.isOpen) return null;

  const datasetDefinitions = {
    TMS: {
      title: 'TMS Train Schedules',
      desc: 'Train timetables, train numbers & route section corridors',
      filename: 'tms_dataset.csv',
      required: ['Train_ID', 'Train_Name', 'Track_Section', 'Train_Start_Time', 'Train_End_Time', 'Train_Priority']
    },
    SMMS: {
      title: 'SMMS Signal Assets',
      desc: 'Interlocking, axle counters, track circuits & signal health',
      filename: 'smms_dataset.csv',
      required: ['Task_ID', 'Asset_ID', 'Track_Section', 'Asset_Type', 'Health_Score', 'Issue_Type', 'Severity']
    },
    TDMS: {
      title: 'TDMS Traction Assets',
      desc: '25kV OHE, neutral sections, insulators & power shutdown flags',
      filename: 'tdms_dataset.csv',
      required: ['Task_ID', 'Asset_ID', 'Track_Section', 'Asset_Type', 'Health_Score', 'Issue_Type', 'Severity', 'Power_Shutdown_Required']
    },
    NORMALIZED: {
      title: 'Normalized Dataset',
      desc: 'Multi-subsystem combined dataset',
      filename: 'normalized_maintenance_dataset.csv',
      required: ['Track_Section', 'Health_Score', 'Asset_ID / Train_ID', 'Issue_Type / Train_Name']
    },
    AUTO: {
      title: 'Auto-Detect Dataset',
      desc: 'Auto-detects from filename or headers',
      filename: 'Any .csv dataset file',
      required: ['Standard columns matching TMS, SMMS, TDMS, or Normalized format']
    }
  };

  const handleSingleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (!file.name.endsWith('.csv')) {
        setError('Please select a valid .csv dataset file.');
        return;
      }
      setSelectedFile(file);
      setError(null);
      setUploadResult(null);

      const fn = file.name.toLowerCase();
      if (fn.includes('tms')) setTargetSystem('TMS');
      else if (fn.includes('smms') || (fn.includes('signal') && !fn.includes('merged'))) setTargetSystem('SMMS');
      else if (fn.includes('tdms') || (fn.includes('traction') && !fn.includes('merged'))) setTargetSystem('TDMS');
      else if (fn.includes('normalized') || fn.includes('merged')) setTargetSystem('NORMALIZED');
    }
  };

  const handleBatchSubmit = async () => {
    if (!tmsBatchFile && !smmsBatchFile && !tdmsBatchFile) {
      setError('Please select at least one CSV file (TMS, SMMS, or TDMS) to upload.');
      return;
    }

    setIsUploading(true);
    setError(null);
    setUploadResult(null);

    const formData = new FormData();
    if (tmsBatchFile) formData.append('tms_file', tmsBatchFile);
    if (smmsBatchFile) formData.append('smms_file', smmsBatchFile);
    if (tdmsBatchFile) formData.append('tdms_file', tdmsBatchFile);

    try {
      const res = await uploadBatchCsv(formData);
      setUploadResult(res.data);
      await refreshStatus();
      showToast(res.data.message || 'CSVs ingested & Priority Scores calculated successfully!', 'success');
    } catch (err) {
      const detail = err.response?.data?.detail || err.message || 'Failed to process CSV files.';
      setError(detail);
    } finally {
      setIsUploading(false);
    }
  };

  const handleSingleSubmit = async () => {
    if (!selectedFile) {
      setError('Please select a CSV file first.');
      return;
    }

    setIsUploading(true);
    setError(null);
    setUploadResult(null);

    const formData = new FormData();
    formData.append('file', selectedFile);

    try {
      let res;
      if (targetSystem === 'TMS') {
        res = await uploadTmsCsv(formData);
      } else if (targetSystem === 'SMMS') {
        res = await uploadSmmsCsv(formData);
      } else if (targetSystem === 'TDMS') {
        res = await uploadTdmsCsv(formData);
      } else {
        res = await uploadMergedCsv(formData);
      }

      setUploadResult(res.data);
      await refreshStatus();
      showToast(res.data.message || 'Dataset processed & scores calculated!', 'success');
    } catch (err) {
      const detail = err.response?.data?.detail || err.message || 'Failed to upload CSV file.';
      setError(detail);
    } finally {
      setIsUploading(false);
    }
  };

  const handleNavigateToPrioritizer = () => {
    closeUploadModal();
    if (setActiveTab) setActiveTab('prioritizer');
  };

  const currentDef = datasetDefinitions[targetSystem] || datasetDefinitions.AUTO;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="bg-[#0E172A] border border-[#1F2E4D] rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#1F2E4D] flex items-center justify-between bg-gradient-to-r from-[#131D33] to-[#0E172A]">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-sky-500/20 to-indigo-500/20 border border-sky-500/30 text-sky-400">
              <UploadCloud className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                Upload your CSV files
              </h3>
              <p className="text-xs text-slate-400">Upload maintenance & operational CSVs to calculate AI Risk, Deadline & Criticality scores</p>
            </div>
          </div>
          <button
            onClick={closeUploadModal}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-[#1F2E4D] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Mode Selector */}
        <div className="px-6 pt-4 pb-2 border-b border-[#1F2E4D]/60 bg-[#0B1121]/50 flex gap-2">
          <button
            onClick={() => { setUploadMode('BATCH'); setUploadResult(null); setError(null); }}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-all ${
              uploadMode === 'BATCH'
                ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40 shadow-sm'
                : 'text-slate-400 hover:text-white bg-[#0E172A] border border-[#1F2E4D]'
            }`}
          >
            
            <span>CSV Upload (TMS + SMMS + TDMS)</span>
          </button>
          
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-6 space-y-5 overflow-y-auto flex-1">
          {/* ======================================================== */}
          {/* BATCH 3-IN-1 MODE */}
          {/* ======================================================== */}
          {uploadMode === 'BATCH' && (
            <div className="space-y-4">
             

              {/* 3 Upload Slots */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {/* 1. TMS Slot */}
                <div className="p-3.5 rounded-xl bg-[#0B1121] border border-sky-500/20 flex flex-col justify-between space-y-2.5 hover:border-sky-500/40 transition-all">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-bold text-sky-400 flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-sky-400"></span>
                        1. TMS Schedules
                      </span>
                     
                    </div>
                    <p className="text-[10px] text-slate-400 leading-tight">Train timetables & route headways</p>
                  </div>

                  <input
                    type="file"
                    ref={tmsInputRef}
                    accept=".csv"
                    onChange={(e) => setTmsBatchFile(e.target.files?.[0] || null)}
                    className="hidden"
                  />

                  {tmsBatchFile ? (
                    <div className="p-2 rounded-lg bg-sky-500/10 border border-sky-500/30 flex items-center justify-between">
                      <div className="truncate text-xs font-mono text-sky-300 max-w-[130px]" title={tmsBatchFile.name}>
                        {tmsBatchFile.name}
                      </div>
                      <button
                        onClick={() => setTmsBatchFile(null)}
                        className="text-slate-400 hover:text-rose-400 p-0.5"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => tmsInputRef.current?.click()}
                      className="w-full py-2 px-2.5 rounded-lg border border-dashed border-sky-500/30 bg-sky-500/5 hover:bg-sky-500/10 text-sky-300 text-[11px] font-medium flex items-center justify-center gap-1.5 transition-all"
                    >
                      <UploadCloud className="w-3.5 h-3.5" /> Select TMS CSV
                    </button>
                  )}
                </div>

                {/* 2. SMMS Slot */}
                <div className="p-3.5 rounded-xl bg-[#0B1121] border border-amber-500/20 flex flex-col justify-between space-y-2.5 hover:border-amber-500/40 transition-all">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-amber-400"></span>
                        2. SMMS Signals
                      </span>
                    
                    </div>
                    <p className="text-[10px] text-slate-400 leading-tight">Interlocking, track circuits & diagnostics</p>
                  </div>

                  <input
                    type="file"
                    ref={smmsInputRef}
                    accept=".csv"
                    onChange={(e) => setSmmsBatchFile(e.target.files?.[0] || null)}
                    className="hidden"
                  />

                  {smmsBatchFile ? (
                    <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-between">
                      <div className="truncate text-xs font-mono text-amber-300 max-w-[130px]" title={smmsBatchFile.name}>
                        {smmsBatchFile.name}
                      </div>
                      <button
                        onClick={() => setSmmsBatchFile(null)}
                        className="text-slate-400 hover:text-rose-400 p-0.5"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => smmsInputRef.current?.click()}
                      className="w-full py-2 px-2.5 rounded-lg border border-dashed border-amber-500/30 bg-amber-500/5 hover:bg-amber-500/10 text-amber-300 text-[11px] font-medium flex items-center justify-center gap-1.5 transition-all"
                    >
                      <UploadCloud className="w-3.5 h-3.5" /> Select SMMS CSV
                    </button>
                  )}
                </div>

                {/* 3. TDMS Slot */}
                <div className="p-3.5 rounded-xl bg-[#0B1121] border border-rose-500/20 flex flex-col justify-between space-y-2.5 hover:border-rose-500/40 transition-all">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-bold text-rose-400 flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-rose-400"></span>
                        3. TDMS Traction
                      </span>
                    
                    </div>
                    <p className="text-[10px] text-slate-400 leading-tight">25kV OHE, neutral & power isolations</p>
                  </div>

                  <input
                    type="file"
                    ref={tdmsInputRef}
                    accept=".csv"
                    onChange={(e) => setTdmsBatchFile(e.target.files?.[0] || null)}
                    className="hidden"
                  />

                  {tdmsBatchFile ? (
                    <div className="p-2 rounded-lg bg-rose-500/10 border border-rose-500/30 flex items-center justify-between">
                      <div className="truncate text-xs font-mono text-rose-300 max-w-[130px]" title={tdmsBatchFile.name}>
                        {tdmsBatchFile.name}
                      </div>
                      <button
                        onClick={() => setTdmsBatchFile(null)}
                        className="text-slate-400 hover:text-rose-400 p-0.5"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => tdmsInputRef.current?.click()}
                      className="w-full py-2 px-2.5 rounded-lg border border-dashed border-rose-500/30 bg-rose-500/5 hover:bg-rose-500/10 text-rose-300 text-[11px] font-medium flex items-center justify-center gap-1.5 transition-all"
                    >
                      <UploadCloud className="w-3.5 h-3.5" /> Select TDMS CSV
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* SINGLE FILE MODE */}
          {/* ======================================================== */}
          {uploadMode === 'SINGLE' && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                  Select Target Subsystem
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {['TMS', 'SMMS', 'TDMS', 'NORMALIZED'].map((sys) => (
                    <button
                      key={sys}
                      type="button"
                      onClick={() => setTargetSystem(sys)}
                      className={`p-2.5 rounded-xl text-xs font-semibold border transition-all text-center ${
                        targetSystem === sys
                          ? 'bg-sky-500/20 text-sky-300 border-sky-500/50 shadow-md'
                          : 'bg-[#0B1121] text-slate-400 border-[#1F2E4D] hover:text-white'
                      }`}
                    >
                      {sys}
                    </button>
                  ))}
                </div>
              </div>

              {/* Single File Drop Area */}
              <input
                type="file"
                ref={fileInputRef}
                accept=".csv"
                onChange={handleSingleFileChange}
                className="hidden"
              />

              <div
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all ${
                  selectedFile
                    ? 'border-sky-500/50 bg-sky-500/5'
                    : 'border-[#1F2E4D] hover:border-sky-500/40 bg-[#0B1121]/50 hover:bg-[#0B1121]'
                }`}
              >
                <div className="mx-auto w-10 h-10 mb-3 rounded-full bg-sky-500/10 flex items-center justify-center text-sky-400">
                  <UploadCloud className="w-5 h-5" />
                </div>
                {selectedFile ? (
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-white">{selectedFile.name}</p>
                    <p className="text-xs text-sky-400 font-mono">{(selectedFile.size / 1024).toFixed(1)} KB • Click to change</p>
                  </div>
                ) : (
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-white">Click or drag & drop to upload <span className="text-sky-300 font-semibold">{currentDef.title}</span></p>
                    <p className="text-[11px] text-slate-500">Supports comma-separated .csv datasets</p>
                  </div>
                )}
              </div>

              {/* Download template */}
              <div className="flex items-center justify-between text-xs px-1">
                <span className="text-slate-400">Expected sample format:</span>
                <a
                  href={getTemplateDownloadUrl(targetSystem.toLowerCase())}
                  download={`${targetSystem.toLowerCase()}_sample.csv`}
                  className="text-sky-400 hover:text-sky-300 flex items-center gap-1 font-medium underline"
                >
                  <Download className="w-3 h-3" /> Download {targetSystem} Template CSV
                </a>
              </div>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-start space-x-2 animate-shake">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Validation & Ingestion Error</p>
                <p className="text-[11px] text-rose-200/90 mt-0.5">{error}</p>
              </div>
            </div>
          )}

          {/* Upload Success & Calculated Scores Card */}
          {uploadResult && (
           
            <div className="p-4 rounded-xl bg-gradient-to-br from-emerald-950/30 to-[#0B1121] border border-emerald-500/30 space-y-3">
              <div className="flex items-center space-x-2 text-emerald-400">
                <CheckCircle2 className="w-5 h-5 shrink-0" />
                <span className="text-xs font-bold text-white">{uploadResult.message}</span>
              </div>

              {/* Score Breakdown Summary */}
              {uploadResult.score_summary && (
                <div className="pt-2 border-t border-emerald-500/20 space-y-3">
                  <div className="flex items-center justify-between">
                    
                   
                  </div>

                 

                  <div className="flex items-center justify-between pt-1">
                  

                    <button
                      onClick={handleNavigateToPrioritizer}
                      className="px-3 py-3 w-full rounded-lg bg-sky-500 hover:bg-sky-400 text-[#0B1121] text-xs font-bold flex items-center justify-center cursor-pointer gap-1.5 shadow-md transition-all"
                    >
                      <span>View Prioritizer</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Required Columns Info Collapsible */}
          <div className="border border-[#1F2E4D] rounded-xl bg-[#0B1121]/60 overflow-hidden">
           
            {showReqCols && (
              <div className="px-4 pb-3.5 pt-1 border-t border-[#1F2E4D]/60 space-y-2 text-[11px] text-slate-400">
                <div className="p-2.5 rounded-lg bg-[#0E172A] border border-[#1F2E4D] space-y-1">
                  <p className="font-semibold text-sky-300">Composite Priority Formula:</p>
                  <p className="font-mono text-slate-300 text-[10px]">
                    Final Score = 0.50 × AI Risk + 0.30 × Deadline Urgency + 0.20 × Criticality
                  </p>
                </div>
                <div>
                  <span className="font-medium text-slate-300">TMS Columns:</span> <span className="font-mono text-slate-400">train_id, train_name, track_section, train_start_time, train_end_time, train_priority</span>
                </div>
                <div>
                  <span className="font-medium text-slate-300">SMMS Columns:</span> <span className="font-mono text-slate-400">task_id, asset_id, track_section, asset_type, health_score, issue_type, severity, next_due_date</span>
                </div>
                <div>
                  <span className="font-medium text-slate-300">TDMS Columns:</span> <span className="font-mono text-slate-400">task_id, asset_id, track_section, asset_type, health_score, issue_type, severity, power_shutdown_required</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer Actions */}
        <div className="px-6 py-4 border-t border-[#1F2E4D] bg-[#0B1121]/80 flex items-center justify-between">
          <button
            type="button"
            onClick={closeUploadModal}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-[#1F2E4D] transition-colors cursor-pointer"
          >
            Close
          </button>
          
          <div className="flex gap-2">
            {uploadMode === 'BATCH' ? (
              <button
                type="button"
                onClick={handleBatchSubmit}
                disabled={isUploading || (!tmsBatchFile && !smmsBatchFile && !tdmsBatchFile)}
                className="px-5 py-2.5 rounded-xl text-xs font-bold bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white flex items-center space-x-2 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all cursor-pointer"
              >
                {isUploading ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Uploading</span>
                  </>
                ) : (
                  <>
             
                    <span>Upload</span>
                  </>
                )}
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSingleSubmit}
                disabled={isUploading || !selectedFile}
                className="px-5 py-2.5 rounded-xl text-xs font-bold bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white flex items-center space-x-2 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                {isUploading ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Processing...</span>
                  </>
                ) : (
                  <>
                    <Calculator className="w-3.5 h-3.5" />
                    <span>Upload & Calculate</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
