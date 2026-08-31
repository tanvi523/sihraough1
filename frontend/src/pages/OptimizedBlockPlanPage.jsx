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

  const [confirmAction, setConfirmAction] = useState(null); // 'approve_all' or 'push_scor'

  const triggerApproveAll = () => {
    setConfirmAction('approve_all');
  };

  const triggerDispatchSCOR = () => {
    setConfirmAction('push_scor');
  };

  const executeConfirmedAction = async () => {
    if (confirmAction === 'approve_all') {
      await handleApproveAll();
    } else if (confirmAction === 'push_scor') {
      handleDispatchSCOR();
    }
    setConfirmAction(null);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Top Banner & Dispatch Actions */}
      <div className="p-6 rounded-2xl bg-[#0E172A] border border-[#1F2E4D] shadow-xl flex flex-col md:flex-row items-center justify-end gap-4">
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={handleExportCSV}
            className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-[#131D33] hover:bg-[#1B2744] text-slate-200 border border-[#1F2E4D] text-xs font-semibold transition-all cursor-pointer"
          >
            <Download className="w-4 h-4 text-sky-400" />
            <span>Export CSV</span>
          </button>

          <button
            onClick={triggerApproveAll}
            className="flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-lg shadow-emerald-600/20 transition-all cursor-pointer"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>Approve All Blocks</span>
          </button>

          <button
            onClick={triggerDispatchSCOR}
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

        <div className="overflow-x-auto max-h-[600px] overflow-y-auto relative">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-[#131D33] text-slate-400 font-mono uppercase text-[11px] border-b border-[#1F2E4D] sticky top-0 z-10">
              <tr>
                <th className="py-3 px-4 bg-[#131D33]">Block Code</th>
                <th className="py-3 px-4 bg-[#131D33]">Track Section</th>
                <th className="py-3 px-4 bg-[#131D33]">Possession Window</th>
                <th className="py-3 px-4 bg-[#131D33]">Duration</th>
                <th className="py-3 px-4 bg-[#131D33]">Departments</th>
                <th className="py-3 px-4 bg-[#131D33]">Power Isolation</th>
                <th className="py-3 px-4 bg-[#131D33]">Delays Saved</th>
                <th className="py-3 px-4 bg-[#131D33]">Status</th>
                <th className="py-3 px-4 bg-[#131D33] text-right">Approval Actions</th>
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
                blocks.map((block) => {
                  const statusLower = (block.status || '').toLowerCase();
                  let statusBadgeBg = 'bg-slate-500/20 text-slate-300 border-slate-500/30';
                  if (statusLower === 'proposed') {
                    statusBadgeBg = 'bg-amber-500/20 text-amber-300 border-amber-500/30';
                  } else if (statusLower === 'approved') {
                    statusBadgeBg = 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30';
                  } else if (statusLower === 'rejected') {
                    statusBadgeBg = 'bg-rose-500/20 text-rose-300 border-rose-500/30';
                  }

                  const isRowActioned = block.status === 'Approved' || block.status === 'Rejected';

                  return (
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
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold border ${statusBadgeBg}`}>
                          {block.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right space-x-2">
                        <button
                          onClick={() => handleStatusUpdate(block.id, 'Approved')}
                          disabled={isRowActioned}
                          className={`px-2.5 py-1 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 text-[11px] font-semibold transition-colors cursor-pointer ${
                            isRowActioned ? 'opacity-40 cursor-not-allowed hover:bg-emerald-500/20 text-emerald-400/60' : ''
                          }`}
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => handleStatusUpdate(block.id, 'Rejected')}
                          disabled={isRowActioned}
                          className={`px-2.5 py-1 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 text-[11px] font-semibold transition-colors cursor-pointer ${
                            isRowActioned ? 'opacity-40 cursor-not-allowed hover:bg-rose-500/20 text-rose-400/60' : ''
                          }`}
                        >
                          Reject
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Confirmation Modal */}
      {confirmAction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
          <div className="bg-[#0E172A] border border-[#1F2E4D] rounded-2xl w-full max-w-md shadow-2xl p-6 space-y-4">
            <h4 className="text-base font-bold text-white uppercase tracking-wider">Confirm Action</h4>
            <p className="text-sm text-slate-300">
              {confirmAction === 'approve_all'
                ? 'Are you sure you want to approve all blocks?'
                : 'Are you sure you want to push to SCOR/Stations?'}
            </p>
            <div className="pt-3 border-t border-[#1F2E4D] flex justify-end space-x-3">
              <button
                onClick={() => setConfirmAction(null)}
                className="px-4 py-2 rounded-xl bg-[#131D33] border border-[#1F2E4D] text-xs font-semibold text-slate-300 hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={executeConfirmedAction}
                className="px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold transition-all"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
