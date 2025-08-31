import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { 
  MessageSquare,
  Send,
  Search,
  Plus,
  Users,
  Clock,
  CheckCircle,
  AlertCircle,
  User,
  Building2,
  MessageCircle,
  Archive,
  Trash2,
  MoreHorizontal,
  Inbox,
  Folder,
  FolderOpen,
  RotateCcw,
  Calendar
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';

interface Conversation {
  id: number;
  title: string;
  type: 'direct_message' | 'support_ticket' | 'group_chat' | 'collaboration';
  participants: string[];
  participantDetails: {
    userId: string;
    firstName: string;
    lastName: string;
    email: string;
    role: string;
    profileImageUrl?: string;
    companyName?: string;
  }[];
  status: 'active' | 'archived' | 'closed';
  unreadCount: number;
  lastMessageAt: string;
  createdAt: string;
}

interface Message {
  id: number;
  conversationId: number;
  senderId: string;
  senderRole: string;
  messageType: 'text' | 'file' | 'image' | 'system';
  content: string;
  senderDetails?: {
    firstName: string;
    lastName: string;
    email: string;
    profileImageUrl?: string;
  };
  metadata: {
    priority?: 'low' | 'normal' | 'high' | 'urgent';
    readBy?: string[];
  };
  createdAt: string;
  updatedAt: string;
}

interface ConversationsResponse {
  success: boolean;
  data: Conversation[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
  };
}

interface MessagesResponse {
  success: boolean;
  data: Message[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
  };
}

interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  companyName?: string;
  role: string;
}

interface UsersResponse {
  success: boolean;
  data: User[];
}

