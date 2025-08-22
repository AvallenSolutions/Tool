import { useState } from 'react';
import { useParams, useLocation } from 'wouter';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { apiRequest, queryClient } from '@/lib/queryClient';
import Sidebar from '@/components/layout/sidebar';
import Header from '@/components/layout/header';
import { 
  ArrowLeft,
  User,
  Building2,
  CheckCircle,
  AlertTriangle,
  Clock,
  MessageSquare,
  FileText,
  TrendingUp,
  Calendar,
  Mail,
  Send,
  Upload,
  Eye,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Download,
  Edit3,
  Paperclip
} from 'lucide-react';

interface ProfileCompletenessData {
  companyId: number;
  companyName: string;
  ownerName: string;
  ownerEmail: string;
  overallCompleteness: number;
  sections: {
    companyProfile: {
      completeness: number;
      missing: string[];
    };
    products: {
      completeness: number;
      totalProducts: number;
      productsWithLCA: number;
      missing: string[];
    };
    carbonFootprint: {
      completeness: number;
      scope1Complete: boolean;
      scope2Complete: boolean;
      scope3Complete: boolean;
      missing: string[];
    };
    reports: {
      completeness: number;
      totalReports: number;
      approvedReports: number;
      missing: string[];
    };
  };
  lastActivity: string;
  onboardingComplete: boolean;
}

interface ProfileResponse {
  success: boolean;
  data: ProfileCompletenessData;
}

