import React, { useState, useEffect, useRef } from 'react';
import { useAuthStore } from '../store/authStore';
import { supabase } from '../lib/supabase';
import { Search, Send, User } from 'lucide-react';
import type { Profile, Message } from '../types/database';

export default function Messages() {
    const { user } = useAuthStore();
    const [contacts, setContacts] = useState<Profile[]>([]);
    const [selectedContact, setSelectedContact] = useState<Profile | null>(null);
    const [messages, setMessages] = useState<(Message & { sender_profile?: Profile; receiver_profile?: Profile })[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [loading, setLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<Profile[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const messageInputRef = useRef<HTMLTextAreaElement>(null);

    // Fetch contacts (people the user has messaged with)
    const fetchContacts = async () => {
        if (!user) return;

        try {
            // Get unique users from messages (as Profile objects)
            const { data: sentMessages, error: sentError } = await supabase
                .from('messages')
                .select('receiver_id, receiver_profile:profiles!messages_receiver_id_fkey(*)')
                .eq('sender_id', user.id)
                .order('created_at', { ascending: false });

            const { data: receivedMessages, error: receivedError } = await supabase
                .from('messages')
                .select('sender_id, sender_profile:profiles!messages_sender_id_fkey(*)')
                .eq('receiver_id', user.id)
                .order('created_at', { ascending: false });

            if (sentError) throw sentError;
            if (receivedError) throw receivedError;

            // Combine and deduplicate contacts as Profile objects
            const contactMap = new Map<string, Profile>();

            sentMessages?.forEach((msg) => {
                if (msg.receiver_profile && !contactMap.has(msg.receiver_id)) {
                    contactMap.set(msg.receiver_id, msg.receiver_profile);
                }
            });

            receivedMessages?.forEach((msg) => {
                if (msg.sender_profile && !contactMap.has(msg.sender_id)) {
                    contactMap.set(msg.sender_id, msg.sender_profile);
                }
            });

            setContacts(Array.from(contactMap.values()));
        } catch (error) {
            console.error('Error fetching contacts:', error);
        }
    };

    // Fetch messages between current user and selected contact
    const fetchMessages = async () => {
        if (!user || !selectedContact) return;

        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('messages')
                .select(`
          *,
          sender_profile:profiles!messages_sender_id_fkey(*),
          receiver_profile:profiles!messages_receiver_id_fkey(*)
        `)
                .or(
                    `and(sender_id.eq.${user.id},receiver_id.eq.${selectedContact.id}),and(sender_id.eq.${selectedContact.id},receiver_id.eq.${user.id})`,
                )
                .order('created_at', { ascending: true });

            if (error) throw error;
            setMessages(data || []);

            // Mark received messages as read
            await supabase
                .from('messages')
                .update({ read: true })
                .eq('receiver_id', user.id)
                .eq('sender_id', selectedContact.id)
                .eq('read', false);
        } catch (error) {
            console.error('Error fetching messages:', error);
        } finally {
            setLoading(false);
        }
    };

    // Search for users
    useEffect(() => {
        const searchUsers = async () => {
            if (!searchQuery.trim() || !user) {
                setSearchResults([]);
                return;
            }

            setIsSearching(true);
            try {
                const { data, error } = await supabase
                    .from('profiles')
                    .select('*')
                    .ilike('full_name', `%${searchQuery}%`)
                    .neq('id', user.id)
                    .limit(5);

                if (error) throw error;
                setSearchResults(data || []);
            } catch (error) {
                console.error('Error searching users:', error);
            } finally {
                setIsSearching(false);
            }
        };

        const debounceTimer = setTimeout(searchUsers, 300);
        return () => clearTimeout(debounceTimer);
    }, [searchQuery, user?.id]);

    // Initial load
    useEffect(() => {
        fetchContacts();
    }, [user]);

    // Load messages when contact is selected
    useEffect(() => {
        if (selectedContact) {
            fetchMessages();
            setSearchQuery('');
        }
    }, [selectedContact]);

    // Scroll to bottom when messages change
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    // Set up real-time subscription for new messages
    useEffect(() => {
        if (!user) return;

        const subscription = supabase
            .channel('messages-changes')
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'messages',
                    filter: `or(sender_id.eq.${user.id},receiver_id.eq.${user.id})`,
                },
                () => {
                    if (selectedContact) {
                        fetchMessages();
                    }
                    fetchContacts();
                },
            )
            .subscribe();

        return () => {
            subscription.unsubscribe();
        };
    }, [user?.id, selectedContact?.id]);

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!user || !selectedContact || !newMessage.trim()) return;

        try {
            const { error } = await supabase
                .from('messages')
                .insert({
                    sender_id: user.id,
                    receiver_id: selectedContact.id,
                    content: newMessage.trim(),
                });

            if (error) throw error;

            setNewMessage('');
            messageInputRef.current?.focus();
        } catch (error) {
            console.error('Error sending message:', error);
        }
    };

    const selectContact = (contact: Profile) => {
        setSelectedContact(contact);
        setSearchResults([]);
    };

    const formatTime = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        const today = new Date();
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);

        if (date.toDateString() === today.toDateString()) {
            return 'Today';
        } else if (date.toDateString() === yesterday.toDateString()) {
            return 'Yesterday';
        } else {
            return date.toLocaleDateString();
        }
    };

    // Group messages by date
    const groupedMessages: { [date: string]: (Message & { sender_profile?: Profile; receiver_profile?: Profile })[] } = {};
    messages.forEach((message) => {
        const date = formatDate(message.created_at);
        if (!groupedMessages[date]) {
            groupedMessages[date] = [];
        }
        groupedMessages[date].push(message);
    });

    return (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow h-[calc(100vh-12rem)]">
            <div className="grid grid-cols-1 md:grid-cols-3 h-full">
                {/* Contacts sidebar */}
                <div className="border-r border-gray-200 dark:border-gray-700 md:col-span-1 flex flex-col">
                    <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Messages</h2>
                        <div className="relative">
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Search users..."
                                className="w-full px-4 py-2 pl-10 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                            />
                            <Search className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
                            {isSearching && (
                                <div className="absolute right-3 top-2.5">
                                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-500"></div>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="overflow-y-auto flex-1">
                        {searchQuery && searchResults.length > 0 ? (
                            <div className="divide-y divide-gray-200 dark:divide-gray-700">
                                {searchResults.map((result) => (
                                    <div
                                        key={result.id}
                                        className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer"
                                        onClick={() => selectContact(result)}
                                    >
                                        <div className="flex items-center">
                                            <div className="bg-gray-200 dark:bg-gray-600 rounded-full h-10 w-10 flex items-center justify-center mr-3">
                                                <User className="h-6 w-6 text-gray-500 dark:text-gray-300" />
                                            </div>
                                            <div>
                                                <p className="font-medium text-gray-900 dark:text-white">{result.full_name}</p>
                                                <p className="text-sm text-gray-500 dark:text-gray-400 capitalize">{result.role}</p>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : searchQuery && searchResults.length === 0 && !isSearching ? (
                            <div className="p-4 text-center text-gray-500 dark:text-gray-400">
                                No users found
                            </div>
                        ) : contacts.length > 0 ? (
                            <div className="divide-y divide-gray-200 dark:divide-gray-700">
                                {contacts.map((contact) => (
                                    <div
                                        key={contact.id}
                                        className={`p-4 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer ${
                                            selectedContact?.id === contact.id ? 'bg-gray-100 dark:bg-gray-700' : ''
                                        }`}
                                        onClick={() => selectContact(contact)}
                                    >
                                        <div className="flex items-center">
                                            <div className="bg-gray-200 dark:bg-gray-600 rounded-full h-10 w-10 flex items-center justify-center mr-3">
                                                <User className="h-6 w-6 text-gray-500 dark:text-gray-300" />
                                            </div>
                                            <div>
                                                <p className="font-medium text-gray-900 dark:text-white">{contact.full_name}</p>
                                                <p className="text-sm text-gray-500 dark:text-gray-400 capitalize">{contact.role}</p>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="p-4 text-center text-gray-500 dark:text-gray-400">
                                No conversations yet
                            </div>
                        )}
                    </div>
                </div>

                {/* Message area */}
                <div className="md:col-span-2 flex flex-col h-full">
                    {selectedContact ? (
                        <>
                            {/* Contact header */}
                            <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center">
                                <div className="bg-gray-200 dark:bg-gray-600 rounded-full h-10 w-10 flex items-center justify-center mr-3">
                                    <User className="h-6 w-6 text-gray-500 dark:text-gray-300" />
                                </div>
                                <div>
                                    <h2 className="font-medium text-gray-900 dark:text-white">{selectedContact.full_name}</h2>
                                    <p className="text-sm text-gray-500 dark:text-gray-400 capitalize">{selectedContact.role}</p>
                                </div>
                            </div>

                            {/* Messages */}
                            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                                {loading && messages.length === 0 ? (
                                    <div className="flex justify-center items-center h-full">
                                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                                    </div>
                                ) : messages.length === 0 ? (
                                    <div className="text-center text-gray-500 dark:text-gray-400 mt-8">
                                        No messages yet. Start the conversation!
                                    </div>
                                ) : (
                                    Object.entries(groupedMessages).map(([date, dateMessages]) => (
                                        <div key={date} className="space-y-3">
                                            <div className="flex justify-center">
                        <span className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 px-2 py-1 rounded-full">
                          {date}
                        </span>
                                            </div>
                                            {dateMessages.map((message) => (
                                                <div
                                                    key={message.id}
                                                    className={`flex ${message.sender_id === user?.id ? 'justify-end' : 'justify-start'}`}
                                                >
                                                    <div
                                                        className={`max-w-[70%] rounded-lg px-4 py-2 ${
                                                            message.sender_id === user?.id
                                                                ? 'bg-blue-500 text-white'
                                                                : 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white'
                                                        }`}
                                                    >
                                                        <p>{message.content}</p>
                                                        <p className={`text-xs mt-1 ${
                                                            message.sender_id === user?.id
                                                                ? 'text-blue-100'
                                                                : 'text-gray-500 dark:text-gray-400'
                                                        }`}>
                                                            {formatTime(message.created_at)}
                                                            {!message.read && message.sender_id === user?.id && (
                                                                <span className="ml-2">• Sent</span>
                                                            )}
                                                        </p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ))
                                )}
                                <div ref={messagesEndRef} />
                            </div>

                            {/* Message input */}
                            <div className="p-4 border-t border-gray-200 dark:border-gray-700">
                                <form onSubmit={handleSendMessage} className="flex items-end space-x-2">
                  <textarea
                      ref={messageInputRef}
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      placeholder="Type a message..."
                      className="flex-1 border border-gray-300 dark:border-gray-600 rounded-md p-2 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white resize-none"
                      rows={1}
                      onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                              e.preventDefault();
                              handleSendMessage(e);
                          }
                      }}
                  />
                                    <button
                                        type="submit"
                                        disabled={!newMessage.trim()}
                                        className="bg-blue-500 text-white p-2 rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
                                    >
                                        <Send className="h-5 w-5" />
                                    </button>
                                </form>
                            </div>
                        </>
                    ) : (
                        <div className="flex items-center justify-center h-full text-gray-500 dark:text-gray-400">
                            Select a contact to start messaging
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}