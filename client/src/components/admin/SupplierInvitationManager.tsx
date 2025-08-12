import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Mail, Plus, Building2, Calendar, CheckCircle, Clock, X, Copy, Loader2 } from 'lucide-react';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

const invitationSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  category: z.string().min(1, 'Please select a category'),
  companyName: z.string().min(1, 'Company name is required'),
  contactName: z.string().optional(),
  message: z.string().optional(),
});

type InvitationForm = z.infer<typeof invitationSchema>;

const SUPPLIER_CATEGORIES = [
  { value: 'ingredient_supplier', label: 'Ingredient Supplier' },
  { value: 'bottle_producer', label: 'Bottle Producer' },
  { value: 'closure_producer', label: 'Closure Producer' },
  { value: 'label_maker', label: 'Label Maker' },
  { value: 'packaging_supplier', label: 'Packaging Supplier' },
  { value: 'contract_distillery', label: 'Contract Distillery' },
  { value: 'contract_brewery', label: 'Contract Brewery' },
];

interface SupplierInvitation {
  id: string;
  email: string;
  category: string;
  companyName: string;
  contactName: string | null;
  message: string | null;
  status: 'pending' | 'accepted' | 'expired';
  invitationToken: string;
  createdAt: string;
  expiresAt: string;
  acceptedAt: string | null;
}

export function SupplierInvitationManager() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { toast } = useToast();

  const form = useForm<InvitationForm>({
    resolver: zodResolver(invitationSchema),
    defaultValues: {
      email: '',
      category: '',
      companyName: '',
      contactName: '',
      message: '',
    },
  });

  // Fetch all invitations
  const { data: invitations = [], isLoading } = useQuery<SupplierInvitation[]>({
    queryKey: ['/api/admin/supplier-invitations'],
  });

  // Create invitation mutation
  const createInvitation = useMutation({
    mutationFn: async (data: InvitationForm) => {
      const response = await fetch('/api/admin/supplier-invitations', {
        method: 'POST',
        body: JSON.stringify(data),
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      });
      
      if (!response.ok) {
        throw new Error('Failed to create invitation');
      }
      
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/supplier-invitations'] });
      setIsDialogOpen(false);
      form.reset();
      toast({
        title: 'Invitation Created',
        description: 'Supplier invitation has been created successfully.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: (error as any)?.message || 'Failed to create invitation',
        variant: 'destructive',
      });
    },
  });

  const handleSubmit = (data: InvitationForm) => {
    createInvitation.mutate(data);
  };

  const copyInvitationUrl = (token: string) => {
    const url = `${window.location.origin}/supplier-onboarding?token=${token}`;
    navigator.clipboard.writeText(url);
    toast({
      title: 'Copied!',
      description: 'Invitation URL copied to clipboard.',
    });
  };

  const getStatusBadge = (status: string, expiresAt: string) => {
    const isExpired = new Date() > new Date(expiresAt);
    
    if (status === 'accepted') {
      return <Badge className="bg-green-100 text-green-800"><CheckCircle className="h-3 w-3 mr-1" />Accepted</Badge>;
    }
    if (isExpired || status === 'expired') {
      return <Badge variant="destructive"><X className="h-3 w-3 mr-1" />Expired</Badge>;
    }
    return <Badge variant="outline"><Clock className="h-3 w-3 mr-1" />Pending</Badge>;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-semibold text-gray-900">Supplier Invitations</h2>
          <p className="text-gray-600">Invite new suppliers to join your network</p>
        </div>
        
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-green-600 hover:bg-green-700">
              <Plus className="h-4 w-4 mr-2" />
              Send Invitation
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5 text-green-600" />
                Send Supplier Invitation
              </DialogTitle>
            </DialogHeader>
            
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email Address</FormLabel>
                      <FormControl>
                        <Input {...field} type="email" placeholder="supplier@company.com" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Supplier Category</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select category" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {SUPPLIER_CATEGORIES.map((category) => (
                            <SelectItem key={category.value} value={category.value}>
                              {category.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="companyName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Company Name</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Company name" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="contactName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Contact Name (Optional)</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Contact person" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="message"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Message (Optional)</FormLabel>
                      <FormControl>
                        <Textarea 
                          {...field} 
                          placeholder="Custom message for the invitation..."
                          className="min-h-[80px]"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <div className="flex gap-2">
                  <Button 
                    type="submit" 
                    disabled={createInvitation.isPending}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    {createInvitation.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Sending...
                      </>
                    ) : (
                      'Send Invitation'
                    )}
                  </Button>
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setIsDialogOpen(false)}
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Invitations List */}
      <div className="space-y-4">
        {isLoading ? (
          <div className="text-center py-8">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-green-600" />
            <p className="text-gray-600">Loading invitations...</p>
          </div>
        ) : invitations.length === 0 ? (
          <Card>
            <CardContent className="text-center py-8">
              <Mail className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Invitations Yet</h3>
              <p className="text-gray-600 mb-4">Start by sending your first supplier invitation.</p>
              <Button onClick={() => setIsDialogOpen(true)} className="bg-green-600 hover:bg-green-700">
                <Plus className="h-4 w-4 mr-2" />
                Send First Invitation
              </Button>
            </CardContent>
          </Card>
        ) : (
          invitations.map((invitation) => (
            <Card key={invitation.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <Building2 className="h-5 w-5 text-gray-500" />
                      <h3 className="text-lg font-medium text-gray-900">{invitation.companyName}</h3>
                      {getStatusBadge(invitation.status, invitation.expiresAt)}
                    </div>
                    
                    <div className="space-y-1 text-sm text-gray-600">
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4" />
                        {invitation.email}
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">
                          {SUPPLIER_CATEGORIES.find(c => c.value === invitation.category)?.label || invitation.category}
                        </Badge>
                      </div>
                      {invitation.contactName && (
                        <div>Contact: {invitation.contactName}</div>
                      )}
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        Sent: {formatDate(invitation.createdAt)} • Expires: {formatDate(invitation.expiresAt)}
                      </div>
                      {invitation.acceptedAt && (
                        <div className="text-green-600">
                          Accepted: {formatDate(invitation.acceptedAt)}
                        </div>
                      )}
                    </div>
                    
                    {invitation.message && (
                      <div className="mt-2 p-2 bg-gray-50 rounded text-sm text-gray-700">
                        <strong>Message:</strong> {invitation.message}
                      </div>
                    )}
                  </div>
                  
                  <div className="ml-4">
                    {invitation.status === 'pending' && new Date() <= new Date(invitation.expiresAt) && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => copyInvitationUrl(invitation.invitationToken)}
                      >
                        <Copy className="h-4 w-4 mr-2" />
                        Copy Link
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}