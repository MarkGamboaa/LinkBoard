// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth, updateProfile, updatePassword, reauthenticateWithCredential, EmailAuthProvider, deleteUser } from "firebase/auth";
import { uploadToCloudinary } from "./cloudinary.js";
import { getApiUrl } from "./utils/api";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyCJzymCOnxVPDNAx0dH-j-PNnjbTb8Nq5k",
  authDomain: "linkboard-5af54.firebaseapp.com",
  projectId: "linkboard-5af54",
  storageBucket: "linkboard-5af54.firebasestorage.app",
  messagingSenderId: "105782062441",
  appId: "1:105782062441:web:0ca2bcc2d97fb2cbc1a1f8",
  measurementId: "G-LL19W9FTL9",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

// Attach the signed-in Firebase identity to API requests. The server verifies
// this token and uses its UID instead of trusting a UID supplied in the body.
export const apiFetch = async (endpoint, options = {}) => {
  const user = auth.currentUser;
  if (!user) throw new Error('You must be signed in to perform this action');

  const idToken = await user.getIdToken();
  return fetch(getApiUrl(endpoint), {
    ...options,
    headers: {
      ...options.headers,
      Authorization: `Bearer ${idToken}`,
    },
  });
};

// Utility function to upload profile image using Cloudinary
export const uploadProfileImage = async (file) => {
  try {
    const user = auth.currentUser;
    if (!user) {
      throw new Error('No user is currently signed in');
    }

    // Upload to Cloudinary
    const result = await uploadToCloudinary(file);
    
    if (result.success) {
      // Update Firebase Auth profile with the image URL
      await updateProfile(user, {
        photoURL: result.url
      });
      return { success: true, url: result.url };
    } else {
      throw new Error(result.message);
    }
  } catch (error) {
    console.error('Error uploading profile image:', error);
    return { success: false, message: error.message };
  }
};

// Utility function to delete profile image
export const deleteProfileImage = async () => {
  try {
    const user = auth.currentUser;
    if (!user) {
      throw new Error('No user is currently signed in');
    }

    console.log('deleteProfileImage - Before update, user.photoURL:', user.photoURL);

    // Remove photoURL from Firebase Auth profile
    await updateProfile(user, {
      photoURL: null
    });

    console.log('deleteProfileImage - After update, user.photoURL:', user.photoURL);

    return { success: true };
  } catch (error) {
    console.error('Error deleting profile image:', error);
    return { success: false, message: error.message };
  }
};

// Utility function to update user profile through the authenticated API
export const updateUserProfile = async (firstName, lastName) => {
  try {
    const user = auth.currentUser;
    if (!user) {
      throw new Error('No user is currently signed in');
    }

    // Save profile data in PostgreSQL through the authenticated API.
    const response = await apiFetch('/api/profile', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        firstName: firstName.trim(),
        lastName: lastName.trim()
      })
    });

    if (!response.ok) {
      throw new Error('Failed to update profile');
    }

    const profileData = await response.json();

    // Also update Firebase Auth displayName for consistency
    await updateProfile(user, {
      displayName: profileData.displayName
    });

    return { success: true, message: 'Profile updated successfully' };
  } catch (error) {
    console.error('Error updating profile:', error);
    return { success: false, message: error.message };
  }
};

// Utility function to get the signed-in user's profile from the API
export const getUserProfile = async () => {
  try {
    const response = await apiFetch('/api/profile');
    
    if (response.ok) {
      const profileData = await response.json();
      return { success: true, data: profileData };
    } else if (response.status === 404) {
      return { success: false, message: 'User profile not found' };
    } else {
      throw new Error('Failed to fetch profile');
    }
  } catch (error) {
    console.error('Error getting user profile:', error);
    return { success: false, message: error.message };
  }
};

