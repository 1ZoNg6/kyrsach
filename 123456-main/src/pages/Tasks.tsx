import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/authStore';
import { Plus, Filter, SortAsc, SortDesc, Search } from 'lucide-react';
import { TaskCard } from '../components/TaskCard';
import { CreateTaskModal } from '../components/task/CreateTaskModal';
import { TaskDetailsModal } from '../components/task/TaskDetailsModal.tsx';
import type { Task } from '../types/database';

export default function Tasks() {
    const { user } = useAuthStore();
    const [tasks, setTasks] = useState<Task[]>([]);
    const [filteredTasks, setFilteredTasks] = useState<Task[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [selectedTask, setSelectedTask] = useState<Task | null>(null);
    const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [priorityFilter, setPriorityFilter] = useState<string>('all');
    const [sortField, setSortField] = useState<string>('created_at');
    const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

    useEffect(() => {
        fetchTasks();
    }, [user]);

    useEffect(() => {
        applyFiltersAndSort();
    }, [tasks, searchQuery, statusFilter, priorityFilter, sortField, sortDirection]);

    const fetchTasks = async () => {
        if (!user) return;

        setLoading(true);
        setError('');

        try {
            let query = supabase
                .from('tasks')
                .select(`
          *,
          assigned_to_profile:profiles!tasks_assigned_to_fkey(*),
          created_by_profile:profiles!tasks_created_by_fkey(*)
        `);

            // If user is not admin/manager, only show tasks they're involved with
            if (user.role !== 'admin' && user.role !== 'manager') {
                query = query.or(`assigned_to.eq.${user.id},created_by.eq.${user.id}`);
            }

            const { data, error: fetchError } = await query;

            if (fetchError) throw fetchError;

            // Fetch additional data for each task
            const tasksWithCounts = await Promise.all((data || []).map(async (task) => {
                // Get comment count
                const { count: commentCount, error: commentError } = await supabase
                    .from('comments')
                    .select('*', { count: 'exact', head: true })
                    .eq('task_id', task.id);

                // Get attachment count
                const { count: attachmentCount, error: attachmentError } = await supabase
                    .from('attachments')
                    .select('*', { count: 'exact', head: true })
                    .eq('task_id', task.id);

                // Get unread notifications count
                const { count: notificationCount, error: notificationError } = await supabase
                    .from('notifications')
                    .select('*', { count: 'exact', head: true })
                    .eq('task_id', task.id)
                    .eq('user_id', user.id)
                    .eq('read', false);

                if (commentError) console.error('Error fetching comments:', commentError);
                if (attachmentError) console.error('Error fetching attachments:', attachmentError);
                if (notificationError) console.error('Error fetching notifications:', notificationError);

                return {
                    ...task,
                    comment_count: commentCount || 0,
                    attachment_count: attachmentCount || 0,
                    unread_notifications: notificationCount || 0
                };
            }));

            setTasks(tasksWithCounts);
        } catch (err) {
            console.error('Error fetching tasks:', err);
            setError('Failed to load tasks');
        } finally {
            setLoading(false);
        }
    };

    const applyFiltersAndSort = () => {
        let result = [...tasks];

        // Apply search filter
        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            result = result.filter(task =>
                task.title.toLowerCase().includes(query) ||
                (task.description && task.description.toLowerCase().includes(query))
            );
        }

        // Apply status filter
        if (statusFilter !== 'all') {
            result = result.filter(task => task.status === statusFilter);
        }

        // Apply priority filter
        if (priorityFilter !== 'all') {
            result = result.filter(task => task.priority === priorityFilter);
        }

        // Apply sorting
        result.sort((a, b) => {
            let valueA, valueB;

            // Handle different field types
            if (sortField === 'created_at' || sortField === 'due_date') {
                valueA = a[sortField] ? new Date(a[sortField]).getTime() : 0;
                valueB = b[sortField] ? new Date(b[sortField]).getTime() : 0;
            } else if (sortField === 'title') {
                valueA = a.title.toLowerCase();
                valueB = b.title.toLowerCase();
            } else if (sortField === 'priority') {
                const priorityOrder = { high: 3, medium: 2, low: 1 };
                valueA = priorityOrder[a.priority] || 0;
                valueB = priorityOrder[b.priority] || 0;
            } else if (sortField === 'status') {
                const statusOrder = { pending: 1, in_progress: 2, completed: 3 };
                valueA = statusOrder[a.status] || 0;
                valueB = statusOrder[b.status] || 0;
            } else {
                valueA = a[sortField];
                valueB = b[sortField];
            }

            // Handle string comparison
            if (typeof valueA === 'string' && typeof valueB === 'string') {
                return sortDirection === 'asc'
                    ? valueA.localeCompare(valueB)
                    : valueB.localeCompare(valueA);
            }

            // Handle numeric comparison
            return sortDirection === 'asc' ? valueA - valueB : valueB - valueA;
        });

        setFilteredTasks(result);
    };

    const handleCreateTask = () => {
        setIsCreateModalOpen(true);
    };

    const handleTaskClick = (task: Task) => {
        setSelectedTask(task);
        setIsDetailsModalOpen(true);
    };

    const handleTaskCreated = () => {
        fetchTasks();
    };

    const handleTaskUpdated = () => {
        fetchTasks();
    };

    const handleTaskDeleted = () => {
        fetchTasks();
    };

    const toggleSortDirection = () => {
        setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    };

    return (
        <div className="space-y-6">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Tasks</h1>

                    <button
                        onClick={handleCreateTask}
                        className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                        <Plus className="h-4 w-4 mr-2" />
                        Create Task
                    </button>
                </div>

                <div className="flex flex-col sm:flex-row gap-4 mb-6">
                    <div className="relative flex-1">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <Search className="h-5 w-5 text-gray-400" />
                        </div>
                        <input
                            type="text"
                            placeholder="Search tasks..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="block w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                        />
                    </div>

                    <div className="flex flex-wrap gap-2">
                        <div className="flex items-center">
                            <Filter className="h-5 w-5 text-gray-400 mr-2" />
                            <select
                                value={statusFilter}
                                onChange={(e) => setStatusFilter(e.target.value)}
                                className="block w-full py-2 px-3 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-sm dark:text-white"
                            >
                                <option value="all">All Statuses</option>
                                <option value="pending">Pending</option>
                                <option value="in_progress">In Progress</option>
                                <option value="completed">Completed</option>
                            </select>
                        </div>

                        <div className="flex items-center">
                            <select
                                value={priorityFilter}
                                onChange={(e) => setPriorityFilter(e.target.value)}
                                className="block w-full py-2 px-3 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-sm dark:text-white"
                            >
                                <option value="all">All Priorities</option>
                                <option value="low">Low</option>
                                <option value="medium">Medium</option>
                                <option value="high">High</option>
                            </select>
                        </div>

                        <div className="flex items-center">
                            <select
                                value={sortField}
                                onChange={(e) => setSortField(e.target.value)}
                                className="block w-full py-2 px-3 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-sm dark:text-white"
                            >
                                <option value="created_at">Created Date</option>
                                <option value="due_date">Due Date</option>
                                <option value="title">Title</option>
                                <option value="priority">Priority</option>
                                <option value="status">Status</option>
                            </select>
                            <button
                                onClick={toggleSortDirection}
                                className="ml-2 p-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
                            >
                                {sortDirection === 'asc' ? <SortAsc className="h-5 w-5" /> : <SortDesc className="h-5 w-5" />}
                            </button>
                        </div>
                    </div>
                </div>

                {error && (
                    <div className="bg-red-50 dark:bg-red-900/50 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-200 px-4 py-3 rounded mb-6">
                        {error}
                    </div>
                )}

                {loading ? (
                    <div className="flex justify-center items-center py-12">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
                    </div>
                ) : filteredTasks.length === 0 ? (
                    <div className="text-center py-12 bg-gray-50 dark:bg-gray-700 rounded-lg">
                        <p className="text-gray-500 dark:text-gray-400">
                            {tasks.length === 0 ? 'No tasks found. Create your first task!' : 'No tasks match your filters.'}
                        </p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {filteredTasks.map(task => (
                            <TaskCard
                                key={task.id}
                                task={task}
                                onClick={() => handleTaskClick(task)}
                            />
                        ))}
                    </div>
                )}
            </div>

            <CreateTaskModal
                isOpen={isCreateModalOpen}
                onClose={() => setIsCreateModalOpen(false)}
                onTaskCreated={handleTaskCreated}
            />

            {selectedTask && (
                <TaskDetailsModal
                    task={selectedTask}
                    isOpen={isDetailsModalOpen}
                    onClose={() => setIsDetailsModalOpen(false)}
                    onTaskUpdated={handleTaskUpdated}
                    onTaskDeleted={handleTaskDeleted}
                />
            )}
        </div>
    );
}