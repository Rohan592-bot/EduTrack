import { trainModel, trainTrajectoryModels, trainLogisticModel, calculateAnomalies, runKMeansClustering } from './mlEngine';

// Simulates an asynchronous worker by yielding the main thread.
// This allows the React UI to visually mount 'Loading' states and switch tabs
// without the browser locking up during heavy array iterations.
export const trainPredictorModelAsync = (students) => {
  return new Promise((resolve) => setTimeout(() => resolve(trainModel(students)), 50));
};
export const trainTrajectoryModelsAsync = (students) => {
  return new Promise((resolve) => setTimeout(() => resolve(trainTrajectoryModels(students)), 50));
};

export const trainLogisticModelAsync = (students) => {
  return new Promise((resolve) => setTimeout(() => resolve(trainLogisticModel(students)), 50));
};

export const calculateAnomaliesAsync = (students) => {
  return new Promise((resolve) => setTimeout(() => resolve(calculateAnomalies(students)), 50));
};

export const runKMeansClusteringAsync = (students) => {
  return new Promise((resolve) => setTimeout(() => resolve(runKMeansClustering(students)), 50));
};
