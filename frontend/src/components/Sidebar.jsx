import React from 'react';
import { useApp } from '../context/AppContext';
import {
  LayoutDashboard,
  TrainTrack,
  Radio,
  Zap,
  Sliders,
  Cpu,
  CalendarCheck,
  BarChart3,
  UploadCloud,
  Layers,
  Sparkles,
  ShieldAlert,
  Train,
  CheckCircle2
} from 'lucide-react';

export const Sidebar = () => {
  const { activePage, setActivePage, openUploadModal, datasetInfo } = useApp();

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, badge: '' },
    { id: 'tms', label: 'Train Schedule (TMS)', icon: TrainTrack, count: datasetInfo?.tms_records, color: 'text-sky-400' },
    { id: 'smms', label: 'Signal Maint. (SMMS)', icon: Radio, count: datasetInfo?.smms_records, color: 'text-emerald-400' },
    { id: 'tdms', label: 'Traction Maint. (TDMS)', icon: Zap, count: datasetInfo?.tdms_records, color: 'text-amber-400' },
    { id: 'prioritizer', label: 'Maintenance Prioritizer', icon: Sliders, badge: 'AI Score', color: 'text-indigo-400' },
    { id: 'conflicts', label: 'Conflict Detection', icon: ShieldAlert, badge: 'Section_ID', color: 'text-rose-400' },
    { id: 'optimizer', label: 'Optimization Engine', icon: Cpu, badge: 'Solver', color: 'text-purple-400' },
    { id: 'blockplan', label: 'Optimized Block Plan', icon: CalendarCheck, badge: datasetInfo?.blocks_scheduled > 0 ? `${datasetInfo.blocks_scheduled} Blks` : 'Ready', color: 'text-teal-400' },
    // { id: 'analytics', label: 'Analytics & ROI', icon: BarChart3, badge: 'ROI', color: 'text-emerald-400' },
  ];

  return (
    <aside className="w-72 bg-[#080E1C] border-r border-[#1B2945] flex flex-col justify-between h-screen sticky top-0 select-none z-30 shadow-2xl">
      {/* Brand Header */}
      <div>
        <div className="p-5 border-b border-[#1B2945] bg-gradient-to-b from-[#111C33] to-[#080E1C] relative overflow-hidden">
          {/* Subtle tricolor line accent at the top for Indian Railways authentic vibe */}
          

          <div className="flex items-center space-x-3.5 mt-1">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-sky-600 via-indigo-600 to-emerald-500 p-0.5 shadow-lg shadow-sky-600/20 flex items-center justify-center">
              <div className="w-full h-full bg-[#080E1C] rounded-[14px] flex items-center justify-center">
                <Train className="w-6 h-6 text-sky-400" />
              </div>
            </div>
            <div>
              <div className="flex items-center space-x-1.5">
                <h1 className="text-sm font-extrabold tracking-tight text-white">
                  INDIAN RAILWAYS
                </h1>
              </div>
              <p className="text-[11px] font-mono text-sky-400 tracking-wide flex items-center gap-1 font-semibold">
                <span>PUNE DIVISION</span>
                
            
              </p>
            </div>
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="p-3 space-y-1 overflow-y-auto max-h-[calc(100vh-270px)]">
        
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activePage === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActivePage(item.id)}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all duration-200 cursor-pointer ${
                  isActive
                    ? 'bg-gradient-to-r from-sky-500/20 to-indigo-500/10 text-white border border-sky-500/40 shadow-lg shadow-sky-500/10'
                    : 'text-slate-300 hover:text-white hover:bg-[#111C33] border border-transparent'
                }`}
              >
                <div className="flex items-center space-x-3 truncate">
                  <div className={`p-1.5 rounded-lg ${isActive ? 'bg-sky-500/20 text-sky-300' : 'bg-[#111C33] text-slate-400'}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <span className="truncate">{item.label}</span>
                </div>

                {/* {item.badge && (
                  <span
                    className={`text-[9px] font-mono font-bold px-2 py-0.5 rounded-full uppercase tracking-wider shrink-0 ${
                      item.badge === 'Live'
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                        : item.badge === 'AI Score'
                        ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                        : item.badge === 'Solver'
                        ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                        : item.badge === 'Section_ID'
                        ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                        : 'bg-sky-500/20 text-sky-300 border border-sky-500/30'
                    }`}
                  >
                    {item.badge}
                  </span>
                )} */}

                {item.count !== undefined && (
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-md bg-[#111C33] text-slate-300 border border-[#1F2E4D]">
                    {item.count}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Sidebar Footer & Ingestion Trigger */}
      <div className="p-3.5 border-t border-[#1B2945] bg-[#060B16]">
        <div className="p-3 rounded-xl bg-gradient-to-br from-[#111C33] to-[#0A1122] border border-[#1F2E4D] mb-2.5 shadow-inner">
          
         
          <button
            onClick={() => openUploadModal('MERGED')}
            className="w-full flex items-center justify-center space-x-2 py-2 px-3 rounded-lg text-xs font-bold bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-500 hover:to-indigo-500 text-white shadow-md shadow-sky-600/25 transition-all cursor-pointer"
          >
            <UploadCloud className="w-3.5 h-3.5" />
            <span>Upload New CSV</span>
          </button>
        </div>

       
         
      </div>
    </aside>
  );
};
