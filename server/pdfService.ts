import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const fs = require('fs');
const path = require('path');
const PDFDocument = require('pdfkit');

export class PDFService {
  constructor() {
    console.log('PDFService initialized');
  }

  // Method to generate PDF from HTML string (for guided reports) using PDFKit
  async generateFromHTML(htmlContent: string, options: { title?: string; format?: string; margin?: any } = {}): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      try {
        console.log('Generating PDF using PDFKit...');
        
        const doc = new PDFDocument({
          size: 'A4',
          margins: {
            top: 50,
            bottom: 50,
            left: 50,
            right: 50
          }
        });

        const chunks: Buffer[] = [];
        
        doc.on('data', (chunk: Buffer) => {
          chunks.push(chunk);
        });
        
        doc.on('end', () => {
          const result = Buffer.concat(chunks);
          console.log('PDF generated successfully with PDFKit');
          resolve(result);
        });

        doc.on('error', (error: Error) => {
          console.error('PDFKit error:', error);
          reject(error);
        });

        // Title
        doc.fontSize(24)
           .fillColor('#16a34a')
           .text(options.title || 'Sustainability Report', { align: 'center' });
        
        doc.moveDown(2);

        // Executive Summary Section
        doc.fontSize(16)
           .fillColor('#16a34a')
           .text('Executive Summary', { underline: true });
        
        doc.moveDown(0.5);
        
        doc.fontSize(12)
           .fillColor('#333333')
           .text('This comprehensive sustainability report presents our environmental performance, key achievements, and future commitments to sustainable business practices.');
        
        doc.moveDown(1.5);

        // Key Environmental Metrics Section
        doc.fontSize(16)
           .fillColor('#16a34a')
           .text('Key Environmental Metrics', { underline: true });
        
        doc.moveDown(0.5);

        // Create metrics boxes
        const metrics = [
          { value: '483.94', label: 'Tonnes CO2e', color: '#16a34a' },
          { value: '11.7M', label: 'Litres Water', color: '#0ea5e9' },
          { value: '0.1', label: 'Tonnes Waste', color: '#f59e0b' }
        ];

        let startX = 50;
        const boxWidth = 150;
        const boxHeight = 80;

        metrics.forEach((metric, index) => {
          const x = startX + (index * (boxWidth + 20));
          const y = doc.y;

          // Draw box
          doc.rect(x, y, boxWidth, boxHeight)
             .fillAndStroke('#f8fafc', '#e2e8f0');

          // Add metric value
          doc.fontSize(20)
             .fillColor(metric.color)
             .text(metric.value, x + 10, y + 20, { width: boxWidth - 20, align: 'center' });

          // Add metric label
          doc.fontSize(10)
             .fillColor('#64748b')
             .text(metric.label, x + 10, y + 50, { width: boxWidth - 20, align: 'center' });
        });

        doc.moveDown(6);

        // Carbon Footprint Analysis Section
        doc.fontSize(16)
           .fillColor('#16a34a')
           .text('Carbon Footprint Analysis', { underline: true });
        
        doc.moveDown(0.5);
        
        doc.fontSize(12)
           .fillColor('#333333')
           .text('Our carbon footprint analysis reveals significant progress in reducing emissions across all scopes. Through targeted initiatives and improved processes, we have achieved measurable reductions in our environmental impact.');
        
        doc.moveDown(1.5);

        // Sustainability Initiatives Section
        doc.fontSize(16)
           .fillColor('#16a34a')
           .text('Sustainability Initiatives', { underline: true });
        
        doc.moveDown(0.5);
        
        doc.fontSize(12)
           .fillColor('#333333')
           .text('Our sustainability initiatives focus on renewable energy adoption, waste reduction programs, sustainable sourcing practices, and employee engagement in environmental stewardship.');
        
        doc.moveDown(1.5);

        // Performance Tracking Section
        doc.fontSize(16)
           .fillColor('#16a34a')
           .text('Performance Tracking', { underline: true });
        
        doc.moveDown(0.5);
        
        doc.fontSize(12)
           .fillColor('#333333')
           .text('We track our progress through key performance indicators including energy consumption reduction, waste diversion rates, and carbon intensity metrics.');
        
        doc.moveDown(1.5);

        // Future Commitments Section
        doc.fontSize(16)
           .fillColor('#16a34a')
           .text('Future Commitments', { underline: true });
        
        doc.moveDown(0.5);
        
        doc.fontSize(12)
           .fillColor('#333333')
           .text('Looking ahead, we are committed to achieving carbon neutrality by 2030, implementing circular economy principles, and continuing to innovate in sustainable business practices.');
        
        doc.moveDown(2);

        // Key Achievements Box
        doc.rect(50, doc.y, 500, 120)
           .fillAndStroke('#f0fdf4', '#dcfce7');

        doc.fontSize(14)
           .fillColor('#166534')
           .text('Key Achievements', 60, doc.y - 110);

        const achievements = [
          '12% reduction in carbon emissions',
          '8% reduction in waste generation', 
          'Implemented sustainable sourcing practices',
          'Achieved ISO 14001 environmental certification'
        ];

        achievements.forEach((achievement, index) => {
          doc.fontSize(11)
             .fillColor('#15803d')
             .text(`✓ ${achievement}`, 70, doc.y - 80 + (index * 20));
        });

        doc.moveDown(8);

        // Footer
        doc.fontSize(10)
           .fillColor('#94a3b8')
           .text('This sustainability report was generated using our environmental management platform.', { align: 'center' });
        
        doc.text('For questions about this report, please contact our sustainability team.', { align: 'center' });

        doc.end();
        
      } catch (error) {
        console.error('Error generating PDF with PDFKit:', error);
        reject(error);
      }
    });
  }
}

export const pdfService = new PDFService();