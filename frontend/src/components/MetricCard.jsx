import React from 'react';

export const MetricCard = ({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  trendPositive = true,
  color = 'sky', // 'sky', 'emerald', 'amber', 'rose', 'purple'
  onClick
}) => {
  const colorMap = {
    sky: {
      bg: 'from-sky-500/10 to-transparent',
      border: 'border-sky-500/20 hover:border-sky-500/40',
      iconBg: 'bg-sky-500/15 border-sky-500/30 text-sky-400',
      glow: 'group-hover:shadow-sky-500/10'
    },
    emerald: {
      bg: 'from-emerald-500/10 to-transparent',
      border: 'border-emerald-500/20 hover:border-emerald-500/40',
      iconBg: 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400',
      glow: 'group-hover:shadow-emerald-500/10'
    },
    amber: {
      bg: 'from-amber-500/10 to-transparent',
      border: 'border-amber-500/20 hover:border-amber-500/40',
      iconBg: 'bg-amber-500/15 border-amber-500/30 text-amber-400',
      glow: 'group-hover:shadow-amber-500/10'
    },
    rose: {
      bg: 'from-rose-500/10 to-transparent',
      border: 'border-rose-500/20 hover:border-rose-500/40',
      iconBg: 'bg-rose-500/15 border-rose-500/30 text-rose-400',
      glow: 'group-hover:shadow-rose-500/10'
    },
    purple: {
      bg: 'from-purple-500/10 to-transparent',
      border: 'border-purple-500/20 hover:border-purple-500/40',
      iconBg: 'bg-purple-500/15 border-purple-500/30 text-purple-400',
      glow: 'group-hover:shadow-purple-500/10'
    }
  };

  const scheme = colorMap[color] || colorMap.sky;

  return (
    <div
      onClick={onClick}
      className={`group relative p-5 rounded-2xl bg-[#0E172A] border ${scheme.border} bg-gradient-to-br ${scheme.bg} transition-all duration-300 shadow-xl ${scheme.glow} ${
        onClick ? 'cursor-pointer hover:-translate-y-0.5' : ''
      }`}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">{title}</p>
          <h3 className="text-2xl font-extrabold text-white tracking-tight font-mono">{value}</h3>
        </div>
        {Icon && (
          <div className={`p-2.5 rounded-xl border ${scheme.iconBg}`}>
            <Icon className="w-5 h-5" />
          </div>
        )}
      </div>

      <div className="mt-3 flex items-center justify-between text-xs">
        {subtitle && <span className="text-slate-400 font-medium truncate">{subtitle}</span>}
        {trend && (
          <span
            className={`font-semibold flex items-center space-x-1 ${
              trendPositive ? 'text-emerald-400' : 'text-rose-400'
            }`}
          >
            {trend}
          </span>
        )}
      </div>
    </div>
  );
};

export const StatusBadge = ({ status }) => {
  const st = (status || '').toLowerCase();
  let bg = 'bg-slate-500/20 text-slate-300 border-slate-500/30';

  if (st.includes('schedul') || st.includes('propos')) {
    bg = 'bg-sky-500/20 text-sky-300 border-sky-500/30';
  } else if (st.includes('progress') || st.includes('active')) {
    bg = 'bg-amber-500/20 text-amber-300 border-amber-500/30';
  } else if (st.includes('complet') || st.includes('approv')) {
    bg = 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30';
  } else if (st.includes('pend') || st.includes('reject') || st.includes('overdue')) {
    bg = 'bg-rose-500/20 text-rose-300 border-rose-500/30';
  }

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold border ${bg}`}>
      {status}
    </span>
  );
};

export const RiskBadge = ({ risk, score }) => {
  const r = (risk || '').toLowerCase();
  let bg = 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30';

  if (r.includes('crit')) {
    bg = 'bg-rose-500/25 text-rose-300 border-rose-500/40 animate-pulse';
  } else if (r.includes('high')) {
    bg = 'bg-amber-500/20 text-amber-300 border-amber-500/30';
  } else if (r.includes('med')) {
    bg = 'bg-sky-500/20 text-sky-300 border-sky-500/30';
  }

  return (
    <span className={`inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-bold border ${bg}`}>
      <span>{risk}</span>
      {score !== undefined && <span className="font-mono text-[10px] opacity-80">({score})</span>}
    </span>
  );
};
