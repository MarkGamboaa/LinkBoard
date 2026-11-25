import React, { useState, useEffect, useRef } from "react";
import BrandLogo from "./BrandLogo";
import { apiFetch, updateUserProfile, getUserProfile, uploadProfileImage, deleteProfileImage, changeUserPassword, validatePassword, deleteUserAccount } from "./firebase";
import LoadingSpinner from "./components/LoadingSpinner.jsx";
import Modal from "./components/Modal.jsx";
import { readShowDomains, cacheShowDomains } from "./utils/linkPreview";

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
  const [showDomains, setShowDomains] = useState(readShowDomains);

  const changeShowDomains = async (next) => {
    setShowDomains(next);
    cacheShowDomains(next);
    try {
      const response = await apiFetch('/api/profile/preferences', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ showDomains: next }),
      });
      if (!response.ok) throw new Error('Failed to save preference');
    } catch (error) {
      console.error('Error saving display preference:', error);
      setShowDomains(!next);
      cacheShowDomains(!next);
    }
  };

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
          setShowDomains(result.data.showDomains !== false);
          cacheShowDomains(result.data.showDomains);
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

  const memberSince = user?.metadata?.creationTime
    ? new Intl.DateTimeFormat(undefined, { dateStyle: 'long' }).format(new Date(user.metadata.creationTime))
    : null;

  if (loading) {
    return <LoadingSpinner fullScreen text="Loading profile…" />;
  }

  return (
    <div className="min-h-screen flex flex-col">
      <div className="max-w-[1800px] mx-auto w-full">
        <header className="cover-band flex items-center justify-between gap-2 px-4 py-3 sm:px-10 sm:py-4">
          <BrandLogo />
          {/* Desktop menu */}
          <div className="hidden sm:flex gap-4 items-center">
            <button className="btn btn-sm btn-ghost" onClick={onBack}>
              <svg className="inline-block w-5 h-5 mr-1" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
              Back
            </button>
            <button className={`btn btn-sm btn-ghost ${logoutLoading ? 'enhanced-button-loading' : ''}`} onClick={handleLogout} disabled={logoutLoading}>
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

        <main className="mx-auto w-full max-w-3xl flex-1 px-4 pb-16 pt-8 sm:px-6">
          <div className="flex flex-col gap-6">
            {/* Identity */}
            <section className="sheet flex flex-col items-center gap-5 px-6 py-6 text-center sm:flex-row sm:text-left">
              {localPhotoURL ? (
                <img src={localPhotoURL} alt="" width={88} height={88} className="h-22 w-22 shrink-0 rounded-full object-cover ring-4 ring-surface" />
              ) : (
                <span aria-hidden="true" className="grid h-22 w-22 shrink-0 place-items-center rounded-full bg-primary text-3xl font-extrabold text-primary-content ring-4 ring-surface">
                  {(userProfile?.nickname || firstName || user?.email || 'U').charAt(0).toUpperCase()}
                </span>
              )}
              <div className="min-w-0 flex-1">
                <h1 className="break-words text-3xl font-extrabold tracking-[-0.02em] text-base-content">
                  {userProfile?.nickname || 'Add a nickname'}
                </h1>
                <p className="mt-1 break-all text-slate">{user?.email}</p>
                {memberSince && <p className="mt-0.5 text-sm text-steel">Member since {memberSince}</p>}
              </div>
              <div className="flex shrink-0 flex-wrap justify-center gap-2 sm:flex-col sm:items-stretch">
                <button type="button" className="btn btn-sm border-hairline-strong bg-card font-semibold text-primary hover:border-primary hover:bg-surface" onClick={() => fileInputRef.current?.click()} disabled={uploadingImage}>
                  {uploadingImage ? 'Uploading…' : localPhotoURL ? 'Change photo' : 'Add photo'}
                </button>
                {localPhotoURL && (
                  <button type="button" className="btn btn-sm btn-ghost font-semibold text-error hover:bg-error/10" onClick={handleDeleteImage} disabled={uploadingImage}>
                    Remove photo
                  </button>
                )}
              </div>
              <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageUpload} className="hidden" aria-label="Profile photo" />
            </section>

            {/* Details: ruled rows like a board sheet; Edit turns the rows into fields. */}
            <section className="sheet" aria-labelledby="details-title">
              <form onSubmit={(event) => { event.preventDefault(); handleSaveProfile(); }}>
                <div className="flex items-center justify-between gap-3 px-6 pb-3 pt-5">
                  <h2 id="details-title" className="text-xl font-extrabold tracking-[-0.01em]">Account details</h2>
                  {editMode ? (
                    <div className="flex gap-2">
                      <button type="button" className="btn btn-sm btn-ghost" onClick={handleCancelEdit} disabled={isUpdating}>Cancel</button>
                      <button type="submit" className="btn btn-sm btn-primary" disabled={isUpdating}>{isUpdating ? 'Saving…' : 'Save'}</button>
                    </div>
                  ) : (
                    <button type="button" className="btn btn-sm border-hairline-strong bg-card font-semibold text-primary hover:border-primary hover:bg-surface" onClick={handleEditProfile}>Edit</button>
                  )}
                </div>
                <dl>
                  {[
                    { id: 'profile-nickname', label: 'Nickname', value: nickname, set: setNickname, hint: 'Shown on your public boards', auto: 'nickname', max: 24 },
                    { id: 'profile-first-name', label: 'First name', value: firstName, set: setFirstName, auto: 'given-name' },
                    { id: 'profile-last-name', label: 'Last name', value: lastName, set: setLastName, auto: 'family-name' },
                  ].map((field) => (
                    <div key={field.id} className="grid grid-cols-1 gap-1 border-t border-hairline px-6 py-3 sm:grid-cols-[10rem_1fr] sm:items-center sm:gap-4">
                      <dt className="text-sm font-semibold text-slate">
                        {editMode ? <label htmlFor={field.id}>{field.label}</label> : field.label}
                      </dt>
                      <dd className="min-w-0">
                        {editMode ? (
                          <input
                            id={field.id}
                            type="text"
                            autoComplete={field.auto}
                            maxLength={field.max}
                            value={field.value}
                            onChange={(event) => field.set(event.target.value)}
                            className="input input-sm input-bordered w-full max-w-sm"
                          />
                        ) : (
                          <span className="break-words text-base-content">{field.value || <span className="text-steel">Not set</span>}</span>
                        )}
                        {field.hint && <p className="mt-0.5 text-xs text-steel">{field.hint}</p>}
                      </dd>
                    </div>
                  ))}
                  <div className="grid grid-cols-1 gap-1 border-t border-hairline px-6 py-3 sm:grid-cols-[10rem_1fr] sm:items-center sm:gap-4">
                    <dt className="text-sm font-semibold text-slate">Email</dt>
                    <dd className="min-w-0 break-all text-base-content">{user?.email}</dd>
                  </div>
                </dl>
              </form>
            </section>

            {/* Display preferences: saved to the account, so every browser gets them. */}
            <section className="sheet" aria-labelledby="display-title">
              <h2 id="display-title" className="px-6 pb-3 pt-5 text-xl font-extrabold tracking-[-0.01em]">Display</h2>
              <label className="flex cursor-pointer items-center justify-between gap-3 border-t border-hairline px-6 py-4">
                <span>
                  <span className="block font-semibold text-base-content">Show website addresses</span>
                  <span className="block text-sm text-steel">Turn off to show only each link’s icon and title on your board cards.</span>
                </span>
                <input type="checkbox" className="toggle toggle-primary" checked={showDomains} onChange={(event) => changeShowDomains(event.target.checked)} />
              </label>
            </section>

            {/* Security */}
            <section className="sheet" aria-labelledby="security-title">
              <h2 id="security-title" className="px-6 pb-3 pt-5 text-xl font-extrabold tracking-[-0.01em]">Security</h2>
              <div className="flex flex-col gap-3 border-t border-hairline px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-semibold text-base-content">Password</p>
                  <p className="text-sm text-steel">You’ll be signed out after changing it.</p>
                </div>
                <button type="button" className="btn btn-sm border-hairline-strong bg-card font-semibold text-primary hover:border-primary hover:bg-surface" onClick={handleChangePassword}>
                  Change password
                </button>
              </div>
            </section>

            {/* Delete account: separated, outlined, never the loudest thing on the page. */}
            <section className="sheet border-error/40" aria-labelledby="delete-title">
              <div className="flex flex-col gap-3 px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 id="delete-title" className="font-bold text-error">Delete account</h2>
                  <p className="text-sm text-steel">Permanently deletes your profile, boards and links. This can’t be undone.</p>
                </div>
                <button type="button" className="btn btn-sm btn-outline border-error/60 font-semibold text-error hover:border-error hover:bg-error hover:text-error-content" onClick={handleDeleteAccount}>
                  Delete account
                </button>
              </div>
            </section>
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
