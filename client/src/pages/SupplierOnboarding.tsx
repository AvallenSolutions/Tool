import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useLocation } from 'wouter';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, Building2, Mail, Phone, Globe, MapPin, Award, Loader2, AlertTriangle } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { apiRequest } from '@/lib/queryClient';

// Supplier onboarding form schema
const supplierOnboardingSchema = z.object({
  supplierName: z.string().min(1, 'Company name is required'),
  description: z.string().min(10, 'Description must be at least 10 characters'),
  website: z.string().url('Please enter a valid website URL').optional().or(z.literal('')),
  contactName: z.string().min(1, 'Contact name is required'),
  contactEmail: z.string().email('Please enter a valid email address'),
  contactPhone: z.string().min(1, 'Contact phone is required'),
  addressStreet: z.string().min(1, 'Street address is required'),
  addressCity: z.string().min(1, 'City is required'),
  addressCountry: z.string().min(1, 'Country is required'),
  certifications: z.array(z.string()).default([]),
});

type SupplierOnboardingForm = z.infer<typeof supplierOnboardingSchema>;

interface InvitationData {
  id: string;
  email: string;
  category: string;
  companyName: string;
  contactName?: string;
  message?: string;
}

export default function SupplierOnboarding() {
  const [, setLocation] = useLocation();
  const [invitationToken, setInvitationToken] = useState<string>('');
  const [newCertification, setNewCertification] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);

  // Extract token from URL parameters
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');
    if (token) {
      setInvitationToken(token);
    } else {
      // Redirect to home if no token provided
      setLocation('/');
    }
  }, [setLocation]);

  // Validate invitation token
  const { data: invitationData, isLoading, error } = useQuery<{ invitation: InvitationData }>({
    queryKey: ['/api/supplier-invitations/validate', invitationToken],
    enabled: Boolean(invitationToken),
    retry: false,
  });

  const form = useForm<SupplierOnboardingForm>({
    resolver: zodResolver(supplierOnboardingSchema),
    defaultValues: {
      supplierName: '',
      description: '',
      website: '',
      contactName: '',
      contactEmail: '',
      contactPhone: '',
      addressStreet: '',
      addressCity: '',
      addressCountry: '',
      certifications: [],
    },
  });

  // Pre-fill form with invitation data
  useEffect(() => {
    if (invitationData?.invitation) {
      form.setValue('supplierName', invitationData.invitation.companyName);
      form.setValue('contactEmail', invitationData.invitation.email);
      if (invitationData.invitation.contactName) {
        form.setValue('contactName', invitationData.invitation.contactName);
      }
    }
  }, [invitationData, form]);

  // Submit supplier onboarding
  const submitOnboarding = useMutation({
    mutationFn: async (data: SupplierOnboardingForm) => {
      const response = await fetch(`/api/supplier-invitations/accept/${invitationToken}`, {
        method: 'POST',
        body: JSON.stringify(data),
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      });
      
      if (!response.ok) {
        throw new Error('Failed to submit registration');
      }
      
      return response.json();
    },
    onSuccess: () => {
      setIsSubmitted(true);
    },
  });

  const handleAddCertification = () => {
    if (newCertification.trim()) {
      const currentCerts = form.getValues('certifications');
      form.setValue('certifications', [...currentCerts, newCertification.trim()]);
      setNewCertification('');
    }
  };

  const handleRemoveCertification = (index: number) => {
    const currentCerts = form.getValues('certifications');
    form.setValue('certifications', currentCerts.filter((_, i) => i !== index));
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-green-600" />
          <p className="text-gray-600">Validating invitation...</p>
        </div>
      </div>
    );
  }

  if (error || !invitationData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="max-w-md w-full mx-4">
          <CardContent className="p-6 text-center">
            <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Invalid Invitation</h2>
            <p className="text-gray-600 mb-4">
              This invitation link is invalid, expired, or has already been used.
            </p>
            <Button onClick={() => setLocation('/')}>
              Return to Home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="max-w-md w-full mx-4">
          <CardContent className="p-6 text-center">
            <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Registration Complete!</h2>
            <p className="text-gray-600 mb-4">
              Thank you for registering as a supplier. Your application is under review and you'll be notified once approved.
            </p>
            <Button onClick={() => setLocation('/')}>
              Return to Home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto py-8 px-4">
        {/* Header */}
        <div className="text-center mb-8">
          <Building2 className="h-12 w-12 text-green-600 mx-auto mb-4" />
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Supplier Onboarding</h1>
          <p className="text-gray-600 max-w-2xl mx-auto">
            Complete your registration to join our verified supplier network for {invitationData.invitation.category}.
          </p>
        </div>

        {/* Invitation Info */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="text-lg">Invitation Details</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label className="text-sm font-medium text-gray-700">Company</Label>
                <p className="text-gray-900">{invitationData.invitation.companyName}</p>
              </div>
              <div>
                <Label className="text-sm font-medium text-gray-700">Category</Label>
                <Badge variant="outline" className="text-green-700 border-green-200 bg-green-50">
                  {invitationData.invitation.category}
                </Badge>
              </div>
              <div>
                <Label className="text-sm font-medium text-gray-700">Email</Label>
                <p className="text-gray-900">{invitationData.invitation.email}</p>
              </div>
              {invitationData.invitation.message && (
                <div className="md:col-span-2">
                  <Label className="text-sm font-medium text-gray-700">Message</Label>
                  <p className="text-gray-900">{invitationData.invitation.message}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Onboarding Form */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Complete Your Registration</CardTitle>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit((data) => submitOnboarding.mutate(data))} className="space-y-6">
                {/* Company Information */}
                <div className="space-y-4">
                  <h3 className="text-lg font-medium text-gray-900">Company Information</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="supplierName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="flex items-center gap-2">
                            <Building2 className="h-4 w-4" />
                            Company Name
                          </FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="Your company name" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="website"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="flex items-center gap-2">
                            <Globe className="h-4 w-4" />
                            Website (Optional)
                          </FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="https://yourcompany.com" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Company Description</FormLabel>
                        <FormControl>
                          <Textarea 
                            {...field} 
                            placeholder="Describe your company, products, and services..."
                            className="min-h-[100px]"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Contact Information */}
                <div className="space-y-4">
                  <h3 className="text-lg font-medium text-gray-900">Contact Information</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="contactName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Contact Name</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="Primary contact person" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="contactEmail"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="flex items-center gap-2">
                            <Mail className="h-4 w-4" />
                            Contact Email
                          </FormLabel>
                          <FormControl>
                            <Input {...field} type="email" placeholder="contact@yourcompany.com" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <FormField
                    control={form.control}
                    name="contactPhone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2">
                          <Phone className="h-4 w-4" />
                          Contact Phone
                        </FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="+1 (555) 123-4567" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Address Information */}
                <div className="space-y-4">
                  <h3 className="text-lg font-medium text-gray-900">Address Information</h3>
                  <FormField
                    control={form.control}
                    name="addressStreet"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2">
                          <MapPin className="h-4 w-4" />
                          Street Address
                        </FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="123 Main Street" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="addressCity"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>City</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="City" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="addressCountry"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Country</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="Country" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                {/* Certifications */}
                <div className="space-y-4">
                  <h3 className="text-lg font-medium text-gray-900">Certifications (Optional)</h3>
                  <div className="flex gap-2">
                    <Input
                      value={newCertification}
                      onChange={(e) => setNewCertification(e.target.value)}
                      placeholder="Add certification (e.g., ISO 9001, Organic, Fair Trade)"
                      onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddCertification())}
                    />
                    <Button type="button" onClick={handleAddCertification} variant="outline">
                      <Award className="h-4 w-4 mr-2" />
                      Add
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {form.watch('certifications').map((cert, index) => (
                      <Badge
                        key={index}
                        variant="secondary"
                        className="cursor-pointer"
                        onClick={() => handleRemoveCertification(index)}
                      >
                        {cert} ×
                      </Badge>
                    ))}
                  </div>
                </div>

                {/* Submit */}
                <div className="flex gap-4">
                  <Button 
                    type="submit" 
                    disabled={submitOnboarding.isPending}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    {submitOnboarding.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Submitting...
                      </>
                    ) : (
                      'Complete Registration'
                    )}
                  </Button>
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setLocation('/')}
                  >
                    Cancel
                  </Button>
                </div>

                {submitOnboarding.error && (
                  <div className="text-sm text-red-600">
                    Error: {(submitOnboarding.error as any)?.message || 'Registration failed'}
                  </div>
                )}
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}