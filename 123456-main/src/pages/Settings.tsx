import React, { useState } from 'react';
import { useAuthStore } from '../store/authStore';
import { supabase } from '../lib/supabase';
import { User, Settings as SettingsIcon, Key, Bell } from 'lucide-react';

export default function Settings() {
    const { user, updateProfile } = useAuthStore();
    const [activeTab, setActiveTab] = useState('profile');
    const [fullName, setFullName] = useState(user?.full_name || '');
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [emailNotifications, setEmailNotifications] = useState(true);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [loading, setLoading] = useState(false);

    const handleProfileUpdate = async (e: React.FormEvent) => {
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

            await updateProfile({ full_name: fullName });
            setSuccess('Profile updated successfully');
        } catch (err) {
            console.error('Error updating profile:', err);
            setError('Failed to update profile');
        } finally {
            setLoading(false);
        }
    };

    const handlePasswordChange = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setSuccess('');
        setLoading(true);

        if (newPassword !== confirmPassword) {
            setError('New passwords do not match');
            setLoading(false);
            return;
        }

        if (newPassword.length < 6) {
            setError('Password must be at least 6 characters long');
            setLoading(false);
            return;
        }

        try {
            const { error } = await supabase.auth.updateUser({
                password: newPassword
            });

            if (error) throw error;

            setSuccess('Password updated successfully');
            setCurrentPassword('');
            setNewPassword('');
            setConfirmPassword('');
        } catch (err: any) {
            console.error('Error updating password:', err);
            setError(err.message || 'Failed to update password');
        } finally {
            setLoading(false);
        }
    };

    const handleNotificationSettings = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setSuccess('');
        setLoading(true);

        try {
            // In a real app, you would save notification preferences to the database
            // For this example, we'll just show a success message
            setSuccess('Notification preferences updated successfully');
        } catch (err) {
            console.error('Error updating notification settings:', err);
            setError('Failed to update notification settings');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center">
                    <SettingsIcon className="mr-2 h-6 w-6" />
                    Settings
                </h1>
            </div>

            <div className="flex flex-col md:flex-row">
                {/* Sidebar */}
                <div className="w-full md:w-64 p-6 border-b md:border-b-0 md:border-r border-gray-200 dark:border-gray-700">
                    <nav className="space-y-1">
                        <button
                            onClick={() => setActiveTab('profile')}
                            className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-md ${
                                activeTab === 'profile'
                                    ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300'
                                    : 'text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-700'
                            }`}
                        >
                            <User className="mr-3 h-5 w-5" />
                            Profile Settings
                        </button>
                        <button
                            onClick={() => setActiveTab('security')}
                            className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-md ${
                                activeTab === 'security'
                                    ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300'
                                    : 'text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-700'
                            }`}
                        >
                            <Key className="mr-3 h-5 w-5" />
                            Security
                        </button>
                        <button
                            onClick={() => setActiveTab('notifications')}
                            className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-md ${
                                activeTab === 'notifications'
                                    ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300'
                                    : 'text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-700'
                            }`}
                        >
                            <Bell className="mr-3 h-5 w-5" />
                            Notifications
                        </button>
                    </nav>
                </div>

                {/* Content */}
                <div className="flex-1 p-6">
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

                    {activeTab === 'profile' && (
                        <div>
                            <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Profile Settings</h2>
                            <form onSubmit={handleProfileUpdate} className="space-y-4">
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

                                <div>
                                    <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                        Email Address
                                    </label>
                                    <input
                                        type="email"
                                        id="email"
                                        value={user?.email || ''}
                                        className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-700 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-900 dark:text-white bg-gray-100 dark:bg-gray-800"
                                        disabled
                                    />
                                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                                        Email address cannot be changed
                                    </p>
                                </div>

                                <div>
                                    <label htmlFor="role" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                        Role
                                    </label>
                                    <input
                                        type="text"
                                        id="role"
                                        value={user?.role || ''}
                                        className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-700 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-900 dark:text-white bg-gray-100 dark:bg-gray-800 capitalize"
                                        disabled
                                    />
                                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                                        Role can only be changed by an administrator
                                    </p>
                                </div>

                                <div className="pt-4">
                                    <button
                                        type="submit"
                                        disabled={loading}
                                        className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                                    >
                                        {loading ? 'Saving...' : 'Save Changes'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    )}

                    {activeTab === 'security' && (
                        <div>
                            <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Security Settings</h2>
                            <form onSubmit={handlePasswordChange} className="space-y-4">
                                <div>
                                    <label htmlFor="currentPassword" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                        Current Password
                                    </label>
                                    <input
                                        type="password"
                                        id="currentPassword"
                                        value={currentPassword}
                                        onChange={(e) => setCurrentPassword(e.target.value)}
                                        className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-700 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-900 dark:text-white"
                                        required
                                    />
                                </div>

                                <div>
                                    <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                        New Password
                                    </label>
                                    <input
                                        type="password"
                                        id="newPassword"
                                        value={newPassword}
                                        onChange={(e) => setNewPassword(e.target.value)}
                                        className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-700 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-900 dark:text-white"
                                        required
                                        minLength={6}
                                    />
                                </div>

                                <div>
                                    <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                        Confirm New Password
                                    </label>
                                    <input
                                        type="password"
                                        id="confirmPassword"
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-700 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-900 dark:text-white"
                                        required
                                        minLength={6}
                                    />
                                </div>

                                <div className="pt-4">
                                    <button
                                        type="submit"
                                        disabled={loading}
                                        className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                                    >
                                        {loading ? 'Updating...' : 'Update Password'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    )}

                    {activeTab === 'notifications' && (
                        <div>
                            <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Notification Settings</h2>
                            <form onSubmit={handleNotificationSettings} className="space-y-4">
                                <div className="space-y-4">
                                    <div className="flex items-start">
                                        <div className="flex items-center h-5">
                                            <input
                                                id="emailNotifications"
                                                name="emailNotifications"
                                                type="checkbox"
                                                checked={emailNotifications}
                                                onChange={(e) => setEmailNotifications(e.target.checked)}
                                                className="focus:ring-blue-500 h-4 w-4 text-blue-600 border-gray-300 rounded"
                                            />
                                        </div>
                                        <div className="ml-3 text-sm">
                                            <label htmlFor="emailNotifications" className="font-medium text-gray-700 dark:text-gray-300">
                                                Email Notifications
                                            </label>
                                            <p className="text-gray-500 dark:text-gray-400">
                                                Receive email notifications for task assignments, updates, and messages.
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex items-start">
                                        <div className="flex items-center h-5">
                                            <input
                                                id="taskUpdates"
                                                name="taskUpdates"
                                                type="checkbox"
                                                checked={true}
                                                className="focus:ring-blue-500 h-4 w-4 text-blue-600 border-gray-300 rounded"
                                            />
                                        </div>
                                        <div className="ml-3 text-sm">
                                            <label htmlFor="taskUpdates" className="font-medium text-gray-700 dark:text-gray-300">
                                                Task Updates
                                            </label>
                                            <p className="text-gray-500 dark:text-gray-400">
                                                Receive notifications when tasks are updated or their status changes.
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex items-start">
                                        <div className="flex items-center h-5">
                                            <input
                                                id="messageNotifications"
                                                name="messageNotifications"
                                                type="checkbox"
                                                checked={true}
                                                className="focus:ring-blue-500 h-4 w-4 text-blue-600 border-gray-300 rounded"
                                            />
                                        </div>
                                        <div className="ml-3 text-sm">
                                            <label htmlFor="messageNotifications" className="font-medium text-gray-700 dark:text-gray-300">
                                                Message Notifications
                                            </label>
                                            <p className="text-gray-500 dark:text-gray-400">
                                                Receive notifications for new messages.
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <div className="pt-4">
                                    <button
                                        type="submit"
                                        disabled={loading}
                                        className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                                    >
                                        {loading ? 'Saving...' : 'Save Preferences'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}