import { Router } from 'express';
import { validateGreenwashAnalysis, handleValidationErrors } from '../../middleware/validation';
import { logger } from '../../config/logger';
import { analyzeGreenwashCompliance } from '../../greenwashAnalysis';

const router = Router();

// POST /api/greenwash-guardian/analyze - Analyze content for greenwashing
router.post('/analyze', validateGreenwashAnalysis, async (req: any, res: any) => {
  try {
    const { content, contentType = 'text' } = req.body;
    
    if (!content) {
      return res.status(400).json({ error: 'Content is required for analysis' });
    }
    
    const analysis = await analyzeGreenwashCompliance(contentType, content);
    
    res.json({
      success: true,
      analysis,
      contentType,
      analyzedAt: new Date().toISOString()
    });
    
    logger.info({ 
      contentType, 
      contentLength: content.length,
      riskLevel: analysis.riskLevel 
    }, 'Greenwash analysis completed');
    
  } catch (error) {
    logger.error({ 
      error, 
      route: '/api/greenwash-guardian/analyze',
      contentType: req.body.contentType 
    }, 'Failed to analyze content for greenwashing');
    
    res.status(500).json({ 
      error: 'Failed to analyze content',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// GET /api/greenwash-guardian/guidelines - Get greenwashing guidelines
router.get('/guidelines', async (req, res) => {
  try {
    const guidelines = {
      principles: [
        'Claims must be accurate and substantiated',
        'Avoid vague or ambiguous terms',
        'Provide clear evidence for environmental benefits',
        'Consider the full lifecycle impact',
        'Be transparent about limitations'
      ],
      redFlags: [
        'Unsubstantiated claims',
        'Vague language like "eco-friendly" without specifics',
        'Irrelevant green imagery',
        'Highlighting minor green attributes while ignoring major impacts',
        'False or misleading certifications'
      ],
      compliance: {
        framework: 'UK DMCC Act 2024',
        lastUpdated: '2025-01-18'
      }
    };
    
    res.json(guidelines);
    logger.info({}, 'Greenwashing guidelines requested');
    
  } catch (error) {
    logger.error({ error, route: '/api/greenwash-guardian/guidelines' }, 'Failed to fetch guidelines');
    res.status(500).json({ error: 'Failed to fetch guidelines' });
  }
});

export default router;