import React, { useState } from 'react';
import { Train, Zap, Radio, AlertCircle, CheckCircle, ArrowRight } from 'lucide-react';

export const SectionalTrackMap = ({ sections = [], onSelectSection, activeSection }) => {
  const stations = [
    { id: 'PUNE', name: 'Pune Jn', km: '0.0', type: 'Terminal Hub', x: 80, y: 110 },
    { id: 'SVJR', name: 'Shivajinagar', km: '2.5', type: 'Suburban', x: 210, y: 110 },
    { id: 'KK', name: 'Khadki', km: '6.2', type: 'Junction/Yard', x: 340, y: 110 },
    { id: 'DAPD', name: 'Dapodi', km: '8.4', type: 'Way Station', x: 460, y: 110 },
    { id: 'CCH', name: 'Chinchwad', km: '16.1', type: 'Industrial Yard', x: 580, y: 110 },
    { id: 'DEHR', name: 'Dehu Road', km: '23.8', type: 'Military/Pass', x: 700, y: 110 },
    { id: 'TGN', name: 'Talegaon', km: '31.2', type: 'Suburban Term', x: 830, y: 110 },
    { id: 'LONI', name: 'Loni', km: '16.5', type: 'Daund Line', x: 260, y: 220 },
  ];

  const trackLinks = [
    { from: 'PUNE', to: 'SVJR', name: 'Pune Jn-Shivajinagar', km: 2.5 },
    { from: 'SVJR', to: 'KK', name: 'Shivajinagar-Khadki', km: 3.7 },
    { from: 'KK', to: 'DAPD', name: 'Khadki-Dapodi', km: 2.2 },
    { from: 'DAPD', to: 'CCH', name: 'Dapodi-Chinchwad', km: 7.7 },
    { from: 'CCH', to: 'DEHR', name: 'Chinchwad-Dehu Road', km: 7.7 },
    { from: 'DEHR', to: 'TGN', name: 'Dehu Road-Talegaon', km: 7.4 },
    { from: 'PUNE', to: 'LONI', name: 'Manjari-Loni', km: 16.5 },
  ];

  const [hoveredLink, setHoveredLink] = useState(null);

  const getSectionStats = (secName) => {
    const found = sections.find((s) => s.section.toLowerCase().includes(secName.toLowerCase().split('-')[0]));
    return found || { train_count: 8, maintenance_task_count: 4, congestion_score: 45, status: 'Optimal' };
  };

  return (
    <div className="p-5 rounded-2xl bg-[#0E172A] border border-[#1F2E4D] shadow-xl relative overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2.5">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-signal-pulse" />
          <h3 className="text-sm font-bold text-white tracking-wide">
            PUNE SUB-DIVISION LIVE TRACK TOPOLOGY & POSSESSION CORRIDOR
          </h3>
        </div>
        <div className="flex items-center space-x-4 text-xs">
          <span className="flex items-center gap-1.5 text-slate-300">
            <span className="w-2.5 h-2.5 rounded-full bg-sky-400"></span> UP / DOWN Main Line
          </span>
          <span className="flex items-center gap-1.5 text-slate-300">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400"></span> Joint Maintenance Active
          </span>
          <span className="flex items-center gap-1.5 text-slate-300">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-400"></span> High Congestion / Speed Restricted
          </span>
        </div>
      </div>

      {/* SVG Canvas Map */}
      <div className="w-full overflow-x-auto py-2">
        <svg viewBox="0 0 920 270" className="w-full h-auto min-w-[750px] select-none">
          {/* Grid background lines */}
          <defs>
            <pattern id="trackGrid" width="20" height="20" patternUnits="userSpaceOnUse">
              <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#1F2E4D" strokeWidth="0.5" opacity="0.3" />
            </pattern>
            <linearGradient id="mainTrackGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#38BDF8" />
              <stop offset="50%" stopColor="#818CF8" />
              <stop offset="100%" stopColor="#34D399" />
            </linearGradient>
          </defs>
          <rect width="920" height="270" fill="url(#trackGrid)" rx="12" />

          {/* Daund Branch Track */}
          <path
            d="M 80 110 C 130 180, 180 220, 260 220"
            fill="none"
            stroke="#64748B"
            strokeWidth="4"
            strokeDasharray="4 4"
          />

          {/* Main Line UP/DOWN dual tracks */}
          <line x1="80" y1="106" x2="830" y2="106" stroke="#38BDF8" strokeWidth="3" opacity="0.8" />
          <line x1="80" y1="114" x2="830" y2="114" stroke="#818CF8" strokeWidth="3" opacity="0.8" />

          {/* Interactive track segments */}
          {trackLinks.map((link) => {
            const stFrom = stations.find((s) => s.id === link.from);
            const stTo = stations.find((s) => s.id === link.to);
            const stats = getSectionStats(link.name);
            const isHovered = hoveredLink === link.name;
            const isSelected = activeSection === link.name;

            const midX = (stFrom.x + stTo.x) / 2;
            const midY = (stFrom.y + stTo.y) / 2;

            let segmentColor = '#38BDF8';
            if (stats.status === 'High Load') segmentColor = '#F43F5E';
            else if (stats.maintenance_task_count > 3) segmentColor = '#F59E0B';

            return (
              <g
                key={link.name}
                className="cursor-pointer transition-all"
                onMouseEnter={() => setHoveredLink(link.name)}
                onMouseLeave={() => setHoveredLink(null)}
                onClick={() => onSelectSection && onSelectSection(link.name)}
              >
                {/* Clickable hit area */}
                {link.from === 'PUNE' && link.to === 'LONI' ? (
                  <path
                    d="M 80 110 C 130 180, 180 220, 260 220"
                    fill="none"
                    stroke={segmentColor}
                    strokeWidth={isSelected || isHovered ? '8' : '4'}
                    strokeOpacity={isSelected || isHovered ? '1' : '0.6'}
                  />
                ) : (
                  <line
                    x1={stFrom.x}
                    y1="110"
                    x2={stTo.x}
                    y2="110"
                    stroke={segmentColor}
                    strokeWidth={isSelected || isHovered ? '8' : '4'}
                    strokeOpacity={isSelected || isHovered ? '1' : '0.6'}
                  />
                )}

                {/* Mid-point telemetry badge */}
                <g transform={`translate(${midX}, ${midY - 18})`}>
                  <rect
                    x="-24"
                    y="-12"
                    width="48"
                    height="24"
                    rx="6"
                    fill="#0B1120"
                    stroke={isSelected || isHovered ? '#38BDF8' : '#1F2E4D'}
                    strokeWidth="1.5"
                  />
                  <text
                    x="0"
                    y="4"
                    textAnchor="middle"
                    fill={segmentColor}
                    fontSize="10"
                    fontFamily="monospace"
                    fontWeight="bold"
                  >
                    {stats.train_count}T|{stats.maintenance_task_count}M
                  </text>
                </g>
              </g>
            );
          })}

          {/* Station Nodes */}
          {stations.map((st) => (
            <g key={st.id} transform={`translate(${st.x}, ${st.y})`} className="cursor-pointer">
              {/* Outer halo */}
              <circle r="16" fill="#131D33" stroke="#38BDF8" strokeWidth="2" opacity="0.9" />
              <circle r="6" fill="#38BDF8" />

              {/* Station Name Label */}
              <text
                x="0"
                y="-24"
                textAnchor="middle"
                fill="#FFFFFF"
                fontSize="11"
                fontWeight="700"
                className="select-none"
              >
                {st.name}
              </text>
              <text
                x="0"
                y="30"
                textAnchor="middle"
                fill="#94A3B8"
                fontSize="9"
                fontFamily="monospace"
              >
                KM {st.km}
              </text>
            </g>
          ))}
        </svg>
      </div>

      {/* Interactive Tooltip & Details Banner */}
      <div className="mt-3 pt-3 border-t border-[#1F2E4D] flex items-center justify-between text-xs text-slate-300">
        <div className="flex items-center space-x-3">
          <span className="font-semibold text-sky-400">Selected Segment:</span>
          <span className="font-mono bg-[#131D33] px-2.5 py-1 rounded-md border border-[#1F2E4D] text-white">
            {hoveredLink || activeSection || 'Pune Jn ↔ Shivajinagar Corridor'}
          </span>
          <span className="text-slate-400">Double track electrified (25kV AC OHE)</span>
        </div>
        <div className="flex items-center space-x-2 text-[11px] text-slate-400">
          <span>Telemetry badge key:</span>
          <span className="font-mono text-sky-300 font-semibold">[T] Active Trains</span>
          <span>•</span>
          <span className="font-mono text-amber-300 font-semibold">[M] Pending Maintenance Tasks</span>
        </div>
      </div>
    </div>
  );
};
