import React, { useState, useEffect, useRef } from "react";
import BrandLogo from "./BrandLogo";
import { updateUserProfile, getUserProfile, uploadProfileImage, deleteProfileImage, changeUserPassword, validatePassword, deleteUserAccount } from "./firebase";
import LoadingSpinner from "./components/LoadingSpinner.jsx";
import ThemeSetting from "./components/ThemeSetting.jsx";
import Modal from "./components/Modal.jsx";

import { auth } from "./firebase";
export default function ProfilePage({ user, onBack, onLogout, onUserUpdate }) {
  const [editMode, setEditMode] = useState(false);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [nickname, setNickname] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [localPhotoURL, setLocalPhotoURL] = useState(user?.photoURL);
  const [changePasswordModal, setChangePasswordModal] = useState(false);
  const [deleteImageModal, setDeleteImageModal] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [visiblePasswordFields, setVisiblePasswordFields] = useState({});
  const [changingPassword, setChangingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [passwordValidationAttempted, setPasswordValidationAttempted] = useState(false);
  const [deleteAccountModal, setDeleteAccountModal] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [deletingAccount, setDeletingAccount] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  const [logoutLoading, setLogoutLoading] = useState(false);
  const fileInputRef = useRef(null);

  const togglePasswordVisibility = (field) => {
    setVisiblePasswordFields((current) => ({ ...current, [field]: !current[field] }));
  };

  const passwordRequirements = [
    { label: 'At least 8 characters', met: newPassword.length >= 8 },
    { label: 'At least 1 uppercase letter', met: /[A-Z]/.test(newPassword) },
    { label: 'At least 1 special character', met: /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(newPassword) },
  ];
  const passwordsMatch = confirmPassword.length > 0 && newPassword === confirmPassword;
  const passwordsDoNotMatch = confirmPassword.length > 0 && newPassword !== confirmPassword;

  // Keep the local avatar in sync with the user prop.
  useEffect(() => {
    setLocalPhotoURL(user?.photoURL);
  }, [user]);

  // Load the signed-in user's profile from the API.
  useEffect(() => {
    const loadUserProfile = async () => {
      try {
        const result = await getUserProfile();
        if (result.success) {
          setUserProfile(result.data);
          setFirstName(result.data.firstName || '');
          setLastName(result.data.lastName || '');
          setNickname(result.data.nickname || '');
        } else {
          // Fall back to the signed-in account's display name if no profile is saved.
          const displayNameParts = user?.displayName?.split(' ') || [];
          setFirstName(displayNameParts[0] || '');
          setLastName(displayNameParts.slice(1).join(' ') || '');
          setNickname('');
        }
      } catch (error) {
        console.error('Error loading user profile:', error);
        // Fall back to the signed-in account's display name.
        const displayNameParts = user?.displayName?.split(' ') || [];
        setFirstName(displayNameParts[0] || '');
        setLastName(displayNameParts.slice(1).join(' ') || '');
        setNickname('');
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
      window.showToast('Please enter both first name and last name', 'error');
      return;
    }
    if (nickname.trim().length < 2 || nickname.trim().length > 24) {
      window.showToast('Nickname must be between 2 and 24 characters', 'error');
      return;
    }

    setIsUpdating(true);
    try {
      const result = await updateUserProfile(firstName.trim(), lastName.trim(), nickname.trim());
      if (result.success) {
        setEditMode(false);
        // Refresh the profile data
        const refreshResult = await getUserProfile();
        if (refreshResult.success) {
          setUserProfile(refreshResult.data);
        }
        window.showToast('Profile updated successfully!', 'success');
      } else {
        window.showToast('Failed to update profile: ' + result.message, 'error');
      }
    } catch (error) {
      window.showToast('Error updating profile: ' + error.message, 'error');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleCancelEdit = () => {
    setEditMode(false);
    const displayNameParts = user?.displayName?.split(' ') || [];
    setFirstName(userProfile?.firstName || displayNameParts[0] || '');
    setLastName(userProfile?.lastName || displayNameParts.slice(1).join(' ') || '');
    setNickname(userProfile?.nickname || '');
  };

  const handleImageUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      window.showToast('Please select an image file', 'error');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      window.showToast('Image size must be less than 5MB', 'error');
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
        window.showToast('Profile image updated successfully!', 'success');
      } else {
        window.showToast('Failed to upload image: ' + result.message, 'error');
      }
    } catch (error) {
      window.showToast('Error uploading image: ' + error.message, 'error');
    } finally {
      setUploadingImage(false);
    }
  };

  const handleDeleteImage = () => {
    if (localPhotoURL) setDeleteImageModal(true);
  };

  const handleConfirmDeleteImage = async () => {
    setUploadingImage(true);
    try {
      const result = await deleteProfileImage();
      if (result.success) {
        setDeleteImageModal(false);
        // Immediately update local state to show the change
        setLocalPhotoURL(null);
        // Reload the user to get the latest data
        await auth.currentUser.reload();
        // Small delay to ensure the update is complete
        await new Promise(resolve => setTimeout(resolve, 100));
        // Update the user state in the parent component
        if (onUserUpdate) {
          onUserUpdate(auth.currentUser);
        }
        window.showToast('Profile image deleted successfully!', 'success');
      } else {
        window.showToast('Failed to delete image: ' + result.message, 'error');
      }
    } catch (error) {
      console.error('Error in handleDeleteImage:', error);
      window.showToast('Error deleting image: ' + error.message, 'error');
    } finally {
      setUploadingImage(false);
    }
  };

  const handleCancelDeleteImage = () => {
    if (uploadingImage) return;
    setDeleteImageModal(false);
  };

  const handleChangePassword = () => {
    setChangePasswordModal(true);
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setPasswordError('');
    setPasswordValidationAttempted(false);
  };

  const handleCancelChangePassword = () => {
    setChangePasswordModal(false);
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setPasswordError('');
    setPasswordValidationAttempted(false);
  };

  const handleSubmitChangePassword = async () => {
    // Clear previous errors
    setPasswordError('');
    setPasswordValidationAttempted(true);

    // Validate inputs
    if (!currentPassword.trim()) {
      setPasswordError('Please enter your current password');
      return;
    }

    if (!newPassword.trim()) {
      return;
    }

    if (!confirmPassword.trim()) {
      return;
    }

    if (newPassword !== confirmPassword) {
      return;
    }

    // Validate new password strength
    const validation = validatePassword(newPassword);
    if (!validation.valid) {
      return;
    }

    setChangingPassword(true);
    try {
      const result = await changeUserPassword(currentPassword, newPassword);
      if (result.success) {
        window.showToast('Password changed successfully! You will be logged out to log in with your new password.', 'success');
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
        window.showToast('Account deleted successfully!', 'success');
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
    return <LoadingSpinner fullScreen text="Loading profile…" />;
  }

  return (
    <div className="min-h-screen flex flex-col">
      <div className="max-w-[1800px] mx-auto w-full">
        <header className="flex flex-row justify-between items-center p-4 sm:p-6 gap-2 sm:gap-0">
                      <h1><BrandLogo /></h1>
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
                  Logging out…
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
            <button className="btn btn-sm btn-ghost" popoverTarget="profile-menu" style={{ anchorName: '--profile-menu' }} aria-label="Menu">
              <svg aria-hidden="true" className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            {/* Native popover: Esc and outside clicks close it. */}
              <div id="profile-menu" popover="auto" className="popover-menu" style={{ positionAnchor: '--profile-menu' }}>
                <button className="px-4 py-2 text-left hover:bg-base-200" onClick={onBack}>
                  <svg className="inline-block w-5 h-5 mr-1" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                  </svg>
                  Back
                </button>
                <button className={`px-4 py-2 text-left hover:bg-base-200 ${logoutLoading ? 'enhanced-button-loading' : ''}`} onClick={handleLogout} disabled={logoutLoading}>
                  {logoutLoading ? (
                    <>
                      <span className="enhanced-button-spinner w-3 h-3"></span>
                      Logging out…
                    </>
                  ) : (
                    <>
                      Logout <span className="ml-1">→</span>
                    </>
                  )}
                </button>
              </div>
          </div>
        </header>

        <main className="flex-1 flex flex-col items-center justify-start px-4 sm:px-6">
          <div className="flex w-full max-w-3xl flex-col items-center pt-2 sm:pt-4">
          
          {/* Profile Content */}
          <div className="w-full space-y-5 sm:space-y-7 pb-4 sm:pb-8">
            {/* Profile Header */}
            <div className="flex flex-col items-center gap-3 text-center sm:flex-row sm:items-center sm:gap-5 sm:text-left">
              <div className="relative inline-block group">
                <div className="avatar">
                  <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full">
                    {(() => {
                      return localPhotoURL ? (
                        <img 
                          src={localPhotoURL} 
                          alt="Profile"
                          width={96}
                          height={96}
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
                <div className="absolute inset-0 bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center">
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
                {editMode ? (
                  <input
                    type="text"
                    value={nickname}
                    maxLength={24}
                    onChange={(e) => setNickname(e.target.value)}
                    className="input input-bordered input-sm w-full max-w-xs text-lg font-bold"
                    placeholder="Nickname"
                    aria-label="Public nickname"
                  />
                ) : (
                  <h2 className="text-xl sm:text-2xl font-bold text-base-content">
                    {userProfile?.nickname || 'Nickname not set'}
                  </h2>
                )}
              </div>
              <div className="flex items-center gap-2 sm:ml-auto">
                {editMode && (
                  <button
                    className="btn btn-ghost btn-sm"
                    onClick={handleCancelEdit}
                    disabled={isUpdating}
                  >
                    Cancel
                  </button>
                )}
                <button
                  className="btn btn-primary btn-sm"
                  onClick={editMode ? handleSaveProfile : handleEditProfile}
                  disabled={isUpdating}
                >
                  {editMode ? (isUpdating ? 'Saving…' : 'Save') : 'Edit'}
                </button>
              </div>
            </div>

            {/* Profile Information */}
            <div className="grid grid-cols-1 items-start gap-4 sm:gap-6">
              <div className="card bg-card">
                <div className="card-body p-4 sm:p-6">
                  <h3 className="card-title col-span-full text-base sm:text-lg font-semibold">Account Information</h3>
                  <div className="grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2">
                    <div className="flex min-w-0 flex-col gap-1">
                      <label htmlFor="profile-first-name" className="font-medium text-charcoal text-sm sm:text-base">First Name:</label>
                      <input
                        id="profile-first-name"
                        type="text"
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        readOnly={!editMode}
                        className={`input input-bordered w-full text-base ${editMode ? 'bg-base-100' : 'bg-base-200'}`}
                        placeholder="First Name"
                      />
                    </div>
                    <div className="flex min-w-0 flex-col gap-1">
                      <label htmlFor="profile-last-name" className="font-medium text-charcoal text-sm sm:text-base">Last Name:</label>
                      <input
                        id="profile-last-name"
                        type="text"
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                        readOnly={!editMode}
                        className={`input input-bordered w-full text-base ${editMode ? 'bg-base-100' : 'bg-base-200'}`}
                        placeholder="Last Name"
                      />
                    </div>
                    <div className="flex min-w-0 flex-col gap-1">
                      <label htmlFor="profile-email" className="font-medium text-charcoal text-sm sm:text-base">Email:</label>
                      <input
                        id="profile-email"
                        type="email"
                        value={user?.email || ''}
                        readOnly
                        className="input input-bordered w-full text-base bg-base-200"
                      />
                    </div>
                    <div className="flex min-w-0 flex-col gap-1">
                      <label htmlFor="profile-account-created" className="font-medium text-charcoal text-sm sm:text-base">Account Created:</label>
                      <input
                        id="profile-account-created"
                        type="text"
                        value={user?.metadata?.creationTime ? new Date(user.metadata.creationTime).toLocaleDateString() : 'Unknown'}
                        readOnly
                        className="input input-bordered w-full text-base bg-base-200"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="card bg-card">
                <div className="p-4 sm:p-6 space-y-3">
                  <h3 className="card-title text-base sm:text-lg font-semibold">Appearance</h3>
                  <ThemeSetting />
                </div>
              </div>

              {/* Account Actions */}
              <div className="card bg-card">
                <div className="p-4 sm:p-6 space-y-3">
                  <h3 className="card-title text-base sm:text-lg font-semibold">Account Actions</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <button 
                      className="btn btn-outline btn-primary min-w-0 whitespace-nowrap text-sm sm:text-base" 
                      onClick={handleChangePassword}
                    >
                      <svg className="w-4 h-4 sm:w-5 sm:h-5 mr-1 sm:mr-2" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                      </svg>
                      Change Password
                    </button>
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
        </div>
      </main>
      </div>

      {/* Change Password Modal */}
      {changePasswordModal && (
        <Modal onClose={handleCancelChangePassword} dismissible={!changingPassword} labelledBy="change-password-title">
          <form className="flex flex-col gap-4" onSubmit={(event) => { event.preventDefault(); handleSubmitChangePassword(); }}>
            <h1 id="change-password-title" className="text-lg font-bold">Change password</h1>
            
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
                <label className="label" htmlFor="current-password">
                  <span className="label-text text-sm sm:text-base">Current Password</span>
                </label>
                <div className="relative">
                  <input
                    id="current-password"
                    autoComplete="current-password" autoFocus
                    type={visiblePasswordFields.current ? 'text' : 'password'}
                    value={currentPassword}
                    onChange={(e) => { setCurrentPassword(e.target.value); setPasswordError(''); }}
                    className="password-input-no-native-reveal input input-bordered w-full pr-12 text-sm sm:text-base"
                    placeholder="Enter current password"
                  />
                  <button
                    type="button"
                    onClick={() => togglePasswordVisibility('current')}
                    className="absolute right-3 top-1/2 z-10 -translate-y-1/2 rounded bg-transparent p-1 text-steel hover:bg-transparent active:bg-transparent hover:text-base-content focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
                    aria-label={visiblePasswordFields.current ? 'Hide current password' : 'Show current password'}
                    title={visiblePasswordFields.current ? 'Hide password' : 'Show password'}
                  >
                    {visiblePasswordFields.current ? (
                      <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="m3 3 18 18M10.6 10.6a2 2 0 0 0 2.8 2.8" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9.9 5.2A10.8 10.8 0 0 1 12 5c5 0 8.5 4.2 9.5 6.1a1.8 1.8 0 0 1 0 1.8 12 12 0 0 1-3.1 3.5M6.2 6.2A13 13 0 0 0 2.5 11a1.8 1.8 0 0 0 0 1.8A10.8 10.8 0 0 0 12 19c.8 0 1.6-.1 2.3-.3" />
                      </svg>
                    ) : (
                      <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.5 12s3.5-7 9.5-7 9.5 7 9.5 7-3.5 7-9.5 7-9.5-7-9.5-7Z" />
                        <circle cx="12" cy="12" r="2.5" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>
              
              <div>
                <label className="label" htmlFor="new-password">
                  <span className="label-text text-sm sm:text-base">New Password</span>
                </label>
                <div className="relative">
                  <input
                    id="new-password"
                    autoComplete="new-password"
                    type={visiblePasswordFields.new ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => { setNewPassword(e.target.value); setPasswordError(''); }}
                    className="password-input-no-native-reveal input input-bordered w-full pr-12 text-sm sm:text-base"
                    placeholder="Enter new password"
                  />
                  <button
                    type="button"
                    onClick={() => togglePasswordVisibility('new')}
                    className="absolute right-3 top-1/2 z-10 -translate-y-1/2 rounded bg-transparent p-1 text-steel hover:bg-transparent active:bg-transparent hover:text-base-content focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
                    aria-label={visiblePasswordFields.new ? 'Hide new password' : 'Show new password'}
                    title={visiblePasswordFields.new ? 'Hide password' : 'Show password'}
                  >
                    {visiblePasswordFields.new ? (
                      <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="m3 3 18 18M10.6 10.6a2 2 0 0 0 2.8 2.8" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9.9 5.2A10.8 10.8 0 0 1 12 5c5 0 8.5 4.2 9.5 6.1a1.8 1.8 0 0 1 0 1.8 12 12 0 0 1-3.1 3.5M6.2 6.2A13 13 0 0 0 2.5 11a1.8 1.8 0 0 0 0 1.8A10.8 10.8 0 0 0 12 19c.8 0 1.6-.1 2.3-.3" />
                      </svg>
                    ) : (
                      <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.5 12s3.5-7 9.5-7 9.5 7 9.5 7-3.5 7-9.5 7-9.5-7-9.5-7Z" />
                        <circle cx="12" cy="12" r="2.5" />
                      </svg>
                    )}
                  </button>
                </div>
                {(newPassword.length > 0 || passwordValidationAttempted) && passwordRequirements.some(({ met }) => !met) && (
                  <ul className="mt-1 space-y-0.5 text-xs text-error" aria-live="polite" aria-label="Password requirements">
                    {passwordRequirements.filter(({ met }) => !met).map(({ label }) => (
                      <li key={label}>{label}</li>
                    ))}
                  </ul>
                )}
              </div>
              
              <div>
                <label className="label" htmlFor="confirm-password">
                  <span className="label-text text-sm sm:text-base">Confirm New Password</span>
                </label>
                <div className="relative">
                  <input
                    id="confirm-password"
                    autoComplete="new-password"
                    type={visiblePasswordFields.confirm ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => { setConfirmPassword(e.target.value); setPasswordError(''); }}
                    className="password-input-no-native-reveal input input-bordered w-full pr-12 text-sm sm:text-base"
                    placeholder="Confirm new password"
                  />
                  <button
                    type="button"
                    onClick={() => togglePasswordVisibility('confirm')}
                    className="absolute right-3 top-1/2 z-10 -translate-y-1/2 rounded bg-transparent p-1 text-steel hover:bg-transparent active:bg-transparent hover:text-base-content focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
                    aria-label={visiblePasswordFields.confirm ? 'Hide confirmation password' : 'Show confirmation password'}
                    title={visiblePasswordFields.confirm ? 'Hide password' : 'Show password'}
                  >
                    {visiblePasswordFields.confirm ? (
                      <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="m3 3 18 18M10.6 10.6a2 2 0 0 0 2.8 2.8" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9.9 5.2A10.8 10.8 0 0 1 12 5c5 0 8.5 4.2 9.5 6.1a1.8 1.8 0 0 1 0 1.8 12 12 0 0 1-3.1 3.5M6.2 6.2A13 13 0 0 0 2.5 11a1.8 1.8 0 0 0 0 1.8A10.8 10.8 0 0 0 12 19c.8 0 1.6-.1 2.3-.3" />
                      </svg>
                    ) : (
                      <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.5 12s3.5-7 9.5-7 9.5 7 9.5 7-3.5 7-9.5 7-9.5-7-9.5-7Z" />
                        <circle cx="12" cy="12" r="2.5" />
                      </svg>
                    )}
                  </button>
                </div>
                {passwordsDoNotMatch && (
                  <p className="mt-1 text-xs text-error" role="status" aria-live="polite">Passwords do not match.</p>
                )}
                {passwordsMatch && (
                  <p className="mt-1 text-xs text-success" role="status" aria-live="polite">Passwords match.</p>
                )}
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-2 justify-end">
              <button
                type="button"
                className="btn btn-ghost text-sm sm:text-base"
                onClick={handleCancelChangePassword}
                disabled={changingPassword}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn btn-primary text-sm sm:text-base"
                disabled={changingPassword}
              >
                {changingPassword ? 'Changing…' : 'Change Password'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Remove Profile Picture Modal */}
      {deleteImageModal && (
        <Modal alert onClose={handleCancelDeleteImage} dismissible={!uploadingImage} labelledBy="delete-profile-image-title" describedBy="delete-profile-image-description">
          <div className="flex flex-col gap-4">
            <h1 id="delete-profile-image-title" className="text-lg font-bold text-base-content">Remove profile picture?</h1>
            <p id="delete-profile-image-description" className="text-sm text-slate">Your profile picture will be removed. You can upload a new one at any time.</p>
            <div className="flex flex-col sm:flex-row gap-2 justify-end">
              <button
                type="button"
                className="btn btn-ghost text-sm sm:text-base"
                onClick={handleCancelDeleteImage}
                disabled={uploadingImage}
                autoFocus
              >
                Cancel
              </button>
              <button
                className="btn btn-error text-sm sm:text-base"
                onClick={handleConfirmDeleteImage}
                disabled={uploadingImage}
              >
                {uploadingImage ? 'Removing…' : 'Remove Picture'}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Delete Account Modal */}
      {deleteAccountModal && (
        <Modal alert onClose={handleCancelDeleteAccount} dismissible={!deletingAccount} labelledBy="delete-account-title" describedBy="delete-account-warning">
          <form className="flex flex-col gap-4" onSubmit={(event) => { event.preventDefault(); handleConfirmDeleteAccount(); }}>
            <h1 id="delete-account-title" className="text-lg font-bold text-error">Delete account?</h1>
            
            <div className="alert alert-warning text-sm">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
              <span id="delete-account-warning">This action cannot be undone. All your data, including boards and links, will be permanently deleted.</span>
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
              <label className="label" htmlFor="delete-account-password">
                <span className="label-text text-sm sm:text-base">Enter your password to confirm</span>
              </label>
              <input
                id="delete-account-password"
                autoComplete="current-password"
                autoFocus
                type="password"
                value={deletePassword}
                onChange={(e) => setDeletePassword(e.target.value)}
                className="input input-bordered w-full text-sm sm:text-base"
                placeholder="Enter your password"
              />
            </div>

            <div className="flex flex-col sm:flex-row gap-2 justify-end">
              <button
                type="button"
                className="btn btn-ghost text-sm sm:text-base"
                onClick={handleCancelDeleteAccount}
                disabled={deletingAccount}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn btn-error text-sm sm:text-base"
                disabled={deletingAccount}
              >
                {deletingAccount ? 'Deleting…' : 'Delete Account'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
