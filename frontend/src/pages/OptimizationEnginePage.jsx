import React, { useState, useEffect } from 'react';
import { runOptimizationEngine, getOptimizedBlocks } from '../services/api';
import { useApp } from '../context/AppContext';
import {
  Cpu,
  Play,
  RefreshCw,
  Zap,
  BarChart3,
  Calendar,
  Target,
  Layers,
  CheckCircle2,
  AlertTriangle,
  Clock,
  TrainTrack,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Settings2
} from 'lucide-react';

const OBJECTIVES = [
  { value: 'balanced',           label: 'Balanced (Default)',          desc: 'Minimizes delay while maximizing throughput' },
  { value: 'minimize_delay',     label: 'Minimize Train Delay',         desc: 'Aggressively selects low-conflict windows' },
  { value: 'maximize_throughput', label: 'Maximize Task Throughput',   desc: 'Packs more tasks per block, tolerates mild delays' },
];

const WINDOWS = [
  { value: 'all',           label: 'All Windows (Auto-Select)' },
  { value: 'night_shadow',  label: 'Night Shadow Only (00:00–05:30)' },
  { value: 'offpeak_day',   label: 'Daytime Off-Peak Only' },
];

export const OptimizationEnginePage = () => {
  const { showToast } = useApp();

  // Engine parameters
  const [targetDate, setTargetDate]     = useState('2026-09-01');
  const [objective, setObjective]       = useState('balanced');
  const [prefWindow, setPrefWindow]     = useState('all');
  const [maxConcurrent, setMaxConcurrent] = useState(3);
  const [headwayBuffer, setHeadwayBuffer] = useState(15);
  const [jointBlocks, setJointBlocks]   = useState(true);

  const [running, setRunning]           = useState(false);
  const [result, setResult]             = useState(null);
  const [blocks, setBlocks]             = useState([]);
  const [loadingBlocks, setLoadingBlocks] = useState(true);
  const [expandedBlock, setExpandedBlock] = useState(null);

  const loadExistingBlocks = async () => {
    try {
      setLoadingBlocks(true);
      const res = await getOptimizedBlocks({ target_date: targetDate });
      setBlocks(res.data);
    } catch (e) {
      console.warn('Block load note:', e.message);
    } finally {
      setLoadingBlocks(false);
    }
  };

  useEffect(() => { loadExistingBlocks(); }, [targetDate]);

  const handleRunOptimization = async () => {
    try {
      setRunning(true);
      setResult(null);
      const res = await runOptimizationEngine({
        target_date: targetDate,
        objective,
        preferred_window: prefWindow,
        max_concurrent_blocks: maxConcurrent,
        allow_power_shutdown_joint: jointBlocks,
        train_headway_buffer_minutes: headwayBuffer,
      });
      setResult(res.data);
      setBlocks(res.data.blocks || []);
      showToast(`Optimization complete: ${res.data.blocks_generated} blocks generated!`, 'success');
    } catch (e) {
      showToast('Optimization failed: ' + (e.response?.data?.detail || e.message), 'error');
    } finally {
      setRunning(false);
    }
  };

  const deptColor = (dept) => {
    if (dept === 'SMMS') return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30';
    if (dept === 'TDMS') return 'text-amber-400 bg-amber-500/10 border-amber-500/30';
    return 'text-sky-400 bg-sky-500/10 border-sky-500/30';
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="p-6 rounded-2xl bg-gradient-to-br from-[#0E172A] to-[#131D33] border border-indigo-500/30 shadow-2xl">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          <div className="flex items-start space-x-4">
            <div className="p-3.5 rounded-2xl bg-indigo-500/20 border border-indigo-500/40 text-indigo-400">
              <Cpu className="w-8 h-8" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Maintenance Block Optimization Engine</h2>
              <p className="text-xs text-slate-300 mt-1 max-w-xl">
                Maximizes Block Utilisation & Minimizes Train Delay
              </p>
     
            </div>
          </div>
          <button
            onClick={handleRunOptimization}
            disabled={running}
            className={`flex items-center space-x-2 px-6 py-3 rounded-xl font-bold text-sm shadow-xl transition-all shrink-0 ${
              running
                ? 'bg-slate-700 text-slate-400 cursor-not-allowed'
                : 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white shadow-indigo-600/30 cursor-pointer'
            }`}
          >
         
            <span>{running ? 'Running Optimization...' : 'Run Optimization Engine'}</span>
          </button>
        </div>
      </div>

      {/* Parameters Panel */}
      <div className="p-5 rounded-2xl bg-[#0E172A] border border-[#1F2E4D] shadow-xl">
        <div className="flex items-center space-x-2 mb-4">
          <Settings2 className="w-4 h-4 text-slate-400" />
          <h3 className="text-sm font-bold text-white">Engine Configuration</h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          <div className="col-span-1 sm:col-span-1 xl:col-span-1">
            <label className="block text-[11px] font-semibold text-slate-300 mb-1 uppercase tracking-wider">Target Date</label>
            <input
              type="date"
              value={targetDate}
              onChange={e => setTargetDate(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl glass-input font-mono"
            />
          </div>

          

          <div>
            <label className="block text-[11px] font-semibold text-slate-300 mb-1 uppercase tracking-wider">Preferred Window</label>
            <select
              value={prefWindow}
              onChange={e => setPrefWindow(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl glass-input cursor-pointer"
            >
              {WINDOWS.map(w => (
                <option key={w.value} value={w.value} className="bg-[#0E172A]">{w.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-300 mb-1 uppercase tracking-wider">
              Headway Buffer <span className="text-slate-400 normal-case font-normal">(mins)</span>
            </label>
            <input
              type="number"
              min="5" max="60"
              value={headwayBuffer}
              onChange={e => setHeadwayBuffer(parseInt(e.target.value))}
              className="w-full px-3 py-2 text-xs rounded-xl glass-input font-mono"
            />
          </div>

          <div className="flex flex-col justify-end">
            <label className="flex items-center space-x-2 cursor-pointer group">
              <div
                onClick={() => setJointBlocks(!jointBlocks)}
                className={`relative w-10 h-5 rounded-full transition-colors ${jointBlocks ? 'bg-indigo-500' : 'bg-slate-600'}`}
              >
                <div className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${jointBlocks ? 'translate-x-5' : 'translate-x-0'}`} />
              </div>
              <span className="text-xs text-slate-300 group-hover:text-white transition-colors">Joint Multi-Dept Blocks</span>
            </label>
            <p className="text-[10px] text-slate-400 mt-0.5">Cluster SMMS + TDMS tasks in one block</p>
          </div>
        </div>
      </div>

      {/* Results KPIs (shown after optimization run) */}
      {result && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3 animate-fade-in">
          {[
            { label: 'Blocks Generated',    value: result.blocks_generated,          color: 'text-indigo-400', icon: "Layers" },
            { label: 'Tasks Scheduled',     value: result.total_tasks_scheduled,      color: 'text-emerald-400', icon: "CheckCircle2" },
            // { label: 'Block Utilization',   value: `${result.block_utilization_pct}%`, color: 'text-sky-400', icon: Target },
            // { label: 'Sections Covered',    value: result.sections_covered,           color: 'text-purple-400', icon: TrainTrack },
            // { label: 'Delay Saved (mins)',  value: result.estimated_delay_savings_minutes, color: 'text-amber-400', icon: Clock },
            // { label: 'Conflicts Resolved',  value: result.conflicts_resolved,         color: 'text-rose-400', icon: AlertTriangle },
            // { label: 'Punctuality Index',   value: `${result.punctuality_preservation_score}%`, color: 'text-teal-400', icon: BarChart3 },
          ].map(kpi => {
            const Icon = kpi.icon;
            return (
              <div key={kpi.label} className="p-3 rounded-xl bg-[#0E172A] border border-[#1F2E4D] shadow-lg">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider leading-tight">{kpi.label}</span>
                  <Icon className={`w-3.5 h-3.5 ${kpi.color}`} />
                </div>
                <div className={`text-xl font-bold font-mono ${kpi.color}`}>{kpi.value}</div>
              </div>
            );
          })}
        </div>
      )}

      {/* Generated Blocks List */}
      <div className="p-5 rounded-2xl bg-[#0E172A] border border-[#1F2E4D] shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <h3 className="text-sm font-bold text-white">Optimized Maintenance Block Plan</h3>
            <span className="px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-xs font-mono font-bold">
              {blocks.length} Blocks
            </span>
          </div>
          <button onClick={loadExistingBlocks} className="text-xs text-slate-400 hover:text-white flex items-center space-x-1 transition-colors">
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Refresh</span>
          </button>
        </div>

        <div className="space-y-3">
          {loadingBlocks ? (
            <div className="text-center py-12 text-slate-400 flex flex-col items-center space-y-2">
              <RefreshCw className="w-6 h-6 animate-spin text-indigo-400" />
              <span>Loading block plan...</span>
            </div>
          ) : blocks.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              <Cpu className="w-8 h-8 mx-auto mb-3 text-slate-600" />
              <p className="text-sm font-medium">No blocks generated yet.</p>
              <p className="text-xs mt-1">Configure parameters above and click <strong>Run Optimization Engine</strong>.</p>
            </div>
          ) : (
            
            blocks.map((block, idx) => {
              console.log(block)
              const isExp = expandedBlock === (block.id || idx);
              const tasks = Array.isArray(block.tasks_included) ? block.tasks_included : [];
              const trains = Array.isArray(block.affected_trains_details) ? block.affected_trains_details : [];

              return (
                <div
                  key={block.block_code}
                  className={`rounded-xl border transition-all ${
                    block.power_shutdown
                      ? 'border-amber-500/40 bg-amber-500/5'
                      : 'border-[#1F2E4D] bg-[#131D33]/50'
                  }`}
                >
                  {/* Block Header Row */}
                  <div className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
                    <div className="flex items-start space-x-3">
                      {/* Priority indicator */}
                      <div className={`p-2 rounded-lg border shrink-0 ${
                        block.priority_score_cleared >= 200
                          ? 'bg-rose-500/15 border-rose-500/40 text-rose-400'
                          : block.priority_score_cleared >= 100
                          ? 'bg-amber-500/15 border-amber-500/40 text-amber-400'
                          : 'bg-indigo-500/15 border-indigo-500/40 text-indigo-400'
                      }`}>
                        <Sparkles className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="flex items-center flex-wrap gap-2">
                          <span className="font-mono font-bold text-white text-sm">{block.block_code}</span>
                          {block.power_shutdown && (
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 font-mono flex items-center gap-1">
                              <Zap className="w-2.5 h-2.5" /> Power Shutdown
                            </span>
                          )}
                          {(block.departments_involved || []).map(d => (
                            <span key={d} className={`text-[9px] font-bold px-1.5 py-0.5 rounded border font-mono ${deptColor(d)}`}>{d}</span>
                          ))}
                        </div>
                        <div className="text-xs text-slate-300 mt-0.5">{block.track_section}</div>
                       
                      </div>
                    </div>

                    <div className="flex items-center flex-wrap gap-4 text-xs shrink-0">
                      {/* Time window */}
                      <div className="text-center">
                        <div className="text-[10px] text-slate-400 uppercase font-semibold">Window</div>
                        <div className="font-mono font-bold text-white text-sm">{block.start_time} – {block.end_time}</div>
                        <div className="text-[10px] text-slate-400">{block.duration_minutes}m</div>
                      </div>

                      {/* Tasks count */}
                      <div className="text-center">
                        <div className="text-[10px] text-slate-400 uppercase font-semibold">Tasks</div>
                        <div className="font-bold text-emerald-400 text-lg font-mono">{tasks.length}</div>
                      </div>

                      {/* Priority score */}
                      

                      {/* Delay saved */}
                      

                      {/* Train impacts */}
                     

                      {/* Status */}
                     

                      {/* Expand toggle */}
                      <button
                        onClick={() => setExpandedBlock(isExp ? null : (block.id || idx))}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-[#1F2E4D] transition-colors"
                      >
                        {isExp ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Expanded Detail */}
                  {isExp && (
                    <div className="border-t border-[#1F2E4D] p-4 space-y-4 bg-[#0A0F1D]/60 rounded-b-xl">
                      {/* Notes */}
                    

                      {/* Tasks Table */}
                      <div>
                        <div className="text-[11px] font-bold text-indigo-300 uppercase tracking-wider mb-2">
                          Scheduled Tasks (sorted by Priority Score DESC)
                        </div>
                        <div className="overflow-x-auto">
                          <table className="w-full text-[11px] text-left">
                            <thead className="text-slate-400 border-b border-[#1F2E4D] uppercase text-[10px] font-mono">
                              <tr>
                                <th className="py-2 px-3">Task ID</th>
                                <th className="py-2 px-3">Dept</th>
                                <th className="py-2 px-3">Asset Type</th>
                                <th className="py-2 px-3">Issue</th>
                                <th className="py-2 px-3">Severity</th>
                                <th className="py-2 px-3 text-right">Duration</th>
                                <th className="py-2 px-3 text-right">Priority Score</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-[#1F2E4D]/50">
                              {tasks
                                .slice()
                                .sort((a, b) => (b.final_priority_score || b.priority_score || 0) - (a.final_priority_score || a.priority_score || 0))
                                .map(t => (
                                  <tr key={t.task_id} className="hover:bg-[#131D33]/40">
                                    <td className="py-2 px-3 font-mono text-sky-300">{t.task_id}</td>
                                    <td className="py-2 px-3">
                                      <span className={`text-[9px] font-bold px-1.5 rounded border ${deptColor(t.source)}`}>{t.source}</span>
                                    </td>
                                    <td className="py-2 px-3 text-slate-200">{t.asset_type}</td>
                                    <td className="py-2 px-3 text-slate-300 max-w-xs truncate">{t.issue_type}</td>
                                    <td className="py-2 px-3">
                                      <span className={`font-bold text-[10px] ${
                                        t.severity === 'Critical' ? 'text-rose-400' :
                                        t.severity === 'High'     ? 'text-amber-400' : 'text-slate-300'
                                      }`}>{t.severity}</span>
                                    </td>
                                    <td className="py-2 px-3 text-right font-mono text-slate-300">{t.estimated_duration_minutes}m</td>
                                    <td className="py-2 px-3 text-right font-mono font-bold text-indigo-300">
                                      {(t.final_priority_score || t.priority_score || 0).toFixed(1)}
                                    </td>
                                  </tr>
                                ))
                              }
                            </tbody>
                          </table>
                        </div>
                      </div>

                      {/* Train Mitigation Table */}
                      {trains.length > 0 && (
                        <div>
                          <div className="text-[11px] font-bold text-rose-300 uppercase tracking-wider mb-2">
                            Train Conflict Mitigations ({trains.length})
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                            {trains.map(tr => (
                              <div key={tr.train_id} className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/25 text-xs">
                                <div className="flex justify-between font-bold">
                                  <span className="text-white font-mono">{tr.train_id} – {tr.train_name}</span>
                                  <span className="text-rose-300">{tr.delay_impact_minutes}m delay</span>
                                </div>
                                <div className="text-slate-400 mt-0.5 font-mono text-[10px]">
                                  {tr.original_start} → {tr.original_end} ({tr.direction}) · {tr.action_taken}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
