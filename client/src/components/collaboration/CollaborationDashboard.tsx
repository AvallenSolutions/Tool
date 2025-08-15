import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useWebSocket, WebSocketMessage } from '@/hooks/useWebSocket';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { 
  MessageSquare, 
  Plus, 
  Send, 
  Users, 
  CheckCircle2, 
  Clock, 
  AlertCircle,
  FileText,
  Calendar,
  User
} from 'lucide-react';
import { format } from 'date-fns';
import { useAuth } from '@/hooks/useAuth';

interface Conversation {
  id: number;
  title: string;
  type: string;
  supplierId?: number;
  participants: string[];
  status: string;
  lastMessageAt: string;
  createdAt: string;
  updatedAt: string;
}

interface Message {
  id: number;
  senderId: string;
  senderRole: string;
  messageType: string;
  content: string;
  attachments: any[];
  metadata: any;
  createdAt: string;
  updatedAt: string;
  senderName?: string;
  senderEmail?: string;
}

interface CollaborationTask {
  id: number;
  title: string;
  description: string;
  assignedTo?: string;
  assignedBy: string;
  status: string;
  priority: string;
  dueDate?: string;
  completedAt?: string;
  createdAt: string;
}

const conversationSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  type: z.string().default('supplier_collaboration'),
  supplierId: z.number().optional(),
});

const taskSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  assignedTo: z.string().optional(),
  priority: z.enum(['low', 'normal', 'high', 'urgent']).default('normal'),
  dueDate: z.string().optional(),
});

