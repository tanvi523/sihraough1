import React, { useState } from 'react';
import { Clock, Zap, Radio, TrainTrack, ShieldCheck, CheckCircle2, ChevronRight, AlertTriangle } from 'lucide-react';
import { StatusBadge } from './MetricCard';

export const BlockGanttChart = ({ blocks = [], trains = [], onSelectBlock }) => {
  const sections = [
    'Pune Jn-Shivajinagar',
    'Shivajinagar-Khadki',
    'Khadki-Dapodi',
    'Dapodi-Chinchwad',
    'Chinchwad-Dehu Road',
    'Dehu Road-Talegaon',
    'Manjari-Loni'
  ];

  const [selectedBlockDetail, setSelectedBlockDetail] = useState(null);
  const [filterDept, setFilterDept] = useState('ALL');

  // Convert "HH:MM" to percentage of 24 hours (0% to 100%)
  const timeToPercent = (timeStr) => {
    if (!timeStr) return 0;
    const parts = timeStr.split(':');
    const h = parseInt(parts[0], 10) || 0;
    const m = parseInt(parts[1], 10) || 0;
    return ((h * 60 + m) / (24 * 60)) * 100;
  };

  const filteredBlocks = blocks.filter((b) => {
    if (filterDept === 'ALL') return true;
    return (b.departments_involved || []).includes(filterDept);
  });

  return (
    <div className="p-5 rounded-2xl bg-[#0E172A] border border-[#1F2E4D] shadow-xl space-y-4">
      {/* Gantt Header & Filters */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 border-b border-[#1F2E4D] pb-4">
        <div>
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-signal-pulse" />
            24-HOUR CORRIDOR POSSESSION & TRAIN HEADWAY GANTT TIMELINE
          </h3>
          <p className="text-xs text-slate-400">
            Interactive visual solver map showing synchronized maintenance blocks vs train paths
          </p>
        </div>

        <div className="flex items-center space-x-2 text-xs">
          <span className="text-slate-400 font-medium">Filter Subsystem:</span>
          {['ALL', 'SMMS', 'TDMS', 'TMS'].map((dept) => (
            <button
              key={dept}
              onClick={() => setFilterDept(dept)}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all ${
                filterDept === dept
                  ? 'bg-sky-500/20 text-sky-400 border-sky-500/40 shadow-sm shadow-sky-500/20'
                  : 'bg-[#131D33] text-slate-400 border-[#1F2E4D] hover:text-white'
              }`}
            >
              {dept}
            </button>
          ))}
        </div>
      </div>

      {/* Gantt Timeline Container */}
      <div className="overflow-x-auto">
        <div className="min-w-[900px]">
          {/* 24-Hour Time Header */}
          <div className="grid grid-cols-12 gap-0 border-b border-[#1F2E4D] pb-2 pl-48 text-[11px] font-mono text-slate-400">
            {Array.from({ length: 12 }).map((_, i) => {
              const hour = i * 2;
              return (
                <div key={hour} className="text-left border-l border-[#1F2E4D]/60 pl-1">
                  {hour.toString().padStart(2, '0')}:00
                </div>
              );
            })}
          </div>

          {/* Section Rows */}
          <div className="divide-y divide-[#1F2E4D]/60 relative">
            {sections.map((section) => {
              const secBlocks = filteredBlocks.filter((b) =>
                b.track_section.toLowerCase().includes(section.toLowerCase().split('-')[0]) ||
                b.track_section.toLowerCase() === section.toLowerCase()
              );

              return (
                <div key={section} className="flex items-center h-16 relative group hover:bg-[#131D33]/30 transition-colors">
                  {/* Section Label */}
                  <div className="w-48 shrink-0 pr-3 flex flex-col justify-center">
                    <span className="text-xs font-bold text-white truncate">{section}</span>
                    <span className="text-[10px] text-slate-400 font-mono">
                      {secBlocks.length} Active Block{secBlocks.length !== 1 ? 's' : ''}
                    </span>
                  </div>

                  {/* 24h Lane Bar */}
                  <div className="flex-1 h-12 bg-[#0B1120] border border-[#1F2E4D] rounded-xl relative overflow-hidden">
                    {/* Hour grid vertical markings */}
                    <div className="absolute inset-0 grid grid-cols-12 pointer-events-none">
                      {Array.from({ length: 12 }).map((_, i) => (
                        <div key={i} className="border-l border-[#1F2E4D]/30 h-full" />
                      ))}
                    </div>

                    {/* Night Shadow prime zone (01:00 to 05:00) */}
                    <div
                      className="absolute top-0 bottom-0 bg-sky-500/5 border-x border-sky-500/20 pointer-events-none"
                      style={{ left: `${(1 / 24) * 100}%`, width: `${(4 / 24) * 100}%` }}
                    >
                      <span className="text-[8px] uppercase tracking-widest text-sky-400/40 pl-1 font-mono">
                        Night Shadow Slot
                      </span>
                    </div>

                    {/* Scheduled Maintenance Blocks */}
                    {secBlocks.map((block) => {
                      const startPct = timeToPercent(block.start_time);
                      const endPct = timeToPercent(block.end_time);
                      const widthPct = Math.max(endPct - startPct, 3.5);

                      const isJoint = (block.departments_involved || []).length > 1;
                      const hasPower = block.power_shutdown;

                      return (
                        <div
                          key={block.block_code}
                          onClick={() => {
                            setSelectedBlockDetail(block);
                            if (onSelectBlock) onSelectBlock(block);
                          }}
                          className={`absolute top-1 bottom-1 rounded-lg px-2 flex items-center justify-between cursor-pointer transition-all duration-200 hover:scale-y-105 z-10 border shadow-lg ${
                            isJoint
                              ? 'bg-gradient-to-r from-purple-600/80 to-indigo-600/80 border-purple-400 text-white hover:border-purple-300 shadow-purple-500/20'
                              : hasPower
                              ? 'bg-gradient-to-r from-amber-600/80 to-orange-600/80 border-amber-400 text-white hover:border-amber-300 shadow-amber-500/20'
                              : 'bg-gradient-to-r from-sky-600/80 to-blue-600/80 border-sky-400 text-white hover:border-sky-300 shadow-sky-500/20'
                          }`}
                          style={{
                            left: `${startPct}%`,
                            width: `${widthPct}%`
                          }}
                          title={`${block.block_code} (${block.start_time} - ${block.end_time})`}
                        >
                          <div className="flex items-center space-x-1.5 truncate">
                            {hasPower && <Zap className="w-3 h-3 text-amber-300 shrink-0" />}
                            <span className="text-[11px] font-bold tracking-tight truncate">
                              {block.block_code}
                            </span>
                          </div>
                          <span className="text-[9px] font-mono opacity-90 hidden sm:inline">
                            {block.duration_minutes}m
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Legend & Summary Footer */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-[#1F2E4D] text-xs">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-1.5">
            <div className="w-3.5 h-3.5 rounded bg-gradient-to-r from-purple-500 to-indigo-500 border border-purple-400" />
            <span className="text-slate-300 font-medium">Integrated Multi-Dept Block (Signal + Traction)</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <div className="w-3.5 h-3.5 rounded bg-gradient-to-r from-amber-500 to-orange-500 border border-amber-400" />
            <span className="text-slate-300 font-medium">OHE Traction Power Block (25kV Isolated)</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <div className="w-3.5 h-3.5 rounded bg-gradient-to-r from-sky-500 to-blue-500 border border-sky-400" />
            <span className="text-slate-300 font-medium">Signalling & Track Possession</span>
          </div>
        </div>

        <div className="text-slate-400 text-[11px] font-mono">
          Total Blocks Scheduled: <strong className="text-emerald-400">{filteredBlocks.length}</strong>
        </div>
      </div>

      {/* Detailed Selected Block Modal/Drawer */}
      {selectedBlockDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="bg-[#0E172A] border border-[#1F2E4D] rounded-2xl w-full max-w-2xl shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-[#1F2E4D] pb-3">
              <div className="flex items-center space-x-3">
                <div className="p-2 rounded-xl bg-purple-500/20 border border-purple-500/30 text-purple-400">
                  <TrainTrack className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="text-base font-bold text-white">{selectedBlockDetail.block_code}</h4>
                  <p className="text-xs text-slate-400">{selectedBlockDetail.track_section}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedBlockDetail(null)}
                className="text-slate-400 hover:text-white px-2 py-1 rounded-lg hover:bg-[#131D33]"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="p-3 rounded-xl bg-[#131D33] border border-[#1F2E4D]">
                <div className="text-[11px] text-slate-400 uppercase font-semibold">Possession Window</div>
                <div className="text-sm font-bold text-sky-400 font-mono mt-1">
                  {selectedBlockDetail.start_time} - {selectedBlockDetail.end_time}
                </div>
                <div className="text-xs text-slate-400 font-mono">{selectedBlockDetail.duration_minutes} Minutes</div>
              </div>

              <div className="p-3 rounded-xl bg-[#131D33] border border-[#1F2E4D]">
                <div className="text-[11px] text-slate-400 uppercase font-semibold">Delays Averted</div>
                <div className="text-sm font-bold text-emerald-400 font-mono mt-1">
                  +{selectedBlockDetail.delays_averted_minutes} min
                </div>
                <div className="text-xs text-slate-400">Punctuality Preserved</div>
              </div>

              <div className="p-3 rounded-xl bg-[#131D33] border border-[#1F2E4D]">
                <div className="text-[11px] text-slate-400 uppercase font-semibold">Power Isolation</div>
                <div className="text-sm font-bold text-amber-400 mt-1 flex items-center gap-1">
                  {selectedBlockDetail.power_shutdown ? 'OHE 25kV SHUTDOWN' : 'Live Line (No Cut)'}
                </div>
                <div className="text-xs text-slate-400">Traction Safety</div>
              </div>
            </div>

            {/* Synchronized Maintenance Tasks Included */}
            <div>
              <h5 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                Bundled Maintenance Tasks ({selectedBlockDetail.tasks_included?.length || 0})
              </h5>
              <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                {(selectedBlockDetail.tasks_included || []).map((t, idx) => (
                  <div
                    key={idx}
                    className="p-2.5 rounded-xl bg-[#131D33] border border-[#1F2E4D] flex items-center justify-between text-xs"
                  >
                    <div>
                      <div className="font-semibold text-white">
                        {t.task_id} • {t.asset_id} ({t.asset_type})
                      </div>
                      <div className="text-slate-400 text-[11px]">{t.issue_type} • Severity: {t.severity}</div>
                    </div>
                    <div className="text-right">
                      <span className="font-mono text-purple-400 font-bold">{t.source}</span>
                      <div className="text-[10px] text-slate-400">{t.estimated_duration_minutes} min</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Affected Trains & Mitigation Action */}
            <div>
              <h5 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                Train Traffic Regulated & Mitigated ({selectedBlockDetail.affected_trains_details?.length || 0})
              </h5>
              <div className="space-y-2 max-h-36 overflow-y-auto pr-1">
                {(selectedBlockDetail.affected_trains_details || []).map((tr, idx) => (
                  <div
                    key={idx}
                    className="p-2.5 rounded-xl bg-[#131D33] border border-[#1F2E4D] flex items-center justify-between text-xs"
                  >
                    <div>
                      <div className="font-bold text-sky-400">
                        {tr.train_id} - {tr.train_name} ({tr.train_type})
                      </div>
                      <div className="text-slate-400 text-[11px]">Action: {tr.action_taken}</div>
                    </div>
                    <span className="px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 text-[11px] font-mono">
                      +{tr.delay_impact_minutes}m Regulated
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-3 border-t border-[#1F2E4D] flex justify-end space-x-3">
              <button
                onClick={() => setSelectedBlockDetail(null)}
                className="px-4 py-2 rounded-xl bg-[#131D33] text-xs font-semibold text-slate-300 hover:text-white"
              >
                Close View
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
