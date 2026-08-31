import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { getOptimizedBlocks, updateBlockStatus, deleteBlock } from '../services/api';
import { BlockGanttChart } from '../components/BlockGanttChart';
import {
  CalendarCheck,
  CheckCircle2,
  XCircle,
  Download,
  Send,
  Trash2,
  Zap,
  Radio,
  TrainTrack,
  FileSpreadsheet,
  Printer,
  Sparkles
} from 'lucide-react';
import { StatusBadge } from '../components/MetricCard';

export const OptimizedBlockPlanPage = () => {
  const { showToast, setActivePage } = useApp();
  const [blocks, setBlocks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [targetDate, setTargetDate] = useState('2026-09-01');

  const fetchBlocks = async () => {
    try {
      setLoading(true);
      const res = await getOptimizedBlocks({ target_date: targetDate });
      setBlocks(res.data);
    } catch (err) {
      console.warn('Block fetch note:', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBlocks();
  }, [targetDate]);

  const handleStatusUpdate = async (blockId, newStatus) => {
    try {
      await updateBlockStatus(blockId, newStatus);
      showToast(`Block plan status updated to ${newStatus}`, 'success');
      fetchBlocks();
    } catch (err) {
      showToast('Failed to update block: ' + err.message, 'error');
    }
  };

  const handleApproveAll = async () => {
    try {
      for (const b of blocks) {
        if (b.id) await updateBlockStatus(b.id, 'Approved');
      }
      showToast('All corridor maintenance blocks approved for dispatch!', 'success');
      fetchBlocks();
    } catch (err) {
      showToast('Error approving blocks: ' + err.message, 'error');
    }
  };

  const handleExportCSV = () => {
    if (!blocks || blocks.length === 0) {
      showToast('No block plans to export.', 'error');
      return;
    }
    const headers = 'Block_Code,Track_Section,Date,Start_Time,End_Time,Duration_Mins,Power_Shutdown,Departments,Status,Delays_Averted_Mins\n';
    const rows = blocks.map((b) =>
      `"${b.block_code}","${b.track_section}","${b.target_date}","${b.start_time}","${b.end_time}",${b.duration_minutes},"${b.power_shutdown ? 'Yes' : 'No'}","${(b.departments_involved || []).join(';')}","${b.status}",${b.delays_averted_minutes}`
    ).join('\n');

    const blob = new Blob([headers + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Pune_Division_Optimized_Block_Plan_${targetDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Block schedule exported to CSV!', 'success');
  };

  const handleDispatchSCOR = () => {
    showToast('Simulated Dispatch: Block authority order pushed to Pune SCOR & Section Controllers!', 'success');
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Top Banner & Dispatch Actions */}
      <div className="p-6 rounded-2xl bg-[#0E172A] border border-[#1F2E4D] shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 rounded-xl bg-purple-500/15 border border-purple-500/30 text-purple-400">
            <CalendarCheck className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">Integrated Maintenance Block Schedule</h2>
            <p className="text-xs text-slate-400">
              Synchronized 24-hour track possessions, power blocks, and train traffic regulation orders
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={handleExportCSV}
            className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-[#131D33] hover:bg-[#1B2744] text-slate-200 border border-[#1F2E4D] text-xs font-semibold transition-all cursor-pointer"
          >
            <Download className="w-4 h-4 text-sky-400" />
            <span>Export CSV</span>
          </button>

          <button
            onClick={handleApproveAll}
            className="flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-lg shadow-emerald-600/20 transition-all cursor-pointer"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>Approve All Blocks</span>
          </button>

          <button
            onClick={handleDispatchSCOR}
            className="flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-500 hover:to-indigo-500 text-white text-xs font-bold shadow-lg shadow-sky-600/20 transition-all cursor-pointer"
          >
            <Send className="w-4 h-4" />
            <span>Push to SCOR / Stations</span>
          </button>
        </div>
      </div>

      {/* 24-Hour Gantt Timeline Visualizer */}
      <BlockGanttChart blocks={blocks} />

      {/* Block Plan Table */}
      <div className="p-5 rounded-2xl bg-[#0E172A] border border-[#1F2E4D] shadow-xl overflow-hidden">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <span>Possession Authority Orders ({blocks.length} Scheduled Windows)</span>
          </h3>
          <span className="text-xs text-slate-400 font-mono">Date: {targetDate}</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#131D33] text-slate-400 font-mono uppercase text-[11px] border-b border-[#1F2E4D]">
              <tr>
                <th className="py-3 px-4">Block Code</th>
                <th className="py-3 px-4">Track Section</th>
                <th className="py-3 px-4">Possession Window</th>
                <th className="py-3 px-4">Duration</th>
                <th className="py-3 px-4">Departments</th>
                <th className="py-3 px-4">Power Isolation</th>
                <th className="py-3 px-4">Delays Saved</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Approval Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1F2E4D]/60 text-slate-200">
              {loading ? (
                <tr>
                  <td colSpan="9" className="text-center py-8 text-slate-400">
                    Loading optimized block plans...
                  </td>
                </tr>
              ) : blocks.length === 0 ? (
                <tr>
                  <td colSpan="9" className="text-center py-8 text-slate-400">
                    No block plans scheduled. Run the Optimization Engine first.
                  </td>
                </tr>
              ) : (
                blocks.map((block) => (
                  <tr key={block.id || block.block_code} className="hover:bg-[#131D33]/40 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-sky-400">
                      {block.block_code}
                    </td>
                    <td className="py-3 px-4 font-semibold text-white">
                      {block.track_section}
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-200">
                      {block.start_time} - {block.end_time}
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-300">
                      {block.duration_minutes} min
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center space-x-1">
                        {(block.departments_involved || []).map((d) => (
                          <span
                            key={d}
                            className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-[#131D33] text-slate-300 border border-[#1F2E4D]"
                          >
                            {d}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      {block.power_shutdown ? (
                        <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px] font-bold font-mono">
                          <Zap className="w-3 h-3 text-amber-400" />
                          <span>25kV ISOLATED</span>
                        </span>
                      ) : (
                        <span className="text-[11px] text-slate-400">No Power Cut</span>
                      )}
                    </td>
                    <td className="py-3 px-4 font-mono font-bold text-emerald-400">
                      +{block.delays_averted_minutes} min
                    </td>
                    <td className="py-3 px-4">
                      <StatusBadge status={block.status} />
                    </td>
                    <td className="py-3 px-4 text-right space-x-2">
                      <button
                        onClick={() => handleStatusUpdate(block.id, 'Approved')}
                        className="px-2.5 py-1 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 text-[11px] font-semibold transition-colors cursor-pointer"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => handleStatusUpdate(block.id, 'Rejected')}
                        className="px-2.5 py-1 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 text-[11px] font-semibold transition-colors cursor-pointer"
                      >
                        Reject
                      </button>
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
