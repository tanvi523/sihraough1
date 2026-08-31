import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Dashboard APIs
export const getDashboardStats = () => api.get('/analytics/dashboard');

// TMS (Train Management System) APIs
export const getTrains = (params) => api.get('/tms/', { params });
export const createTrain = (data) => api.post('/tms/', data);
export const deleteTrain = (trainId) => api.delete(`/tms/${trainId}`);
export const clearAllTrains = () => api.delete('/tms/');
export const uploadTmsCsv = (formData) => api.post('/upload/tms', formData, {
  headers: { 'Content-Type': 'multipart/form-data' }
});

// SMMS (Signal Maintenance) APIs
export const getSignalTasks = (params) => api.get('/smms/', { params });
export const createSignalTask = (data) => api.post('/smms/', data);
export const deleteSignalTask = (taskId) => api.delete(`/smms/${taskId}`);
export const clearAllSignalTasks = () => api.delete('/smms/');
export const updateSignalTaskStatus = (taskId, status) => api.patch(`/smms/${taskId}/status?status=${status}`);
export const uploadSmmsCsv = (formData) => api.post('/upload/smms', formData, {
  headers: { 'Content-Type': 'multipart/form-data' }
});

// TDMS (Traction Maintenance) APIs
export const getTractionTasks = (params) => api.get('/tdms/', { params });
export const createTractionTask = (data) => api.post('/tdms/', data);
export const deleteTractionTask = (taskId) => api.delete(`/tdms/${taskId}`);
export const clearAllTractionTasks = () => api.delete('/tdms/');
export const updateTractionTaskStatus = (taskId, status) => api.patch(`/tdms/${taskId}/status?status=${status}`);
export const uploadTdmsCsv = (formData) => api.post('/upload/tdms', formData, {
  headers: { 'Content-Type': 'multipart/form-data' }
});

// Prioritizer APIs
export const getPrioritizationWeights = () => api.get('/prioritizer/weights');
export const updatePrioritizationWeights = (weights) => api.put('/prioritizer/weights', weights);
export const getRankedTasks = (params) => api.get('/prioritizer/ranked', { params });
export const recalculateRankings = (weights) => api.post('/prioritizer/recalculate', weights);

// Export & Template URLs
export const getTemplateDownloadUrl = (system) => `${API_BASE_URL}/upload/template/${system}`;
export const getExportRankedCsvUrl = (params = {}) => {
  const query = new URLSearchParams(params).toString();
  return `${API_BASE_URL}/prioritizer/export${query ? `?${query}` : ''}`;
};

// Batch Multi-CSV Ingestion
export const uploadBatchCsv = (formData) => api.post('/upload/batch', formData, {
  headers: { 'Content-Type': 'multipart/form-data' }
});

// Conflict Detection APIs
export const getConflictTasks = (params) => api.get('/conflicts/tasks', { params });
export const getConflictSummary = () => api.get('/conflicts/summary');
export const getConflictSections = () => api.get('/conflicts/sections');
export const simulateConflictWindow = (data) => api.post('/conflicts/simulate', data);

// Optimizer APIs
export const runOptimizationEngine = (params) => api.post('/optimizer/run', params);
export const getOptimizedBlocks = (params) => api.get('/optimizer/blocks', { params });
export const updateBlockStatus = (blockId, status) => api.patch(`/optimizer/blocks/${blockId}/status?status=${status}`);
export const deleteBlock = (blockId) => api.delete(`/optimizer/blocks/${blockId}`);

// Analytics APIs
export const getAnalyticsReport = () => api.get('/analytics/report');

// Ingestion & Dataset APIs
export const getDatasetStatus = () => api.get('/upload/status');
export const triggerAutoSeed = () => api.post('/upload/seed');
export const uploadMergedCsv = (formData) => api.post('/upload/merged', formData, {
  headers: { 'Content-Type': 'multipart/form-data' }
});
export const resetDatabase = () => api.post('/upload/reset');
export const clearAllData = () => api.delete('/upload/clear/all');
export const clearTmsData = () => api.delete('/upload/clear/tms');
export const clearSmmsData = () => api.delete('/upload/clear/smms');
export const clearTdmsData = () => api.delete('/upload/clear/tdms');

export default api;
