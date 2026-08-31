import React, { useState, useEffect } from "react";
import { useApp } from "../context/AppContext";
import { getDashboardStats } from "../services/api";
import { MetricCard } from "../components/MetricCard";
import TrainIcon from "../assets/Train.svg";
import {
  TrainTrack,
  AlertTriangle,
  CalendarCheck,
  Activity,
  Layers,
  MapPin,
  RefreshCw,
  Cpu,
  Zap,
  Clock,
  CheckCircle2,
  TrendingUp,
  ShieldAlert,
  Radio,
  Sliders,
  Sparkles,
  ChevronRight,
  Info,
} from "lucide-react";
import {
  BarChart,
  Bar,
  AreaChart,
  Area,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  ScatterChart,
  Scatter,
  ZAxis,
} from "recharts";

export const DashboardPage = () => {
  const { showToast, setActivePage } = useApp();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedBlock, setSelectedBlock] = useState(null);
  const [activeFilterDept, setActiveFilterDept] = useState("ALL");

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await getDashboardStats();
      setData(res.data);
    } catch (err) {
      console.error("Error fetching dashboard stats:", err);
      showToast("Failed to load dashboard data", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  if (loading || !data) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] text-slate-400">
        <div className="relative">
          <div className="w-14 h-14 rounded-full border-4 border-indigo-500/20 border-t-indigo-500 animate-spin" />
          <Cpu className="w-6 h-6 text-indigo-400 absolute inset-0 m-auto" />
        </div>
        <h2 className="text-xl font-bold text-white mt-6">
          Loading AI Optimizer Visualizations
        </h2>
        <p className="text-xs text-slate-400 mt-2">
          Aggregating telemetry, priority indices, and corridor possession
          maps...
        </p>
      </div>
    );
  }

  const {
    kpis = {},
    priority_distribution = [],
    risk_distribution = [],
    task_status_distribution = [],
    section_maintenance_load = [],
    maintenance_timeline = [],
    gantt_blocks = [],
    map_points = [],
  } = data;

  const filteredMapPoints = map_points.filter((p) => {
    if (activeFilterDept === "ALL") return true;
    return p.source === activeFilterDept;
  });

  const getDeptColor = (source) => {
    if (source === "SMMS") return "#10B981";
    if (source === "TDMS") return "#F59E0B";
    return "#38BDF8";
  };

  return (
    <div className="space-y-6 pb-16 animate-fade-in text-slate-100">
      {/* Top Banner */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-[#0E172A] via-[#131D33] to-[#0E172A] border border-indigo-500/30 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 relative z-10">
          <div className="flex items-center space-x-4">
            <div className="p-3 rounded-2xl bg-gradient-to-br from-indigo-500/30 to-purple-500/30 border border-indigo-500/40 text-indigo-300 shadow-inner">
              <img
                src={TrainIcon}
                className="w-[60px] h-[60px] rounded-sm"
                alt=""
              />
            </div>
            <div>
              <div className="flex items-center space-x-2"></div>
              <h1 className="text-2xl lg:text-3xl font-extrabold text-white tracking-tight mt-0.5">
                AI Railway Maintenance Block Optimizer
              </h1>
              <p className="text-xs text-slate-300 mt-1 max-w-2xl">
                Conflict resolution, block scheduling, and prioritizer.
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={fetchData}
              className="flex items-center space-x-2 px-4 py-2 rounded-xl bg-[#1F2E4D]/80 hover:bg-[#2A3E66] border border-[#2F4472] text-xs font-semibold text-slate-200 transition-all cursor-pointer shadow-md"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Refresh</span>
            </button>
            <button
              onClick={() => setActivePage("optimizer")}
              className="flex items-center space-x-2 px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-xs font-bold shadow-lg shadow-indigo-600/30 transition-all cursor-pointer"
            >
              <span>Optimize</span>
            </button>
          </div>
        </div>
      </div>

      {/* ──────────────── Dashboard KPIs ──────────────── */}
      <div>
        <div className="flex items-center justify-between mb-3 px-1">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
            <Activity className="w-3.5 h-3.5 text-indigo-400" />
            KPIs
          </h2>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 h-auto gap-3.5">
          <MetricCard
            title="Total Trains"
            value={kpis.total_trains || 0}
            subtitle="TMS Daily Schedule"
            icon={TrainTrack}
            color="sky"
            trend=""
          />
          <MetricCard
            title="Maintenance Tasks"
            value={kpis.total_maintenance_tasks || 0}
            subtitle="TMS,SMMS & TDMS Total Tasks"
            icon={Layers}
            color="indigo"
            trend=""
          />
          <MetricCard
            title="High Risk Assets"
            value={kpis.high_risk_assets || 0}
            subtitle="Assets in Risk"
            icon={AlertTriangle}
            color="rose"
            trend=""
          />
        </div>
      </div>

      {/* ──────────────── Row 1: Priority Distribution, Risk Distribution & Task Status ──────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Priority Distribution */}
        <div className="p-5 rounded-2xl bg-[#0E172A] border border-[#1F2E4D] shadow-xl flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h3 className="text-sm font-bold text-white">
                Priority Distribution
              </h3>
            </div>
          </div>
          {/* {console.log(priority_distribution)} */}
          <div className="h-56 w-full my-auto">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={priority_distribution}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {priority_distribution.map((entry, index) => (
                    <Cell
                      key={`pcell-${index}`}
                      fill={entry.color}
                      stroke="#0E172A"
                      strokeWidth={2}
                    />
                  ))}
                </Pie>
                <RechartsTooltip
                  contentStyle={{
                    backgroundColor: "#0B1120",
                    borderColor: "#1F2E4D",
                    borderRadius: "12px",
                    fontSize: "12px",
                  }}
                />
                <Legend
                  wrapperStyle={{ fontSize: "11px", paddingTop: "8px" }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Risk Distribution */}
        <div className="p-5 rounded-2xl bg-[#0E172A] border border-[#1F2E4D] shadow-xl flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h3 className="text-sm font-bold text-white">
                Risk Distribution
              </h3>
            </div>
          </div>
          <div className="h-56 w-full my-auto">
            {/* {console.log(risk_distribution)} */}
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={risk_distribution}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {risk_distribution.map((entry, index) => (
                    <Cell
                      key={`rcell-${index}`}
                      fill={entry.color}
                      stroke="#0E172A"
                      strokeWidth={2}
                    />
                  ))}
                </Pie>
                <RechartsTooltip
                  contentStyle={{
                    backgroundColor: "#0B1120",
                    borderColor: "#1F2E4D",
                    borderRadius: "12px",
                    fontSize: "12px",
                  }}
                />
                <Legend
                  wrapperStyle={{ fontSize: "11px", paddingTop: "8px" }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Task Status */}
        <div className="p-5 rounded-2xl bg-[#0E172A] border border-[#1F2E4D] shadow-xl flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h3 className="text-sm font-bold text-white">
                Task Status Breakdown
              </h3>
              <p className="text-[11px] text-slate-400">
                SMMS & TDMS Work Orders
              </p>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-purple-500/10 text-purple-400 border border-purple-500/30">
              Execution Status
            </span>
          </div>
          <div className="h-56 w-full my-auto">
            {console.log(task_status_distribution)}
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={task_status_distribution}
                margin={{ left: -25, right: 10, top: 10, bottom: 0 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="#1F2E4D"
                  vertical={false}
                  opacity={0.5}
                />
                <XAxis dataKey="status" stroke="#64748B" fontSize={10} />
                <YAxis stroke="#64748B" fontSize={11} />
                <RechartsTooltip
                  contentStyle={{
                    backgroundColor: "#0B1120",
                    borderColor: "#1F2E4D",
                    borderRadius: "12px",
                    fontSize: "12px",
                  }}
                  cursor={{ fill: "#1F2E4D", opacity: 0.3 }}
                />
                <Bar
                  dataKey="count"
                  fill="#8B5CF6"
                  radius={[6, 6, 0, 0]}
                  barSize={36}
                >
                  {task_status_distribution.map((entry, index) => {
                    const colors = ["#F59E0B", "#38BDF8", "#10B981", "#EF4444"];
                    return (
                      <Cell
                        key={`stcell-${index}`}
                        fill={colors[index % colors.length]}
                      />
                    );
                  })}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Block Details Modal when clicking on Gantt bar */}
      {selectedBlock && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-[#0E172A] border border-[#1F2E4D] rounded-2xl w-full max-w-xl shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-[#1F2E4D] pb-3">
              <div>
                <h4 className="text-base font-bold text-white font-mono">
                  {selectedBlock.block_code}
                </h4>
                <p className="text-xs text-slate-400">
                  {selectedBlock.section}
                </p>
              </div>
              <button
                onClick={() => setSelectedBlock(null)}
                className="text-slate-400 hover:text-white px-2.5 py-1 rounded-lg hover:bg-[#131D33] text-sm"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="p-3 rounded-xl bg-[#131D33] border border-[#1F2E4D]">
                <div className="text-[10px] text-slate-400 uppercase font-semibold">
                  Duration
                </div>
                <div className="text-sm font-bold text-sky-400 font-mono mt-0.5">
                  {selectedBlock.duration_mins} min
                </div>
              </div>
              <div className="p-3 rounded-xl bg-[#131D33] border border-[#1F2E4D]">
                <div className="text-[10px] text-slate-400 uppercase font-semibold">
                  Tasks Bundled
                </div>
                <div className="text-sm font-bold text-emerald-400 font-mono mt-0.5">
                  {selectedBlock.tasks_count}
                </div>
              </div>
              <div className="p-3 rounded-xl bg-[#131D33] border border-[#1F2E4D]">
                <div className="text-[10px] text-slate-400 uppercase font-semibold">
                  Power Isolation
                </div>
                <div className="text-sm font-bold text-amber-400 font-mono mt-0.5">
                  {selectedBlock.power_shutdown ? "YES" : "NO"}
                </div>
              </div>
            </div>

            <div>
              <h5 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                Block Details
              </h5>
              <div className="p-3 rounded-xl bg-[#131D33] border border-[#1F2E4D] text-xs text-slate-300 space-y-1.5">
                <div>
                  <span className="text-slate-400">Type:</span>{" "}
                  {selectedBlock.block_type}
                </div>
                <div>
                  <span className="text-slate-400">Departments:</span>{" "}
                  {(selectedBlock.depts || []).join(", ")}
                </div>
                <div>
                  <span className="text-slate-400">Priority Cleared:</span>{" "}
                  <strong className="text-indigo-400">
                    {selectedBlock.priority_cleared} pts
                  </strong>
                </div>
                <div>
                  <span className="text-slate-400">Status:</span>{" "}
                  <span className="text-emerald-400 font-semibold">
                    {selectedBlock.status}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-2 border-t border-[#1F2E4D]">
              <button
                onClick={() => setSelectedBlock(null)}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition-colors"
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
