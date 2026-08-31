import React, { useState, useEffect } from 'react';
import { getRankedTasks, getExportRankedCsvUrl } from '../services/api';
import { useApp } from '../context/AppContext';
import {
  BrainCircuit,
  Filter,
  Search,
  AlertTriangle,
  Clock,
  ShieldAlert,
  ArrowRight,
  Calculator,
  RefreshCw,
  UploadCloud,
  Download,
  Sliders,
  Sparkles,
  Zap,
  CheckCircle2
} from 'lucide-react';
import { StatusBadge, RiskBadge } from '../components/MetricCard';

export const MaintenancePrioritizerPage = () => {
  const { openUploadModal } = useApp();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Custom Scoring Weights (Defaults: 0.50 Risk, 0.30 Deadline, 0.20 Criticality)
  const [showWeightSliders, setShowWeightSliders] = useState(false);
  const [riskWeight, setRiskWeight] = useState(0.5);
  const [deadlineWeight, setDeadlineWeight] = useState(0.3);
  const [criticalityWeight, setCriticalityWeight] = useState(0.2);

  // Filters
  const [subsystemFilter, setSubsystemFilter] = useState('');
  const [sectionFilter, setSectionFilter] = useState('');
  const [search, setSearch] = useState('');

  const fetchTasks = async () => {
    try {
      setLoading(true);
      const params = {
        risk_weight: riskWeight,
        deadline_weight: deadlineWeight,
        criticality_weight: criticalityWeight
      };
      if (subsystemFilter) params.subsystem = subsystemFilter;
      if (sectionFilter) params.section = sectionFilter;
      if (search) params.search = search;
      
      const res = await getRankedTasks(params);
      setTasks(res.data);
    } catch (err) {
      console.warn("Failed to fetch ranked tasks", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, [subsystemFilter, sectionFilter, search, riskWeight, deadlineWeight, criticalityWeight]);

  const resetWeights = () => {
    setRiskWeight(0.5);
    setDeadlineWeight(0.3);
    setCriticalityWeight(0.2);
  };

  const topTask = tasks.length > 0 ? tasks[0] : null;
  const avgRisk = tasks.length > 0 ? (tasks.reduce((a, b) => a + (b.ai_risk_score || 0), 0) / tasks.length).toFixed(1) : 0;
  const avgDeadline = tasks.length > 0 ? (tasks.reduce((a, b) => a + (b.deadline_score || 0), 0) / tasks.length).toFixed(1) : 0;
  const avgCrit = tasks.length > 0 ? (tasks.reduce((a, b) => a + (b.criticality_score || 0), 0) / tasks.length).toFixed(1) : 0;
  const avgPriority = tasks.length > 0 ? (tasks.reduce((a, b) => a + (b.final_priority_score || 0), 0) / tasks.length).toFixed(1) : 0;

  const critCount = tasks.filter(t => t.risk_level === 'Critical').length;
  const highCount = tasks.filter(t => t.risk_level === 'High').length;

  const exportUrl = getExportRankedCsvUrl({
    subsystem: subsystemFilter || undefined,
    section: sectionFilter || undefined,
    risk_weight: riskWeight,
    deadline_weight: deadlineWeight,
    criticality_weight: criticalityWeight
  });

  return (
    <div className="space-y-6 pb-12">
      {/* Formula & Hero Banner */}
      <div className="p-6 rounded-2xl bg-gradient-to-br from-[#0E172A] via-[#131D33] to-[#0B1121] border border-sky-500/20 shadow-2xl relative overflow-hidden">
        {/* Decorative Grid BG */}
        <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-10 bg-center"></div>
        
        <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          <div className="flex  space-x-4 max-w-2xl items-center justify-center">
            <div className="p-3 rounded-2xl bg-indigo-500/20 border border-indigo-500/30 text-indigo-400 shrink-0">
              <Calculator className="w-8 h-8" />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h2 className="text-xl font-bold text-white">Multi-Factor Priority Scoring Engine</h2>
                
              </div>
              <p className="text-xs text-slate-300 mb-3 leading-relaxed">
                Calculates objective, actionable priority scores for all maintenance tasks across Track, Signal, and Traction systems based on AI Risk, Deadline Urgency, and Section Criticality.
              </p>
              
              <div className="flex items-center flex-wrap gap-2">
                <div className="inline-flex items-center flex-wrap gap-2 px-3 py-1.5 rounded-xl bg-[#0B1121]/90 border border-[#1F2E4D] font-mono text-xs shadow-inner">
                  <span className="font-bold text-white">Final Priority Score =</span>
                  <span className="px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 font-bold border border-rose-500/30">
                    {riskWeight.toFixed(2)} × AI Risk Score
                  </span>
                  <span className="text-slate-400">+</span>
                  <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30">
                    {deadlineWeight.toFixed(2)} × Deadline Score
                  </span>
                  <span className="text-slate-400">+</span>
                  <span className="px-2 py-0.5 rounded bg-sky-500/20 text-sky-300 font-bold border border-sky-500/30">
                    {criticalityWeight.toFixed(2)} × Criticality Score
                  </span>
                </div>

               
              </div>
            </div>
          </div>
          
          {/* Action Buttons */}
          <div className="flex flex-row lg:flex-col gap-2 w-full lg:w-auto shrink-0">
            <button
              onClick={() => openUploadModal('BATCH')}
              className="flex-1 lg:flex-none px-4 py-2.5 rounded-xl bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-lg shadow-sky-500/20 transition-all"
            >
              <UploadCloud className="w-4 h-4" />
              <span>Upload CSV Datasets</span>
            </button>

           
          </div>
        </div>

        {/* Live Weight Sliders Drawer */}
        {showWeightSliders && (
          <div className="mt-5 pt-4 border-t border-[#1F2E4D]/80 grid grid-cols-1 md:grid-cols-4 gap-4 items-center bg-[#0B1121]/60 p-4 rounded-xl">
            {/* Risk Slider */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-semibold">
                <span className="text-rose-300">AI Risk Weight:</span>
                <span className="font-mono text-rose-400">{(riskWeight * 100).toFixed(0)}%</span>
              </div>
              <input
                type="range"
                min="0.0"
                max="1.0"
                step="0.05"
                value={riskWeight}
                onChange={(e) => setRiskWeight(parseFloat(e.target.value))}
                className="w-full h-1.5 bg-[#1F2E4D] rounded-lg appearance-none cursor-pointer accent-rose-500"
              />
            </div>

            {/* Deadline Slider */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-semibold">
                <span className="text-amber-300">Deadline Weight:</span>
                <span className="font-mono text-amber-400">{(deadlineWeight * 100).toFixed(0)}%</span>
              </div>
              <input
                type="range"
                min="0.0"
                max="1.0"
                step="0.05"
                value={deadlineWeight}
                onChange={(e) => setDeadlineWeight(parseFloat(e.target.value))}
                className="w-full h-1.5 bg-[#1F2E4D] rounded-lg appearance-none cursor-pointer accent-amber-500"
              />
            </div>

            {/* Criticality Slider */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-semibold">
                <span className="text-sky-300">Criticality Weight:</span>
                <span className="font-mono text-sky-400">{(criticalityWeight * 100).toFixed(0)}%</span>
              </div>
              <input
                type="range"
                min="0.0"
                max="1.0"
                step="0.05"
                value={criticalityWeight}
                onChange={(e) => setCriticalityWeight(parseFloat(e.target.value))}
                className="w-full h-1.5 bg-[#1F2E4D] rounded-lg appearance-none cursor-pointer accent-sky-500"
              />
            </div>

            <div className="flex justify-end md:justify-center">
              <button
                onClick={resetWeights}
                className="px-3 py-1.5 rounded-lg bg-[#0E172A] border border-[#1F2E4D] hover:border-slate-400 text-slate-400 hover:text-white text-[11px] font-medium transition-all"
              >
                Reset Defaults (50/30/20)
              </button>
            </div>
          </div>
        )}
      </div>

     

      {/* Filter Bar */}
      <div className="p-4 rounded-2xl bg-[#0E172A] border border-[#1F2E4D] shadow-xl flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            placeholder="Search Task ID, Asset ID, Defect Type, Track Corridor..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs rounded-xl glass-input placeholder-slate-500"
          />
        </div>
        
        <select
          value={subsystemFilter}
          onChange={(e) => setSubsystemFilter(e.target.value)}
          className="px-3 py-2 text-xs rounded-xl glass-input w-full md:w-48 cursor-pointer"
        >
          <option value="" className="bg-[#0E172A]">All Departments (TMS, SMMS, TDMS)</option>
          <option value="SMMS" className="bg-[#0E172A]">SMMS (Signal)</option>
          <option value="TDMS" className="bg-[#0E172A]">TDMS (Traction)</option>
          <option value="TMS" className="bg-[#0E172A]">TMS (Track)</option>
        </select>
        
        <select
          value={sectionFilter}
          onChange={(e) => setSectionFilter(e.target.value)}
          className="px-3 py-2 text-xs rounded-xl glass-input w-full md:w-56 cursor-pointer"
        >
          <option value="" className="bg-[#0E172A]">All Track Sections</option>
          <option value="Pune Jn-Shivajinagar" className="bg-[#0E172A]">Pune Jn ↔ Shivajinagar</option>
          <option value="Shivajinagar-Khadki" className="bg-[#0E172A]">Shivajinagar ↔ Khadki</option>
          <option value="Khadki-Dapodi" className="bg-[#0E172A]">Khadki ↔ Dapodi</option>
          <option value="Dapodi-Kasarwadi" className="bg-[#0E172A]">Dapodi ↔ Kasarwadi</option>
          <option value="Kasarwadi-Pimpri" className="bg-[#0E172A]">Kasarwadi ↔ Pimpri</option>
          <option value="Pimpri-Chinchwad" className="bg-[#0E172A]">Pimpri ↔ Chinchwad</option>
          <option value="Chinchwad-Akurdi" className="bg-[#0E172A]">Chinchwad ↔ Akurdi</option>
          <option value="Akurdi-Dehu Road" className="bg-[#0E172A]">Akurdi ↔ Dehu Road</option>
          <option value="Dehu Road-Begdewadi" className="bg-[#0E172A]">Dehu Road ↔ Begdewadi</option>
          <option value="Talegaon" className="bg-[#0E172A]">Talegaon Corridor</option>
        </select>
        
        <button
          onClick={fetchTasks}
          className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center justify-center space-x-2 shadow-lg shadow-indigo-600/20 transition-all"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Ranked Tasks Table */}
      <div className="bg-[#0E172A] border border-[#1F2E4D] rounded-2xl shadow-xl overflow-hidden flex flex-col">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs whitespace-nowrap">
            <thead className="bg-[#131D33] text-slate-400 font-mono uppercase text-[10px] border-b border-[#1F2E4D]">
              <tr>
                <th className="py-3.5 px-4 font-bold tracking-wider text-center">Rank</th>
                <th className="py-3.5 px-4 font-bold tracking-wider">Task & Asset Info</th>
                <th className="py-3.5 px-4 font-bold tracking-wider">Location / Corridor / Defect</th>
                <th className="py-3.5 px-4 font-bold tracking-wider text-center">
                  <div className="text-rose-400">AI Risk Score</div>
                </th>
                <th className="py-3.5 px-4 font-bold tracking-wider text-center">
                  <div className="text-amber-400">Deadline Score</div>
                </th>
                <th className="py-3.5 px-4 font-bold tracking-wider text-center">
                  <div className="text-sky-400">Criticality Score</div>
                 
                </th>
                <th className="py-3.5 px-4 font-bold tracking-wider text-center bg-indigo-900/20 border-l border-indigo-500/20">
                  <div className="text-indigo-400 text-sm">Final Priority Score</div>
                 
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1F2E4D]/60">
              {loading ? (
                <tr>
                  <td colSpan="7" className="text-center py-12 text-slate-400">
                    <div className="flex flex-col items-center justify-center space-y-3">
                      <RefreshCw className="w-6 h-6 animate-spin text-indigo-400" />
                      <span>Computing task priority scores...</span>
                    </div>
                  </td>
                </tr>
              ) : tasks.length === 0 ? (
                <tr>
                  <td colSpan="7" className="text-center py-12 text-slate-400">
                    <div className="space-y-3">
                      <p>No maintenance tasks found for current filters.</p>
                      <button
                        onClick={() => openUploadModal('BATCH')}
                        className="px-4 py-2 rounded-xl bg-sky-500/20 hover:bg-sky-500/30 text-sky-300 border border-sky-500/40 text-xs font-semibold inline-flex items-center gap-1.5 transition-all"
                      >
                        <UploadCloud className="w-3.5 h-3.5" />
                        <span>Upload TMS, SMMS & TDMS Datasets</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                tasks.map((task, index) => (
                  <tr key={`${task.source}-${task.task_id}-${index}`} className="hover:bg-[#131D33]/40 transition-colors group">
                    <td className="py-4 px-4 font-bold text-slate-400 text-center font-mono">
                      {index + 1}
                    </td>
                    
                    <td className="py-4 px-4">
                      <div className="flex items-center space-x-3">
                        {/* Subsystem Icon */}
                        <div className={`p-1.5 rounded-lg border ${
                          task.source === 'SMMS' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' :
                          task.source === 'TDMS' ? 'bg-amber-500/10 border-amber-500/30 text-amber-400' :
                          'bg-sky-500/10 border-sky-500/30 text-sky-400'
                        }`}>
                          <span className="font-bold text-[9px] font-mono">{task.source}</span>
                        </div>
                        <div>
                          <div className="font-mono font-bold text-white text-sm">{task.task_id}</div>
                         
                        </div>
                      </div>
                    </td>
                    
                    <td className="py-4 px-4">
                      <div className="text-slate-200 font-semibold truncate max-w-xs">{task.issue_type}</div>
                      <div className="flex items-center space-x-2 mt-1">
                        
                        
                        
                      </div>
                    </td>

                    {/* AI Risk Score */}
                    <td className="py-4 px-4 text-center">
                      <div className="flex flex-col items-center justify-center">
                        <div className={`text-sm font-mono font-bold ${
                          task.ai_risk_score >= 80 ? 'text-rose-400' :
                          task.ai_risk_score >= 50 ? 'text-amber-400' :
                          'text-emerald-400'
                        }`}>
                          {task.ai_risk_score?.toFixed(1) || '--'}
                        </div>
                        <div className="w-12 h-1 bg-[#0B1121] rounded-full mt-1 overflow-hidden">
                          <div 
                            className={`h-full ${
                              task.ai_risk_score >= 80 ? 'bg-rose-500' :
                              task.ai_risk_score >= 50 ? 'bg-amber-500' :
                              'bg-emerald-500'
                            }`}
                            style={{ width: `${task.ai_risk_score || 0}%` }}
                          />
                        </div>
                      </div>
                    </td>

                    {/* Deadline Score */}
                    <td className="py-4 px-4 text-center">
                      <div className="flex flex-col items-center justify-center">
                        <div className={`text-sm font-mono font-bold ${
                          task.deadline_score >= 80 ? 'text-rose-400' :
                          task.deadline_score >= 50 ? 'text-amber-400' :
                          'text-sky-400'
                        }`}>
                          {task.deadline_score?.toFixed(1) || '--'}
                        </div>
                       
                      </div>
                    </td>

                    {/* Criticality Score */}
                    <td className="py-4 px-4 text-center">
                      <div className="flex flex-col items-center justify-center">
                        <div className={`text-sm font-mono font-bold ${
                          task.criticality_score >= 80 ? 'text-rose-400' :
                          task.criticality_score >= 50 ? 'text-amber-400' :
                          'text-slate-300'
                        }`}>
                          {task.criticality_score?.toFixed(1) || '--'}
                        </div>
                       
                      </div>
                    </td>

                    {/* Final Priority Score */}
                    <td className="py-4 px-4 text-center bg-indigo-900/10 border-l border-indigo-500/20 group-hover:bg-indigo-900/20 transition-colors">
                      <div className="flex flex-col items-center justify-center space-y-1.5">
                        <span className={`px-3 py-1 rounded-lg font-mono font-bold text-base shadow-sm border ${
                          task.final_priority_score >= 75 ? 'bg-rose-500/20 text-rose-300 border-rose-500/50 shadow-rose-500/20' :
                          task.final_priority_score >= 55 ? 'bg-amber-500/20 text-amber-300 border-amber-500/50 shadow-amber-500/20' :
                          task.final_priority_score >= 35 ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/50 shadow-indigo-500/20' :
                          'bg-slate-500/20 text-slate-300 border-slate-500/50'
                        }`}>
                          {task.final_priority_score?.toFixed(2)}
                        </span>
                     
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
