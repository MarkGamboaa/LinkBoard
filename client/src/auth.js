import { supabase } from './supabase';
import { uploadToCloudinary } from './cloudinary.js';
import { getApiUrl } from './utils/api';

export const apiFetch = async (endpoint, options = {}) => {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('You must be signed in to perform this action');

  return fetch(getApiUrl(endpoint), {
    ...options,
    headers: {
      ...options.headers,
      Authorization: `Bearer ${session.access_token}`,
    },
  });
};

export const updateUserProfile = async (firstName, lastName, nickname) => {
  try {
    const { data: { user }, error } = await supabase.auth.updateUser({
      data: {
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        ...(nickname !== undefined ? { nickname: nickname.trim() } : {}),
        display_name: `${firstName.trim()} ${lastName.trim()}`.trim(),
      },
    });
    if (error) throw error;

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
    return { success: true, user, message: 'Profile updated successfully' };
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

export const syncProfileFromAuthMetadata = async (user) => {
  const firstName = user?.user_metadata?.first_name?.trim();
  const lastName = user?.user_metadata?.last_name?.trim();
  const nickname = user?.user_metadata?.nickname?.trim();
  if (!firstName || !lastName || !nickname) return;
  const existing = await getUserProfile();
  if (!existing.success) await updateUserProfile(firstName, lastName, nickname);
};

export const uploadProfileImage = async (file) => {
  try {
    const result = await uploadToCloudinary(file);
    if (!result.success) throw new Error(result.message);
    const { error } = await supabase.auth.updateUser({ data: { avatar_url: result.url } });
    if (error) throw error;
    return { success: true, url: result.url };
  } catch (error) {
    console.error('Error uploading profile image:', error);
    return { success: false, message: error.message };
  }
};

export const deleteProfileImage = async () => {
  try {
    const { error } = await supabase.auth.updateUser({ data: { avatar_url: null } });
    if (error) throw error;
    return { success: true };
  } catch (error) {
    console.error('Error deleting profile image:', error);
    return { success: false, message: error.message };
  }
};

export const validatePassword = (password) => {
  const hasUpperCase = /[A-Z]/.test(password);
  const hasSpecialChar = /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password);
  if (password.length < 8) return { valid: false, message: 'Password must be at least 8 characters long' };
  if (!hasUpperCase) return { valid: false, message: 'Password must contain at least one uppercase letter' };
  if (!hasSpecialChar) return { valid: false, message: 'Password must contain at least one special character' };
  return { valid: true, message: 'Password is valid' };
};

export const changeUserPassword = async (currentPassword, newPassword) => {
  try {
    const validation = validatePassword(newPassword);
    if (!validation.valid) throw new Error(validation.message);
    const { data: { user }, error: signInError } = await supabase.auth.signInWithPassword({
      email: (await supabase.auth.getUser()).data.user?.email,
      password: currentPassword,
    });
    if (signInError || !user) throw new Error('Current password is incorrect');
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) throw error;
    return { success: true, message: 'Password updated successfully' };
  } catch (error) {
    console.error('Error changing password:', error);
    return { success: false, message: error.message };
  }
};

export const deleteUserAccount = async (currentPassword) => {
  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user?.email) throw new Error('No user is currently signed in');
    const { error: signInError } = await supabase.auth.signInWithPassword({ email: user.email, password: currentPassword });
    if (signInError) throw new Error('Current password is incorrect');

    const profileResponse = await apiFetch('/api/profile', { method: 'DELETE' });
    if (!profileResponse.ok && profileResponse.status !== 404) throw new Error('Could not delete your profile data');
    const boardsResponse = await apiFetch('/api/boards', { method: 'DELETE' });
    if (!boardsResponse.ok) throw new Error('Could not delete your boards');
    const accountResponse = await apiFetch('/api/auth/account', { method: 'DELETE' });
    if (!accountResponse.ok) throw new Error('Could not delete your authentication account');
    await supabase.auth.signOut();
    return { success: true, message: 'Account deleted successfully' };
  } catch (error) {
    console.error('Error deleting user account:', error);
    return { success: false, message: error.message };
  }
};
