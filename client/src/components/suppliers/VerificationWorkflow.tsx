import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  Shield, 
  CheckCircle, 
  AlertTriangle, 
  Eye, 
  Edit3,
  User,
  AlertCircle
} from "lucide-react";

interface ExtractedField {
  fieldName: string;
  extractedValue: any;
  confidence: number;
  source: 'auto' | 'manual';
  verified: boolean;
}

interface VerificationWorkflowProps {
  extractedFields: ExtractedField[];
  onVerificationComplete: (verifiedFields: ExtractedField[]) => void;
  disabled?: boolean;
}

export default function VerificationWorkflow({ 
  extractedFields, 
  onVerificationComplete, 
  disabled = false 
}: VerificationWorkflowProps) {
  const [fields, setFields] = useState<ExtractedField[]>(extractedFields);
  const [allVerified, setAllVerified] = useState(false);

  const handleFieldVerification = (index: number, verified: boolean) => {
    const updatedFields = [...fields];
    updatedFields[index].verified = verified;
    setFields(updatedFields);
  };

  const handleVerifyAll = () => {
    const updatedFields = fields.map(field => ({ ...field, verified: true }));
    setFields(updatedFields);
    setAllVerified(true);
  };

  const handleComplete = () => {
    onVerificationComplete(fields);
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return "text-green-600 bg-green-50 border-green-200";
    if (confidence >= 0.6) return "text-yellow-600 bg-yellow-50 border-yellow-200";
    return "text-orange-600 bg-orange-50 border-orange-200";
  };

  const getConfidenceLabel = (confidence: number) => {
    if (confidence >= 0.8) return "High Confidence";
    if (confidence >= 0.6) return "Medium Confidence";
    return "Low Confidence - Verify Carefully";
  };

  const verifiedCount = fields.filter(f => f.verified).length;
  const totalCount = fields.length;
  const verificationComplete = verifiedCount === totalCount;

  const autoExtractedFields = fields.filter(f => f.source === 'auto');
  const manualFields = fields.filter(f => f.source === 'manual');

  return (
    <Card className="border-2 border-blue-200 bg-blue-50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Shield className="w-5 h-5 text-blue-600" />
          Human Verification Required
        </CardTitle>
        <div className="text-sm text-gray-600">
          Please verify all extracted data before proceeding. This ensures accuracy and prevents errors in your product database.
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Verification Progress */}
        <div className="bg-white border rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-semibold text-gray-900">Verification Progress</h4>
            <span className="text-sm text-gray-600">
              {verifiedCount} of {totalCount} fields verified
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${(verifiedCount / totalCount) * 100}%` }}
            />
          </div>
          {verificationComplete && (
            <div className="mt-3 flex items-center gap-2 text-green-600">
              <CheckCircle className="w-4 h-4" />
              <span className="text-sm font-medium">All fields verified and ready to proceed</span>
            </div>
          )}
        </div>

        {/* Auto-extracted Fields Verification */}
        {autoExtractedFields.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-semibold text-gray-900 flex items-center gap-2">
                <Eye className="w-4 h-4" />
                Auto-Extracted Data ({autoExtractedFields.length} fields)
              </h4>
              <Button 
                variant="outline" 
                size="sm"
                onClick={handleVerifyAll}
                disabled={disabled || allVerified}
              >
                Verify All
              </Button>
            </div>

            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <strong>Please review each auto-extracted field carefully.</strong> Web scraping may not always be 100% accurate. 
                Verify all values match your actual product specifications before proceeding.
              </AlertDescription>
            </Alert>

            <div className="space-y-3">
              {autoExtractedFields.map((field, index) => (
                <div key={index} className="bg-white border rounded-lg p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h5 className="font-medium text-gray-900 capitalize">
                          {field.fieldName.replace(/([A-Z])/g, ' $1').trim()}
                        </h5>
                        <Badge 
                          variant="outline" 
                          className={getConfidenceColor(field.confidence)}
                        >
                          {getConfidenceLabel(field.confidence)}
                        </Badge>
                      </div>
                      <div className="text-sm text-gray-600">
                        <strong>Extracted Value:</strong> {
                          typeof field.extractedValue === 'object' 
                            ? JSON.stringify(field.extractedValue)
                            : field.extractedValue
                        }
                      </div>
                      {field.confidence < 0.6 && (
                        <div className="mt-2 text-xs text-orange-600 bg-orange-50 p-2 rounded">
                          <AlertCircle className="w-3 h-3 inline mr-1" />
                          Low confidence - please double-check this value carefully
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id={`verify-${index}`}
                        checked={field.verified}
                        onCheckedChange={(checked) => 
                          handleFieldVerification(index, checked as boolean)
                        }
                        disabled={disabled}
                      />
                      <label 
                        htmlFor={`verify-${index}`}
                        className="text-sm font-medium cursor-pointer"
                      >
                        Verified
                      </label>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Manual Fields */}
        {manualFields.length > 0 && (
          <div className="space-y-4">
            <h4 className="font-semibold text-gray-900 flex items-center gap-2">
              <User className="w-4 h-4" />
              Manual Entry ({manualFields.length} fields)
            </h4>
            <div className="space-y-3">
              {manualFields.map((field, index) => (
                <div key={index} className="bg-white border rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h5 className="font-medium text-gray-900 capitalize">
                        {field.fieldName.replace(/([A-Z])/g, ' $1').trim()}
                      </h5>
                      <div className="text-sm text-gray-600">
                        <strong>Manual Entry:</strong> {
                          typeof field.extractedValue === 'object' 
                            ? JSON.stringify(field.extractedValue)
                            : field.extractedValue
                        }
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id={`verify-manual-${index}`}
                        checked={field.verified}
                        onCheckedChange={(checked) => 
                          handleFieldVerification(autoExtractedFields.length + index, checked as boolean)
                        }
                        disabled={disabled}
                      />
                      <label 
                        htmlFor={`verify-manual-${index}`}
                        className="text-sm font-medium cursor-pointer"
                      >
                        Verified
                      </label>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="pt-4 border-t">
          <Alert className="mb-4">
            <Shield className="h-4 w-4" />
            <AlertDescription>
              <strong>By proceeding, you confirm that:</strong>
              <ul className="list-disc list-inside mt-2 space-y-1 text-sm">
                <li>All auto-extracted data has been reviewed for accuracy</li>
                <li>All values match your actual product specifications</li>
                <li>Any manual entries have been double-checked</li>
                <li>This data is ready to be saved to your product database</li>
              </ul>
            </AlertDescription>
          </Alert>

          <Button 
            onClick={handleComplete}
            disabled={disabled || !verificationComplete}
            className="w-full bg-green-600 hover:bg-green-700 text-white"
          >
            {verificationComplete ? (
              <>
                <CheckCircle className="w-4 h-4 mr-2" />
                Complete Verification & Proceed
              </>
            ) : (
              <>
                <AlertCircle className="w-4 h-4 mr-2" />
                Please verify all fields to continue
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}