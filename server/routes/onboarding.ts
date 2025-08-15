import type { Express, Request, Response } from "express";
import { body, validationResult } from "express-validator";
import { isAuthenticated } from "../replitAuth";
import { storage } from "../storage";

export function setupOnboardingRoutes(app: Express) {
  // PATCH /api/companies/update-onboarding - Update company with onboarding data
  app.patch('/api/companies/update-onboarding', 
    isAuthenticated,
    [
      body('primaryMotivation').optional().isString(),
      body('productCategory').optional().isString(),
      body('numberOfEmployees').optional().isString(),
      body('industry').optional().isString(),
      body('country').optional().isString(),
      body('onboardingComplete').optional().isBoolean(),
    ],
    async (req: Request, res: Response) => {
      try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
          return res.status(400).json({ error: 'Validation failed', details: errors.array() });
        }

        const user = req.user as any;
        if (!user?.claims?.sub) {
          return res.status(401).json({ error: 'User not authenticated' });
        }

        // Get company by owner ID
        const company = await storage.getCompanyByOwner(user.claims.sub);
        if (!company) {
          return res.status(400).json({ error: 'User not associated with a company' });
        }

        // Update company with onboarding data
        const updateData: any = {};
        
        if (req.body.primaryMotivation) updateData.primaryMotivation = req.body.primaryMotivation;
        if (req.body.industry) updateData.industry = req.body.industry;
        if (req.body.country) updateData.country = req.body.country;
        if (req.body.numberOfEmployees) updateData.size = req.body.numberOfEmployees; // Map to existing 'size' field
        if (req.body.onboardingComplete !== undefined) updateData.onboardingComplete = req.body.onboardingComplete;

        const updatedCompany = await storage.updateCompany(company.id, updateData);

        res.json({ 
          success: true, 
          company: updatedCompany 
        });
      } catch (error) {
        console.error('Error updating company onboarding:', error);
        res.status(500).json({ error: 'Failed to update company information' });
      }
    }
  );

  // GET /api/companies/current - Get current company information
  app.get('/api/companies/current', isAuthenticated, async (req, res) => {
    try {
      const user = req.user as any;
      if (!user?.claims?.sub) {
        return res.status(401).json({ error: 'User not authenticated' });
      }

      // Get company by owner ID
      const company = await storage.getCompanyByOwner(user.claims.sub);
      
      if (!company) {
        return res.status(404).json({ error: 'Company not found' });
      }

      res.json({ company });
    } catch (error) {
      console.error('Error getting current company:', error);
      res.status(500).json({ error: 'Failed to get company information' });
    }
  });
}