import { useState, useEffect } from 'react';
import { useAuthStore } from '../store/authStore';
import { supabase } from '../lib/supabase';
import { CheckSquare, Clock, AlertTriangle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { TaskCard } from '../components/TaskCard';
import { TaskDetailsModal } from '../components/TaskDetailsModal';
import type { Task } from '../types/database';

export default function Dashboard() {
  const { user } = useAuthStore();
  const [recentTasks, setRecentTasks] = useState<Task[]>([]);
  const [dueSoonTasks, setDueSoonTasks] = useState<Task[]>([]);
  const [highPriorityTasks, setHighPriorityTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [stats, setStats] = useState({
    total: 0,
    completed: 0,
    inProgress: 0,
    pending: 0,
  });

  useEffect(() => {
    if (user) {
      fetchDashboardData();
    } else {
      setLoading(false); // Установим loading в false, если user отсутствует
    }
  }, [user]);

  const fetchDashboardData = async () => {
    if (!user) return; // Добавим проверку на user перед выполнением запросов
    setLoading(true);
    try {
      // Fetch task statistics
      const { data: statsData, error: statsError } = await supabase
          .from('tasks')
          .select('status', { count: 'exact' });

      if (statsError) throw statsError;

      const total = statsData?.length || 0;
      const completed = statsData?.filter((t) => t.status === 'completed').length || 0;
      const inProgress = statsData?.filter((t) => t.status === 'in_progress').length || 0;
      const pending = statsData?.filter((t) => t.status === 'pending').length || 0;

      setStats({ total, completed, inProgress, pending });

      // Fetch recent tasks
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

      const { data: recentData, error: recentError } = await query
          .order('created_at', { ascending: false })
          .limit(5);

      if (recentError) throw recentError;
      setRecentTasks(recentData || []);

      // Fetch tasks due soon (in the next 7 days)
      const nextWeek = new Date();
      nextWeek.setDate(nextWeek.getDate() + 7);

      let dueSoonQuery = supabase
          .from('tasks')
          .select(`
          *,
          assigned_to_profile:profiles!tasks_assigned_to_fkey(*),
          created_by_profile:profiles!tasks_created_by_fkey(*)
        `)
          .lt('due_date', nextWeek.toISOString())
          .gt('due_date', new Date().toISOString())
          .not('status', 'eq', 'completed');

      if (user.role !== 'admin' && user.role !== 'manager') {
        dueSoonQuery = dueSoonQuery.or(`assigned_to.eq.${user.id},created_by.eq.${user.id}`);
      }

      const { data: dueSoonData, error: dueSoonError } = await dueSoonQuery
          .order('due_date', { ascending: true })
          .limit(5);

      if (dueSoonError) throw dueSoonError;
      setDueSoonTasks(dueSoonData || []);

      // Fetch high priority tasks
      let highPriorityQuery = supabase
          .from('tasks')
          .select(`
          *,
          assigned_to_profile:profiles!tasks_assigned_to_fkey(*),
          created_by_profile:profiles!tasks_created_by_fkey(*)
        `)
          .eq('priority', 'high')
          .not('status', 'eq', 'completed');

      if (user.role !== 'admin' && user.role !== 'manager') {
        highPriorityQuery = highPriorityQuery.or(`assigned_to.eq.${user.id},created_by.eq.${user.id}`);
      }

      const { data: highPriorityData, error: highPriorityError } = await highPriorityQuery
          .order('created_at', { ascending: false })
          .limit(5);

      if (highPriorityError) throw highPriorityError;
      setHighPriorityTasks(highPriorityData || []);

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleTaskClick = (task: Task) => {
    setSelectedTask(task);
    setIsDetailsModalOpen(true);
  };

  const handleTaskUpdated = () => {
    if (user) fetchDashboardData(); // Добавим проверку user
  };

  const handleTaskDeleted = () => {
    if (user) fetchDashboardData(); // Добавим проверку user
  };

  if (loading) {
    return (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        </div>
    );
  }

  if (!user) {
    return (
        <div className="flex justify-center items-center h-64 text-gray-500">
          Please log in to view your dashboard.
        </div>
    );
  }

  return (
      <div className="space-y-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h1 className="text-2xl font-bold mb-6 text-gray-900 dark:text-white">Welcome, {user.full_name || user.email || 'User'}!</h1>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-blue-50 dark:bg-blue-900/20 p-6 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-blue-600 dark:text-blue-400 text-sm font-medium">Total Tasks</p>
                  <p className="text-3xl font-bold text-blue-700 dark:text-blue-300">{stats.total}</p>
                </div>
                <div className="bg-blue-100 dark:bg-blue-800 p-3 rounded-full">
                  <CheckSquare className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                </div>
              </div>
            </div>

            <div className="bg-green-50 dark:bg-green-900/20 p-6 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-green-600 dark:text-green-400 text-sm font-medium">Completed</p>
                  <p className="text-3xl font-bold text-green-700 dark:text-green-300">{stats.completed}</p>
                </div>
                <div className="bg-green-100 dark:bg-green-800 p-3 rounded-full">
                  <CheckSquare className="h-6 w-6 text-green-600 dark:text-green-400" />
                </div>
              </div>
            </div>

            <div className="bg-yellow-50 dark:bg-yellow-900/20 p-6 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-yellow-600 dark:text-yellow-400 text-sm font-medium">In Progress</p>
                  <p className="text-3xl font-bold text-yellow-700 dark:text-yellow-300">{stats.inProgress}</p>
                </div>
                <div className="bg-yellow-100 dark:bg-yellow-800 p-3 rounded-full">
                  <Clock className="h-6 w-6 text-yellow-600 dark:text-yellow-400" />
                </div>
              </div>
            </div>

            <div className="bg-red-50 dark:bg-red-900/20 p-6 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-red-600 dark:text-red-400 text-sm font-medium">Pending</p>
                  <p className="text-3xl font-bold text-red-700 dark:text-red-300">{stats.pending}</p>
                </div>
                <div className="bg-red-100 dark:bg-red-800 p-3 rounded-full">
                  <AlertTriangle className="h-6 w-6 text-red-600 dark:text-red-400" />
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div>
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Recent Tasks</h2>
                <Link to="/tasks" className="text-sm text-blue-600 dark:text-blue-400 hover:underline">View all</Link>
              </div>

              {recentTasks.length === 0 ? (
                  <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg text-center">
                    <p className="text-gray-500 dark:text-gray-400">No recent tasks found</p>
                  </div>
              ) : (
                  <div className="space-y-4">
                    {recentTasks.map(task => (
                        <TaskCard
                            key={task.id}
                            task={{
                              ...task,
                              unread_notifications: 0, // Добавим типизацию для unread_notifications
                            }}
                            onClick={() => handleTaskClick(task)}
                        />
                    ))}
                  </div>
              )}
            </div>

            <div>
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Due Soon</h2>
                <Link to="/tasks" className="text-sm text-blue-600 dark:text-blue-400 hover:underline">View all</Link>
              </div>

              {dueSoonTasks.length === 0 ? (
                  <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg text-center">
                    <p className="text-gray-500 dark:text-gray-400">No tasks due soon</p>
                  </div>
              ) : (
                  <div className="space-y-4">
                    {dueSoonTasks.map(task => (
                        <TaskCard
                            key={task.id}
                            task={{
                              ...task,
                              unread_notifications: 0, // Добавим типизацию для unread_notifications
                            }}
                            onClick={() => handleTaskClick(task)}
                        />
                    ))}
                  </div>
              )}
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">High Priority Tasks</h2>
            <Link to="/tasks" className="text-sm text-blue-600 dark:text-blue-400 hover:underline">View all</Link>
          </div>

          {highPriorityTasks.length === 0 ? (
              <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg text-center">
                <p className="text-gray-500 dark:text-gray-400">No high priority tasks</p>
              </div>
          ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {highPriorityTasks.map(task => (
                    <TaskCard
                        key={task.id}
                        task={{
                          ...task,
                          unread_notifications: 0, // Добавим типизацию для unread_notifications
                        }}
                        onClick={() => handleTaskClick(task)}
                    />
                ))}
              </div>
          )}
        </div>

        {selectedTask && (
            <TaskDetailsModal
                task={selectedTask}
                isOpen={isDetailsModalOpen}
                onClose={() => {
                  setIsDetailsModalOpen(false);
                  setSelectedTask(null);
                }}
                onTaskUpdated={handleTaskUpdated}
                onTaskDeleted={handleTaskDeleted}
            />
        )}
      </div>
  );
}