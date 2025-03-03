import React, { useState, useEffect, useRef } from 'react';
import { useAuthStore } from '../store/authStore';
import { supabase } from '../lib/supabase';
import { User, Settings, Upload, Camera, X } from 'lucide-react';

export default function Profile() {
    const { user, loadUser, updateProfile } = useAuthStore();
    const [isEditing, setIsEditing] = useState(false);
    const [fullName, setFullName] = useState(user?.full_name || '');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [loading, setLoading] = useState(false);
    const [uploadingAvatar, setUploadingAvatar] = useState(false);
    const [avatarUrl, setAvatarUrl] = useState(user?.avatar_url || '');
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (user) {
            setFullName(user.full_name);
            setAvatarUrl(user.avatar_url || '');
        }
    }, [user]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setSuccess('');
        setLoading(true);

        try {
            const { error: updateError } = await supabase
                .from('profiles')
                .update({ full_name: fullName })
                .eq('id', user?.id);

            if (updateError) throw updateError;

            await loadUser();
            setSuccess('Profile updated successfully');
            setIsEditing(false);
        } catch (err) {
            console.error('Error updating profile:', err);
            setError('Failed to update profile');
        } finally {
            setLoading(false);
        }
    };

    const handleAvatarClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || !e.target.files[0]) return;

        const file = e.target.files[0];
        const fileSize = file.size / 1024 / 1024; // size in MB

        if (fileSize > 2) {
            setError('File size must be less than 2MB');
            return;
        }

        setUploadingAvatar(true);
        setError('');

        try {
            // Upload image to storage
            const fileExt = file.name.split('.').pop();
            const fileName = `${user?.id}-${Math.random().toString(36).substring(2)}.${fileExt}`;
            const filePath = `avatars/${fileName}`;

            const { error: uploadError } = await supabase.storage
                .from('avatars')
                .upload(filePath, file);

            if (uploadError) throw uploadError;

            // Get public URL
            const { data: urlData } = supabase.storage
                .from('avatars')
                .getPublicUrl(filePath);

            const avatarUrl = urlData.publicUrl;

            // Update profile
            const { error: updateError } = await supabase
                .from('profiles')
                .update({ avatar_url: avatarUrl })
                .eq('id', user?.id);

            if (updateError) throw updateError;

            setAvatarUrl(avatarUrl);
            await updateProfile({ avatar_url: avatarUrl });
            setSuccess('Profile picture updated successfully');
        } catch (err) {
            console.error('Error uploading avatar:', err);
            setError('Failed to upload profile picture');
        } finally {
            setUploadingAvatar(false);
        }
    };

    const removeAvatar = async () => {
        if (!avatarUrl) return;

        setUploadingAvatar(true);
        setError('');

        try {
            // Update profile to remove avatar URL
            const { error: updateError } = await supabase
                .from('profiles')
                .update({ avatar_url: null })
                .eq('id', user?.id);

            if (updateError) throw updateError;

            setAvatarUrl('');
            await updateProfile({ avatar_url: null });
            setSuccess('Profile picture removed successfully');
        } catch (err) {
            console.error('Error removing avatar:', err);
            setError('Failed to remove profile picture');
        } finally {
            setUploadingAvatar(false);
        }
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
        });
    };

    return (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                <div className="flex justify-between items-center">
                    <h1 className="text-2xl font-bold flex items-center text-gray-900 dark:text-white">
                        <User className="mr-2 h-6 w-6" />
                        Profile Settings
                    </h1>
                    <button
                        onClick={() => setIsEditing(!isEditing)}
                        className="flex items-center text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                    >
                        <Settings className="h-5 w-5 mr-1" />
                        {isEditing ? 'Cancel Editing' : 'Edit Profile'}
                    </button>
                </div>
            </div>

            <div className="p-6">
                {error && (
                    <div className="mb-4 bg-red-50 dark:bg-red-900/50 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-200 px-4 py-3 rounded">
                        {error}
                    </div>
                )}
                {success && (
                    <div className="mb-4 bg-green-50 dark:bg-green-900/50 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-200 px-4 py-3 rounded">
                        {success}
                    </div>
                )}

                <div className="flex flex-col md:flex-row gap-8">
                    <div className="flex flex-col items-center space-y-4">
                        <div className="relative">
                            <div
                                className="h-32 w-32 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center overflow-hidden"
                                onClick={handleAvatarClick}
                            >
                                {avatarUrl ? (
                                    <img
                                        src={avatarUrl}
                                        alt={user?.full_name || 'Profile'}
                                        className="h-full w-full object-cover"
                                    />
                                ) : (
                                    <User className="h-16 w-16 text-gray-400" />
                                )}

                                {uploadingAvatar && (
                                    <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
                                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
                                    </div>
                                )}
                            </div>

                            <button
                                type="button"
                                onClick={handleAvatarClick}
                                className="absolute bottom-0 right-0 bg-blue-600 text-white p-2 rounded-full hover:bg-blue-700"
                            >
                                <Camera className="h-4 w-4" />
                            </button>

                            <input
                                type="file"
                                ref={fileInputRef}
                                onChange={handleFileChange}
                                accept="image/*"
                                className="hidden"
                            />
                        </div>

                        {avatarUrl && (
                            <button
                                type="button"
                                onClick={removeAvatar}
                                className="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 text-sm flex items-center"
                                disabled={uploadingAvatar}
                            >
                                <X className="h-4 w-4 mr-1" />
                                Remove photo
                            </button>
                        )}

                        <p className="text-sm text-gray-500 dark:text-gray-400 text-center">
                            Click to upload a profile picture<br />
                            (Max size: 2MB)
                        </p>
                    </div>

                    <div className="flex-1">
                        {isEditing ? (
                            <form onSubmit={handleSubmit} className="space-y-4">
                                <div>
                                    <label htmlFor="fullName" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                        Full Name
                                    </label>
                                    <input
                                        type="text"
                                        id="fullName"
                                        value={fullName}
                                        onChange={(e) => setFullName(e.target.value)}
                                        className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-700 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-900 dark:text-white"
                                        required
                                    />
                                </div>

                                <div className="flex items-center space-x-4">
                                    <button
                                        type="submit"
                                        disabled={loading}
                                        className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50 dark:bg-blue-600 dark:hover:bg-blue-700"
                                    >
                                        {loading ? 'Saving...' : 'Save Changes'}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setIsEditing(false);
                                            setFullName(user?.full_name || '');
                                        }}
                                        className="text-gray-600 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </form>
                        ) : (
                            <div className="space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                                        <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Full Name</h3>
                                        <p className="mt-1 text-lg font-semibold text-gray-900 dark:text-white">{user?.full_name}</p>
                                    </div>

                                    <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                                        <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Role</h3>
                                        <p className="mt-1 text-lg font-semibold capitalize text-gray-900 dark:text-white">{user?.role}</p>
                                    </div>

                                    <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                                        <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Member Since</h3>
                                        <p className="mt-1 text-lg font-semibold text-gray-900 dark:text-white">
                                            {user?.created_at ? formatDate(user.created_at) : 'N/A'}
                                        </p>
                                    </div>

                                    <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                                        <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Account Status</h3>
                                        <p className="mt-1">
                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-sm font-medium bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300">
                                                Active
                                            </span>
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}