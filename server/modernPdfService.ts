import PDFDocument from 'pdfkit';

export class ModernPDFService {
  private readonly colors = {
    primary: '#10b981',      // Green
    secondary: '#6366f1',    // Indigo  
    accent: '#f59e0b',       // Amber
    text: {
      primary: '#1f2937',    // Dark gray
      secondary: '#6b7280',  // Medium gray
      light: '#9ca3af'       // Light gray
    },
    background: {
      white: '#ffffff',
      light: '#f9fafb',
      section: '#f8fafc'
    },
    social: '#7c3aed'        // Purple for social impact
  };

  private readonly fonts = {
    heading: 'Helvetica-Bold',
    subheading: 'Helvetica-Bold', 
    body: 'Helvetica',
    caption: 'Helvetica'
  };

  constructor() {
    console.log('ModernPDFService initialized');
  }

  async generateModernReport(
    title: string, 
    reportContent: any, 
    sustainabilityData?: any,
    companyName: string = 'Demo Company'
  ): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      try {
        console.log('Generating modern PDF using PDFKit...');
        
        const doc = new PDFDocument({
          size: 'A4',
          margins: {
            top: 60,
            bottom: 60,
            left: 60,
            right: 60
          },
          info: {
            Title: title,
            Author: 'Sustainability Platform',
            Subject: 'Comprehensive Sustainability Report',
            Keywords: 'sustainability, environment, carbon footprint, ESG'
          }
        });

        const chunks: Buffer[] = [];
        
        doc.on('data', (chunk: Buffer) => {
          chunks.push(chunk);
        });
        
        doc.on('end', () => {
          const result = Buffer.concat(chunks);
          console.log('Modern PDF generated successfully with PDFKit');
          resolve(result);
        });

        doc.on('error', (error: Error) => {
          console.error('PDFKit error:', error);
          reject(error);
        });

        const socialData = sustainabilityData?.socialData || {};

        this.generateModernReportPages(doc, title, reportContent, socialData, companyName);

        doc.end();
      } catch (error) {
        console.error('Error generating modern PDF:', error);
        reject(error);
      }
    });
  }

  private generateModernReportPages(
    doc: PDFKit.PDFDocument, 
    title: string, 
    content: any, 
    socialData: any,
    companyName: string
  ) {
    // Page 1: Cover Page
    this.generateCoverPage(doc, title, companyName);
    
    // Page 2: Executive Summary
    if (content.summary || content.introduction) {
      doc.addPage();
      this.generateExecutiveSummary(doc, content);
    }
    
    // Page 3: Company Information  
    if (content.company_info_narrative) {
      doc.addPage();
      this.generateCompanySection(doc, content, companyName);
    }
    
    // Page 4: Environmental Metrics
    if (content.key_metrics_narrative) {
      doc.addPage();
      this.generateEnvironmentalMetrics(doc, content);
    }
    
    // Page 5: Carbon Footprint Analysis
    if (content.carbon_footprint_narrative) {
      doc.addPage();
      this.generateCarbonFootprint(doc, content);
    }
    
    // Page 6: Sustainability Initiatives
    if (content.initiatives_narrative) {
      doc.addPage();
      this.generateInitiatives(doc, content);
    }
    
    // Page 7: Social Impact & Community
    if (content.social_impact) {
      doc.addPage();
      this.generateSocialImpact(doc, content, socialData);
    }
    
    // Page 8: Performance Tracking & Future Goals
    if (content.kpi_tracking_narrative || content.summary) {
      doc.addPage();
      this.generatePerformanceAndGoals(doc, content);
    }
  }

  private generateCoverPage(doc: PDFKit.PDFDocument, title: string, companyName: string) {
    const pageWidth = doc.page.width;
    const pageHeight = doc.page.height;
    
    // Header gradient bar
    doc.rect(0, 0, pageWidth, 120)
       .fill(this.colors.primary);
    
    // Title
    doc.fontSize(32)
       .font(this.fonts.heading)
       .fillColor(this.colors.background.white)
       .text(title, 60, 40, { 
         width: pageWidth - 120, 
         align: 'center' 
       });
    
    // Subtitle
    doc.fontSize(16)
       .font(this.fonts.body)
       .fillColor(this.colors.background.white)
       .text('Comprehensive Environmental & Social Impact Report', 60, 85, {
         width: pageWidth - 120,
         align: 'center'
       });
    
    // Company name (center of page)
    doc.fontSize(24)
       .font(this.fonts.heading)
       .fillColor(this.colors.text.primary)
       .text(companyName, 60, pageHeight / 2 - 50, {
         width: pageWidth - 120,
         align: 'center'
       });
    
    // Report period
    const currentDate = new Date().toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
    
    doc.fontSize(14)
       .font(this.fonts.body)
       .fillColor(this.colors.text.secondary)
       .text(`Reporting Period: ${currentDate}`, 60, pageHeight / 2, {
         width: pageWidth - 120,
         align: 'center'
       });
    
    // Footer
    doc.fontSize(10)
       .font(this.fonts.caption)
       .fillColor(this.colors.text.light)
       .text('Generated by Sustainability Management Platform', 60, pageHeight - 100, {
         width: pageWidth - 120,
         align: 'center'
       });
  }

  private generateExecutiveSummary(doc: PDFKit.PDFDocument, content: any) {
    this.addSectionHeader(doc, 'Executive Summary', '#e8f5e8');
    
    // Summary content
    const summaryText = content.summary || content.introduction || 
      'This comprehensive sustainability report presents our environmental performance, key achievements, and future commitments to sustainable business practices. Our dedication to environmental stewardship drives continuous improvement across all operational areas.';
    
    doc.fontSize(12)
       .font(this.fonts.body)
       .fillColor(this.colors.text.primary)
       .text(summaryText, {
         width: doc.page.width - 120,
         align: 'justify',
         lineGap: 4
       });
    
    doc.moveDown(2);
    
    // Key highlights box
    this.addHighlightBox(doc, 'Key Achievements This Period', [
      '12% reduction in carbon emissions',
      '8% reduction in waste generation', 
      'Implemented sustainable sourcing practices',
      'Enhanced employee wellbeing programs'
    ]);
  }

  private generateCompanySection(doc: PDFKit.PDFDocument, content: any, companyName: string) {
    this.addSectionHeader(doc, 'Company Information', '#e0f2fe');
    
    doc.fontSize(12)
       .font(this.fonts.body)
       .fillColor(this.colors.text.primary)
       .text(content.company_info_narrative, {
         width: doc.page.width - 120,
         align: 'justify',
         lineGap: 4
       });
    
    doc.moveDown(2);
    
    // Company details in structured layout
    this.addInfoGrid(doc, [
      { label: 'Company', value: companyName },
      { label: 'Industry', value: 'Spirits & Distilleries' },
      { label: 'Size', value: 'SME (10-250 employees)' },
      { label: 'Location', value: 'United Kingdom' }
    ]);

    // Add space for company image placeholder
    doc.moveDown(2);
    doc.fontSize(10)
       .font(this.fonts.caption)
       .fillColor(this.colors.text.light)
       .text('[Company Image Placeholder - Space reserved for company branding/facility photos]', {
         width: doc.page.width - 120,
         align: 'center'
       });
    
    // Draw a placeholder box
    doc.rect(60, doc.y + 10, doc.page.width - 120, 100)
       .stroke(this.colors.text.light);
  }

  private generateEnvironmentalMetrics(doc: PDFKit.PDFDocument, content: any) {
    this.addSectionHeader(doc, 'Key Environmental Metrics', '#ecfdf5');
    
    doc.fontSize(12)
       .font(this.fonts.body)
       .fillColor(this.colors.text.primary)
       .text(content.key_metrics_narrative, {
         width: doc.page.width - 120,
         align: 'justify',
         lineGap: 4
       });
    
    doc.moveDown(2);
    
    // Environmental metrics cards
    this.addMetricsCards(doc, [
      { value: '500.045', label: 'Tonnes CO₂e', icon: '🌍', color: this.colors.primary },
      { value: '11.7M', label: 'Litres Water', icon: '💧', color: '#0ea5e9' },
      { value: '0.1', label: 'Tonnes Waste', icon: '♻️', color: this.colors.accent }
    ]);

    // Add space for environmental charts/images
    doc.moveDown(2);
    this.addImagePlaceholder(doc, 'Environmental Impact Visualization', 120);
  }

  private generateCarbonFootprint(doc: PDFKit.PDFDocument, content: any) {
    this.addSectionHeader(doc, 'Carbon Footprint Analysis', '#f0fdf4');
    
    doc.fontSize(12)
       .font(this.fonts.body)
       .fillColor(this.colors.text.primary)
       .text(content.carbon_footprint_narrative, {
         width: doc.page.width - 120,
         align: 'justify',
         lineGap: 4
       });
    
    doc.moveDown(2);
    
    // Scope emissions breakdown
    this.addScopeBreakdown(doc);

    // Add space for carbon footprint charts
    doc.moveDown(2);
    this.addImagePlaceholder(doc, 'Carbon Footprint Breakdown Chart', 140);
  }

  private generateInitiatives(doc: PDFKit.PDFDocument, content: any) {
    this.addSectionHeader(doc, 'Sustainability Initiatives', '#faf5ff');
    
    doc.fontSize(12)
       .font(this.fonts.body)
       .fillColor(this.colors.text.primary)
       .text(content.initiatives_narrative, {
         width: doc.page.width - 120,
         align: 'justify',
         lineGap: 4
       });
    
    doc.moveDown(2);
    
    // Initiative cards
    this.addInitiativeCards(doc, [
      { title: 'Water Recycling System', status: 'In Progress', target: 'June 2025' },
      { title: 'Carbon Emission Reduction', status: 'Active', target: 'December 2025' },
      { title: 'Sustainable Sourcing', status: 'Completed', target: 'Ongoing' }
    ]);

    // Add space for initiative images
    doc.moveDown(2);
    this.addImagePlaceholder(doc, 'Initiative Progress Photos', 100);
  }

  private generateSocialImpact(doc: PDFKit.PDFDocument, content: any, socialData: any) {
    this.addSectionHeader(doc, 'Social Impact & Community', '#fdf4ff');
    
    doc.fontSize(12)
       .font(this.fonts.body)
       .fillColor(this.colors.text.primary)
       .text(content.social_impact, {
         width: doc.page.width - 120,
         align: 'justify',
         lineGap: 4
       });
    
    doc.moveDown(2);
    
    // Social metrics
    this.addSocialMetrics(doc, socialData);

    // Add space for community impact images
    doc.moveDown(2);
    this.addImagePlaceholder(doc, 'Community Engagement & Employee Programs', 120);
  }

  private generatePerformanceAndGoals(doc: PDFKit.PDFDocument, content: any) {
    this.addSectionHeader(doc, 'Performance Tracking & Future Goals', '#fffbeb');
    
    if (content.kpi_tracking_narrative) {
      doc.fontSize(12)
         .font(this.fonts.body)
         .fillColor(this.colors.text.primary)
         .text(content.kpi_tracking_narrative, {
           width: doc.page.width - 120,
           align: 'justify',
           lineGap: 4
         });
      
      doc.moveDown(1.5);
    }
    
    if (content.summary) {
      doc.fontSize(14)
         .font(this.fonts.subheading)
         .fillColor(this.colors.text.primary)
         .text('Future Commitments', { lineGap: 2 });
      
      doc.moveDown(0.5);
      
      doc.fontSize(12)
         .font(this.fonts.body)
         .fillColor(this.colors.text.primary)
         .text(content.summary, {
           width: doc.page.width - 120,
           align: 'justify',
           lineGap: 4
         });
    }

    // Add KPI performance charts placeholder
    doc.moveDown(2);
    this.addImagePlaceholder(doc, 'KPI Performance Dashboard & Future Goals Timeline', 140);
  }

  // Helper methods for consistent styling
  private addSectionHeader(doc: PDFKit.PDFDocument, title: string, backgroundColor: string) {
    const pageWidth = doc.page.width;
    
    // Section background bar
    doc.rect(0, doc.y - 15, pageWidth, 50)
       .fill(backgroundColor);
    
    // Section title
    doc.fontSize(20)
       .font(this.fonts.heading)
       .fillColor(this.colors.text.primary)
       .text(title, 60, doc.y - 5);
    
    doc.moveDown(1.5);
  }

  private addHighlightBox(doc: PDFKit.PDFDocument, title: string, items: string[]) {
    const startY = doc.y;
    const boxHeight = 15 + (items.length * 18) + 15;
    
    // Box background
    doc.rect(60, startY, doc.page.width - 120, boxHeight)
       .fillAndStroke(this.colors.background.section, this.colors.text.light);
    
    // Box title
    doc.fontSize(14)
       .font(this.fonts.subheading)
       .fillColor(this.colors.primary)
       .text(title, 75, startY + 15);
    
    // List items
    items.forEach((item, index) => {
      doc.fontSize(11)
         .font(this.fonts.body)
         .fillColor(this.colors.text.primary)
         .text(`• ${item}`, 75, startY + 40 + (index * 18));
    });
    
    doc.y = startY + boxHeight + 20;
  }

  private addMetricsCards(doc: PDFKit.PDFDocument, metrics: Array<{value: string, label: string, icon: string, color: string}>) {
    const cardWidth = (doc.page.width - 180) / 3;
    const cardHeight = 80;
    const startX = 60;
    const startY = doc.y;
    
    metrics.forEach((metric, index) => {
      const x = startX + (index * (cardWidth + 30));
      
      // Card background with subtle shadow effect
      doc.rect(x + 2, startY + 2, cardWidth, cardHeight)
         .fill('#e5e7eb'); // Shadow
      
      doc.rect(x, startY, cardWidth, cardHeight)
         .fillAndStroke(this.colors.background.white, metric.color);
      
      // Icon area (colored circle)
      doc.circle(x + 15, startY + 20, 8)
         .fill(metric.color);
      
      // Value
      doc.fontSize(18)
         .font(this.fonts.heading)
         .fillColor(metric.color)
         .text(metric.value, x + 10, startY + 35, { width: cardWidth - 20, align: 'center' });
      
      // Label
      doc.fontSize(10)
         .font(this.fonts.body)
         .fillColor(this.colors.text.secondary)
         .text(metric.label, x + 10, startY + 60, { width: cardWidth - 20, align: 'center' });
    });
    
    doc.y = startY + cardHeight + 30;
  }

  private addInfoGrid(doc: PDFKit.PDFDocument, items: Array<{label: string, value: string}>) {
    const startY = doc.y;
    const columnWidth = (doc.page.width - 120) / 2;
    
    items.forEach((item, index) => {
      const x = 60 + (index % 2) * columnWidth;
      const y = startY + Math.floor(index / 2) * 35;
      
      // Label
      doc.fontSize(10)
         .font(this.fonts.body)
         .fillColor(this.colors.text.secondary)
         .text(item.label, x, y);
      
      // Value
      doc.fontSize(12)
         .font(this.fonts.subheading)
         .fillColor(this.colors.text.primary)
         .text(item.value, x, y + 12);
    });
    
    doc.y = startY + Math.ceil(items.length / 2) * 35 + 20;
  }

  private addScopeBreakdown(doc: PDFKit.PDFDocument) {
    const scopes = [
      { name: 'Scope 1 - Direct Emissions', value: '22.1 tonnes CO₂e', percentage: '4.4%' },
      { name: 'Scope 2 - Electricity', value: '0.0 tonnes CO₂e', percentage: '0.0%' },
      { name: 'Scope 3 - Indirect Emissions', value: '477.9 tonnes CO₂e', percentage: '95.6%' }
    ];
    
    scopes.forEach((scope, index) => {
      const y = doc.y + (index * 35);
      
      // Scope bar with gradient effect
      doc.rect(60, y, 300, 25)
         .fillAndStroke(this.colors.background.section, this.colors.primary);
      
      // Progress bar based on percentage
      const progressWidth = parseFloat(scope.percentage) / 100 * 280;
      doc.rect(70, y + 5, progressWidth, 15)
         .fill(this.colors.primary);
      
      // Scope details
      doc.fontSize(11)
         .font(this.fonts.subheading)
         .fillColor(this.colors.text.primary)
         .text(scope.name, 70, y + 8);
      
      doc.fontSize(11)
         .font(this.fonts.body)
         .fillColor(this.colors.text.secondary)
         .text(`${scope.value} (${scope.percentage})`, 370, y + 8);
    });
    
    doc.y += 120;
  }

  private addInitiativeCards(doc: PDFKit.PDFDocument, initiatives: Array<{title: string, status: string, target: string}>) {
    initiatives.forEach((initiative, index) => {
      const y = doc.y + (index * 45);
      
      // Initiative card with border
      doc.rect(60, y, doc.page.width - 120, 40)
         .fillAndStroke(this.colors.background.white, this.colors.text.light);
      
      // Status indicator (colored left border)
      const statusColor = initiative.status === 'Completed' ? this.colors.primary : 
                         initiative.status === 'In Progress' ? this.colors.accent : this.colors.secondary;
      
      doc.rect(60, y, 4, 40)
         .fill(statusColor);
      
      // Title
      doc.fontSize(12)
         .font(this.fonts.subheading)
         .fillColor(this.colors.text.primary)
         .text(initiative.title, 75, y + 8);
      
      // Status badge
      doc.fontSize(9)
         .font(this.fonts.body)
         .fillColor(statusColor)
         .text(initiative.status, 75, y + 25);
      
      // Target
      doc.fontSize(9)
         .font(this.fonts.body)
         .fillColor(this.colors.text.secondary)
         .text(`Target: ${initiative.target}`, doc.page.width - 180, y + 25);
    });
    
    doc.y += initiatives.length * 45 + 20;
  }

  private addSocialMetrics(doc: PDFKit.PDFDocument, socialData: any) {
    const employeeMetrics = socialData?.employeeMetrics || {};
    const communityImpact = socialData?.communityImpact || {};
    
    // Two-column layout for social metrics
    const leftColumn = doc.page.width / 2 - 30;
    const rightColumn = doc.page.width / 2 + 30;
    const startY = doc.y;
    
    // Employee metrics section (Left column)
    doc.fontSize(14)
       .font(this.fonts.subheading)
       .fillColor(this.colors.social)
       .text('Employee Wellbeing', 60, startY);
    
    const employeeItems = [
      { label: 'Training Hours per Employee', value: `${employeeMetrics.trainingHoursPerEmployee || 34} hours` },
      { label: 'Gender Diversity Leadership', value: `${employeeMetrics.genderDiversityLeadership || 26}%` },
      { label: 'Turnover Rate', value: `${employeeMetrics.turnoverRate || 9}%` },
      { label: 'Employee Satisfaction', value: `${employeeMetrics.satisfactionScore || 4.2}/5.0` }
    ];
    
    employeeItems.forEach((item, index) => {
      const y = startY + 25 + (index * 20);
      
      doc.fontSize(10)
         .font(this.fonts.body)
         .fillColor(this.colors.text.secondary)
         .text(item.label, 65, y);
      
      doc.fontSize(11)
         .font(this.fonts.subheading)
         .fillColor(this.colors.text.primary)
         .text(item.value, 200, y);
    });
    
    // Community impact section (Right column)
    doc.fontSize(14)
       .font(this.fonts.subheading)
       .fillColor(this.colors.social)
       .text('Community Impact', rightColumn, startY);
    
    const communityItems = [
      { label: 'Local Suppliers', value: `${communityImpact.localSuppliersPercentage || 75}%` },
      { label: 'Community Investment', value: `£${(communityImpact.communityInvestment || 25000).toLocaleString()}` },
      { label: 'Jobs Created', value: `${communityImpact.jobsCreated || 12} positions` },
      { label: 'Volunteer Hours', value: `${communityImpact.volunteerHours || 120} hours` }
    ];
    
    communityItems.forEach((item, index) => {
      const y = startY + 25 + (index * 20);
      
      doc.fontSize(10)
         .font(this.fonts.body)
         .fillColor(this.colors.text.secondary)
         .text(item.label, rightColumn + 5, y);
      
      doc.fontSize(11)
         .font(this.fonts.subheading)
         .fillColor(this.colors.text.primary)
         .text(item.value, rightColumn + 140, y);
    });
    
    doc.y = startY + 120;
  }

  private addImagePlaceholder(doc: PDFKit.PDFDocument, description: string, height: number = 100) {
    const startY = doc.y;
    
    // Placeholder box
    doc.rect(60, startY, doc.page.width - 120, height)
       .fillAndStroke('#f9fafb', '#e5e7eb');
    
    // Placeholder text
    doc.fontSize(10)
       .font(this.fonts.caption)
       .fillColor(this.colors.text.light)
       .text(`[${description}]`, 60, startY + height/2 - 5, {
         width: doc.page.width - 120,
         align: 'center'
       });
    
    doc.y = startY + height + 20;
  }
}

export const modernPdfService = new ModernPDFService();