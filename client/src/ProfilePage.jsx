import React, { useState, useEffect, useRef } from "react";
import { updateUserProfile, getUserProfileFromFirestore, uploadProfileImage, deleteProfileImage, changeUserPassword, validatePassword, deleteUserAccount } from "./firebase";
import LoadingSpinner from "./components/LoadingSpinner.jsx";

import { auth } from "./firebase";
export default function ProfilePage({ user, onBack, onLogout, onUserUpdate }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [localPhotoURL, setLocalPhotoURL] = useState(user?.photoURL);
  const [changePasswordModal, setChangePasswordModal] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [deleteAccountModal, setDeleteAccountModal] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [deletingAccount, setDeletingAccount] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  const [logoutLoading, setLogoutLoading] = useState(false);
  const fileInputRef = useRef(null);

  // Debug logging for user prop changes
  useEffect(() => {
    console.log('ProfilePage - user prop changed:', user);
    console.log('ProfilePage - user.photoURL:', user?.photoURL);
    setLocalPhotoURL(user?.photoURL);
  }, [user]);

  // Load user profile from Firestore
  useEffect(() => {
    const loadUserProfile = async () => {
      try {
        const result = await getUserProfileFromFirestore(user.uid);
        if (result.success) {
          setUserProfile(result.data);
          setFirstName(result.data.firstName || '');
          setLastName(result.data.lastName || '');
        } else {
          // Fallback to Firebase Auth displayName if no MongoDB data
          const displayNameParts = user?.displayName?.split(' ') || [];
          setFirstName(displayNameParts[0] || '');
          setLastName(displayNameParts.slice(1).join(' ') || '');
        }
      } catch (error) {
        console.error('Error loading user profile:', error);
        // Fallback to Firebase Auth displayName
        const displayNameParts = user?.displayName?.split(' ') || [];
        setFirstName(displayNameParts[0] || '');
        setLastName(displayNameParts.slice(1).join(' ') || '');
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      loadUserProfile();
    }
  }, [user]);

  const handleEditProfile = () => {
    setEditMode(true);
  };

  const handleSaveProfile = async () => {
    if (!firstName.trim() || !lastName.trim()) {
      alert('Please enter both first name and last name');
      return;
    }

    setIsUpdating(true);
    try {
      const result = await updateUserProfile(firstName.trim(), lastName.trim());
      if (result.success) {
        setEditMode(false);
        // Refresh the profile data
        const refreshResult = await getUserProfileFromFirestore(user.uid);
        if (refreshResult.success) {
          setUserProfile(refreshResult.data);
        }
        alert('Profile updated successfully!');
      } else {
        alert('Failed to update profile: ' + result.message);
      }
    } catch (error) {
      alert('Error updating profile: ' + error.message);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleCancelEdit = () => {
    setEditMode(false);
    const displayNameParts = user?.displayName?.split(' ') || [];
    setFirstName(displayNameParts[0] || '');
    setLastName(displayNameParts.slice(1).join(' ') || '');
  };

  const handleImageUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('Image size must be less than 5MB');
      return;
    }

    setUploadingImage(true);
    try {
      const result = await uploadProfileImage(file);
      if (result.success) {
        // Immediately update local state to show the change
        setLocalPhotoURL(result.url);
        // Reload the user to get the latest data
        await auth.currentUser.reload();
        // Small delay to ensure the update is complete
        await new Promise(resolve => setTimeout(resolve, 100));
        // Update the user state in the parent component
        if (onUserUpdate) onUserUpdate(auth.currentUser);
        alert('Profile image updated successfully!');
      } else {
        alert('Failed to upload image: ' + result.message);
      }
    } catch (error) {
      alert('Error uploading image: ' + error.message);
    } finally {
      setUploadingImage(false);
    }
  };

  const handleDeleteImage = async () => {
    if (!user.photoURL) return;
    if (!confirm('Are you sure you want to delete your profile image?')) return;
    
    console.log('Before delete - user.photoURL:', user.photoURL);
    setUploadingImage(true);
    try {
      const result = await deleteProfileImage();
      console.log('Delete result:', result);
      if (result.success) {
        // Immediately update local state to show the change
        setLocalPhotoURL(null);
        // Reload the user to get the latest data
        await auth.currentUser.reload();
        console.log('After reload - auth.currentUser.photoURL:', auth.currentUser.photoURL);
        // Small delay to ensure the update is complete
        await new Promise(resolve => setTimeout(resolve, 100));
        // Update the user state in the parent component
        if (onUserUpdate) {
          console.log('Calling onUserUpdate with:', auth.currentUser);
          onUserUpdate(auth.currentUser);
        }
        alert('Profile image deleted successfully!');
      } else {
        alert('Failed to delete image: ' + result.message);
      }
    } catch (error) {
      console.error('Error in handleDeleteImage:', error);
      alert('Error deleting image: ' + error.message);
    } finally {
      setUploadingImage(false);
    }
  };

  const handleChangePassword = () => {
    setChangePasswordModal(true);
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setPasswordError('');
  };

  const handleCancelChangePassword = () => {
    setChangePasswordModal(false);
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setPasswordError('');
  };

  const handleSubmitChangePassword = async () => {
    // Clear previous errors
    setPasswordError('');

    // Validate inputs
    if (!currentPassword.trim()) {
      setPasswordError('Please enter your current password');
      return;
    }

    if (!newPassword.trim()) {
      setPasswordError('Please enter a new password');
      return;
    }

    if (!confirmPassword.trim()) {
      setPasswordError('Please confirm your new password');
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError('New passwords do not match');
      return;
    }

    // Validate new password strength
    const validation = validatePassword(newPassword);
    if (!validation.valid) {
      setPasswordError(validation.message);
      return;
    }

    setChangingPassword(true);
    try {
      const result = await changeUserPassword(currentPassword, newPassword);
      if (result.success) {
        alert('Password changed successfully! You will be logged out to log in with your new password.');
        handleCancelChangePassword();
        // Log out the user after successful password change
        if (onLogout) {
          onLogout();
        }
      } else {
        setPasswordError(result.message);
      }
    } catch {
      setPasswordError('An error occurred while changing password');
    } finally {
      setChangingPassword(false);
    }
  };

  const handleDeleteAccount = () => {
    setDeleteAccountModal(true);
    setDeletePassword('');
    setDeleteError('');
  };

  const handleCancelDeleteAccount = () => {
    setDeleteAccountModal(false);
    setDeletePassword('');
    setDeleteError('');
  };

  const handleLogout = async () => {
    setLogoutLoading(true);
    try {
      await onLogout();
    } catch (error) {
      console.error('Error during logout:', error);
      setLogoutLoading(false);
    }
  };

  const handleConfirmDeleteAccount = async () => {
    // Clear previous errors
    setDeleteError('');

    // Validate input
    if (!deletePassword.trim()) {
      setDeleteError('Please enter your password to confirm account deletion');
      return;
    }

    setDeletingAccount(true);
    try {
      const result = await deleteUserAccount(deletePassword);
      if (result.success) {
        alert('Account deleted successfully!');
        // Log out the user after successful account deletion
        if (onLogout) {
          onLogout();
        }
      } else {
        setDeleteError(result.message);
      }
    } catch {
      setDeleteError('An error occurred while deleting your account');
    } finally {
      setDeletingAccount(false);
    }
  };

  if (loading) {
    return <LoadingSpinner fullScreen text="Loading profile..." />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#e3efff] to-[#b3d0f7] flex flex-col">
      <div className="max-w-[1800px] mx-auto w-full">
        <header className="flex flex-row justify-between items-center p-4 sm:p-6 gap-2 sm:gap-0">
          <h1 className="text-2xl sm:text-3xl font-bold text-primary">LinkBoard</h1>
          {/* Desktop menu */}
          <div className="hidden sm:flex gap-4 items-center">
            <button className="btn btn-sm btn-ghost" onClick={onBack}>
              <svg className="inline-block w-5 h-5 mr-1" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
              Back
            </button>
            <button className={`btn btn-sm btn-white shadow ${logoutLoading ? 'enhanced-button-loading' : ''}`} onClick={handleLogout} disabled={logoutLoading}>
              {logoutLoading ? (
                <>
                  <span className="enhanced-button-spinner w-3 h-3"></span>
                  Logging out...
                </>
              ) : (
                <>
                  Logout <span className="ml-1">→</span>
                </>
              )}
            </button>
          </div>
          {/* Mobile menu */}
          <div className="sm:hidden flex items-center relative">
            <button className="btn btn-sm btn-ghost" onClick={() => setMenuOpen(v => !v)} aria-label="Open menu">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            {menuOpen && (
              <div className="absolute right-0 top-10 w-40 bg-white rounded-lg shadow-lg z-50 flex flex-col border border-gray-200">
                <button className="px-4 py-2 text-left hover:bg-gray-100" onClick={onBack}>
                  <svg className="inline-block w-5 h-5 mr-1" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                  </svg>
                  Back
                </button>
                <button className={`px-4 py-2 text-left hover:bg-gray-100 ${logoutLoading ? 'enhanced-button-loading' : ''}`} onClick={handleLogout} disabled={logoutLoading}>
                  {logoutLoading ? (
                    <>
                      <span className="enhanced-button-spinner w-3 h-3"></span>
                      Logging out...
                    </>
                  ) : (
                    <>
                      Logout <span className="ml-1">→</span>
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        </header>

        <main className="flex-1 flex flex-col items-center justify-start px-4 sm:px-6">
          <div className="bg-white bg-opacity-60 rounded-xl sm:rounded-2xl shadow-xl w-full max-w-2xl h-[calc(100vh-120px)] sm:h-[calc(100vh-115px)] max-h-full sm:max-h-[900px] flex flex-col justify-start items-center p-2 sm:p-4 lg:p-8 mt-0 overflow-y-auto">
          
          {/* Profile Content */}
          <div className="w-full max-w-2xl space-y-4 sm:space-y-6 pb-4 sm:pb-8">
            {/* Profile Header */}
            <div className="text-center space-y-3 sm:space-y-4">
              <div className="relative inline-block group">
                <div className="avatar">
                  <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full">
                    {(() => {
                      console.log('Rendering profile image - localPhotoURL:', localPhotoURL, 'type:', typeof localPhotoURL);
                      return localPhotoURL ? (
                        <img 
                          src={localPhotoURL} 
                          alt="Profile" 
                          className="w-20 h-20 sm:w-24 sm:h-24 rounded-full object-cover"
                        />
                      ) : (
                        <div className="bg-primary text-primary-content rounded-full w-20 h-20 sm:w-24 sm:h-24 flex items-center justify-center">
                          <span className="text-2xl sm:text-3xl">
                            {userProfile ? userProfile.firstName?.charAt(0)?.toUpperCase() : 
                             user?.displayName ? user.displayName.charAt(0).toUpperCase() : 'U'}
                          </span>
                        </div>
                      );
                    })()}
                  </div>
                </div>
                
                {/* Edit overlay - appears on hover */}
                <div className="absolute inset-0 bg-black bg-opacity-50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center">
                  <button
                    className="btn btn-circle btn-sm btn-primary"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadingImage}
                    title="Edit profile picture"
                  >
                    {uploadingImage ? (
                      <span className="enhanced-button-spinner w-3 h-3"></span>
                    ) : (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    )}
                  </button>
                </div>
                
                {/* Delete button - only show if image exists */}
                {localPhotoURL && (
                  <button
                    className="absolute -top-2 -right-2 btn btn-circle btn-xs btn-error opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                    onClick={handleDeleteImage}
                    disabled={uploadingImage}
                    title="Remove profile picture"
                  >
                    {uploadingImage ? (
                      <span className="enhanced-button-spinner w-2 h-2"></span>
                    ) : (
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    )}
                  </button>
                )}
                
                {/* Hidden file input */}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                />
              </div>
              
              <div>
                <h2 className="text-xl sm:text-2xl font-bold text-gray-800">
                  {userProfile ? `${userProfile.firstName} ${userProfile.lastName}` : user?.displayName || 'User'}
                </h2>
                <p className="text-sm sm:text-base text-gray-600 break-all">{user?.email}</p>
              </div>
            </div>

            {/* Profile Information */}
            <div className="space-y-3 sm:space-y-4">
              <div className="card bg-white/80 backdrop-blur">
                <div className="card-body p-4 sm:p-6">
                  <h3 className="card-title text-base sm:text-lg font-semibold">Account Information</h3>
                  <div className="space-y-2 sm:space-y-3">
                    {editMode ? (
                      <>
                        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
                          <span className="font-medium text-gray-700 text-sm sm:text-base">First Name:</span>
                          <input
                            type="text"
                            value={firstName}
                            onChange={(e) => setFirstName(e.target.value)}
                            className="input input-bordered input-sm w-full sm:w-32"
                            placeholder="First Name"
                          />
                        </div>
                        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
                          <span className="font-medium text-gray-700 text-sm sm:text-base">Last Name:</span>
                          <input
                            type="text"
                            value={lastName}
                            onChange={(e) => setLastName(e.target.value)}
                            className="input input-bordered input-sm w-full sm:w-32"
                            placeholder="Last Name"
                          />
                        </div>
                        <div className="flex gap-2 justify-end mt-2">
                          <button 
                            className="btn btn-sm btn-ghost" 
                            onClick={handleCancelEdit}
                            disabled={isUpdating}
                          >
                            Cancel
                          </button>
                          <button 
                            className="btn btn-sm btn-primary" 
                            onClick={handleSaveProfile}
                            disabled={isUpdating}
                          >
                            {isUpdating ? 'Saving...' : 'Save'}
                          </button>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-1">
                          <span className="font-medium text-gray-700 text-sm sm:text-base">First Name:</span>
                          <span className="text-gray-900 text-sm sm:text-base break-all">{userProfile?.firstName || user?.displayName?.split(' ')[0] || 'Not set'}</span>
                        </div>
                        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-1">
                          <span className="font-medium text-gray-700 text-sm sm:text-base">Last Name:</span>
                          <span className="text-gray-900 text-sm sm:text-base break-all">{userProfile?.lastName || user?.displayName?.split(' ').slice(1).join(' ') || 'Not set'}</span>
                        </div>
                      </>
                    )}
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-1">
                      <span className="font-medium text-gray-700 text-sm sm:text-base">Email:</span>
                      <span className="text-gray-900 text-sm sm:text-base break-all">{user?.email}</span>
                    </div>
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-1">
                      <span className="font-medium text-gray-700 text-sm sm:text-base">Account Created:</span>
                      <span className="text-gray-900 text-sm sm:text-base">
                        {user?.metadata?.creationTime ? 
                          new Date(user.metadata.creationTime).toLocaleDateString() : 
                          'Unknown'}
                      </span>
                    </div>
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-1">
                      <span className="font-medium text-gray-700 text-sm sm:text-base">Last Sign In:</span>
                      <span className="text-gray-900 text-sm sm:text-base">
                        {user?.metadata?.lastSignInTime ? 
                          new Date(user.metadata.lastSignInTime).toLocaleDateString() : 
                          'Unknown'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Account Actions */}
              <div className="card bg-white/80 backdrop-blur">
                <div className="p-3 sm:p-4 space-y-2">
                  <h3 className="card-title text-base sm:text-lg font-semibold">Account Actions</h3>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <button 
                      className="btn btn-outline btn-primary flex-1 text-sm sm:text-base" 
                      onClick={handleEditProfile}
                      disabled={editMode}
                    >
                      <svg className="w-4 h-4 sm:w-5 sm:h-5 mr-1 sm:mr-2" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                      Edit Profile
                    </button>
                    <button 
                      className="btn btn-outline btn-secondary flex-1 text-sm sm:text-base" 
                      onClick={handleChangePassword}
                    >
                      <svg className="w-4 h-4 sm:w-5 sm:h-5 mr-1 sm:mr-2" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                      </svg>
                      Change Password
                    </button>
                  </div>
                </div>
              </div>

              {/* Delete Account */}
              <div className="card bg-white/80 backdrop-blur">
                <div className="p-3 sm:p-4">
                  <button 
                    className="btn btn-error w-full text-sm sm:text-base" 
                    onClick={handleDeleteAccount}
                  >
                    <svg className="w-4 h-4 sm:w-5 sm:h-5 mr-1 sm:mr-2" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    Delete Account
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
      </div>

      {/* Change Password Modal */}
      {changePasswordModal && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/20 backdrop-blur-sm z-50 p-4">
          <div className="bg-white rounded-lg p-4 sm:p-6 shadow-lg flex flex-col gap-4 w-full max-w-md">
            <h2 className="text-lg font-bold">Change Password</h2>
            
            {passwordError && (
              <div className="alert alert-error text-sm">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>{passwordError}</span>
              </div>
            )}

            <div className="space-y-3">
              <div>
                <label className="label">
                  <span className="label-text text-sm sm:text-base">Current Password</span>
                </label>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="input input-bordered w-full text-sm sm:text-base"
                  placeholder="Enter current password"
                />
              </div>
              
              <div>
                <label className="label">
                  <span className="label-text text-sm sm:text-base">New Password</span>
                </label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="input input-bordered w-full text-sm sm:text-base"
                  placeholder="Enter new password"
                />
                <div className="text-xs text-gray-500 mt-1">
                  Must be at least 8 characters with 1 uppercase letter and 1 special character
                </div>
              </div>
              
              <div>
                <label className="label">
                  <span className="label-text text-sm sm:text-base">Confirm New Password</span>
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="input input-bordered w-full text-sm sm:text-base"
                  placeholder="Confirm new password"
                />
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-2 justify-end">
              <button 
                className="btn btn-ghost text-sm sm:text-base" 
                onClick={handleCancelChangePassword}
                disabled={changingPassword}
              >
                Cancel
              </button>
              <button
                className="btn btn-primary text-sm sm:text-base"
                onClick={handleSubmitChangePassword}
                disabled={changingPassword}
              >
                {changingPassword ? 'Changing...' : 'Change Password'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Account Modal */}
      {deleteAccountModal && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/20 backdrop-blur-sm z-50 p-4">
          <div className="bg-white rounded-lg p-4 sm:p-6 shadow-lg flex flex-col gap-4 w-full max-w-md">
            <h2 className="text-lg font-bold text-red-600">Delete Account</h2>
            
            <div className="alert alert-warning text-sm">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
              <span>This action cannot be undone. All your data, including boards and links, will be permanently deleted.</span>
            </div>

            {deleteError && (
              <div className="alert alert-error text-sm">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>{deleteError}</span>
              </div>
            )}

            <div>
              <label className="label">
                <span className="label-text text-sm sm:text-base">Enter your password to confirm</span>
              </label>
              <input
                type="password"
                value={deletePassword}
                onChange={(e) => setDeletePassword(e.target.value)}
                className="input input-bordered w-full text-sm sm:text-base"
                placeholder="Enter your password"
              />
            </div>

            <div className="flex flex-col sm:flex-row gap-2 justify-end">
              <button 
                className="btn btn-ghost text-sm sm:text-base" 
                onClick={handleCancelDeleteAccount}
                disabled={deletingAccount}
              >
                Cancel
              </button>
              <button
                className="btn btn-error text-sm sm:text-base"
                onClick={handleConfirmDeleteAccount}
                disabled={deletingAccount}
              >
                {deletingAccount ? 'Deleting...' : 'Delete Account'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 