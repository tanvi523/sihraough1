import React from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { CsvUploadModal } from './components/CsvUploadModal';

// Pages
import { DashboardPage } from './pages/DashboardPage';
import { TrainSchedulePage } from './pages/TrainSchedulePage';
import { SignalMaintenancePage } from './pages/SignalMaintenancePage';
import { TractionMaintenancePage } from './pages/TractionMaintenancePage';
import { MaintenancePrioritizerPage } from './pages/MaintenancePrioritizerPage';
import { TrainConflictDetectionPage } from './pages/TrainConflictDetectionPage';
import { OptimizationEnginePage } from './pages/OptimizationEnginePage';
import { OptimizedBlockPlanPage } from './pages/OptimizedBlockPlanPage';
import { AnalyticsPage } from './pages/AnalyticsPage';

const MainLayout = () => {
  const { activePage } = useApp();

  const renderActivePage = () => {
    switch (activePage) {
      case 'dashboard':
        return <DashboardPage />;
      case 'tms':
        return <TrainSchedulePage />;
      case 'smms':
        return <SignalMaintenancePage />;
      case 'tdms':
        return <TractionMaintenancePage />;
      case 'prioritizer':
        return <MaintenancePrioritizerPage />;
      case 'conflicts':
        return <TrainConflictDetectionPage />;
      case 'optimizer':
        return <OptimizationEnginePage />;
      case 'blockplan':
        return <OptimizedBlockPlanPage />;
      case 'analytics':
        return <AnalyticsPage />;
      default:
        return <DashboardPage />;
    }
  };

  return (
    <div className="flex min-h-screen bg-[#070C18] text-slate-100 font-sans">
      {/* Sidebar Navigation */}
      <Sidebar />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Sticky Header */}
        <Header />

        {/* Page Body */}
        <main className="flex-1 p-6 overflow-y-auto">
          {renderActivePage()}
        </main>
      </div>

      {/* Global CSV Upload Modal */}
      <CsvUploadModal />
    </div>
  );
};

export default function App() {
  return (
    <AppProvider>
      <MainLayout />
    </AppProvider>
  );
}