export default function CollaborationDashboard() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [selectedConversationId, setSelectedConversationId] = useState<number | null>(null);
  const [messageInput, setMessageInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isNewConversationOpen, setIsNewConversationOpen] = useState(false);
  const [isNewTaskOpen, setIsNewTaskOpen] = useState(false);

  // WebSocket connection
  const { isConnected, sendChatMessage, sendTypingIndicator } = useWebSocket({
    userId: user?.id,
    onMessage: handleWebSocketMessage
  });

  function handleWebSocketMessage(message: WebSocketMessage) {
    if (message.type === 'message' && message.conversationId === selectedConversationId) {
      setMessages(prev => [...prev, message.data as Message]);
      
      // Scroll to bottom
      setTimeout(() => {
        const messagesContainer = document.getElementById('messages-container');
        if (messagesContainer) {
          messagesContainer.scrollTop = messagesContainer.scrollHeight;
        }
      }, 100);
    } else if (message.type === 'typing') {
      // Handle typing indicators
      console.log('User is typing:', message.data);
    }
  }

  // Fetch conversations
  const { data: conversationsData, isLoading: conversationsLoading } = useQuery<{ conversations: Conversation[] }>({
    queryKey: ['/api/conversations'],
    refetchInterval: 30000,
  });

  const conversations = conversationsData?.conversations || [];

  // Fetch messages for selected conversation
  const { data: messagesData, isLoading: messagesLoading } = useQuery<{ messages: Message[] }>({
    queryKey: [`/api/conversations/${selectedConversationId}/messages`],
    enabled: !!selectedConversationId,
  });

  useEffect(() => {
    if (messagesData?.messages) {
      setMessages(messagesData.messages);
    }
  }, [messagesData]);

  // Fetch tasks for selected conversation
  const { data: tasksData } = useQuery<{ tasks: CollaborationTask[] }>({
    queryKey: [`/api/conversations/${selectedConversationId}/tasks`],
    enabled: !!selectedConversationId,
  });

  const tasks = tasksData?.tasks || [];

  // Form for new conversation
  const conversationForm = useForm<z.infer<typeof conversationSchema>>({
    resolver: zodResolver(conversationSchema),
    defaultValues: {
      title: '',
      type: 'supplier_collaboration',
    },
  });

  // Form for new task
  const taskForm = useForm<z.infer<typeof taskSchema>>({
    resolver: zodResolver(taskSchema),
    defaultValues: {
      title: '',
      description: '',
      priority: 'normal',
    },
  });

  // Create conversation mutation
  const createConversationMutation = useMutation({
    mutationFn: async (data: z.infer<typeof conversationSchema>) => {
      const response = await fetch('/api/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error('Failed to create conversation');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/conversations'] });
      setIsNewConversationOpen(false);
      conversationForm.reset();
    },
  });

  // Create task mutation
  const createTaskMutation = useMutation({
    mutationFn: async (data: z.infer<typeof taskSchema>) => {
      const response = await fetch(`/api/conversations/${selectedConversationId}/tasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error('Failed to create task');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/conversations/${selectedConversationId}/tasks`] });
      setIsNewTaskOpen(false);
      taskForm.reset();
    },
  });

  // Update task status mutation
  const updateTaskMutation = useMutation({
    mutationFn: async ({ taskId, status }: { taskId: number; status: string }) => {
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ status }),
      });
      if (!response.ok) throw new Error('Failed to update task');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/conversations/${selectedConversationId}/tasks`] });
    },
  });

  const handleSendMessage = () => {
    if (!messageInput.trim() || !selectedConversationId) return;

    sendChatMessage(selectedConversationId, messageInput.trim());
    setMessageInput('');
    setIsTyping(false);
  };

  const handleTyping = (value: string) => {
    setMessageInput(value);
    
    if (!isTyping && value.trim()) {
      setIsTyping(true);
      selectedConversationId && sendTypingIndicator(selectedConversationId, true);
    } else if (isTyping && !value.trim()) {
      setIsTyping(false);
      selectedConversationId && sendTypingIndicator(selectedConversationId, false);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { color: 'bg-yellow-100 text-yellow-800 border-yellow-200', icon: Clock },
      in_progress: { color: 'bg-blue-100 text-blue-800 border-blue-200', icon: AlertCircle },
      completed: { color: 'bg-green-100 text-green-800 border-green-200', icon: CheckCircle2 },
      cancelled: { color: 'bg-red-100 text-red-800 border-red-200', icon: AlertCircle },
    };
    
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
    const Icon = config.icon;
    
    return (
      <Badge className={config.color}>
        <Icon className="h-3 w-3 mr-1" />
        {status.replace('_', ' ')}
      </Badge>
    );
  };

  const getPriorityBadge = (priority: string) => {
    const priorityConfig = {
      low: 'bg-gray-100 text-gray-800',
      normal: 'bg-blue-100 text-blue-800',
      high: 'bg-orange-100 text-orange-800',
      urgent: 'bg-red-100 text-red-800',
    };
    
    return (
      <Badge className={priorityConfig[priority as keyof typeof priorityConfig] || priorityConfig.normal}>
        {priority}
      </Badge>
    );
  };

  return (
    <div className="flex h-screen bg-lightest-gray">
      {/* Conversations Sidebar */}
      <div className="w-80 bg-white border-r border-gray-200 flex flex-col">
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Collaboration Hub</h2>
            <div className="flex items-center space-x-2">
              <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
              <span className="text-xs text-gray-500">
                {isConnected ? 'Connected' : 'Offline'}
              </span>
            </div>
          </div>
          
          <Dialog open={isNewConversationOpen} onOpenChange={setIsNewConversationOpen}>
            <DialogTrigger asChild>
              <Button className="w-full">
                <Plus className="h-4 w-4 mr-2" />
                New Conversation
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-white">
              <DialogHeader>
                <DialogTitle>Start New Conversation</DialogTitle>
              </DialogHeader>
              <Form {...conversationForm}>
                <form onSubmit={conversationForm.handleSubmit((data) => createConversationMutation.mutate(data))} className="space-y-4">
                  <FormField
                    control={conversationForm.control}
                    name="title"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Conversation Title</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter conversation title..." {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={conversationForm.control}
                    name="type"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Type</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select conversation type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="supplier_collaboration">Supplier Collaboration</SelectItem>
                            <SelectItem value="project_discussion">Project Discussion</SelectItem>
                            <SelectItem value="support">Support</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button type="submit" disabled={createConversationMutation.isPending}>
                    {createConversationMutation.isPending ? 'Creating...' : 'Create Conversation'}
                  </Button>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>

        <ScrollArea className="flex-1">
          {conversationsLoading ? (
            <div className="p-4">Loading conversations...</div>
          ) : conversations.length === 0 ? (
            <div className="p-4 text-center text-gray-500">
              <MessageSquare className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>No conversations yet</p>
              <p className="text-sm">Start a new conversation to collaborate with suppliers</p>
            </div>
          ) : (
            conversations.map((conversation) => (
              <div
                key={conversation.id}
                onClick={() => setSelectedConversationId(conversation.id)}
                className={`p-4 border-b border-gray-100 cursor-pointer hover:bg-gray-50 transition-colors ${
                  selectedConversationId === conversation.id ? 'bg-blue-50 border-blue-200' : ''
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{conversation.title}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      {conversation.type.replace('_', ' ')} • {conversation.participants.length} participants
                    </p>
                    {conversation.lastMessageAt && (
                      <p className="text-xs text-gray-400 mt-1">
                        {format(new Date(conversation.lastMessageAt), 'MMM dd, HH:mm')}
                      </p>
                    )}
                  </div>
                  <Badge variant="secondary" className="text-xs">
                    {conversation.status}
                  </Badge>
                </div>
              </div>
            ))
          )}
        </ScrollArea>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {selectedConversationId ? (
          <>
            {/* Header */}
            <div className="p-4 border-b border-gray-200 bg-white">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold">
                    {conversations.find(c => c.id === selectedConversationId)?.title}
                  </h3>
                  <p className="text-sm text-gray-500">
                    {conversations.find(c => c.id === selectedConversationId)?.participants.length} participants
                  </p>
                </div>
                <div className="flex items-center space-x-2">
                  <Dialog open={isNewTaskOpen} onOpenChange={setIsNewTaskOpen}>
                    <DialogTrigger asChild>
                      <Button variant="outline" size="sm">
                        <Plus className="h-4 w-4 mr-2" />
                        Add Task
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="bg-white">
                      <DialogHeader>
                        <DialogTitle>Create New Task</DialogTitle>
                      </DialogHeader>
                      <Form {...taskForm}>
                        <form onSubmit={taskForm.handleSubmit((data) => createTaskMutation.mutate(data))} className="space-y-4">
                          <FormField
                            control={taskForm.control}
                            name="title"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Task Title</FormLabel>
                                <FormControl>
                                  <Input placeholder="Enter task title..." {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={taskForm.control}
                            name="description"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Description</FormLabel>
                                <FormControl>
                                  <Textarea placeholder="Task description..." {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={taskForm.control}
                            name="priority"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Priority</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                  <FormControl>
                                    <SelectTrigger>
                                      <SelectValue placeholder="Select priority" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    <SelectItem value="low">Low</SelectItem>
                                    <SelectItem value="normal">Normal</SelectItem>
                                    <SelectItem value="high">High</SelectItem>
                                    <SelectItem value="urgent">Urgent</SelectItem>
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <Button type="submit" disabled={createTaskMutation.isPending}>
                            {createTaskMutation.isPending ? 'Creating...' : 'Create Task'}
                          </Button>
                        </form>
                      </Form>
                    </DialogContent>
                  </Dialog>
                </div>
              </div>
            </div>

            <Tabs defaultValue="messages" className="flex-1 flex flex-col">
              <TabsList className="mx-4 mt-4">
                <TabsTrigger value="messages">Messages</TabsTrigger>
                <TabsTrigger value="tasks">Tasks ({tasks.length})</TabsTrigger>
                <TabsTrigger value="files">Files</TabsTrigger>
              </TabsList>

              <TabsContent value="messages" className="flex-1 flex flex-col m-0">
                {/* Messages Area */}
                <ScrollArea 
                  id="messages-container" 
                  className="flex-1 p-4"
                >
                  {messagesLoading ? (
                    <div className="text-center">Loading messages...</div>
                  ) : messages.length === 0 ? (
                    <div className="text-center text-gray-500 mt-8">
                      <MessageSquare className="h-12 w-12 mx-auto mb-2 opacity-50" />
                      <p>No messages yet</p>
                      <p className="text-sm">Start the conversation!</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {messages.map((message) => (
                        <div
                          key={message.id}
                          className={`flex ${message.senderRole === 'system' ? 'justify-center' : message.senderId === user?.id ? 'justify-end' : 'justify-start'}`}
                        >
                          <div
                            className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                              message.senderRole === 'system'
                                ? 'bg-gray-100 text-gray-600 text-sm'
                                : message.senderId === user?.id
                                ? 'bg-blue-600 text-white'
                                : 'bg-white border border-gray-200'
                            }`}
                          >
                            {message.senderRole !== 'system' && message.senderId !== user?.id && (
                              <div className="flex items-center space-x-2 mb-1">
                                <User className="h-4 w-4" />
                                <span className="text-xs font-medium">
                                  {message.senderName || 'Unknown User'}
                                </span>
                              </div>
                            )}
                            <p className="text-sm">{message.content}</p>
                            <p className={`text-xs mt-1 ${
                              message.senderId === user?.id ? 'text-blue-100' : 'text-gray-500'
                            }`}>
                              {format(new Date(message.createdAt), 'HH:mm')}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>

                {/* Message Input */}
                <div className="p-4 border-t border-gray-200 bg-white">
                  <div className="flex items-center space-x-2">
                    <Input
                      value={messageInput}
                      onChange={(e) => handleTyping(e.target.value)}
                      placeholder="Type your message..."
                      onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                      className="flex-1"
                    />
                    <Button onClick={handleSendMessage} disabled={!messageInput.trim()}>
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="tasks" className="flex-1 p-4">
                <div className="space-y-4">
                  {tasks.length === 0 ? (
                    <div className="text-center text-gray-500 mt-8">
                      <FileText className="h-12 w-12 mx-auto mb-2 opacity-50" />
                      <p>No tasks yet</p>
                      <p className="text-sm">Create tasks to track collaboration progress</p>
                    </div>
                  ) : (
                    tasks.map((task) => (
                      <Card key={task.id}>
                        <CardHeader className="pb-3">
                          <div className="flex items-start justify-between">
                            <div className="space-y-1">
                              <CardTitle className="text-base">{task.title}</CardTitle>
                              {task.description && (
                                <p className="text-sm text-gray-600">{task.description}</p>
                              )}
                            </div>
                            <div className="flex items-center space-x-2">
                              {getPriorityBadge(task.priority)}
                              {getStatusBadge(task.status)}
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent className="pt-0">
                          <div className="flex items-center justify-between text-sm text-gray-500">
                            <div className="flex items-center space-x-4">
                              {task.dueDate && (
                                <div className="flex items-center space-x-1">
                                  <Calendar className="h-4 w-4" />
                                  <span>Due {format(new Date(task.dueDate), 'MMM dd')}</span>
                                </div>
                              )}
                              <span>Created {format(new Date(task.createdAt), 'MMM dd')}</span>
                            </div>
                            {task.status !== 'completed' && task.status !== 'cancelled' && (
                              <div className="space-x-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => updateTaskMutation.mutate({
                                    taskId: task.id,
                                    status: task.status === 'pending' ? 'in_progress' : 'completed'
                                  })}
                                  disabled={updateTaskMutation.isPending}
                                >
                                  {task.status === 'pending' ? 'Start' : 'Complete'}
                                </Button>
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  )}
                </div>
              </TabsContent>

              <TabsContent value="files" className="flex-1 p-4">
                <div className="text-center text-gray-500 mt-8">
                  <FileText className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>File sharing coming soon</p>
                  <p className="text-sm">Share documents and files with suppliers</p>
                </div>
              </TabsContent>
            </Tabs>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center bg-gray-50">
            <div className="text-center text-gray-500">
              <Users className="h-16 w-16 mx-auto mb-4 opacity-50" />
              <h3 className="text-lg font-medium mb-2">Welcome to Collaboration Hub</h3>
              <p>Select a conversation to start collaborating with suppliers</p>
              <p className="text-sm mt-2">Create tasks, share files, and communicate in real-time</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}