import { initializeApp } from 'firebase/app';
import {
  deleteUser,
  EmailAuthProvider,
  getAuth,
  reauthenticateWithCredential,
  updatePassword,
  updateProfile,
} from 'firebase/auth';
import { uploadToCloudinary } from './cloudinary.js';
import { getApiUrl } from './utils/api';

const firebaseConfig = {
  apiKey: 'AIzaSyCJzymCOnxVPDNAx0dH-j-PNnjbTb8Nq5k',
  authDomain: 'linkboard-5af54.firebaseapp.com',
  projectId: 'linkboard-5af54',
  storageBucket: 'linkboard-5af54.firebasestorage.app',
  messagingSenderId: '105782062441',
  appId: '1:105782062441:web:0ca2bcc2d97fb2cbc1a1f8',
  measurementId: 'G-LL19W9FTL9',
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

export const apiFetch = async (endpoint, options = {}) => {
  const user = auth.currentUser;
  if (!user) throw new Error('You must be signed in to perform this action');
  const idToken = await user.getIdToken();
  return fetch(getApiUrl(endpoint), {
    ...options,
    headers: { ...options.headers, Authorization: `Bearer ${idToken}` },
  });
};

export const uploadProfileImage = async (file) => {
  try {
    if (!auth.currentUser) throw new Error('No user is currently signed in');
    const result = await uploadToCloudinary(file);
    if (!result.success) throw new Error(result.message);
    await updateProfile(auth.currentUser, { photoURL: result.url });
    return { success: true, url: result.url };
  } catch (error) {
    console.error('Error uploading profile image:', error);
    return { success: false, message: error.message };
  }
};

export const deleteProfileImage = async () => {
  try {
    if (!auth.currentUser) throw new Error('No user is currently signed in');
    await updateProfile(auth.currentUser, { photoURL: null });
    return { success: true };
  } catch (error) {
    console.error('Error deleting profile image:', error);
    return { success: false, message: error.message };
  }
};

export const updateUserProfile = async (firstName, lastName, nickname) => {
  try {
    const user = auth.currentUser;
    if (!user) throw new Error('No user is currently signed in');
    const response = await apiFetch('/api/profile', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        ...(nickname !== undefined ? { nickname: nickname.trim() } : {}),
      }),
    });
    if (!response.ok) throw new Error('Failed to update profile');
    const profile = await response.json();
    await updateProfile(user, { displayName: profile.displayName });
    return { success: true, message: 'Profile updated successfully' };
  } catch (error) {
    console.error('Error updating profile:', error);
    return { success: false, message: error.message };
  }
};

export const getUserProfile = async () => {
  try {
    const response = await apiFetch('/api/profile');
    if (response.ok) return { success: true, data: await response.json() };
    if (response.status === 404) return { success: false, message: 'User profile not found' };
    throw new Error('Failed to fetch profile');
  } catch (error) {
    console.error('Error getting user profile:', error);
    return { success: false, message: error.message };
  }
};

export const validatePassword = (password) => {
  const minLength = 8;
  const hasUpperCase = /[A-Z]/.test(password);
  const hasSpecialChar = /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password);
  if (password.length < minLength) return { valid: false, message: `Password must be at least ${minLength} characters long` };
  if (!hasUpperCase) return { valid: false, message: 'Password must contain at least one uppercase letter' };
  if (!hasSpecialChar) return { valid: false, message: 'Password must contain at least one special character' };
  return { valid: true, message: 'Password is valid' };
};

export const changeUserPassword = async (currentPassword, newPassword) => {
  try {
    const user = auth.currentUser;
    if (!user) throw new Error('No user is currently signed in');
    const validation = validatePassword(newPassword);
    if (!validation.valid) throw new Error(validation.message);
    const credential = EmailAuthProvider.credential(user.email, currentPassword);
    await reauthenticateWithCredential(user, credential);
    await updatePassword(user, newPassword);
    return { success: true, message: 'Password updated successfully' };
  } catch (error) {
    if (error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
      return { success: false, message: 'Current password is incorrect' };
    }
    if (error.code === 'auth/weak-password') return { success: false, message: 'New password is too weak' };
    if (error.code === 'auth/requires-recent-login') return { success: false, message: 'Please log in again to change your password' };
    return { success: false, message: error.message };
  }
};

export const deleteUserAccount = async (currentPassword) => {
  try {
    const user = auth.currentUser;
    if (!user) throw new Error('No user is currently signed in');
    const credential = EmailAuthProvider.credential(user.email, currentPassword);
    await reauthenticateWithCredential(user, credential);

    const profileResponse = await apiFetch('/api/profile', { method: 'DELETE' });
    if (!profileResponse.ok && profileResponse.status !== 404) throw new Error('Could not delete profile data');
    const boardsResponse = await apiFetch('/api/boards', { method: 'DELETE' });
    if (!boardsResponse.ok) throw new Error('Could not delete board data');
    await deleteUser(user);
    return { success: true, message: 'Account deleted successfully' };
  } catch (error) {
    if (error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
      return { success: false, message: 'Current password is incorrect' };
    }
    if (error.code === 'auth/requires-recent-login') return { success: false, message: 'Please log in again to delete your account' };
    return { success: false, message: error.message };
  }
};
