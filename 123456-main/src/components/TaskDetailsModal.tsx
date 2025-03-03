import React, { useState, useEffect, useRef } from 'react';
import { X, Search, Paperclip, Download } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/authStore';
import type { Task, TaskPriority, TaskStatus, Profile, Comment, Attachment } from '../types/database';

interface TaskDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  task: Task;
  onTaskUpdated?: () => void;
  onTaskDeleted?: () => void;
}

export function TaskDetailsModal({ isOpen, onClose, task, onTaskUpdated, onTaskDeleted }: TaskDetailsModalProps) {
  const { user } = useAuthStore();
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description || '');
  const [status, setStatus] = useState<TaskStatus>(task.status);
  const [priority, setPriority] = useState<TaskPriority>(task.priority);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [users, setUsers] = useState<Profile[]>([]);
  const [selectedAssignee, setSelectedAssignee] = useState<Profile | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [comments, setComments] = useState<(Comment & { user_profile: Profile })[]>([]);
  const [loadingComments, setLoadingComments] = useState(false);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [loadingAttachments, setLoadingAttachments] = useState(false);
  const [uploadingFiles, setUploadingFiles] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const commentsEndRef = useRef<HTMLDivElement>(null);
  const isAdmin = user?.role === 'admin' || user?.role === 'manager';
  const isAssignee = task.assigned_to === user?.id;
  const canEditTask = isAdmin || isAssignee;

  useEffect(() => {
    setTitle(task.title);
    setDescription(task.description || '');
    setStatus(task.status);
    setPriority(task.priority);
    setSelectedAssignee(null);
    setSearchQuery('');
    fetchComments();
    fetchAttachments();
    if (task.assigned_to) {
      fetchAssignee();
    }
  }, [task.id]);

  useEffect(() => {
    // Scroll to bottom of comments when new ones are added
    if (commentsEndRef.current) {
      commentsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [comments]);

  const fetchAssignee = async () => {
    if (!task.assigned_to) return;

    try {
      const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', task.assigned_to)
          .single();

      if (error) throw error;
      if (data) setSelectedAssignee(data);
    } catch (err) {
      console.error('Error fetching assignee:', err);
    }
  };

  const fetchComments = async () => {
    setLoadingComments(true);
    try {
      const { data, error } = await supabase
          .from('comments')
          .select(`
          *,
          user_profile:profiles(*)
        `)
          .eq('task_id', task.id)
          .order('created_at', { ascending: true });

      if (error) throw error;
      setComments(data || []);
    } catch (err) {
      console.error('Error fetching comments:', err);
    } finally {
      setLoadingComments(false);
    }
  };

  const fetchAttachments = async () => {
    setLoadingAttachments(true);
    try {
      const { data, error } = await supabase
          .from('attachments')
          .select(`
          *,
          user_profile:profiles(*)
        `)
          .eq('task_id', task.id)
          .order('created_at', { ascending: false });

      if (error) throw error;
      setAttachments(data || []);
    } catch (err) {
      console.error('Error fetching attachments:', err);
    } finally {
      setLoadingAttachments(false);
    }
  };

  useEffect(() => {
    const searchUsers = async () => {
      if (!searchQuery.trim()) {
        setUsers([]);
        return;
      }

      setIsSearching(true);
      try {
        const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .ilike('full_name', `%${searchQuery}%`)
            .neq('id', user?.id)
            .limit(5);

        if (error) throw error;
        setUsers(data || []);
      } catch (err) {
        console.error('Error searching users:', err);
      } finally {
        setIsSearching(false);
      }
    };

    const debounceTimer = setTimeout(searchUsers, 300);
    return () => clearTimeout(debounceTimer);
  }, [searchQuery, user?.id]);

  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id || !newComment.trim()) return;

    setLoading(true);
    try {
      const { error: commentError } = await supabase
          .from('comments')
          .insert({
            task_id: task.id,
            user_id: user.id,
            content: newComment.trim()
          });

      if (commentError) throw commentError;

      setNewComment('');
      await fetchComments();
    } catch (err: any) {
      console.error('Error submitting comment:', err);
      setError(err.message || 'Failed to submit comment');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateTask = async () => {
    if (!user?.id) return;

    setLoading(true);
    setError('');

    try {
      const { error: updateError } = await supabase
          .from('tasks')
          .update({
            title,
            description: description || null,
            status,
            priority,
            assigned_to: selectedAssignee?.id || null
          })
          .eq('id', task.id);

      if (updateError) throw updateError;

      onTaskUpdated?.();
      onClose();
    } catch (err: any) {
      console.error('Error updating task:', err);
      setError(err.message || 'Failed to update task');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteTask = async () => {
    if (!user?.id) return;

    if (!window.confirm('Are you sure you want to delete this task? This action cannot be undone.')) {
      return;
    }

    setLoading(true);
    setError('');

    try {
      const { error: deleteError } = await supabase
          .from('tasks')
          .delete()
          .eq('id', task.id);

      if (deleteError) throw deleteError;

      onTaskDeleted?.();
      onClose();
    } catch (err: any) {
      console.error('Error deleting task:', err);
      setError(err.message || 'Failed to delete task');
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      setFiles(prevFiles => [...prevFiles, ...newFiles]);
    }
  };

  const removeFile = (index: number) => {
    setFiles(prevFiles => prevFiles.filter((_, i) => i !== index));
  };

  const uploadFiles = async () => {
    if (files.length === 0 || !user?.id) return;

    setUploadingFiles(true);
    try {
      for (const file of files) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${Math.random().toString(36).substring(2, 15)}.${fileExt}`;
        const filePath = `${task.id}/${fileName}`;

        const { error: uploadError } = await supabase.storage
            .from('attachments')
            .upload(filePath, file);

        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage
            .from('attachments')
            .getPublicUrl(filePath);

        await supabase.from('attachments').insert({
          task_id: task.id,
          user_id: user.id,
          file_name: file.name,
          file_type: file.type,
          file_url: urlData.publicUrl,
          file_size: file.size
        });
      }

      setFiles([]);
      await fetchAttachments();
    } catch (err: any) {
      console.error('Error uploading files:', err);
      setError(err.message || 'Failed to upload files');
    } finally {
      setUploadingFiles(false);
    }
  };

  const formatFileSize = (bytes: number | undefined) => {
    if (!bytes) return 'Unknown size';
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = bytes;
    let unitIndex = 0;

    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }

    return `${size.toFixed(1)} ${units[unitIndex]}`;
  };

  if (!isOpen) return null;

  return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="bg-white dark:bg-gray-800 rounded-lg max-w-4xl w-full p-6 max-h-[90vh] overflow-y-auto">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Task Details</h2>
            <button
                onClick={onClose}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {error && (
              <div className="mb-4 bg-red-50 dark:bg-red-900/50 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-200 px-4 py-3 rounded">
                {error}
              </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-2 space-y-4">
              <div>
                <label htmlFor="title" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Title
                </label>
                <input
                    type="text"
                    id="title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-700 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-900 dark:text-white"
                    required
                    disabled={!isAdmin}
                />
              </div>

              <div>
                <label htmlFor="description" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Description
                </label>
                <textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={3}
                    className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-700 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-900 dark:text-white"
                    disabled={!isAdmin}
                />
              </div>

              <div className="border-t dark:border-gray-700 pt-4">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Comments</h3>
                <div className="space-y-4 max-h-60 overflow-y-auto mb-4">
                  {loadingComments ? (
                      <div className="text-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
                      </div>
                  ) : comments.length === 0 ? (
                      <p className="text-gray-500 dark:text-gray-400 text-center">No comments yet</p>
                  ) : (
                      <>
                        {comments.map((comment) => (
                            <div key={comment.id} className="bg-gray-50 dark:bg-gray-900 p-3 rounded-lg">
                              <div className="flex justify-between items-start">
                                <div>
                                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                                    {comment.user_profile.full_name}
                                  </p>
                                  <p className="text-sm text-gray-500 dark:text-gray-400">
                                    {new Date(comment.created_at).toLocaleString()}
                                  </p>
                                </div>
                              </div>
                              <p className="mt-2 text-gray-700 dark:text-gray-300">{comment.content}</p>
                            </div>
                        ))}
                        <div ref={commentsEndRef} />
                      </>
                  )}
                </div>
                <form onSubmit={handleSubmitComment} className="mt-4">
                <textarea
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder="Add a comment..."
                    className="w-full rounded-md border-gray-300 dark:border-gray-700 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-900 dark:text-white"
                    rows={3}
                />
                  <div className="mt-2 flex justify-end">
                    <button
                        type="submit"
                        disabled={loading || !newComment.trim()}
                        className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 dark:focus:ring-offset-gray-900"
                    >
                      {loading ? 'Sending...' : 'Send'}
                    </button>
                  </div>
                </form>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label htmlFor="status" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Status
                </label>
                <select
                    id="status"
                    value={status}
                    onChange={(e) => setStatus(e.target.value as TaskStatus)}
                    className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-700 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-900 dark:text-white"
                    disabled={!canEditTask}
                >
                  <option value="pending">Pending</option>
                  <option value="in_progress">In Progress</option>
                  <option value="completed">Completed</option>
                </select>
              </div>

              <div>
                <label htmlFor="priority" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Priority
                </label>
                <select
                    id="priority"
                    value={priority}
                    onChange={(e) => setPriority(e.target.value as TaskPriority)}
                    className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-700 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-900 dark:text-white"
                    disabled={!isAdmin}
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </div>

              {isAdmin && (
                  <div>
                    <label htmlFor="assignee" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Assignee
                    </label>
                    <div className="relative mt-1">
                      <div className="relative">
                        <input
                            type="text"
                            id="assignee"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search by name..."
                            className="block w-full rounded-md border-gray-300 dark:border-gray-700 pl-10 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-900 dark:text-white"
                        />
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <Search className="h-5 w-5 text-gray-400" />
                        </div>
                      </div>
                      {isSearching && (
                          <div className="absolute right-0 top-0 h-full flex items-center pr-3">
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
                          </div>
                      )}
                      {users.length > 0 && searchQuery && (
                          <div className="absolute z-10 mt-1 w-full bg-white dark:bg-gray-800 rounded-md shadow-lg border border-gray-200 dark:border-gray-700">
                            {users.map((user) => (
                                <button
                                    key={user.id}
                                    type="button"
                                    onClick={() => {
                                      setSelectedAssignee(user);
                                      setSearchQuery(user.full_name);
                                      setUsers([]);
                                    }}
                                    className="block w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
                                >
                                  {user.full_name} ({user.role})
                                </button>
                            ))}
                          </div>
                      )}
                    </div>
                    {selectedAssignee && (
                        <div className="mt-2 flex items-center">
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                      Selected: {selectedAssignee.full_name}
                    </span>
                          <button
                              type="button"
                              onClick={() => {
                                setSelectedAssignee(null);
                                setSearchQuery('');
                              }}
                              className="ml-2 text-sm text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                          >
                            Clear
                          </button>
                        </div>
                    )}
                  </div>
              )}

              <div className="border-t dark:border-gray-700 pt-4">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Attachments</h3>
                {loadingAttachments ? (
                    <div className="text-center py-4">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
                    </div>
                ) : (
                    <div className="space-y-2 max-h-40 overflow-y-auto mb-4">
                      {attachments.length === 0 ? (
                          <p className="text-gray-500 dark:text-gray-400 text-center py-2">No attachments</p>
                      ) : (
                          attachments.map((attachment) => (
                              <div key={attachment.id} className="flex items-center justify-between bg-gray-50 dark:bg-gray-900 p-2 rounded">
                                <div className="flex items-center space-x-2 overflow-hidden">
                                  <Paperclip className="h-4 w-4 text-gray-500 dark:text-gray-400 flex-shrink-0" />
                                  <div className="overflow-hidden">
                                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{attachment.file_name}</p>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">{formatFileSize(attachment.file_size)}</p>
                                  </div>
                                </div>
                                <a
                                    href={attachment.file_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                                >
                                  <Download className="h-4 w-4" />
                                </a>
                              </div>
                          ))
                      )}
                    </div>
                )}

                {canEditTask && (
                    <div>
                      <div className="flex items-center space-x-2">
                        <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            className="inline-flex items-center px-3 py-2 border border-gray-300 dark:border-gray-600 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:focus:ring-offset-gray-900"
                        >
                          <Paperclip className="-ml-0.5 mr-2 h-4 w-4" />
                          Attach Files
                        </button>
                        <input
                            type="file"
                            ref={fileInputRef}
                            className="hidden"
                            multiple
                            onChange={handleFileChange}
                        />
                        {files.length > 0 && (
                            <button
                                type="button"
                                onClick={uploadFiles}
                                disabled={uploadingFiles}
                                className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 dark:focus:ring-offset-gray-900"
                            >
                              {uploadingFiles ? 'Uploading...' : 'Upload'}
                            </button>
                        )}
                      </div>

                      {files.length > 0 && (
                          <div className="mt-2">
                            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Selected files:</h4>
                            <ul className="space-y-1">
                              {files.map((file, index) => (
                                  <li key={index} className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-700 p-1 rounded">
                                    <span className="truncate max-w-[200px]">{file.name}</span>
                                    <button
                                        type="button"
                                        onClick={() => removeFile(index)}
                                        className="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                                    >
                                      <X className="h-4 w-4" />
                                    </button>
                                  </li>
                              ))}
                            </ul>
                          </div>
                      )}
                    </div>
                )}
              </div>
            </div>
          </div>

          <div className="flex justify-between space-x-3 mt-6 pt-4 border-t dark:border-gray-700">
            {isAdmin && (
                <button
                    type="button"
                    onClick={handleDeleteTask}
                    className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 dark:focus:ring-offset-gray-900"
                    disabled={loading}
                >
                  Delete Task
                </button>
            )}
            <div className="flex space-x-3 ml-auto">
              <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
                  disabled={loading}
              >
                Cancel
              </button>
              {canEditTask && (
                  <button
                      type="button"
                      onClick={handleUpdateTask}
                      disabled={loading}
                      className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 dark:focus:ring-offset-gray-900"
                  >
                    {loading ? 'Saving...' : 'Save Changes'}
                  </button>
              )}
            </div>
          </div>
        </div>
      </div>
  );
}