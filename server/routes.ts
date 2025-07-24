import type { Express } from "express";
import { createServer, type Server } from "http";
import path from "path";
import fs from "fs";
import Stripe from "stripe";
import passport from "passport";
import { storage as dbStorage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { insertCompanySchema, insertProductSchema, insertSupplierSchema, insertUploadedDocumentSchema, insertLcaQuestionnaireSchema, companies, reports } from "@shared/schema";
import { db } from "./db";
import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import multer from "multer";
import { extractUtilityData, analyzeDocument } from "./anthropic";
import { lcaService, LCAJobManager } from "./lca";
import { PDFService } from "./pdfService";
import { WebScrapingService } from "./services/WebScrapingService";
import { PDFExtractionService } from "./services/PDFExtractionService";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
  apiVersion: "2024-11-20.acacia",
});

// Configure multer for file uploads
const upload = multer({ dest: 'uploads/' });

export function registerRoutes(app: Express): Server {
  // Authentication routes
  setupAuth(app);

  app.use(passport.initialize());
  app.use(passport.session());

  // GreenwashGuardian API Routes - AI-powered analysis
  app.post('/api/greenwash-guardian/analyze', async (req, res) => {
    try {
      const { type, content } = req.body;

      if (!type || !content || !['website', 'text'].includes(type)) {
        return res.status(400).json({ 
          error: 'Valid type (website or text) and content are required' 
        });
      }

      console.log(`Starting ${type} analysis for GreenwashGuardian`);
      console.log(`Content to analyze: "${content.substring(0, 100)}..."`);
      
      let analysisContent = content;
      
      // If analyzing a website, scrape the content first
      if (type === 'website' && content.includes('.')) {
        try {
          // Add protocol if missing
          const url = content.startsWith('http') ? content : `https://${content}`;
          console.log(`Scraping website content from: ${url}`);
          
          const response = await fetch(url, {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
          });
          
          if (response.ok) {
            const html = await response.text();
            const cheerio = await import('cheerio');
            const $ = cheerio.load(html);
            
            // Remove script and style elements
            $('script, style, nav, footer, .navigation, .menu').remove();
            
            // Extract main content text
            const textContent = $('body').text()
              .replace(/\s+/g, ' ')
              .trim()
              .substring(0, 10000); // Limit to 10k chars for analysis
            
            if (textContent.length > 100) {
              analysisContent = textContent;
              console.log(`Successfully scraped ${analysisContent.length} characters from website`);
            } else {
              console.log('Insufficient content scraped, using URL as fallback');
            }
          } else {
            console.log(`Website not accessible (${response.status}), analyzing URL text instead`);
          }
        } catch (error) {
          console.log(`Website scraping error, analyzing URL text instead:`, error.message);
        }
      }
      
      // AI-powered analysis using Anthropic API
      const Anthropic = (await import('@anthropic-ai/sdk')).default;
      const anthropic = new Anthropic({
        apiKey: process.env.ANTHROPIC_API_KEY,
      });

      const prompt = `You are an expert in the UK Digital Markets, Competition and Consumers Act 2024 (DMCC Act 2024) compliance, specifically analyzing environmental and sustainability claims for greenwashing violations.

Analyze the following ${type} content for DMCC Act 2024 compliance violations:

"""
${analysisContent}
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

      const response = await anthropic.messages.create({
        model: "claude-sonnet-4-20250514",
        max_tokens: 2000,
        messages: [{ role: 'user', content: prompt }],
      });

      const responseText = response.content[0].type === 'text' ? response.content[0].text : '';
      
      // Extract JSON from AI response - handle markdown code blocks
      let cleanedJson = responseText;
      
      // Remove all markdown code block markers
      cleanedJson = cleanedJson.replace(/```json/gi, '').replace(/```/g, '').trim();
      
      // Extract JSON object by finding the first { and last }
      const jsonStart = cleanedJson.indexOf('{');
      const jsonEnd = cleanedJson.lastIndexOf('}');
      
      if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
        cleanedJson = cleanedJson.substring(jsonStart, jsonEnd + 1);
      }
      
      console.log('Attempting to parse JSON:', cleanedJson.substring(0, 500) + '...');
      
      let result;
      try {
        result = JSON.parse(cleanedJson);
      } catch (parseError) {
        console.error('JSON parse failed, trying alternative approach:', parseError.message);
        
        // Fallback: try to find valid JSON more aggressively
        const jsonMatches = responseText.match(/\{[\s\S]*\}/);
        if (jsonMatches && jsonMatches[0]) {
          try {
            result = JSON.parse(jsonMatches[0]);
          } catch (secondError) {
            console.error('Secondary JSON parse also failed:', secondError.message);
            throw new Error('Could not parse AI response as JSON');
          }
        } else {
          throw new Error('No valid JSON found in AI response');
        }
      }
      
      // Validate and enhance the AI result
      if (!result || typeof result !== 'object') {
        throw new Error('Invalid AI response structure');
      }
      
      // Ensure required fields exist
      result.score = result.score || 50;
      result.status = result.status || 'warning';
      result.issues = result.issues || [];
      result.recommendations = result.recommendations || [];
      result.analysisDetails = result.analysisDetails || {
        contentType: type,
        totalClaims: 0,
        highRiskIssues: 0,
        substantiationLevel: 'Low',
        dmccCompliance: 'Needs Review'
      };

      console.log(`Analysis result:`, JSON.stringify(result, null, 2));
      console.log(`Issues found: ${result.issues?.length || 0}`);
      console.log(`Successfully completed GreenwashGuardian analysis with AI`);
      
      res.json(result);
    } catch (error) {
      console.error('GreenwashGuardian AI analysis error:', error);
      
      // Fallback response with error indication
      res.status(500).json({
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
        recommendations: ['Please try again later or ensure valid content is provided'],
        analysisDetails: {
          contentType: 'error',
          totalClaims: 1,
          highRiskIssues: 0,
          substantiationLevel: 'Low',
          dmccCompliance: 'Needs Review'
        },
        error: 'AI analysis service error'
      });
    }
  });

  const server = createServer(app);
  
  return server;
}