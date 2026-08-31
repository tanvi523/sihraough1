import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { getTractionTasks, updateTractionTaskStatus, createTractionTask, deleteTractionTask, clearAllTractionTasks } from '../services/api';
import {
  Zap,
  Search,
  Plus,
  Trash2,
  UploadCloud,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Filter,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  ShieldAlert,
  Flame
} from 'lucide-react';
import { StatusBadge } from '../components/MetricCard';

export const TractionMaintenancePage = () => {
  const { openUploadModal, showToast } = useApp();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedSection, setSelectedSection] = useState('');
  const [selectedPowerShutdown, setSelectedPowerShutdown] = useState('');
  const [selectedSeverity, setSelectedSeverity] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');

  // Sorting state
  const [sortBy, setSortBy] = useState('health_score');
  const [sortOrder, setSortOrder] = useState('asc');

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newTask, setNewTask] = useState({
    task_id: 'TDMS-' + Math.floor(1000 + Math.random() * 9000),
    asset_id: 'OHE-' + Math.floor(1000 + Math.random() * 9000),
    city: 'Pune',
    track_section: 'Pune Jn-Shivajinagar',
    asset_type: 'OHE',
    asset_condition: 'Fair',
    health_score: 52.0,
    issue_type: 'Section Insulator Damage',
    severity: 'High',
    last_maintenance_date: '2026-07-20',
    next_due_date: '2026-09-05',
    estimated_duration_minutes: 120,
    maintenance_status: 'Pending',
    asset_criticality: 'High',
    safety_impact: 'High',
    fault_status: 'Normal',
    power_shutdown_required: 'Yes'
  });

  const fetchTractionTasks = async () => {
    try {
      setLoading(true);
      const params = {
        sort_by: sortBy,
        sort_order: sortOrder
      };
      if (search) params.search = search;
      if (selectedSection) params.section = selectedSection;
      if (selectedPowerShutdown) params.power_shutdown = selectedPowerShutdown;
      if (selectedSeverity) params.severity = selectedSeverity;
      if (selectedStatus) params.status = selectedStatus;

      const res = await getTractionTasks(params);
      setTasks(res.data);
    } catch (err) {
      console.warn('TDMS fetch note:', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTractionTasks();
  }, [search, selectedSection, selectedPowerShutdown, selectedSeverity, selectedStatus, sortBy, sortOrder]);

  const handleSort = (field) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
  };

  const renderSortIndicator = (field) => {
    if (sortBy !== field) {
      return <ArrowUpDown className="w-3 h-3 text-slate-500 opacity-60 inline ml-1" />;
    }
    return sortOrder === 'asc' ? (
      <ArrowUp className="w-3 h-3 text-amber-400 inline ml-1 font-bold" />
    ) : (
      <ArrowDown className="w-3 h-3 text-amber-400 inline ml-1 font-bold" />
    );
  };

  const handleStatusChange = async (taskId, newStatus) => {
    try {
      await updateTractionTaskStatus(taskId, newStatus);
      showToast(`Traction Task ${taskId} status updated to ${newStatus}`, 'success');
      fetchTractionTasks();
    } catch (err) {
      showToast('Failed to update status: ' + err.message, 'error');
    }
  };

  const handleDelete = async (taskId) => {
    if (window.confirm(`Delete traction maintenance task ${taskId}?`)) {
      try {
        await deleteTractionTask(taskId);
        showToast(`Traction task ${taskId} removed successfully`, 'success');
        fetchTractionTasks();
      } catch (err) {
        showToast('Failed to delete task: ' + err.message, 'error');
      }
    }
  };

  const handleClearAll = async () => {
    if (window.confirm('Are you sure you want to clear ALL TDMS traction records?')) {
      try {
        await clearAllTractionTasks();
        showToast('All TDMS records cleared successfully', 'success');
        fetchTractionTasks();
      } catch (err) {
        showToast('Failed to clear TDMS: ' + err.message, 'error');
      }
    }
  };

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    try {
      await createTractionTask(newTask);
      showToast(`Traction task ${newTask.task_id} logged successfully!`, 'success');
      setIsAddModalOpen(false);
      fetchTractionTasks();
    } catch (err) {
      showToast('Failed to create task: ' + err.message, 'error');
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header Banner */}
      <div className="p-6 rounded-2xl bg-[#0E172A] border border-[#1F2E4D] shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-400">
            <Zap className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">Traction Distribution Management (TDMS)</h2>
            <p className="text-xs text-slate-400">
              Quick Overview of Traction Maintenance Records
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          {tasks.length > 0 && (
            <button
              onClick={handleClearAll}
              className="flex items-center space-x-1.5 px-3 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 text-xs font-semibold transition-all cursor-pointer"
              title="Clear all TDMS records"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Clear All</span>
            </button>
          )}
          <button
            onClick={() => openUploadModal('TDMS')}
            className="flex items-center space-x-2 px-3.5 py-2 rounded-xl bg-[#131D33] hover:bg-[#1B2744] text-slate-200 border border-[#1F2E4D] text-xs font-semibold transition-all cursor-pointer"
          >
            <UploadCloud className="w-4 h-4 text-amber-400" />
            <span>Upload TDMS CSV</span>
          </button>
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center space-x-2 px-4 py-2 rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white text-xs font-semibold shadow-lg shadow-amber-600/20 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Log Traction Fault</span>
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="p-4 rounded-2xl bg-[#0E172A] border border-[#1F2E4D] shadow-xl grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            placeholder="Search OHE, Feeder, Issue..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs rounded-xl glass-input placeholder-slate-500"
          />
        </div>

        <select
          value={selectedSection}
          onChange={(e) => setSelectedSection(e.target.value)}
          aria-label="Filter by track section"
          className="px-3 py-2 text-xs rounded-xl glass-input cursor-pointer"
        >
          <option value="" className="bg-[#0E172A]">All Track Sections</option>
          <option value="Pune Jn-Shivajinagar" className="bg-[#0E172A]">Pune Jn ↔ Shivajinagar</option>
          <option value="Shivajinagar-Khadki" className="bg-[#0E172A]">Shivajinagar ↔ Khadki</option>
          <option value="Khadki-Dapodi" className="bg-[#0E172A]">Khadki ↔ Dapodi</option>
          <option value="Dehu Road-Talegaon" className="bg-[#0E172A]">Dehu Road ↔ Talegaon</option>
          <option value="Manjari-Loni" className="bg-[#0E172A]">Manjari ↔ Loni</option>
        </select>

        <select
          value={selectedPowerShutdown}
          onChange={(e) => setSelectedPowerShutdown(e.target.value)}
          aria-label="Filter by power shutdown requirement"
          className="px-3 py-2 text-xs rounded-xl glass-input cursor-pointer"
        >
          <option value="" className="bg-[#0E172A]">All Power Block Types</option>
          <option value="Yes" className="bg-[#0E172A]">⚡ Power Shutdown Required (Yes)</option>
          <option value="No" className="bg-[#0E172A]">No Shutdown Required (Live Line)</option>
        </select>

        <select
          value={selectedSeverity}
          onChange={(e) => setSelectedSeverity(e.target.value)}
          aria-label="Filter by severity level"
          className="px-3 py-2 text-xs rounded-xl glass-input cursor-pointer"
        >
          <option value="" className="bg-[#0E172A]">All Severities</option>
          <option value="Critical" className="bg-[#0E172A]">Critical Severity</option>
          <option value="High" className="bg-[#0E172A]">High Severity</option>
          <option value="Medium" className="bg-[#0E172A]">Medium Severity</option>
          <option value="Low" className="bg-[#0E172A]">Low Severity</option>
        </select>

        <button
          onClick={() => {
            setSearch('');
            setSelectedSection('');
            setSelectedPowerShutdown('');
            setSelectedSeverity('');
            setSelectedStatus('');
          }}
          className="px-3 py-2 rounded-xl bg-[#131D33] hover:bg-[#1B2744] text-xs font-semibold text-slate-300 border border-[#1F2E4D] transition-colors"
        >
          Reset Filters
        </button>
      </div>

      {/* Traction Tasks Table */}
      <div className="p-5 rounded-2xl bg-[#0E172A] border border-[#1F2E4D] shadow-xl overflow-hidden">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <h3 className="text-sm font-bold text-white">Traction Distribution Tasks</h3>
            <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30 text-xs font-mono font-bold">
              Showing {tasks.length} records
            </span>
          </div>
     
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#131D33] text-slate-400 font-mono uppercase text-[11px] border-b border-[#1F2E4D] select-none">
              <tr>
                <th onClick={() => handleSort('asset_id')} className="py-3 px-4 cursor-pointer hover:text-white">
                  Task / Asset ID {renderSortIndicator('asset_id')}
                </th>
                <th onClick={() => handleSort('asset_type')} className="py-3 px-4 cursor-pointer hover:text-white">
                  Asset Type {renderSortIndicator('asset_type')}
                </th>
                <th onClick={() => handleSort('track_section')} className="py-3 px-4 cursor-pointer hover:text-white">
                  Track Section {renderSortIndicator('track_section')}
                </th>
                <th onClick={() => handleSort('issue_type')} className="py-3 px-4 cursor-pointer hover:text-white">
                  Issue Description {renderSortIndicator('issue_type')}
                </th>
                <th onClick={() => handleSort('power_shutdown_required')} className="py-3 px-4 cursor-pointer hover:text-white">
                  Power Shutdown {renderSortIndicator('power_shutdown_required')}
                </th>
                <th onClick={() => handleSort('health_score')} className="py-3 px-4 cursor-pointer hover:text-white">
                  Health Score {renderSortIndicator('health_score')}
                </th>
                <th onClick={() => handleSort('estimated_duration_minutes')} className="py-3 px-4 cursor-pointer hover:text-white">
                  Duration {renderSortIndicator('estimated_duration_minutes')}
                </th>
                <th className="py-3 px-4">Status Action</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1F2E4D]/60 text-slate-200">
              {loading ? (
                <tr>
                  <td colSpan="9" className="text-center py-8 text-slate-400">
                    Loading traction assets...
                  </td>
                </tr>
              ) : tasks.length === 0 ? (
                <tr>
                  <td colSpan="9" className="text-center py-8 text-slate-400">
                    No traction maintenance records found.
                  </td>
                </tr>
              ) : (
                tasks.map((task) => (
                  <tr key={task.id || task.task_id} className="hover:bg-[#131D33]/40 transition-colors">
                    <td className="py-3 px-4">
                      <div className="font-mono font-bold text-amber-400">{task.asset_id}</div>
                      <div className="text-[10px] text-slate-400 font-mono">{task.task_id}</div>
                    </td>
                    <td className="py-3 px-4 font-semibold text-white">
                      {task.asset_type}
                    </td>
                    <td className="py-3 px-4 text-slate-300">
                      {task.track_section}
                    </td>
                    <td className="py-3 px-4">
                      <div className="text-slate-200 font-medium">{task.issue_type}</div>
                      <div className="mt-0.5">
                        <span
                          className={`text-[10px] font-bold px-1.5 py-0.2 rounded ${
                            task.severity === 'Critical'
                              ? 'bg-rose-500/20 text-rose-300'
                              : task.severity === 'High'
                              ? 'bg-amber-500/20 text-amber-300'
                              : 'bg-sky-500/20 text-sky-300'
                          }`}
                        >
                          {task.severity}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      {task.power_shutdown_required === 'Yes' ? (
                        <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px] font-bold font-mono">
                          <Zap className="w-3 h-3 text-amber-400" />
                          <span>YES</span>
                        </span>
                      ) : (
                        <span className="text-[11px] text-slate-400 font-mono">NO</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center space-x-2">
                        <div className="w-16 bg-[#131D33] rounded-full h-2 overflow-hidden border border-[#1F2E4D]">
                          <div
                            className={`h-full rounded-full ${
                              task.health_score < 40
                                ? 'bg-rose-500'
                                : task.health_score < 70
                                ? 'bg-amber-400'
                                : 'bg-emerald-400'
                            }`}
                            style={{ width: `${task.health_score}%` }}
                          />
                        </div>
                        <span className="font-mono font-bold text-xs">{task.health_score}%</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-300">
                      {task.estimated_duration_minutes}m
                    </td>
                    <td className="py-3 px-4">
                      <select
                        value={task.maintenance_status}
                        onChange={(e) => handleStatusChange(task.task_id, e.target.value)}
                        aria-label={`Update status for ${task.task_id}`}
                        className={`text-[11px] font-semibold px-2 py-1 rounded-lg border cursor-pointer focus:outline-none ${
                          task.maintenance_status === 'Completed'
                            ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                            : task.maintenance_status === 'In Progress'
                            ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                            : task.maintenance_status === 'Scheduled'
                            ? 'bg-sky-500/20 text-sky-300 border-sky-500/40'
                            : 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                        }`}
                      >
                        <option value="Pending" className="bg-[#0E172A] text-slate-200">Pending</option>
                        <option value="Scheduled" className="bg-[#0E172A] text-slate-200">Scheduled</option>
                        <option value="In Progress" className="bg-[#0E172A] text-slate-200">In Progress</option>
                        <option value="Completed" className="bg-[#0E172A] text-slate-200">Completed</option>
                      </select>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => handleDelete(task.task_id)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                        title="Delete traction task"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Log Traction Fault Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="bg-[#0E172A] border border-[#1F2E4D] rounded-2xl w-full max-w-lg shadow-2xl p-6 space-y-4">
            <h3 className="text-base font-bold text-white">Log OHE Traction Maintenance Task</h3>

            <form onSubmit={handleCreateSubmit} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">Asset ID</label>
                  <input
                    type="text"
                    required
                    value={newTask.asset_id}
                    onChange={(e) => setNewTask({ ...newTask, asset_id: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl glass-input font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">Asset Type</label>
                  <select
                    value={newTask.asset_type}
                    onChange={(e) => setNewTask({ ...newTask, asset_type: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl glass-input"
                  >
                    <option value="OHE">OHE Catenary & Contact Wire</option>
                    <option value="Feeder">25kV Feeder Line</option>
                    <option value="Transformer">Traction Substation Transformer</option>
                    <option value="Section Insulator">Section Insulator Assembly</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">Track Section</label>
                <select
                  value={newTask.track_section}
                  onChange={(e) => setNewTask({ ...newTask, track_section: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-xl glass-input"
                >
                  <option value="Pune Jn-Shivajinagar">Pune Jn ↔ Shivajinagar</option>
                  <option value="Shivajinagar-Khadki">Shivajinagar ↔ Khadki</option>
                  <option value="Khadki-Dapodi">Khadki ↔ Dapodi</option>
                  <option value="Dehu Road-Talegaon">Dehu Road ↔ Talegaon</option>
                  <option value="Manjari-Loni">Manjari ↔ Loni</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">Issue Type</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Section Insulator Damage"
                    value={newTask.issue_type}
                    onChange={(e) => setNewTask({ ...newTask, issue_type: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl glass-input"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">Power Shutdown Required?</label>
                  <select
                    value={newTask.power_shutdown_required}
                    onChange={(e) => setNewTask({ ...newTask, power_shutdown_required: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl glass-input"
                  >
                    <option value="Yes">Yes (Isolate 25kV OHE)</option>
                    <option value="No">No (Live Maintenance)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">Health Score (0-100)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={newTask.health_score}
                    onChange={(e) => setNewTask({ ...newTask, health_score: parseFloat(e.target.value) })}
                    className="w-full px-3 py-2 text-xs rounded-xl glass-input font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">Est. Duration (Minutes)</label>
                  <input
                    type="number"
                    min="15"
                    max="480"
                    value={newTask.estimated_duration_minutes}
                    onChange={(e) => setNewTask({ ...newTask, estimated_duration_minutes: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 text-xs rounded-xl glass-input font-mono"
                  />
                </div>
              </div>

              <div className="pt-4 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-[#131D33] text-xs font-semibold text-slate-300 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 text-xs font-bold text-white shadow-lg"
                >
                  Save Record
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
