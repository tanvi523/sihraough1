import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { getTrains, createTrain, deleteTrain, clearAllTrains } from '../services/api';
import {
  TrainTrack,
  Search,
  Plus,
  Trash2,
  UploadCloud,
  Clock,
  Filter,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { StatusBadge } from '../components/MetricCard';

export const TrainSchedulePage = () => {
  const { openUploadModal, showToast } = useApp();
  const [trains, setTrains] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedSection, setSelectedSection] = useState('');
  const [selectedDirection, setSelectedDirection] = useState('');
  const [selectedPriority, setSelectedPriority] = useState('');

  // Sorting state
  const [sortBy, setSortBy] = useState('train_start_time');
  const [sortOrder, setSortOrder] = useState('asc');

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newTrain, setNewTrain] = useState({
    train_id: '',
    train_name: '',
    train_type: 'Express',
    train_priority: 'High',
    track_section: 'Pune Jn-Shivajinagar',
    train_start_time: '08:30',
    train_end_time: '10:45',
    direction: 'UP',
    city: 'Pune'
  });

  const fetchTrainsList = async () => {
    try {
      setLoading(true);
      const params = {
        sort_by: sortBy,
        sort_order: sortOrder
      };
      if (search) params.search = search;
      if (selectedSection) params.section = selectedSection;
      if (selectedDirection) params.direction = selectedDirection;
      if (selectedPriority) params.priority = selectedPriority;

      const res = await getTrains(params);
      setTrains(res.data);
    } catch (err) {
      console.warn('TMS fetch note:', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTrainsList();
  }, [search, selectedSection, selectedDirection, selectedPriority, sortBy, sortOrder]);

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
      <ArrowUp className="w-3 h-3 text-sky-400 inline ml-1 font-bold" />
    ) : (
      <ArrowDown className="w-3 h-3 text-sky-400 inline ml-1 font-bold" />
    );
  };

  const handleDelete = async (trainId) => {
    if (window.confirm(`Delete train schedule for ${trainId}?`)) {
      try {
        await deleteTrain(trainId);
        showToast(`Train ${trainId} removed successfully`, 'success');
        fetchTrainsList();
      } catch (err) {
        showToast('Failed to delete train: ' + err.message, 'error');
      }
    }
  };

  const handleClearAll = async () => {
    if (window.confirm('Are you sure you want to clear ALL TMS train schedules?')) {
      try {
        await clearAllTrains();
        showToast('All TMS train records cleared successfully', 'success');
        fetchTrainsList();
      } catch (err) {
        showToast('Failed to clear trains: ' + err.message, 'error');
      }
    }
  };

  const handleAddSubmit = async (e) => {
    e.preventDefault();
    try {
      await createTrain(newTrain);
      showToast(`Train schedule ${newTrain.train_id} created!`, 'success');
      setIsAddModalOpen(false);
      fetchTrainsList();
    } catch (err) {
      showToast('Failed to create train: ' + err.message, 'error');
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Top Banner & Actions */}
      <div className="p-6 rounded-2xl bg-[#0E172A] border border-[#1F2E4D] shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-sky-500/15 border border-sky-500/30 text-sky-400">
              <TrainTrack className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Train Management System (TMS)</h2>
              <p className="text-xs text-slate-400">Quick Overview of Train Schedules</p>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          {trains.length > 0 && (
            <button
              onClick={handleClearAll}
              className="flex items-center space-x-1.5 px-3 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 text-xs font-semibold transition-all cursor-pointer"
              title="Clear all TMS records"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Clear All</span>
            </button>
          )}
          <button
            onClick={() => openUploadModal('TMS')}
            className="flex items-center space-x-2 px-3.5 py-2 rounded-xl bg-[#131D33] hover:bg-[#1B2744] text-slate-200 border border-[#1F2E4D] text-xs font-semibold transition-all cursor-pointer"
          >
            <UploadCloud className="w-4 h-4 text-sky-400" />
            <span>Upload TMS CSV</span>
          </button>
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center space-x-2 px-4 py-2 rounded-xl bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-500 hover:to-indigo-500 text-white text-xs font-semibold shadow-lg shadow-sky-600/20 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add Train Schedule</span>
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="p-4 rounded-2xl bg-[#0E172A] border border-[#1F2E4D] shadow-xl grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        {/* Search */}
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            placeholder="Search Train Name, ID, Section..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs rounded-xl glass-input placeholder-slate-500"
          />
        </div>

        {/* Section Filter */}
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

        {/* Direction Filter */}
        <select
          value={selectedDirection}
          onChange={(e) => setSelectedDirection(e.target.value)}
          aria-label="Filter by train direction"
          className="px-3 py-2 text-xs rounded-xl glass-input cursor-pointer"
        >
          <option value="" className="bg-[#0E172A]">All Directions</option>
          <option value="UP" className="bg-[#0E172A]">UP (Towards Mumbai/Lonavala)</option>
          <option value="DOWN" className="bg-[#0E172A]">DOWN (Towards Pune/Daund)</option>
        </select>

        {/* Priority Filter */}
        <select
          value={selectedPriority}
          onChange={(e) => setSelectedPriority(e.target.value)}
          aria-label="Filter by train priority"
          className="px-3 py-2 text-xs rounded-xl glass-input cursor-pointer"
        >
          <option value="" className="bg-[#0E172A]">All Priorities</option>
          <option value="High" className="bg-[#0E172A]">High Priority</option>
          <option value="Medium" className="bg-[#0E172A]">Medium Priority</option>
          <option value="Low" className="bg-[#0E172A]">Low Priority</option>
        </select>

        {/* Reset Filter Button */}
        <button
          onClick={() => {
            setSearch('');
            setSelectedSection('');
            setSelectedDirection('');
            setSelectedPriority('');
          }}
          className="px-3 py-2 rounded-xl bg-[#131D33] hover:bg-[#1B2744] text-xs font-semibold text-slate-300 border border-[#1F2E4D] transition-colors"
        >
          Clear Filters
        </button>
      </div>

      {/* Train Timetables Data Table */}
      <div className="p-5 rounded-2xl bg-[#0E172A] border border-[#1F2E4D] shadow-xl overflow-hidden">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <h3 className="text-sm font-bold text-white">Scheduled Timetables</h3>
            <span className="px-2.5 py-0.5 rounded-full bg-sky-500/20 text-sky-400 border border-sky-500/30 text-xs font-mono font-bold">
              Showing {trains.length} records
            </span>
          </div>
         
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#131D33] text-slate-400 font-mono uppercase text-[11px] border-b border-[#1F2E4D] select-none">
              <tr>
                <th onClick={() => handleSort('train_id')} className="py-3 px-4 cursor-pointer hover:text-white">
                  Train ID {renderSortIndicator('train_id')}
                </th>
                <th onClick={() => handleSort('train_name')} className="py-3 px-4 cursor-pointer hover:text-white">
                  Train Name {renderSortIndicator('train_name')}
                </th>
                <th onClick={() => handleSort('train_type')} className="py-3 px-4 cursor-pointer hover:text-white">
                  Type {renderSortIndicator('train_type')}
                </th>
                <th onClick={() => handleSort('train_priority')} className="py-3 px-4 cursor-pointer hover:text-white">
                  Priority {renderSortIndicator('train_priority')}
                </th>
                <th onClick={() => handleSort('track_section')} className="py-3 px-4 cursor-pointer hover:text-white">
                  Track Section {renderSortIndicator('track_section')}
                </th>
                <th onClick={() => handleSort('train_start_time')} className="py-3 px-4 cursor-pointer hover:text-white">
                  Operating Window {renderSortIndicator('train_start_time')}
                </th>
                <th onClick={() => handleSort('direction')} className="py-3 px-4 cursor-pointer hover:text-white">
                  Direction {renderSortIndicator('direction')}
                </th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1F2E4D]/60 text-slate-200">
              {loading ? (
                <tr>
                  <td colSpan="8" className="text-center py-8 text-slate-400">
                    Loading train schedules...
                  </td>
                </tr>
              ) : trains.length === 0 ? (
                <tr>
                  <td colSpan="8" className="text-center py-8 text-slate-400">
                    No train schedules found. Upload a TMS CSV dataset or adjust filters.
                  </td>
                </tr>
              ) : (
                trains.map((train) => (
                  <tr key={train.id || train.train_id} className="hover:bg-[#131D33]/40 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-sky-400">
                      {train.train_id}
                    </td>
                    <td className="py-3 px-4 font-semibold text-white">
                      {train.train_name}
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded-md bg-[#131D33] text-slate-300 border border-[#1F2E4D]">
                        {train.train_type || 'Express'}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`px-2 py-0.5 rounded-md font-bold text-[10px] ${
                          (train.train_priority || '').toLowerCase() === 'high' || (train.train_priority || '').toLowerCase() === 'critical'
                            ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                            : (train.train_priority || '').toLowerCase() === 'medium'
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                            : 'bg-slate-500/20 text-slate-300 border border-slate-500/30'
                        }`}
                      >
                        {train.train_priority || 'High'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-300">
                      {train.track_section}
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-200">
                      {train.train_start_time} - {train.train_end_time}
                    </td>
                    <td className="py-3 px-4 font-mono font-bold">
                      <span className={train.direction === 'UP' ? 'text-sky-400' : 'text-emerald-400'}>
                        {train.direction || 'UP'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => handleDelete(train.train_id)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                        title="Delete train schedule"
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

      {/* Add Train Schedule Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="bg-[#0E172A] border border-[#1F2E4D] rounded-2xl w-full max-w-lg shadow-2xl p-6 space-y-4">
            <h3 className="text-base font-bold text-white">Add Train Timetable Schedule</h3>

            <form onSubmit={handleAddSubmit} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">Train ID</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. TR-0199"
                    value={newTrain.train_id}
                    onChange={(e) => setNewTrain({ ...newTrain, train_id: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl glass-input font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">Train Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Pragati Express"
                    value={newTrain.train_name}
                    onChange={(e) => setNewTrain({ ...newTrain, train_name: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl glass-input"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">Train Type</label>
                  <select
                    value={newTrain.train_type}
                    onChange={(e) => setNewTrain({ ...newTrain, train_type: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl glass-input"
                  >
                    <option value="Superfast">Superfast Express</option>
                    <option value="Express">Express</option>
                    <option value="Passenger">Passenger</option>
                    <option value="Local">Local Suburban</option>
                    <option value="Freight">Freight Corridor</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">Priority</label>
                  <select
                    value={newTrain.train_priority}
                    onChange={(e) => setNewTrain({ ...newTrain, train_priority: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl glass-input"
                  >
                    <option value="High">High Priority</option>
                    <option value="Medium">Medium Priority</option>
                    <option value="Low">Low Priority</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">Track Section</label>
                <select
                  value={newTrain.track_section}
                  onChange={(e) => setNewTrain({ ...newTrain, track_section: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-xl glass-input"
                >
                  <option value="Pune Jn-Shivajinagar">Pune Jn ↔ Shivajinagar</option>
                  <option value="Shivajinagar-Khadki">Shivajinagar ↔ Khadki</option>
                  <option value="Khadki-Dapodi">Khadki ↔ Dapodi</option>
                  <option value="Dehu Road-Talegaon">Dehu Road ↔ Talegaon</option>
                  <option value="Manjari-Loni">Manjari ↔ Loni</option>
                </select>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">Start Time</label>
                  <input
                    type="text"
                    placeholder="08:30"
                    value={newTrain.train_start_time}
                    onChange={(e) => setNewTrain({ ...newTrain, train_start_time: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl glass-input font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">End Time</label>
                  <input
                    type="text"
                    placeholder="10:45"
                    value={newTrain.train_end_time}
                    onChange={(e) => setNewTrain({ ...newTrain, train_end_time: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl glass-input font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">Direction</label>
                  <select
                    value={newTrain.direction}
                    onChange={(e) => setNewTrain({ ...newTrain, direction: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl glass-input"
                  >
                    <option value="UP">UP</option>
                    <option value="DOWN">DOWN</option>
                  </select>
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
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-sky-600 to-indigo-600 text-xs font-bold text-white shadow-lg"
                >
                  Create Schedule
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