// Internal Messaging Component
function InternalMessagingComponent({ companyId }: { companyId: string }) {
  const [newMessage, setNewMessage] = useState({ subject: '', message: '', priority: 'normal' });
  const { toast } = useToast();

  // Fetch messages for this company
  const { data: messagesResponse, isLoading } = useQuery({
    queryKey: ['/api/messages', companyId],
    queryFn: async () => {
      const response = await fetch(`/api/messages/${companyId}`);
      return response.json();
    },
  });

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: async (messageData: any) => {
      const response = await apiRequest('POST', '/api/messages', messageData);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/messages', companyId] });
      setNewMessage({ subject: '', message: '', priority: 'normal' });
      toast({
        title: 'Message Sent',
        description: 'Your message has been sent successfully.',
      });
    },
    onError: () => {
      toast({
        title: 'Failed to Send',
        description: 'There was an error sending your message.',
        variant: 'destructive',
      });
    },
  });

  const handleSendMessage = () => {
    if (!newMessage.subject.trim() || !newMessage.message.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Subject and message are required.',
        variant: 'destructive',
      });
      return;
    }

    sendMessageMutation.mutate({
      companyId: parseInt(companyId),
      fromUserId: '44886248', // Admin user ID
      toUserId: 'user-123', // Company user ID (would be dynamic in real implementation)
      subject: newMessage.subject,
      message: newMessage.message,
      priority: newMessage.priority,
      messageType: 'general',
    });
  };

  const messages = messagesResponse?.data || [];

  return (
    <div className="space-y-6">
      {/* Send New Message */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Send className="h-5 w-5" />
            Send Message
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium">Subject</label>
            <Input
              placeholder="Message subject..."
              value={newMessage.subject}
              onChange={(e) => setNewMessage({ ...newMessage, subject: e.target.value })}
              data-testid="input-message-subject"
            />
          </div>
          <div>
            <label className="text-sm font-medium">Priority</label>
            <Select
              value={newMessage.priority}
              onValueChange={(value) => setNewMessage({ ...newMessage, priority: value })}
            >
              <SelectTrigger data-testid="select-message-priority">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="normal">Normal</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="urgent">Urgent</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-sm font-medium">Message</label>
            <Textarea
              placeholder="Type your message here..."
              rows={4}
              value={newMessage.message}
              onChange={(e) => setNewMessage({ ...newMessage, message: e.target.value })}
              data-testid="textarea-message-content"
            />
          </div>
          <Button 
            onClick={handleSendMessage}
            disabled={sendMessageMutation.isPending}
            className="flex items-center gap-2"
            data-testid="button-send-message"
          >
            <Send className="h-4 w-4" />
            {sendMessageMutation.isPending ? 'Sending...' : 'Send Message'}
          </Button>
        </CardContent>
      </Card>

      {/* Message History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Message History
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin w-6 h-6 border-2 border-avallen-green border-t-transparent rounded-full mx-auto mb-4" />
              <p className="text-muted-foreground">Loading messages...</p>
            </div>
          ) : messages.length > 0 ? (
            <div className="space-y-4">
              {messages.map((message: any) => (
                <div key={message.id} className="border rounded-lg p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h4 className="font-medium">{message.subject}</h4>
                      <p className="text-sm text-muted-foreground">
                        From: {message.fromUserId} • {new Date(message.createdAt).toLocaleString()}
                      </p>
                    </div>
                    <Badge variant={message.priority === 'urgent' ? 'destructive' : 'secondary'}>
                      {message.priority}
                    </Badge>
                  </div>
                  <p className="text-sm">{message.message}</p>
                  {!message.isRead && (
                    <Badge variant="secondary" className="mt-2">Unread</Badge>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No messages yet. Start a conversation!</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// Document Review Component
function DocumentReviewComponent({ companyId }: { companyId: string }) {
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [documentType, setDocumentType] = useState('general');
  const { toast } = useToast();

  // Fetch documents for this company
  const { data: documentsResponse, isLoading } = useQuery({
    queryKey: ['/api/documents', companyId],
    queryFn: async () => {
      const response = await fetch(`/api/documents/${companyId}`);
      return response.json();
    },
  });

  // Upload document mutation
  const uploadMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      const response = await fetch('/api/documents/upload', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/documents', companyId] });
      setUploadFile(null);
      setDocumentType('general');
      toast({
        title: 'Document Uploaded',
        description: 'Document has been uploaded for review.',
      });
    },
    onError: () => {
      toast({
        title: 'Upload Failed',
        description: 'There was an error uploading your document.',
        variant: 'destructive',
      });
    },
  });

  // Review document mutation
  const reviewMutation = useMutation({
    mutationFn: async ({ documentId, reviewData }: { documentId: number; reviewData: any }) => {
      const response = await apiRequest('PATCH', `/api/documents/${documentId}/review`, reviewData);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/documents', companyId] });
      toast({
        title: 'Review Updated',
        description: 'Document review has been updated.',
      });
    },
  });

  const handleUpload = () => {
    if (!uploadFile) {
      toast({
        title: 'No File Selected',
        description: 'Please select a file to upload.',
        variant: 'destructive',
      });
      return;
    }

    const formData = new FormData();
    formData.append('document', uploadFile);
    formData.append('companyId', companyId);
    formData.append('documentType', documentType);

    uploadMutation.mutate(formData);
  };

  const handleReview = (documentId: number, status: string, comments?: string) => {
    reviewMutation.mutate({
      documentId,
      reviewData: {
        status,
        reviewComments: comments,
        reviewNotes: []
      }
    });
  };

  const documents = documentsResponse?.data || [];

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved':
        return <CheckCircle2 className="h-4 w-4 text-green-600" />;
      case 'rejected':
        return <XCircle className="h-4 w-4 text-red-600" />;
      case 'in_review':
        return <Eye className="h-4 w-4 text-blue-600" />;
      default:
        return <Clock className="h-4 w-4 text-orange-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'bg-green-100 text-green-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      case 'in_review': return 'bg-blue-100 text-blue-800';
      default: return 'bg-orange-100 text-orange-800';
    }
  };

  return (
    <div className="space-y-6">
      {/* Upload Document */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Upload Document for Review
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium">Document Type</label>
            <Select value={documentType} onValueChange={setDocumentType}>
              <SelectTrigger data-testid="select-document-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="general">General Document</SelectItem>
                <SelectItem value="sustainability_report">Sustainability Report</SelectItem>
                <SelectItem value="lca_report">LCA Report</SelectItem>
                <SelectItem value="certificate">Certificate</SelectItem>
                <SelectItem value="policy">Policy Document</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-sm font-medium">Select File</label>
            <Input
              type="file"
              onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
              accept=".pdf,.doc,.docx,.xls,.xlsx"
              data-testid="input-document-upload"
            />
          </div>
          <Button 
            onClick={handleUpload}
            disabled={uploadMutation.isPending || !uploadFile}
            className="flex items-center gap-2"
            data-testid="button-upload-document"
          >
            <Upload className="h-4 w-4" />
            {uploadMutation.isPending ? 'Uploading...' : 'Upload Document'}
          </Button>
        </CardContent>
      </Card>

      {/* Document List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Documents for Review
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin w-6 h-6 border-2 border-avallen-green border-t-transparent rounded-full mx-auto mb-4" />
              <p className="text-muted-foreground">Loading documents...</p>
            </div>
          ) : documents.length > 0 ? (
            <div className="space-y-4">
              {documents.map((doc: any) => (
                <div key={doc.id} className="border rounded-lg p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <h4 className="font-medium flex items-center gap-2">
                        <FileText className="h-4 w-4" />
                        {doc.documentName}
                      </h4>
                      <p className="text-sm text-muted-foreground">
                        Type: {doc.documentType} • Size: {(doc.fileSize / 1024 / 1024).toFixed(2)} MB
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Submitted: {new Date(doc.submittedAt).toLocaleString()}
                      </p>
                    </div>
                    <Badge className={`${getStatusColor(doc.status)} flex items-center gap-1`}>
                      {getStatusIcon(doc.status)}
                      {doc.status.replace('_', ' ')}
                    </Badge>
                  </div>

                  {doc.reviewComments && (
                    <div className="mb-3 p-3 bg-gray-50 rounded">
                      <p className="text-sm font-medium">Review Comments:</p>
                      <p className="text-sm">{doc.reviewComments}</p>
                    </div>
                  )}

                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex items-center gap-1"
                      onClick={() => window.open(doc.documentUrl, '_blank')}
                      data-testid={`button-view-document-${doc.id}`}
                    >
                      <Eye className="h-3 w-3" />
                      View
                    </Button>
                    
                    {doc.status === 'pending' && (
                      <>
                        <Button
                          size="sm"
                          className="flex items-center gap-1 bg-green-600 hover:bg-green-700"
                          onClick={() => handleReview(doc.id, 'approved', 'Document approved by admin')}
                          disabled={reviewMutation.isPending}
                          data-testid={`button-approve-document-${doc.id}`}
                        >
                          <CheckCircle2 className="h-3 w-3" />
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          className="flex items-center gap-1"
                          onClick={() => handleReview(doc.id, 'rejected', 'Document requires revision')}
                          disabled={reviewMutation.isPending}
                          data-testid={`button-reject-document-${doc.id}`}
                        >
                          <XCircle className="h-3 w-3" />
                          Reject
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No documents submitted yet.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function UserDetail() {
  const { companyId } = useParams();
  const [, navigate] = useLocation();
  const [activeTab, setActiveTab] = useState('overview');

  const { data: profileResponse, isLoading, error } = useQuery<ProfileResponse>({
    queryKey: ['/api/admin/users', companyId],
    queryFn: async () => {
      if (!companyId) throw new Error('Company ID is required');
      
      const response = await fetch(`/api/admin/users/${companyId}`);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      return response.json();
    },
    enabled: !!companyId,
    refetchInterval: 30000,
  });

  const profile = profileResponse?.data;

  const getCompletenessColor = (completeness: number) => {
    if (completeness >= 80) return 'text-green-600';
    if (completeness >= 50) return 'text-orange-600';
    return 'text-red-600';
  };

  const getProgressColor = (completeness: number) => {
    if (completeness >= 80) return 'bg-green-500';
    if (completeness >= 50) return 'bg-orange-500';
    return 'bg-red-500';
  };

  const getSectionIcon = (completeness: number) => {
    if (completeness >= 80) return <CheckCircle className="h-5 w-5 text-green-600" />;
    if (completeness >= 50) return <Clock className="h-5 w-5 text-orange-600" />;
    return <AlertTriangle className="h-5 w-5 text-red-600" />;
  };

  if (isLoading) {
    return (
      <div className="flex h-screen bg-lightest-gray">
        <Sidebar />
        <div className="flex-1 flex flex-col">
          <Header title="User Profile" subtitle="Loading user details..." />
          <main className="flex-1 p-6 overflow-y-auto">
            <div className="space-y-6">
              <div className="animate-pulse">
                <div className="h-8 bg-gray-200 rounded w-64 mb-4"></div>
                <div className="grid gap-4 md:grid-cols-3">
                  {[...Array(3)].map((_, i) => (
                    <Card key={i}>
                      <CardContent className="p-6">
                        <div className="h-4 bg-gray-200 rounded mb-2"></div>
                        <div className="h-8 bg-gray-200 rounded"></div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            </div>
          </main>
        </div>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="flex h-screen bg-lightest-gray">
        <Sidebar />
        <div className="flex-1 flex flex-col">
          <Header title="User Profile" subtitle="Error loading user details" />
          <main className="flex-1 p-6 overflow-y-auto">
            <div className="space-y-6">
              <Button 
                variant="outline" 
                onClick={() => navigate('/app/admin/users')}
                className="flex items-center gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to User Management
              </Button>
              
              <Card className="border-red-200 bg-red-50">
                <CardContent className="p-6">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-red-600" />
                    <div>
                      <h3 className="font-medium text-red-800">User Not Found</h3>
                      <p className="text-sm text-red-700 mt-1">
                        The user profile could not be loaded. The company may not exist or you may not have permission to view it.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-lightest-gray">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header 
          title={`${profile.companyName} Profile`}
          subtitle={`Detailed user profile and completeness analysis for ${profile.ownerName}`}
        />
        <main className="flex-1 p-6 overflow-y-auto">
          <div className="space-y-6">
            {/* Navigation */}
            <Button 
              variant="outline" 
              onClick={() => navigate('/app/admin/users')}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to User Management
            </Button>

            {/* User Header */}
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-avallen-green/10 rounded-lg">
                      <Building2 className="h-8 w-8 text-avallen-green" />
                    </div>
                    <div>
                      <h1 className="text-2xl font-bold">{profile.companyName}</h1>
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <User className="h-4 w-4" />
                        <span>{profile.ownerName}</span>
                        <Mail className="h-4 w-4 ml-2" />
                        <span>{profile.ownerEmail}</span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-3xl font-bold text-avallen-green">
                      {profile.overallCompleteness}%
                    </div>
                    <div className="text-sm text-muted-foreground">Overall Completeness</div>
                    {profile.onboardingComplete ? (
                      <Badge className="mt-2 bg-green-100 text-green-800">
                        Onboarding Complete
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="mt-2">
                        Onboarding In Progress
                      </Badge>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Tabbed Interface */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="overview" className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4" />
                  Profile Overview
                </TabsTrigger>
                <TabsTrigger value="messaging" className="flex items-center gap-2">
                  <MessageSquare className="w-4 h-4" />
                  Internal Messaging
                </TabsTrigger>
                <TabsTrigger value="documents" className="flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  Document Review
                </TabsTrigger>
              </TabsList>

              {/* Profile Overview Tab */}
              <TabsContent value="overview" className="space-y-6">
                {/* Profile Completeness Section */}
                <Card>
                  <CardHeader>
                    <CardTitle>Profile Completeness Analysis</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* Overall Progress */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-lg font-medium">Overall Progress</span>
                        <span className={`text-lg font-bold ${getCompletenessColor(profile.overallCompleteness)}`}>
                          {profile.overallCompleteness}%
                        </span>
                      </div>
                      <Progress 
                        value={profile.overallCompleteness} 
                        className="h-3"
                      />
                    </div>

                    {/* Section Breakdowns */}
                    <div className="grid gap-4 md:grid-cols-2">
                      {/* Company Profile */}
                      <Card className="border-l-4 border-l-blue-500">
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              {getSectionIcon(profile.sections.companyProfile.completeness)}
                              <span className="font-medium">Company Profile</span>
                            </div>
                            <span className={`font-bold ${getCompletenessColor(profile.sections.companyProfile.completeness)}`}>
                              {profile.sections.companyProfile.completeness}%
                            </span>
                          </div>
                          <Progress 
                            value={profile.sections.companyProfile.completeness} 
                            className="h-2 mb-2"
                          />
                          {profile.sections.companyProfile.missing.length > 0 && (
                            <div className="text-sm text-muted-foreground">
                              <span className="font-medium">Missing:</span>
                              <ul className="list-disc list-inside mt-1">
                                {profile.sections.companyProfile.missing.map((item, index) => (
                                  <li key={index}>{item}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </CardContent>
                      </Card>

                      {/* Products */}
                      <Card className="border-l-4 border-l-green-500">
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              {getSectionIcon(profile.sections.products.completeness)}
                              <span className="font-medium">Products & LCA</span>
                            </div>
                            <span className={`font-bold ${getCompletenessColor(profile.sections.products.completeness)}`}>
                              {profile.sections.products.completeness}%
                            </span>
                          </div>
                          <Progress 
                            value={profile.sections.products.completeness} 
                            className="h-2 mb-2"
                          />
                          <div className="text-sm text-muted-foreground">
                            <div>{profile.sections.products.totalProducts} products, {profile.sections.products.productsWithLCA} with LCA</div>
                            {profile.sections.products.missing.length > 0 && (
                              <div className="mt-1">
                                <span className="font-medium">Issues:</span>
                                <ul className="list-disc list-inside">
                                  {profile.sections.products.missing.map((item, index) => (
                                    <li key={index}>{item}</li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </Card>

                      {/* Carbon Footprint */}
                      <Card className="border-l-4 border-l-orange-500">
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              {getSectionIcon(profile.sections.carbonFootprint.completeness)}
                              <span className="font-medium">Carbon Footprint</span>
                            </div>
                            <span className={`font-bold ${getCompletenessColor(profile.sections.carbonFootprint.completeness)}`}>
                              {profile.sections.carbonFootprint.completeness}%
                            </span>
                          </div>
                          <Progress 
                            value={profile.sections.carbonFootprint.completeness} 
                            className="h-2 mb-2"
                          />
                          <div className="text-sm text-muted-foreground">
                            <div className="flex gap-4">
                              <span>Scope 1: {profile.sections.carbonFootprint.scope1Complete ? '✓' : '✗'}</span>
                              <span>Scope 2: {profile.sections.carbonFootprint.scope2Complete ? '✓' : '✗'}</span>
                              <span>Scope 3: {profile.sections.carbonFootprint.scope3Complete ? '✓' : '✗'}</span>
                            </div>
                            {profile.sections.carbonFootprint.missing.length > 0 && (
                              <div className="mt-1">
                                <span className="font-medium">Missing:</span>
                                <ul className="list-disc list-inside">
                                  {profile.sections.carbonFootprint.missing.map((item, index) => (
                                    <li key={index}>{item}</li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </Card>

                      {/* Reports */}
                      <Card className="border-l-4 border-l-purple-500">
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              {getSectionIcon(profile.sections.reports.completeness)}
                              <span className="font-medium">Reports</span>
                            </div>
                            <span className={`font-bold ${getCompletenessColor(profile.sections.reports.completeness)}`}>
                              {profile.sections.reports.completeness}%
                            </span>
                          </div>
                          <Progress 
                            value={profile.sections.reports.completeness} 
                            className="h-2 mb-2"
                          />
                          <div className="text-sm text-muted-foreground">
                            <div>{profile.sections.reports.totalReports} reports, {profile.sections.reports.approvedReports} approved</div>
                            {profile.sections.reports.missing.length > 0 && (
                              <div className="mt-1">
                                <span className="font-medium">Issues:</span>
                                <ul className="list-disc list-inside">
                                  {profile.sections.reports.missing.map((item, index) => (
                                    <li key={index}>{item}</li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    </div>

                    {/* Last Activity */}
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Calendar className="h-4 w-4" />
                      <span>Last activity: {new Date(profile.lastActivity).toLocaleString()}</span>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Internal Messaging Tab */}
              <TabsContent value="messaging" className="space-y-6">
                <InternalMessagingComponent companyId={companyId!} />
              </TabsContent>

              {/* Document Review Tab */}
              <TabsContent value="documents" className="space-y-6">
                <DocumentReviewComponent companyId={companyId!} />
              </TabsContent>
            </Tabs>
          </div>
        </main>
      </div>
    </div>
  );
}