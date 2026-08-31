import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import {
  Clock,
  RotateCcw,
  Upload,
  Layers,
  Sparkles,
  MapPin,
  CheckCircle2,
  AlertTriangle,
  Train,
  Bell,
  SlidersHorizontal
} from 'lucide-react';
import { resetDatabase } from '../services/api';

export const Header = () => {
  const { activePage, division, setDivision, refreshStatus, showToast, openUploadModal } = useApp();
  const [currentTime, setCurrentTime] = useState('');
  const [isResetting, setIsResetting] = useState(false);
  const [notificationCount, setNotificationCount] = useState(3);

  useEffect(() => {
    const updateTimer = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString('en-IN', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: false
        }) + ' IST'
      );
    };
    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleResetData = async () => {
    if (window.confirm('Re-seed database from Pune Division standardized datasets?')) {
      try {
        setIsResetting(true);
        await resetDatabase();
        await refreshStatus();
        showToast('Database reset and re-seeded with 300 Indian Railways Pune Division records!', 'success');
      } catch (err) {
        showToast('Failed to reset dataset: ' + err.message, 'error');
      } finally {
        setIsResetting(false);
      }
    }
  };

  const getPageMeta = () => {
    switch (activePage) {
      case 'dashboard':
        return { title: 'Railway Block Planning', subtitle: '' };
      case 'tms':
        return { title: 'Train Management System (TMS)', subtitle: '' };
      case 'smms':
        return { title: 'Signal Maintenance Management System (SMMS)', subtitle: '' };
      case 'tdms':
        return { title: 'Traction Distribution Management System (TDMS)', subtitle: '' };
      case 'prioritizer':
        return { title: 'AI Maintenance Risk Prioritizer', subtitle: '' };
      case 'conflicts':
        return { title: 'Train Conflict Detection & Timetable Analysis', subtitle: '' };
      case 'optimizer':
        return { title: 'Block Optimization Engine', subtitle: '' };
      case 'blockplan':
        return { title: 'Optimized Maintenance Block Schedule & Gantt', subtitle: '24-hour synchronized track possession and power isolation plan' };
      case 'analytics':
        return { title: 'Executive Operations Analytics & ROI', subtitle: 'Delay reduction benchmarks, punctuality retention & corridor health' };
      default:
        return { title: 'Railway Maintenance Block Optimizer', subtitle: 'Indian Railways - Pune Sub-Division' };
    }
  };

  const meta = getPageMeta();

  return (
    <header className="h-20 bg-[#080E1C]/90 backdrop-blur-xl border-b border-[#1B2945] px-6 flex items-center justify-between sticky top-0 z-20 shadow-md">
      {/* Page Title & Breadcrumb */}
      <div className="flex items-center space-x-3">
        <div className="flex flex-col">
          <div className="flex items-center space-x-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-sky-400 font-mono flex items-center gap-1">
              
              INDIAN RAILWAYS
            </span>
            
            <span className="text-[11px] text-slate-400 font-semibold font-mono">PUNE DIVISION</span>
          </div>
          <h2 className="text-lg lg:text-xl font-extrabold text-white tracking-tight mt-0.5">{meta.title}</h2>
          <p className="text-[11px] text-slate-400 hidden sm:block">{meta.subtitle}</p>
        </div>
      </div>

      {/* Header Actions & Telemetry */}
      <div className="flex items-center space-x-3">
        {/* Live IST Clock */}
        <div className="hidden md:flex items-center space-x-2 px-3 py-1.5 rounded-xl bg-[#111C33] border border-[#1F2E4D] text-xs font-mono text-slate-200 shadow-inner">
          <Clock className="w-3.5 h-3.5 text-sky-400" />
          <span className="font-bold">{currentTime || '18:45:00 IST'}</span>
        </div>

        {/* Section Scope Selector */}
        <div className="hidden lg:flex items-center space-x-2 px-3 py-1.5 rounded-xl bg-[#111C33] border border-[#1F2E4D] text-xs text-slate-200 shadow-inner">
          <MapPin className="w-3.5 h-3.5 text-amber-400 shrink-0" />
          <div
            className="bg-transparent border-none text-xs font-semibold text-slate-200 focus:outline-none  pr-1"
          >
            <div value="Pune Division (Central Railway)" className="bg-[#0B1120] text-slate-200">
              Pune Division
            </div>
            
          </div>
        </div>

        {/* Action Buttons */}
        <button
          onClick={() => openUploadModal('MERGED')}
          className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-sky-500/15 hover:bg-sky-500/25 text-sky-300 border border-sky-500/35 text-xs font-bold transition-all cursor-pointer shadow-sm"
        >
          <Upload className="w-3.5 h-3.5" />
          <span>Upload CSV</span>
        </button>

        <button
          onClick={handleResetData}
          disabled={isResetting}
          title="Re-seed clean dataset"
          className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-[#111C33] hover:bg-[#1A284A] text-slate-300 hover:text-white border border-[#1F2E4D] text-xs font-medium transition-all cursor-pointer shadow-sm"
        >
          <RotateCcw className={`w-3.5 h-3.5 ${isResetting ? 'animate-spin text-sky-400' : ''}`} />
          <span className="hidden sm:inline">Reset DB</span>
        </button>

      
       
      </div>
    </header>
  );
};
