import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { LayoutDashboard, CheckSquare, LogOut, User, MessageSquare, Bell } from 'lucide-react';
import { supabase } from '../lib/supabase';
import ThemeToggle from './ui/ThemeToggle';
import ProfileDropdown from './ui/ProfileDropdown';

interface LayoutProps {
    children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
    const { user, signOut } = useAuthStore();
    const navigate = useNavigate();
    const location = useLocation();
    const [unreadNotifications, setUnreadNotifications] = useState(0);
    const [unreadMessages, setUnreadMessages] = useState(0);

    useEffect(() => {
        if (!user?.id) return;

        const fetchNotificationCount = async () => {
            try {
                const { count, error } = await supabase
                    .from('notifications')
                    .select('*', { count: 'exact', head: true })
                    .eq('user_id', user.id)
                    .eq('read', false);

                if (error) throw error;
                setUnreadNotifications(count || 0);
            } catch (err) {
                console.error('Error fetching notification count:', err);
            }
        };

        const fetchMessageCount = async () => {
            try {
                const { count, error } = await supabase
                    .from('messages')
                    .select('*', { count: 'exact', head: true })
                    .eq('receiver_id', user.id)
                    .eq('read', false);

                if (error) throw error;
                setUnreadMessages(count || 0);
            } catch (err) {
                console.error('Error fetching message count:', err);
            }
        };

        fetchNotificationCount();
        fetchMessageCount();

        // Set up subscription for new notifications
        const notificationsSubscription = supabase
            .channel('notifications-changes')
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'notifications',
                    filter: `user_id=eq.${user.id}`,
                },
                () => {
                    fetchNotificationCount();
                },
            )
            .subscribe();

        // Set up subscription for new messages
        const messagesSubscription = supabase
            .channel('messages-changes')
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'messages',
                    filter: `receiver_id=eq.${user.id}`,
                },
                () => {
                    fetchMessageCount();
                },
            )
            .subscribe();

        return () => {
            notificationsSubscription.unsubscribe();
            messagesSubscription.unsubscribe();
        };
    }, [user?.id]);

    const handleSignOut = async () => {
        await signOut();
        navigate('/login');
    };

    const isActive = (path: string) => {
        return location.pathname === path;
    };

    return (
        <div className="min-h-screen bg-gray-100 dark:bg-gray-900 transition-colors duration-200">
            <nav className="bg-white dark:bg-gray-800 shadow-sm transition-colors duration-200">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between h-16">
                        <div className="flex">
                            <div className="flex-shrink-0 flex items-center">
                                <Link to="/" className="text-xl font-bold text-gray-900 dark:text-white">
                                    TaskManager
                                </Link>
                            </div>
                            <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
                                <Link
                                    to="/"
                                    className={`inline-flex items-center px-1 pt-1 text-sm font-medium ${
                                        isActive('/')
                                            ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400'
                                            : 'text-gray-900 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400'
                                    }`}
                                >
                                    <LayoutDashboard className="mr-2 h-4 w-4" />
                                    Dashboard
                                </Link>
                                <Link
                                    to="/tasks"
                                    className={`inline-flex items-center px-1 pt-1 text-sm font-medium ${
                                        isActive('/tasks')
                                            ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400'
                                            : 'text-gray-900 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400'
                                    }`}
                                >
                                    <CheckSquare className="mr-2 h-4 w-4" />
                                    Tasks
                                </Link>
                                <Link
                                    to="/messages"
                                    className={`inline-flex items-center px-1 pt-1 text-sm font-medium ${
                                        isActive('/messages')
                                            ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400'
                                            : 'text-gray-900 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400'
                                    }`}
                                >
                                    <MessageSquare className="mr-2 h-4 w-4" />
                                    Messages
                                    {unreadMessages > 0 && (
                                        <span className="ml-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                      {unreadMessages > 9 ? '9+' : unreadMessages}
                    </span>
                                    )}
                                </Link>
                                <Link
                                    to="/profile"
                                    className={`inline-flex items-center px-1 pt-1 text-sm font-medium ${
                                        isActive('/profile')
                                            ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400'
                                            : 'text-gray-900 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400'
                                    }`}
                                >
                                    <User className="mr-2 h-4 w-4" />
                                    Profile
                                </Link>
                            </div>
                        </div>
                        <div className="flex items-center space-x-4">
                            <ThemeToggle />
                            <button className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 relative">
                                <Bell className="h-5 w-5" />
                                {unreadNotifications > 0 && (
                                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-4 w-4 flex items-center justify-center">
                    {unreadNotifications > 9 ? '9+' : unreadNotifications}
                  </span>
                                )}
                            </button>
                            <ProfileDropdown />
                            <button
                                onClick={handleSignOut}
                                className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700"
                            >
                                <LogOut className="mr-2 h-4 w-4" />
                                Sign out
                            </button>
                        </div>
                    </div>
                </div>
            </nav>

            <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
                {children}
            </main>
        </div>
    );
}