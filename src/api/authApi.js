import API from './axios';

export const register = (data) => API.post('/auth/register', data);
export const verifyRegister = (data) => API.post('/auth/verify-register', data);
export const login = (data) => API.post('/auth/login', data);
export const forgotPassword = (data) => API.post('/auth/forgot-password', data);
export const resetPassword = (data) => API.post('/auth/reset-password', data);
export const getUser = () => API.get('/auth/user');