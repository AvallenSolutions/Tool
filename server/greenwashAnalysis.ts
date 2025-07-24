import Anthropic from '@anthropic-ai/sdk';

// AI-powered GreenwashGuardian Analysis using Anthropic API
export async function analyzeGreenwashCompliance(type: string, content: string) {
  const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
  });

  const prompt = `You are an expert in the UK Digital Markets, Competition and Consumers Act 2024 (DMCC Act 2024) compliance, specifically analyzing environmental and sustainability claims for greenwashing violations.

Analyze the following ${type} content for DMCC Act 2024 compliance violations:

"""
${content}
"""

Extract specific environmental claims and provide detailed analysis. For each claim found, provide:

1. EXACT QUOTE: Extract the complete sentence containing the environmental claim
2. RISK LEVEL: Assign GREEN (compliant), AMBER (warning), or RED (critical) 
3. VIOLATION RISK: Percentage (0-100%)
4. ISSUE: Specific problem with the claim
5. SUGGESTED EDIT: Actionable recommendation
6. DMCC SECTION: Relevant DMCC Act section reference

Respond in this exact JSON format:
{
  "score": 0-100,
  "status": "compliant|warning|non-compliant", 
  "issues": [
    {
      "type": "compliant|warning|critical",
      "category": "category name",
      "claim": "exact quote from content",
      "description": "specific issue description",
      "solution": "actionable recommendation", 
      "violationRisk": 0-100,
      "dmccSection": "DMCC section reference"
    }
  ],
  "recommendations": ["overall recommendations"],
  "analysisDetails": {
    "contentType": "${type}",
    "totalClaims": 0,
    "highRiskIssues": 0,
    "substantiationLevel": "Low|Moderate|High",
    "dmccCompliance": "Compliant|Needs Attention|Non-Compliant"
  }
}

Key focus areas:
- Vague terms (sustainable, eco-friendly, green, natural) - quote the exact sentence
- Unsubstantiated claims (carbon neutral, climate positive) - quote the full claim
- Missing evidence or third-party verification
- Comparative claims without proper baselines - quote the comparison
- Specific measurable claims (quote them exactly and mark as compliant if well-substantiated)

Be precise and quote actual text from the content, not generic terms.`;

  try {
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 2000,
      messages: [{ role: 'user', content: prompt }],
    });

    const responseText = response.content[0].type === 'text' ? response.content[0].text : '';
    const aiAnalysis = JSON.parse(responseText);
    return aiAnalysis;
  } catch (error) {
    console.error('AI analysis failed:', error);
    // Simple fallback for basic pattern matching
    return {
      score: 50,
      status: 'warning',
      issues: [{
        type: 'warning',
        category: 'Analysis Error',
        claim: 'Unable to complete AI analysis',
        description: 'AI analysis service temporarily unavailable',
        solution: 'Please try again or provide text content directly',
        violationRisk: 50,
        dmccSection: 'General Compliance'
      }],
      recommendations: ['Retry analysis with AI service'],
      analysisDetails: {
        contentType: type,
        totalClaims: 1,
        highRiskIssues: 0,
        substantiationLevel: 'Low',
        dmccCompliance: 'Needs Review'
      }
    };
  }
}