// Password validation function
export const validatePassword = (password) => {
  const minLength = 8;
  const hasUpperCase = /[A-Z]/.test(password);
  const hasSpecialChar = /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password);
  
  if (password.length < minLength) {
    return { valid: false, message: `Password must be at least ${minLength} characters long` };
  }
  if (!hasUpperCase) {
    return { valid: false, message: 'Password must contain at least one uppercase letter' };
  }
  if (!hasSpecialChar) {
    return { valid: false, message: 'Password must contain at least one special character' };
  }
  
  return { valid: true, message: 'Password is valid' };
};

// Utility function to change password
export const changeUserPassword = async (currentPassword, newPassword) => {
  try {
    const user = auth.currentUser;
    if (!user) {
      throw new Error('No user is currently signed in');
    }

    // Validate new password
    const validation = validatePassword(newPassword);
    if (!validation.valid) {
      throw new Error(validation.message);
    }

    // Re-authenticate user with current password
    const credential = EmailAuthProvider.credential(user.email, currentPassword);
    await reauthenticateWithCredential(user, credential);

    // Update password
    await updatePassword(user, newPassword);

    return { success: true, message: 'Password updated successfully' };
  } catch (error) {
    console.error('Error changing password:', error);
    
    // Handle specific Firebase errors
    if (error.code === 'auth/wrong-password') {
      return { success: false, message: 'Current password is incorrect' };
    } else if (error.code === 'auth/weak-password') {
      return { success: false, message: 'New password is too weak' };
    } else if (error.code === 'auth/requires-recent-login') {
      return { success: false, message: 'Please log in again to change your password' };
    }
    
    return { success: false, message: error.message };
  }
};

// Utility function to delete user account and all associated data
export const deleteUserAccount = async (currentPassword) => {
  try {
    const user = auth.currentUser;
    if (!user) {
      throw new Error('No user is currently signed in');
    }

    // Re-authenticate user before deletion (Firebase requirement)
    const credential = EmailAuthProvider.credential(user.email, currentPassword);
    await reauthenticateWithCredential(user, credential);

    // Test if server is accessible
    console.log('Testing server connectivity...');
    try {
      const testResponse = await fetch(getApiUrl('/api/test'));
      if (!testResponse.ok) {
        throw new Error('Server not accessible');
      }
      console.log('Server is accessible');
    } catch (error) {
      console.error('Server connectivity test failed:', error);
      throw new Error('Cannot connect to server. Please ensure the server is running.');
    }

    // Delete user data from PostgreSQL before deleting Firebase Auth account.
    console.log('Deleting user profile for user:', user.uid);
    const deleteProfileResponse = await apiFetch('/api/profile', {
      method: 'DELETE'
    });

    console.log('Profile deletion response status:', deleteProfileResponse.status);
    if (!deleteProfileResponse.ok && deleteProfileResponse.status !== 404) {
      const errorText = await deleteProfileResponse.text();
      console.error('Failed to delete user profile:', errorText);
    } else {
      console.log('User profile deleted successfully');
    }

    // Delete all of the user's boards from PostgreSQL.
    console.log('Deleting user boards for user:', user.uid);
    const deleteBoardsResponse = await apiFetch('/api/boards', {
      method: 'DELETE'
    });

    console.log('Boards deletion response status:', deleteBoardsResponse.status);
    if (!deleteBoardsResponse.ok) {
      const errorText = await deleteBoardsResponse.text();
      console.error('Failed to delete user boards:', errorText);
    } else {
      const result = await deleteBoardsResponse.json();
      console.log('User boards deleted successfully:', result);
    }

    // Finally, delete the user from Firebase Auth
    console.log('Deleting user from Firebase Auth:', user.uid);
    await deleteUser(user);
    console.log('User deleted successfully from Firebase Auth');

    return { success: true, message: 'Account deleted successfully' };
  } catch (error) {
    console.error('Error deleting user account:', error);
    
    // Handle specific Firebase errors
    if (error.code === 'auth/wrong-password') {
      return { success: false, message: 'Current password is incorrect' };
    } else if (error.code === 'auth/requires-recent-login') {
      return { success: false, message: 'Please log in again to delete your account' };
    }
    
    return { success: false, message: error.message };
  }
};