export default function AdminMessaging() {
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [newMessage, setNewMessage] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [showNewConversation, setShowNewConversation] = useState(false);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [conversationTitle, setConversationTitle] = useState('');
  const [currentFolder, setCurrentFolder] = useState<'active' | 'archived' | 'deleted'>('active');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();

  // Fetch conversations based on current folder
  const { data: conversationsResponse, isLoading: loadingConversations } = useQuery<ConversationsResponse>({
    queryKey: ['/api/admin/conversations', currentFolder, searchTerm],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (searchTerm) params.append('search', searchTerm);
      
      let endpoint = '/api/admin/conversations';
      if (currentFolder === 'archived') {
        endpoint = '/api/admin/conversations/archived';
      } else if (currentFolder === 'deleted') {
        endpoint = '/api/admin/conversations/deleted';
      }
      
      const response = await fetch(`${endpoint}?${params}`);
      if (!response.ok) throw new Error(`Failed to fetch ${currentFolder} conversations`);
      const data = await response.json();
      console.log(`🔍 Frontend received ${currentFolder} conversations data:`, data);
      return data;
    },
    refetchInterval: 5000, // Refresh every 5 seconds
  });

  // Fetch messages for selected conversation
  const { data: messagesResponse, isLoading: loadingMessages } = useQuery<MessagesResponse>({
    queryKey: ['/api/admin/conversations', selectedConversation?.id, 'messages'],
    queryFn: async () => {
      if (!selectedConversation) return null;
      
      const response = await fetch(`/api/admin/conversations/${selectedConversation.id}/messages`);
      if (!response.ok) throw new Error('Failed to fetch messages');
      return response.json();
    },
    enabled: !!selectedConversation,
    refetchInterval: 3000, // Refresh every 3 seconds
  });

  // Fetch users for new conversation
  const { data: usersResponse } = useQuery<UsersResponse>({
    queryKey: ['/api/admin/users-for-messaging'],
    queryFn: async () => {
      const response = await fetch('/api/admin/users-for-messaging');
      if (!response.ok) throw new Error('Failed to fetch users');
      return response.json();
    },
    enabled: showNewConversation,
  });

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: async ({ conversationId, content, priority = 'normal' }: {
      conversationId: number;
      content: string;
      priority?: 'low' | 'normal' | 'high' | 'urgent';
    }) => {
      const response = await fetch(`/api/admin/conversations/${conversationId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content, messageType: 'text', priority }),
      });
      if (!response.ok) throw new Error('Failed to send message');
      return response.json();
    },
    onSuccess: () => {
      setNewMessage('');
      queryClient.invalidateQueries({ queryKey: ['/api/admin/conversations'] });
      if (selectedConversation) {
        queryClient.invalidateQueries({ 
          queryKey: ['/api/admin/conversations', selectedConversation.id, 'messages'] 
        });
      }
    },
    onError: () => {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to send message. Please try again.",
      });
    },
  });

  // Create conversation mutation
  const createConversationMutation = useMutation({
    mutationFn: async ({ title, participants, initialMessage }: {
      title: string;
      participants: string[];
      initialMessage?: string;
    }) => {
      const response = await fetch('/api/admin/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, participants, type: 'direct_message', initialMessage }),
      });
      if (!response.ok) throw new Error('Failed to create conversation');
      return response.json();
    },
    onSuccess: (data) => {
      setShowNewConversation(false);
      setSelectedUsers([]);
      setConversationTitle('');
      setNewMessage('');
      queryClient.invalidateQueries({ queryKey: ['/api/admin/conversations'] });
      
      // Select the new conversation
      if (data?.data) {
        setSelectedConversation(data.data);
      }
      
      toast({
        title: "Success",
        description: "New conversation created successfully.",
      });
    },
    onError: () => {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to create conversation. Please try again.",
      });
    },
  });

  // Archive conversation mutation
  const archiveConversationMutation = useMutation({
    mutationFn: async (conversationId: number) => {
      const response = await fetch(`/api/admin/conversations/${conversationId}/archive`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        if (response.status === 404) {
          throw new Error('Conversation no longer exists');
        }
        throw new Error(errorData.error || 'Failed to archive conversation');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/conversations'] });
      setSelectedConversation(null);
      toast({
        title: "Success",
        description: "Conversation archived successfully.",
      });
    },
    onError: (error: Error) => {
      // If conversation no longer exists, just refresh the list
      if (error.message === 'Conversation no longer exists') {
        queryClient.invalidateQueries({ queryKey: ['/api/admin/conversations'] });
        setSelectedConversation(null);
        toast({
          title: "Already Archived",
          description: "This conversation has already been archived or removed.",
        });
      } else {
        toast({
          variant: "destructive",
          title: "Error",
          description: error.message || "Failed to archive conversation. Please try again.",
        });
      }
    },
  });

  // Delete conversation mutation
  const deleteConversationMutation = useMutation({
    mutationFn: async (conversationId: number) => {
      const response = await fetch(`/api/admin/conversations/${conversationId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        if (response.status === 404) {
          throw new Error('Conversation no longer exists');
        }
        throw new Error(errorData.error || 'Failed to delete conversation');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/conversations'] });
      setSelectedConversation(null);
      toast({
        title: "Success",
        description: "Conversation deleted successfully.",
      });
    },
    onError: (error: Error) => {
      // If conversation no longer exists, just refresh the list
      if (error.message === 'Conversation no longer exists') {
        queryClient.invalidateQueries({ queryKey: ['/api/admin/conversations'] });
        setSelectedConversation(null);
        toast({
          title: "Already Deleted",
          description: "This conversation has already been deleted.",
        });
      } else {
        toast({
          variant: "destructive",
          title: "Error",
          description: error.message || "Failed to delete conversation. Please try again.",
        });
      }
    },
  });

  // Restore conversation mutation for deleted folder
  const restoreConversationMutation = useMutation({
    mutationFn: async (deletedId: string) => {
      const actualId = deletedId.replace('deleted-', '');
      const response = await fetch(`/api/admin/conversations/deleted/${actualId}/restore`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to restore conversation');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/conversations', currentFolder] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/conversations', 'active'] });
      setSelectedConversation(null);
      toast({
        title: "Success",
        description: "Conversation restored successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to restore conversation. Please try again.",
      });
    },
  });

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messagesResponse?.data]);

  const conversations = conversationsResponse?.data || [];
  const messages = messagesResponse?.data || [];
  const users = usersResponse?.data || [];

  const handleSendMessage = () => {
    if (!selectedConversation || !newMessage.trim()) return;
    
    sendMessageMutation.mutate({
      conversationId: selectedConversation.id,
      content: newMessage.trim(),
    });
  };

  const handleCreateConversation = () => {
    if (!conversationTitle.trim() || selectedUsers.length === 0) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Please provide a title and select at least one participant.",
      });
      return;
    }

    createConversationMutation.mutate({
      title: conversationTitle,
      participants: selectedUsers,
      initialMessage: newMessage.trim() || undefined,
    });
  };

  const handleArchiveConversation = (conversationId: number) => {
    archiveConversationMutation.mutate(conversationId);
  };

  const handleDeleteConversation = (conversationId: number, title: string) => {
    if (confirm(`Are you sure you want to delete the conversation "${title}"? This action cannot be undone.`)) {
      deleteConversationMutation.mutate(conversationId);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'closed': return 'bg-red-100 text-red-800';
      case 'archived': return 'bg-gray-100 text-gray-800';
      default: return 'bg-blue-100 text-blue-800';
    }
  };

  const getPriorityColor = (priority?: string) => {
    switch (priority) {
      case 'urgent': return 'text-red-600';
      case 'high': return 'text-orange-600';
      case 'low': return 'text-gray-600';
      default: return 'text-blue-600';
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)]">
      {/* Header */}
      <div className="flex items-center justify-between flex-shrink-0 mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Admin Messaging</h1>
          <p className="text-muted-foreground">
            Direct communication with users and support conversation management
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
            <MessageSquare className="w-3 h-3 mr-1" />
            {conversations.length} Conversations
          </Badge>
          <Button onClick={() => setShowNewConversation(true)}>
            <Plus className="h-4 w-4 mr-2" />
            New Conversation
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1 min-h-0">
        {/* Conversations List */}
        <Card className="lg:col-span-1 flex flex-col">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Conversations
            </CardTitle>
            
            {/* Folder Navigation */}
            <div className="flex items-center gap-1 bg-muted/50 rounded-lg p-1">
              <Button
                variant={currentFolder === 'active' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setCurrentFolder('active')}
                className="flex-1 h-8"
                data-testid="folder-active"
              >
                <Inbox className="w-3 h-3 mr-1" />
                Active
              </Button>
              <Button
                variant={currentFolder === 'archived' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setCurrentFolder('archived')}
                className="flex-1 h-8"
                data-testid="folder-archived"
              >
                <Archive className="w-3 h-3 mr-1" />
                Archive
              </Button>
              <Button
                variant={currentFolder === 'deleted' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setCurrentFolder('deleted')}
                className="flex-1 h-8"
                data-testid="folder-deleted"
              >
                <Trash2 className="w-3 h-3 mr-1" />
                Deleted
              </Button>
            </div>
            
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={`Search ${currentFolder} conversations...`}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8"
                data-testid="input-search-conversations"
              />
            </div>
          </CardHeader>
          <CardContent className="p-0 flex-1">
            <ScrollArea className="h-full">
              {loadingConversations ? (
                <div className="p-4">
                  <div className="space-y-3">
                    {[...Array(5)].map((_, i) => (
                      <div key={`skeleton-${i}`} className="h-16 bg-gray-100 rounded-lg animate-pulse"></div>
                    ))}
                  </div>
                </div>
              ) : conversations.length === 0 ? (
                <div className="p-4 text-center text-muted-foreground">
                  <MessageCircle className="h-12 w-12 mx-auto mb-2 text-muted-foreground" />
                  <p>No conversations yet</p>
                  <p className="text-sm">Start a new conversation to communicate with users</p>
                </div>
              ) : (
                <div className="space-y-1">
                  {conversations.map((conversation) => (
                    <div
                      key={conversation.id}
                      className={`p-4 cursor-pointer hover:bg-gray-50 border-b transition-colors ${
                        selectedConversation?.id === conversation.id ? 'bg-blue-50 border-l-4 border-l-blue-500' : ''
                      }`}
                      onClick={() => setSelectedConversation(conversation)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="text-sm font-medium truncate">
                              {conversation.title}
                            </h4>
                            <Badge variant="secondary" className={getStatusColor(conversation.status)}>
                              {conversation.status}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-1 text-xs text-muted-foreground mb-2">
                            {conversation.participantDetails.slice(0, 2).map((participant, i) => (
                              <span key={participant.userId}>
                                {participant.firstName} {participant.lastName}
                                {i < Math.min(conversation.participantDetails.length - 1, 1) && ', '}
                              </span>
                            ))}
                            {conversation.participantDetails.length > 2 && (
                              <span>+{conversation.participantDetails.length - 2} more</span>
                            )}
                          </div>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                              <Clock className="h-3 w-3" />
                              {new Date(conversation.lastMessageAt).toLocaleDateString()}
                            </div>
                            {conversation.unreadCount > 0 && (
                              <Badge variant="destructive" className="text-xs px-1.5 py-0.5">
                                {conversation.unreadCount}
                              </Badge>
                            )}
                          </div>
                        </div>
                        
                        {/* Show additional folder-specific information */}
                        {(currentFolder === 'archived' || currentFolder === 'deleted') && (
                          <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                            <Calendar className="h-3 w-3" />
                            {currentFolder === 'archived' && (conversation as any).archivedAt && 
                              `Archived: ${new Date((conversation as any).archivedAt).toLocaleDateString()}`
                            }
                            {currentFolder === 'deleted' && (conversation as any).daysUntilPermanentDelete !== undefined && 
                              `Deleted (${(conversation as any).daysUntilPermanentDelete} days left)`
                            }
                          </div>
                        )}
                        
                        <div className="flex items-center gap-1">
                          {currentFolder === 'active' && (
                            <>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleArchiveConversation(conversation.id);
                                }}
                                className="h-8 w-8 p-0 hover:bg-gray-200"
                                disabled={archiveConversationMutation.isPending}
                                data-testid={`button-archive-${conversation.id}`}
                              >
                                <Archive className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteConversation(conversation.id, conversation.title);
                                }}
                                className="h-8 w-8 p-0 hover:bg-red-100 hover:text-red-600"
                                disabled={deleteConversationMutation.isPending}
                                data-testid={`button-delete-${conversation.id}`}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                          {currentFolder === 'deleted' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                restoreConversationMutation.mutate(conversation.id.toString());
                              }}
                              className="h-8 w-8 p-0 hover:bg-green-100 hover:text-green-600"
                              disabled={restoreConversationMutation.isPending}
                              data-testid={`button-restore-${conversation.id}`}
                            >
                              <RotateCcw className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Messages Area */}
        <Card className="lg:col-span-2 flex flex-col">
          {selectedConversation ? (
            <>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <MessageSquare className="h-5 w-5" />
                      {selectedConversation.title}
                    </CardTitle>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="secondary" className={getStatusColor(selectedConversation.status)}>
                        {selectedConversation.status}
                      </Badge>
                      <span className="text-sm text-muted-foreground">
                        {selectedConversation.participantDetails.length} participants
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {currentFolder === 'active' && (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleArchiveConversation(selectedConversation.id)}
                          disabled={archiveConversationMutation.isPending}
                          className="flex items-center gap-2"
                          data-testid="button-archive-selected"
                        >
                          <Archive className="h-4 w-4" />
                          Archive
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDeleteConversation(selectedConversation.id, selectedConversation.title)}
                          disabled={deleteConversationMutation.isPending}
                          className="flex items-center gap-2 hover:bg-red-50 hover:text-red-600 hover:border-red-200"
                          data-testid="button-delete-selected"
                        >
                          <Trash2 className="h-4 w-4" />
                          Delete
                        </Button>
                      </>
                    )}
                    {currentFolder === 'deleted' && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => restoreConversationMutation.mutate(selectedConversation.id.toString())}
                        disabled={restoreConversationMutation.isPending}
                        className="flex items-center gap-2 hover:bg-green-50 hover:text-green-600 hover:border-green-200"
                        data-testid="button-restore-selected"
                      >
                        <RotateCcw className="h-4 w-4" />
                        Restore
                      </Button>
                    )}
                  </div>
                </div>
              </CardHeader>
              <Separator />
              <CardContent className="p-0 flex-1">
                <ScrollArea className="h-full p-4">
                  {loadingMessages ? (
                    <div className="space-y-4">
                      {[...Array(3)].map((_, i) => (
                        <div key={`message-skeleton-${i}`} className="flex gap-3">
                          <div className="w-8 h-8 bg-gray-200 rounded-full animate-pulse"></div>
                          <div className="flex-1">
                            <div className="h-4 bg-gray-200 rounded animate-pulse mb-2"></div>
                            <div className="h-12 bg-gray-200 rounded animate-pulse"></div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : messages.length === 0 ? (
                    <div className="text-center py-8">
                      <MessageCircle className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                      <p className="text-muted-foreground">No messages yet</p>
                      <p className="text-sm text-muted-foreground">Send the first message to start the conversation</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {messages.map((message) => (
                        <div key={message.id} className="flex gap-3">
                          <Avatar className="w-8 h-8">
                            <AvatarImage src={message.senderDetails?.profileImageUrl || ''} />
                            <AvatarFallback>
                              {message.senderRole === 'admin' ? 'A' : 
                               `${message.senderDetails?.firstName?.[0] || ''}${message.senderDetails?.lastName?.[0] || ''}`}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-sm font-medium">
                                {message.senderRole === 'admin' ? 'Admin' : 
                                 `${message.senderDetails?.firstName || ''} ${message.senderDetails?.lastName || ''}`}
                              </span>
                              {message.senderRole === 'admin' && (
                                <Badge variant="secondary" className="text-xs px-1.5 py-0.5">Admin</Badge>
                              )}
                              <span className="text-xs text-muted-foreground">
                                {new Date(message.createdAt).toLocaleString()}
                              </span>
                              {message.metadata.priority && message.metadata.priority !== 'normal' && (
                                <AlertCircle className={`h-4 w-4 ${getPriorityColor(message.metadata.priority)}`} />
                              )}
                            </div>
                            <div className="text-sm text-gray-900 whitespace-pre-wrap">
                              {message.content}
                            </div>
                          </div>
                        </div>
                      ))}
                      <div ref={messagesEndRef} />
                    </div>
                  )}
                </ScrollArea>
                <Separator />
                
                {/* Message input - only for active conversations */}
                {currentFolder === 'active' ? (
                  <div className="p-4">
                    <div className="flex gap-2">
                      <Textarea
                        placeholder="Type your message..."
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        className="flex-1"
                        rows={2}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            handleSendMessage();
                          }
                        }}
                        data-testid="textarea-message"
                      />
                      <Button 
                        onClick={handleSendMessage}
                        disabled={!newMessage.trim() || sendMessageMutation.isPending}
                        data-testid="button-send-message"
                      >
                        <Send className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="p-4 bg-muted/30 border-t">
                    <div className="flex items-center justify-center gap-2 text-muted-foreground">
                      <Archive className="h-4 w-4" />
                      <span className="text-sm">
                        {currentFolder === 'archived' 
                          ? 'This conversation is archived. Messages cannot be sent.' 
                          : 'This conversation is deleted. Messages cannot be sent.'
                        }
                      </span>
                    </div>
                  </div>
                )}
              </CardContent>
            </>
          ) : (
            <CardContent className="flex items-center justify-center flex-1">
              <div className="text-center">
                <MessageSquare className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-medium mb-2">Select a conversation</h3>
                <p className="text-muted-foreground">Choose a conversation from the left to view messages</p>
              </div>
            </CardContent>
          )}
        </Card>
      </div>

      {/* New Conversation Dialog */}
      {showNewConversation && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-md bg-white">
            <CardHeader>
              <CardTitle>Start New Conversation</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium">Conversation Title</label>
                <Input
                  placeholder="Enter conversation title..."
                  value={conversationTitle}
                  onChange={(e) => setConversationTitle(e.target.value)}
                />
              </div>
              <div>
                <label className="text-sm font-medium">Select Users</label>
                <ScrollArea className="h-32 border rounded-md p-2">
                  {users.map((user) => (
                    <div key={user.id} className="flex items-center space-x-2 py-1">
                      <input
                        type="checkbox"
                        id={user.id}
                        checked={selectedUsers.includes(user.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedUsers([...selectedUsers, user.id]);
                          } else {
                            setSelectedUsers(selectedUsers.filter(id => id !== user.id));
                          }
                        }}
                      />
                      <label htmlFor={user.id} className="text-sm cursor-pointer flex-1">
                        {user.firstName} {user.lastName}
                        {user.companyName && (
                          <span className="text-muted-foreground"> - {user.companyName}</span>
                        )}
                      </label>
                    </div>
                  ))}
                </ScrollArea>
              </div>
              <div>
                <label className="text-sm font-medium">Initial Message (Optional)</label>
                <Textarea
                  placeholder="Type your first message..."
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  rows={3}
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setShowNewConversation(false);
                    setSelectedUsers([]);
                    setConversationTitle('');
                    setNewMessage('');
                  }}
                >
                  Cancel
                </Button>
                <Button 
                  onClick={handleCreateConversation}
                  disabled={createConversationMutation.isPending}
                >
                  Create Conversation
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}