// Utility function to get the base API URL without trailing slash
export const getApiBaseUrl = () => {
  const baseUrl = (import.meta.env.VITE_API_URL || 'http://localhost:3001').replace(/\/$/, '');
  return baseUrl;
};

// Utility function to construct API endpoints
export const getApiUrl = (endpoint) => {
  const baseUrl = getApiBaseUrl();
  return `${baseUrl}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
}; 