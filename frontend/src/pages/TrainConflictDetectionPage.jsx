import React, { useState, useEffect } from 'react';
import {
  getConflictTasks,
  getConflictSummary,
  getConflictSections,
  simulateConflictWindow
} from '../services/api';
import { useApp } from '../context/AppContext';
import {
  ShieldAlert,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Search,
  Filter,
  RefreshCw,
  Zap,
  TrainTrack,
  ArrowRight,
  Sparkles,
  SlidersHorizontal,
  ChevronDown,
  ChevronUp,
  Flame,
  Info
} from 'lucide-react';

export const TrainConflictDetectionPage = () => {
  const { showToast } = useApp();
  const [tasks, setTasks] = useState([]);
  const [summary, setSummary] = useState(null);
  const [sections, setSections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedSection, setSelectedSection] = useState('');
  const [selectedSeverity, setSelectedSeverity] = useState('');
  const [selectedSubsystem, setSelectedSubsystem] = useState('');
  const [search, setSearch] = useState('');
  const [expandedTaskId, setExpandedTaskId] = useState(null);

  // Live Simulator State
  const [simSection, setSimSection] = useState('');
  const [simStart, setSimStart] = useState('09:00');
  const [simEnd, setSimEnd] = useState('11:00');
  const [simPowerCut, setSimPowerCut] = useState('No');
  const [simLoading, setSimLoading] = useState(false);
  const [simResult, setSimResult] = useState(null);

  const fetchSections = async () => {
    try {
      const res = await getConflictSections();
      const secList = res.data || [];
      setSections(secList);
      if (secList.length > 0 && !simSection) {
        setSimSection(secList[0]);
      }
    } catch (err) {
      console.warn('Conflict sections fetch error:', err);
    }
  };

  const fetchConflictData = async () => {
    try {
      setLoading(true);
      const params = {};
      if (selectedSection) params.section = selectedSection;
      if (selectedSeverity) params.severity = selectedSeverity;
      if (selectedSubsystem) params.subsystem = selectedSubsystem;

      const [tasksRes, sumRes] = await Promise.all([
        getConflictTasks(params),
        getConflictSummary(),
      ]);

      setTasks(tasksRes.data);
      setSummary(sumRes.data);
    } catch (err) {
      console.warn('Conflict fetch notice:', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSections();
  }, []);

  useEffect(() => {
    fetchConflictData();
  }, [selectedSection, selectedSeverity, selectedSubsystem]);

  // Combine fetched sections with any sections found in tasks
  const allSections = Array.from(
    new Set([...sections, ...tasks.map((t) => t.track_section).filter(Boolean)])
  ).sort();

  useEffect(() => {
    if (allSections.length > 0 && (!simSection || !allSections.includes(simSection))) {
      setSimSection(allSections[0]);
    }
  }, [allSections]);

  const handleSimulate = async (e) => {
    if (e) e.preventDefault();
    try {
      setSimLoading(true);
      const res = await simulateConflictWindow({
        track_section: simSection,
        start_time: simStart,
        end_time: simEnd,
        power_shutdown_required: simPowerCut,
      });
      setSimResult(res.data);
      showToast('Simulation complete for ' + simSection, 'success');
    } catch (err) {
      showToast('Simulation failed: ' + err.message, 'error');
    } finally {
      setSimLoading(false);
    }
  };

  const getSeverityBadge = (sev) => {
    switch (sev) {
      case 'Critical':
        return (
          <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-500/20 text-rose-300 border border-rose-500/50 shadow-sm shadow-rose-500/20 animate-pulse">
            <Flame className="w-3.5 h-3.5 text-rose-400" />
            <span>CRITICAL CONFLICT</span>
          </span>
        );
      case 'High':
        return (
          <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/50 shadow-sm shadow-amber-500/20">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
            <span>HIGH CONFLICT</span>
          </span>
        );
      case 'Medium':
        return (
          <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-bold bg-yellow-500/20 text-yellow-300 border border-yellow-500/50">
            <Clock className="w-3.5 h-3.5 text-yellow-400" />
            <span>MODERATE CONFLICT</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/50 shadow-sm shadow-emerald-500/20">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            <span>CLEAR WINDOW</span>
          </span>
        );
    }
  };

  const filteredTasks = tasks.filter((t) => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (
      t.task_id.toLowerCase().includes(s) ||
      t.asset_id.toLowerCase().includes(s) ||
      t.track_section.toLowerCase().includes(s) ||
      t.issue_type.toLowerCase().includes(s)
    );
  });

  return (
    <div className="space-y-6 pb-12">
      {/* Top Banner */}
      <div className="p-6 rounded-2xl bg-gradient-to-br from-[#0E172A] via-[#131D33] to-[#0A0F1D] border border-rose-500/30 shadow-2xl relative overflow-hidden">
        <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          <div className="flex items-start space-x-4">
            <div className="p-3.5 rounded-2xl bg-rose-500/20 border border-rose-500/40 text-rose-400 shrink-0">
              <ShieldAlert className="w-8 h-8" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-xl font-bold text-white">Train Conflict Detection & Timetable Cross-Referencing</h2>
                
              </div>
              <p className="text-xs text-slate-300 mt-1 max-w-2xl">
                Compares scheduled maintenance tasks against operational TMS train schedules by track corridor to prevent train delays and identify conflict-free gap windows.
              </p>
            </div>
          </div>

          {/* Quick Refresh */}
          <button
            onClick={fetchConflictData}
            className="flex items-center space-x-2 px-4 py-2 rounded-xl bg-[#131D33] hover:bg-[#1B2744] text-xs font-semibold text-slate-200 border border-[#1F2E4D] transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="p-4 rounded-2xl bg-[#0E172A] border border-rose-500/40 shadow-xl bg-gradient-to-b from-rose-500/10 to-transparent">
          <div className="text-[11px] font-semibold text-rose-300 uppercase tracking-wider mb-1 flex items-center justify-between">
            <span>Critical Clashes</span>
        
          </div>
          <div className="text-2xl font-bold font-mono text-rose-400">
            {summary ? summary.critical_conflicts : '--'}
          </div>
          <div className="text-[10px] text-rose-300/80 mt-1 font-medium">Multiple train overlap</div>
        </div>

        <div className="p-4 rounded-2xl bg-[#0E172A] border border-amber-500/40 shadow-xl bg-gradient-to-b from-amber-500/10 to-transparent">
          <div className="text-[11px] font-semibold text-amber-300 uppercase tracking-wider mb-1 flex items-center justify-between">
            <span>High/Moderate Conflicts</span>
            
          </div>
          <div className="text-2xl font-bold font-mono text-amber-400">
            {summary ? (summary.high_conflicts + summary.medium_conflicts) : '--'}
          </div>
          <div className="text-[10px] text-amber-300/80 mt-1 font-medium">Can be delayed</div>
        </div>

        <div className="p-4 rounded-2xl bg-[#0E172A] border border-emerald-500/40 shadow-xl bg-gradient-to-b from-emerald-500/10 to-transparent">
          <div className="text-[11px] font-semibold text-emerald-300 uppercase tracking-wider mb-1 flex items-center justify-between">
            <span>Clear Windows</span>
           
          </div>
          <div className="text-2xl font-bold font-mono text-emerald-400">
            {summary ? summary.clear_windows_available : '--'}
          </div>
          <div className="text-[10px] text-emerald-300/80 mt-1 font-medium">
            {summary ? summary.conflict_free_percentage : 0}% Conflict-free open headway slots
          </div>
        </div>
      </div>

      {/* Interactive Real-Time Conflict Simulator */}
      <div className="p-6 rounded-2xl bg-[#0E172A] border border-indigo-500/30 shadow-2xl space-y-4">
        <div className="flex items-center justify-between border-b border-[#1F2E4D] pb-3">
          <div className="flex items-center space-x-2">
            <SlidersHorizontal className="w-5 h-5 text-indigo-400" />
            <h3 className="text-base font-bold text-white">Interactive Conflict & Headway Window Simulator</h3>
          </div>
         
        </div>

        <form onSubmit={handleSimulate} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 items-end">
          <div>
            <label className="block text-[11px] font-semibold text-slate-300 mb-1">Track Section (Section_ID)</label>
            <select
              value={simSection}
              onChange={(e) => setSimSection(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl glass-input cursor-pointer"
            >
              {allSections.length > 0 ? (
                allSections.map((sec) => (
                  <option key={sec} value={sec} className="bg-[#0E172A]">
                    {sec}
                  </option>
                ))
              ) : (
                <option value="" disabled className="bg-[#0E172A]">
                  No Track Sections Found (Upload Data)
                </option>
              )}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-300 mb-1">Proposed Start Time</label>
            <input
              type="time"
              value={simStart}
              onChange={(e) => setSimStart(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl glass-input font-mono"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-300 mb-1">Proposed End Time</label>
            <input
              type="time"
              value={simEnd}
              onChange={(e) => setSimEnd(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl glass-input font-mono"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-300 mb-1">Power Shutdown</label>
            <select
              value={simPowerCut}
              onChange={(e) => setSimPowerCut(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl glass-input cursor-pointer"
            >
              <option value="No">No</option>
              <option value="Yes">Yes</option>
            </select>
          </div>

          <button
            type="submit"
            disabled={simLoading}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-sky-600 hover:from-indigo-500 hover:to-sky-500 text-white text-xs font-bold shadow-lg shadow-indigo-600/30 transition-all flex items-center justify-center space-x-2 cursor-pointer h-9"
          >
           
            <span>{simLoading ? 'Analyzing...' : 'Identify Conflict'}</span>
          </button>
        </form>

        {/* Simulation Feedback Card */}
        {simResult && (
          <div className="p-4 rounded-xl bg-[#131D33] border border-[#1F2E4D] space-y-3 mt-3 animate-fade-in">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#1F2E4D] pb-2">
              <div className="flex items-center space-x-3">
                {getSeverityBadge(simResult.conflict_severity)}
                <span className="text-xs text-slate-300 font-mono">
                  Tested: <strong>{simResult.tested_window}</strong> ({simResult.duration_minutes} mins) on <strong>{simResult.track_section}</strong>
                </span>
              </div>
              <div className="text-xs font-mono text-slate-300">
                Estimated Delay Impact: <strong className="text-amber-400">{simResult.delay_impact_estimate_minutes} mins</strong>
              </div>
            </div>

            {/* Conflicting Trains List */}
            {simResult.conflicting_trains.length > 0 ? (
              <div className="space-y-1.5">
                <div className="text-[11px] font-bold text-rose-300 uppercase tracking-wider">
                  ⚠️ {simResult.conflicting_trains.length} Conflicting Trains Detected in this window:
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                  {simResult.conflicting_trains.map((trn) => (
                    <div key={trn.train_id} className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/30 text-xs space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-white font-mono">{trn.train_id} - {trn.train_name}</span>
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-rose-500/30 text-rose-200">{trn.train_priority}</span>
                      </div>
                      <div className="text-[11px] text-slate-300 flex justify-between font-mono">
                        <span>Timetable: {trn.train_start_time} - {trn.train_end_time}</span>
                        <span className="text-rose-300 font-bold">Overlap: {trn.overlap_minutes}m</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Zero Train Conflicts! This proposed window fits completely inside open track headway margin.</span>
              </div>
            )}

            {/* Available and Recommended Windows Advice */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2 border-t border-[#1F2E4D] text-xs">
              <div className="p-2.5 rounded-lg bg-[#0E172A] border border-[#1F2E4D]">
                <span className="text-[10px] font-bold text-sky-400 uppercase block mb-1">Earliest Available Traffic Window</span>
                {simResult.earliest_available_window ? (
                  <div className="font-mono font-bold text-white flex items-center space-x-2">
                    <Clock className="w-4 h-4 text-sky-400" />
                    <span>{simResult.earliest_available_window.start_time} - {simResult.earliest_available_window.end_time} ({simResult.earliest_available_window.duration_minutes}m)</span>
                  </div>
                ) : (
                  <span className="text-slate-400">None available within 24h</span>
                )}
              </div>

              <div className="p-2.5 rounded-lg bg-[#0E172A] border border-emerald-500/30">
                <span className="text-[10px] font-bold text-emerald-400 uppercase block mb-1">Recommended Optimal Maintenance Slot</span>
                {simResult.recommended_window ? (
                  <div className="font-mono font-bold text-emerald-300 flex items-center space-x-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span>{simResult.recommended_window.start_time} - {simResult.recommended_window.end_time} [{simResult.recommended_window.window_type}]</span>
                  </div>
                ) : (
                  <span className="text-slate-400">Default Night Slot Recommended</span>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Filter Bar for Main Table */}
      <div className="p-4 rounded-2xl bg-[#0E172A] border border-[#1F2E4D] shadow-xl grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            placeholder="Search Task, Asset, Section, Issue..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs rounded-xl glass-input placeholder-slate-500"
          />
        </div>

        <select
          value={selectedSection}
          onChange={(e) => setSelectedSection(e.target.value)}
          className="px-3 py-2 text-xs rounded-xl glass-input cursor-pointer"
        >
          <option value="" className="bg-[#0E172A]">All Track Sections</option>
          {allSections.map((sec) => (
            <option key={sec} value={sec} className="bg-[#0E172A]">
              {sec}
            </option>
          ))}
        </select>

        <select
          value={selectedSeverity}
          onChange={(e) => setSelectedSeverity(e.target.value)}
          className="px-3 py-2 text-xs rounded-xl glass-input cursor-pointer"
        >
          <option value="" className="bg-[#0E172A]">All Conflict Severities</option>
          <option value="Critical" className="bg-[#0E172A]">🔴 Critical Conflict (Direct Clashes)</option>
          <option value="High" className="bg-[#0E172A]">🟠 High Conflict (Express Overlaps)</option>
          <option value="Medium" className="bg-[#0E172A]">🟡 Medium Conflict (Minor Overlaps)</option>
          <option value="Clear" className="bg-[#0E172A]">🟢 Clear Windows (0 Train Clashes)</option>
        </select>

        <select
          value={selectedSubsystem}
          onChange={(e) => setSelectedSubsystem(e.target.value)}
          className="px-3 py-2 text-xs rounded-xl glass-input cursor-pointer"
        >
          <option value="" className="bg-[#0E172A]">All Subsystems (SMMS, TDMS, TMS)</option>
          <option value="SMMS" className="bg-[#0E172A]">SMMS - Signal Assets</option>
          <option value="TDMS" className="bg-[#0E172A]">TDMS - Traction Assets</option>
          <option value="TMS" className="bg-[#0E172A]">TMS - Track Assets</option>
        </select>
      </div>

      {/* Main Conflict Matrix Table */}
      <div className="p-5 rounded-2xl bg-[#0E172A] border border-[#1F2E4D] shadow-xl overflow-hidden">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <h3 className="text-sm font-bold text-white">Maintenance Tasks vs. TMS Timetable Cross-Reference Matrix</h3>
            <span className="px-2.5 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30 text-xs font-mono font-bold">
              Showing {filteredTasks.length} tasks
            </span>
          </div>
          <span className="text-xs text-slate-400 font-mono">Dynamic Section_ID Timetable Conflict Engine</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#131D33] text-slate-400 font-mono uppercase text-[11px] border-b border-[#1F2E4D] select-none">
              <tr>
                <th className="py-3 px-4">Task / Asset ID</th>
                <th className="py-3 px-4">Track Section & Issue</th>
                <th className="py-3 px-4 text-center">Conflicting Trains</th>
                <th className="py-3 px-4 text-center">Conflict Severity</th>
                <th className="py-3 px-4">Earliest Available Window</th>
                <th className="py-3 px-4">Recommended Maintenance Window</th>
                <th className="py-3 px-4 text-right">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1F2E4D]/60 text-slate-200">
              {loading ? (
                <tr>
                  <td colSpan="7" className="text-center py-12 text-slate-400">
                    <div className="flex flex-col items-center justify-center space-y-2">
                      <RefreshCw className="w-6 h-6 animate-spin text-sky-400" />
                      <span>Scanning TMS schedule overlaps across section corridors...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredTasks.length === 0 ? (
                <tr>
                  <td colSpan="7" className="text-center py-12 text-slate-400">
                    No maintenance tasks matched the selected filter criteria.
                  </td>
                </tr>
              ) : (
                filteredTasks.map((t) => {
                  const isExpanded = expandedTaskId === t.task_id;
                  return (
                    <React.Fragment key={t.task_id}>
                      <tr className="hover:bg-[#131D33]/50 transition-colors">
                        <td className="py-3 px-4">
                          <div className="flex items-center space-x-2">
                            <span
                              className={`text-[9px] font-bold font-mono px-1.5 py-0.5 rounded border ${
                                t.source === 'SMMS'
                                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                                  : t.source === 'TDMS'
                                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                                  : 'bg-sky-500/20 text-sky-300 border-sky-500/40'
                              }`}
                            >
                              {t.source}
                            </span>
                            <div>
                              <div className="font-mono font-bold text-white">{t.task_id}</div>
                              <div className="text-[10px] text-slate-400 font-mono">{t.asset_id}</div>
                            </div>
                          </div>
                        </td>

                        <td className="py-3 px-4">
                          <div className="font-medium text-slate-200">{t.track_section}</div>
                          <div className="text-[11px] text-slate-400 truncate max-w-xs">{t.issue_type}</div>
                        </td>

                        <td className="py-3 px-4 text-center">
                          {t.conflicting_trains_count > 0 ? (
                            <span className="inline-flex items-center space-x-1 font-mono font-bold text-rose-400 bg-rose-500/15 border border-rose-500/30 px-2 py-0.5 rounded-lg text-xs">
                              <span>{t.conflicting_trains_count} Trains</span>
                            </span>
                          ) : (
                            <span className="font-mono text-emerald-400 font-semibold bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 rounded-lg text-xs">
                              0 (Clear)
                            </span>
                          )}
                        </td>

                        <td className="py-3 px-4 text-center">
                          {getSeverityBadge(t.conflict_severity)}
                        </td>

                        <td className="py-3 px-4">
                          {t.earliest_available_window ? (
                            <div className="font-mono text-slate-200 flex items-center space-x-1.5">
                              <Clock className="w-3.5 h-3.5 text-sky-400" />
                              <span>{t.earliest_available_window.start_time} - {t.earliest_available_window.end_time}</span>
                              <span className="text-[10px] text-slate-400">({t.earliest_available_window.duration_minutes}m)</span>
                            </div>
                          ) : (
                            <span className="text-slate-400 font-mono text-xs">--</span>
                          )}
                        </td>

                        <td className="py-3 px-4">
                          {t.recommended_window ? (
                            <div className="space-y-0.5">
                              <div className="font-mono font-bold text-emerald-300 flex items-center space-x-1.5">
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                                <span>{t.recommended_window.start_time} - {t.recommended_window.end_time}</span>
                              </div>
                              <div className="text-[10px] text-emerald-400 font-mono font-semibold">
                                {t.recommended_window.window_type}
                              </div>
                            </div>
                          ) : (
                            <span className="text-slate-400 font-mono text-xs">--</span>
                          )}
                        </td>

                        <td className="py-3 px-4 text-right">
                          <button
                            onClick={() => setExpandedTaskId(isExpanded ? null : t.task_id)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-[#1F2E4D] transition-colors inline-flex items-center space-x-1"
                          >
                            <span className="text-[11px]">Inspect</span>
                            {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                          </button>
                        </td>
                      </tr>

                      {/* Expanded Conflict Diagnostic View */}
                      {isExpanded && (
                        <tr className="bg-[#0A0F1D]/90">
                          <td colSpan="7" className="p-4 border-b border-[#1F2E4D]">
                            <div className="space-y-3">
                              <div className="flex items-center justify-between text-xs font-semibold text-slate-300">
                                <span>Detailed Conflict Diagnostic for {t.task_id} ({t.track_section})</span>
                                <span className="font-mono text-slate-400">Required Duration: {t.estimated_duration_minutes} mins</span>
                              </div>

                              {t.conflicting_trains.length > 0 ? (
                                <div className="space-y-1.5">
                                  <div className="text-[11px] font-bold text-rose-300 uppercase">
                                    Direct Timetable Clashes:
                                  </div>
                                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                                    {t.conflicting_trains.map((trn) => (
                                      <div key={trn.train_id} className="p-2 rounded bg-[#131D33] border border-rose-500/30 text-xs space-y-1">
                                        <div className="flex justify-between font-bold">
                                          <span className="text-white font-mono">{trn.train_id} - {trn.train_name}</span>
                                          <span className="text-[10px] text-rose-300 px-1 rounded bg-rose-500/20">{trn.impact_level}</span>
                                        </div>
                                        <div className="text-[11px] text-slate-300 flex justify-between font-mono">
                                          <span>Slot: {trn.train_start_time} - {trn.train_end_time}</span>
                                          <span className="text-rose-400 font-bold">Overlap: {trn.overlap_minutes}m</span>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              ) : (
                                <div className="text-xs text-emerald-300 flex items-center space-x-1.5">
                                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                                  <span>No trains scheduled on this section during default slot. Open clearance confirmed.</span>
                                </div>
                              )}

                              {/* Available Alternative Windows */}
                              <div className="pt-2 border-t border-[#1F2E4D]">
                                <div className="text-[11px] font-bold text-sky-300 uppercase mb-1.5">
                                  Feasible Available Track Gap Windows (≥ {t.estimated_duration_minutes} min duration):
                                </div>
                                <div className="flex flex-wrap gap-2">
                                  {t.available_windows.map((win, idx) => (
                                    <div
                                      key={idx}
                                      className={`px-3 py-1.5 rounded-lg border text-xs font-mono ${
                                        win.is_recommended
                                          ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300 font-bold'
                                          : 'bg-[#131D33] border-[#1F2E4D] text-slate-300'
                                      }`}
                                    >
                                      <span>{win.start_time} - {win.end_time}</span>
                                      <span className="text-[10px] text-slate-400 ml-1.5">({win.duration_minutes}m, {win.window_type})</span>
                                      {win.is_recommended && <span className="ml-1.5 text-emerald-400">★ Optimal</span>}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
