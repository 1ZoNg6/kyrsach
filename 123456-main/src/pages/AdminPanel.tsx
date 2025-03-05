import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/authStore';
import { useAppSettingsStore } from '../store/AppSettingStore.ts';
import { Settings, User, Users, AlertTriangle, Save, X } from 'lucide-react';

export default function AdminPanel() {
    const { user } = useAuthStore();
    const { appName, primaryColor, logoUrl, updateSettings, loading: settingsLoading } = useAppSettingsStore();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [activeTab, setActiveTab] = useState('app');
    const [users, setUsers] = useState<any[]>([]);
    const [editingUser, setEditingUser] = useState<string | null>(null);
    const [userRoles, setUserRoles] = useState<Record<string, string>>({});

    // App settings state
    const [appNameInput, setAppNameInput] = useState(appName);
    const [primaryColorInput, setPrimaryColorInput] = useState(primaryColor);
    const [logoUrlInput, setLogoUrlInput] = useState(logoUrl || '');

    useEffect(() => {
        if (user?.role === 'admin') {
            fetchUsers();
        }
    }, [user]);

    useEffect(() => {
        setAppNameInput(appName);
        setPrimaryColorInput(primaryColor);
        setLogoUrlInput(logoUrl || '');
    }, [appName, primaryColor, logoUrl]);

    const fetchUsers = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .order('full_name');

            if (error) throw error;

            setUsers(data || []);

            // Initialize user roles
            const roles: Record<string, string> = {};
            data?.forEach(user => {
                roles[user.id] = user.role;
            });
            setUserRoles(roles);
        } catch (err) {
            console.error('Error fetching users:', err);
            setError('Failed to load users');
        } finally {
            setLoading(false);
        }
    };

    const handleSaveAppSettings = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setSuccess('');

        try {
            await updateSettings({
                appName: appNameInput,
                primaryColor: primaryColorInput,
                logoUrl: logoUrlInput || null
            });

            setSuccess('App settings updated successfully');
        } catch (err) {
            console.error('Error updating app settings:', err);
            setError('Failed to update app settings');
        }
    };

    const handleUpdateUserRole = async (userId: string) => {
        setError('');
        setSuccess('');

        try {
            const { error } = await supabase
                .from('profiles')
                .update({ role: userRoles[userId] })
                .eq('id', userId);

            if (error) throw error;

            setEditingUser(null);
            setSuccess('User role updated successfully');
            fetchUsers();
        } catch (err) {
            console.error('Error updating user role:', err);
            setError('Failed to update user role');
        }
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString();
    };

    if (user?.role !== 'admin') {
        return (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                <div className="text-center py-12">
                    <AlertTriangle className="mx-auto h-12 w-12 text-red-500" />
                    <h3 className="mt-2 text-lg font-medium text-gray-900 dark:text-white">Access Denied</h3>
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                        You do not have permission to view this page.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center">
                    <Settings className="mr-2 h-6 w-6" />
                    Admin Panel
                </h1>
            </div>

            <div className="flex flex-col md:flex-row">
                {/* Sidebar */}
                <div className="w-full md:w-64 p-6 border-b md:border-b-0 md:border-r border-gray-200 dark:border-gray-700">
                    <nav className="space-y-1">
                        <button
                            onClick={() => setActiveTab('app')}
                            className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-md ${
                                activeTab === 'app'
                                    ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300'
                                    : 'text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-700'
                            }`}
                        >
                            <Settings className="mr-3 h-5 w-5" />
                            App Settings
                        </button>
                        <button
                            onClick={() => setActiveTab('users')}
                            className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-md ${
                                activeTab === 'users'
                                    ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300'
                                    : 'text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-700'
                            }`}
                        >
                            <Users className="mr-3 h-5 w-5" />
                            User Management
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

                    {activeTab === 'app' && (
                        <div>
                            <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Application Settings</h2>
                            <form onSubmit={handleSaveAppSettings} className="space-y-4">
                                <div>
                                    <label htmlFor="appName" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                        Application Name
                                    </label>
                                    <input
                                        type="text"
                                        id="appName"
                                        value={appNameInput}
                                        onChange={(e) => setAppNameInput(e.target.value)}
                                        className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-700 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-900 dark:text-white"
                                        required
                                    />
                                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                                        This name will be displayed in the navigation bar and browser title.
                                    </p>
                                </div>

                                <div>
                                    <label htmlFor="primaryColor" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                        Primary Color
                                    </label>
                                    <div className="mt-1 flex items-center">
                                        <input
                                            type="color"
                                            id="primaryColor"
                                            value={primaryColorInput}
                                            onChange={(e) => setPrimaryColorInput(e.target.value)}
                                            className="h-10 w-10 rounded-md border-gray-300 dark:border-gray-700 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                                        />
                                        <input
                                            type="text"
                                            value={primaryColorInput}
                                            onChange={(e) => setPrimaryColorInput(e.target.value)}
                                            className="ml-2 block w-full rounded-md border-gray-300 dark:border-gray-700 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-900 dark:text-white"
                                        />
                                    </div>
                                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                                        This color will be used for buttons, links, and other UI elements.
                                    </p>
                                </div>

                                <div>
                                    <label htmlFor="logoUrl" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                        Logo URL (Optional)
                                    </label>
                                    <input
                                        type="text"
                                        id="logoUrl"
                                        value={logoUrlInput}
                                        onChange={(e) => setLogoUrlInput(e.target.value)}
                                        className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-700 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-900 dark:text-white"
                                    />
                                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                                        Enter a URL to your company logo. Leave blank to use the application name.
                                    </p>
                                </div>

                                <div className="pt-4">
                                    <button
                                        type="submit"
                                        disabled={settingsLoading}
                                        className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                                    >
                                        {settingsLoading ? 'Saving...' : 'Save Settings'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    )}

                    {activeTab === 'users' && (
                        <div>
                            <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4">User Management</h2>

                            {loading ? (
                                <div className="flex justify-center items-center py-12">
                                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
                                </div>
                            ) : users.length === 0 ? (
                                <div className="text-center py-12 bg-gray-50 dark:bg-gray-700 rounded-lg">
                                    <User className="mx-auto h-12 w-12 text-gray-400" />
                                    <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">No users found</h3>
                                </div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                                        <thead className="bg-gray-50 dark:bg-gray-700">
                                        <tr>
                                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                                Name
                                            </th>
                                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                                Role
                                            </th>
                                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                                Joined
                                            </th>
                                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                                Actions
                                            </th>
                                        </tr>
                                        </thead>
                                        <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                                        {users.map((userItem) => (
                                            <tr key={userItem.id}>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="flex items-center">
                                                        <div className="flex-shrink-0 h-10 w-10">
                                                            {userItem.avatar_url ? (
                                                                <img
                                                                    className="h-10 w-10 rounded-full object-cover"
                                                                    src={userItem.avatar_url}
                                                                    alt={userItem.full_name}
                                                                />
                                                            ) : (
                                                                <div className="h-10 w-10 rounded-full bg-gray-200 dark:bg-gray-600 flex items-center justify-center">
                                                                    <User className="h-6 w-6 text-gray-500 dark:text-gray-400" />
                                                                </div>
                                                            )}
                                                        </div>
                                                        <div className="ml-4">
                                                            <div className="text-sm font-medium text-gray-900 dark:text-white">
                                                                {userItem.full_name}
                                                            </div>
                                                            <div className="text-sm text-gray-500 dark:text-gray-400">
                                                                {userItem.email}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    {editingUser === userItem.id ? (
                                                        <select
                                                            value={userRoles[userItem.id]}
                                                            onChange={(e) => setUserRoles({...userRoles, [userItem.id]: e.target.value})}
                                                            className="block w-full rounded-md border-gray-300 dark:border-gray-700 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-900 dark:text-white text-sm"
                                                        >
                                                            <option value="admin">Admin</option>
                                                            <option value="manager">Manager</option>
                                                            <option value="worker">Worker</option>
                                                        </select>
                                                    ) : (
                                                        <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                                            userItem.role === 'admin'
                                                                ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-300'
                                                                : userItem.role === 'manager'
                                                                    ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300'
                                                                    : 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300'
                                                        }`}>
                                {userItem.role}
                              </span>
                                                    )}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                                    {formatDate(userItem.created_at)}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                                    {editingUser === userItem.id ? (
                                                        <div className="flex space-x-2">
                                                            <button
                                                                onClick={() => handleUpdateUserRole(userItem.id)}
                                                                className="text-green-600 hover:text-green-900 dark:text-green-400 dark:hover:text-green-300"
                                                            >
                                                                <Save className="h-5 w-5" />
                                                            </button>
                                                            <button
                                                                onClick={() => setEditingUser(null)}
                                                                className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                                                            >
                                                                <X className="h-5 w-5" />
                                                            </button>
                                                        </div>
                                                    ) : (
                                                        <button
                                                            onClick={() => setEditingUser(userItem.id)}
                                                            className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300"
                                                        >
                                                            Edit Role
                                                        </button>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}