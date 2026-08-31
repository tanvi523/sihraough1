import React, { createContext, useContext, useState, useEffect } from 'react';
import { getDatasetStatus, triggerAutoSeed } from '../services/api';

const AppContext = createContext();

export const AppProvider = ({ children }) => {
  const [activePage, setActivePage] = useState('dashboard');
  const [division, setDivision] = useState('Pune Division (Central Railway)');
  const [datasetInfo, setDatasetInfo] = useState({
    status: 'loading',
    tms_records: 0,
    smms_records: 0,
    tdms_records: 0,
    blocks_scheduled: 0
  });
  const [uploadModal, setUploadModal] = useState({
    isOpen: false,
    targetSystem: 'MERGED' // TMS, SMMS, TDMS, MERGED
  });
  const [toastMessage, setToastMessage] = useState(null);

  const showToast = (message, type = 'success') => {
    setToastMessage({ message, type });
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  const refreshStatus = async () => {
    try {
      const res = await getDatasetStatus();
      setDatasetInfo(res.data);
    } catch (err) {
      console.warn('Backend connection note:', err.message);
    }
  };

  useEffect(() => {
    refreshStatus();
  }, []);

  const openUploadModal = (system = 'MERGED') => {
    setUploadModal({ isOpen: true, targetSystem: system });
  };

  const closeUploadModal = () => {
    setUploadModal({ isOpen: false, targetSystem: 'MERGED' });
  };

  return (
    <AppContext.Provider
      value={{
        activePage,
        setActivePage,
        division,
        setDivision,
        datasetInfo,
        refreshStatus,
        uploadModal,
        openUploadModal,
        closeUploadModal,
        showToast
      }}
    >
      {children}
      {/* Global Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center space-x-3 px-4 py-3 rounded-xl shadow-2xl border transition-all duration-300 transform translate-y-0 backdrop-blur-xl"
             style={{
               background: toastMessage.type === 'error' ? 'rgba(239, 68, 68, 0.9)' : 'rgba(16, 185, 129, 0.9)',
               borderColor: toastMessage.type === 'error' ? '#F87171' : '#34D399',
               color: '#FFFFFF'
             }}>
          <div className="w-2.5 h-2.5 rounded-full bg-white animate-ping" />
          <span className="text-sm font-medium">{toastMessage.message}</span>
        </div>
      )}
    </AppContext.Provider>
  );
};

export const useApp = () => useContext(AppContext);
