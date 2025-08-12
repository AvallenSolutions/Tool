import express from 'express';
import { ObjectStorageService } from '../objectStorage';

const router = express.Router();

/**
 * POST /api/objects/upload
 * Gets a presigned URL for uploading files to object storage
 */
router.post('/upload', async (req, res) => {
  try {
    const objectStorageService = new ObjectStorageService();
    const uploadURL = await objectStorageService.getObjectEntityUploadURL();
    
    res.json({ 
      success: true,
      uploadURL 
    });
  } catch (error) {
    console.error('Error getting upload URL:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to get upload URL',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/objects/:objectPath(*)
 * Serves uploaded objects from object storage
 */
router.get('/:objectPath(*)', async (req, res) => {
  try {
    const objectPath = `/objects/${req.params.objectPath}`;
    const objectStorageService = new ObjectStorageService();
    
    const objectFile = await objectStorageService.getObjectEntityFile(objectPath);
    await objectStorageService.downloadObject(objectFile, res);
  } catch (error) {
    console.error('Error serving object:', error);
    if (error instanceof Error && error.name === 'ObjectNotFoundError') {
      return res.status(404).json({ error: 'Object not found' });
    }
    res.status(500).json({ 
      error: 'Failed to serve object',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;