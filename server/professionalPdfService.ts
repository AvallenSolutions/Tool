import PDFDocument from 'pdfkit';

export class ProfessionalPDFService {
  private readonly colors = {
    primary: '#2D3748',        // Dark blue-gray (like template)
    accent: '#F6E05E',         // Yellow accent (from template)
    text: {
      primary: '#1A202C',      // Dark text
      secondary: '#4A5568',    // Medium gray
      light: '#718096'         // Light gray
    },
    background: {
      white: '#FFFFFF',
      light: '#F7FAFC',
      accent: '#FFF9E6'        // Light yellow background
    },
    green: '#10B981'           // Sustainability green
  };

  private readonly fonts = {
    heading: 'Helvetica-Bold',
    subheading: 'Helvetica-Bold',
    body: 'Helvetica',
    caption: 'Helvetica'
  };

  constructor() {
    console.log('ProfessionalPDFService initialized');
  }

  async generateProfessionalReport(
    title: string,
    reportContent: any,
    sustainabilityData?: any,
    companyName: string = 'Demo Company',
    metrics: any = {}
  ): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      try {
        console.log('Generating professional sustainability report...');
        console.log('Report content keys:', Object.keys(reportContent || {}));
        console.log('Metrics:', metrics);
        
        const doc = new PDFDocument({
          size: 'A4',
          margins: {
            top: 40,
            bottom: 40,
            left: 40,
            right: 40
          },
          info: {
            Title: title,
            Author: 'Sustainability Platform',
            Subject: 'Comprehensive Sustainability Report'
          }
        });

        const chunks: Buffer[] = [];
        
        doc.on('data', (chunk: Buffer) => {
          chunks.push(chunk);
        });
        
        doc.on('end', () => {
          const result = Buffer.concat(chunks);
          console.log('Professional PDF generated successfully');
          resolve(result);
        });

        doc.on('error', (error: Error) => {
          console.error('PDF generation error:', error);
          reject(error);
        });

        this.generateReportContent(doc, title, reportContent, sustainabilityData, companyName, metrics);

        doc.end();
      } catch (error) {
        console.error('Error generating professional PDF:', error);
        reject(error);
      }
    });
  }

  private generateReportContent(
    doc: PDFKit.PDFDocument,
    title: string,
    content: any,
    sustainabilityData: any,
    companyName: string,
    metrics: any
  ) {
    // Page 1: Cover Page
    this.generateCoverPage(doc, title, companyName);
    
    // Page 2: Table of Contents
    doc.addPage();
    this.generateTableOfContents(doc);
    
    // Page 3: Executive Summary
    doc.addPage();
    this.generateExecutiveSummary(doc, content, metrics);
    
    // Page 4: Company Overview
    doc.addPage();
    this.generateCompanyOverview(doc, content, companyName);
    
    // Page 5: Environmental Metrics
    doc.addPage();
    this.generateEnvironmentalMetrics(doc, content, metrics);
    
    // Page 6: Performance Overview
    doc.addPage();
    this.generatePerformanceOverview(doc, content, metrics);
    
    // Page 7: Sustainability Initiatives
    doc.addPage();
    this.generateSustainabilityInitiatives(doc, content);
    
    // Page 8: Social Impact
    doc.addPage();
    this.generateSocialImpact(doc, content, sustainabilityData);
    
    // Page 9: Future Goals & KPIs
    doc.addPage();
    this.generateFutureGoals(doc, content);
    
    // Page 10: Contact Information
    doc.addPage();
    this.generateContactPage(doc, companyName);
  }

  private generateCoverPage(doc: PDFKit.PDFDocument, title: string, companyName: string) {
    const pageWidth = doc.page.width;
    const pageHeight = doc.page.height;
    
    // Company name at top in large text
    doc.fontSize(48)
       .font(this.fonts.heading)
       .fillColor(this.colors.primary)
       .text(companyName.toUpperCase(), 40, 80, {
         width: pageWidth - 80,
         align: 'left'
       });
    
    // Main title
    doc.fontSize(64)
       .font(this.fonts.heading)
       .fillColor(this.colors.primary)
       .text('SUSTAINABILITY', 40, 180, {
         width: pageWidth - 80,
         align: 'left'
       });
    
    doc.text('REPORT', 40, 250, {
      width: pageWidth - 80,
      align: 'left'
    });
    
    // Year
    const currentYear = new Date().getFullYear();
    doc.fontSize(32)
       .font(this.fonts.heading)
       .fillColor(this.colors.primary)
       .text(currentYear.toString(), 40, 320, {
         width: pageWidth - 80,
         align: 'left'
       });
    
    // Date section
    const currentDate = new Date();
    const monthName = currentDate.toLocaleDateString('en-US', { month: 'long' }).toUpperCase();
    
    doc.fontSize(14)
       .font(this.fonts.body)
       .fillColor(this.colors.text.secondary)
       .text(`${monthName}`, 40, 380);
    
    doc.text(`${currentYear}`, 40, 400);
    
    // Prepared by section
    doc.text('Prepared by', 40, 440);
    doc.fontSize(12)
       .font(this.fonts.heading)
       .fillColor(this.colors.text.primary)
       .text('SUSTAINABILITY PLATFORM', 40, 460);
    
    // Accent rectangle (inspired by template design)
    doc.rect(40, pageHeight - 120, 200, 40)
       .fill(this.colors.accent);
  }

  private generateTableOfContents(doc: PDFKit.PDFDocument) {
    // Section title
    doc.fontSize(32)
       .font(this.fonts.heading)
       .fillColor(this.colors.primary)
       .text('TABLE OF', 40, 80);
    
    doc.text('CONTENTS', 40, 120);
    
    // TOC entries
    const tocEntries = [
      { title: 'EXECUTIVE SUMMARY', page: 3 },
      { title: 'COMPANY OVERVIEW', page: 4 },
      { title: 'ENVIRONMENTAL METRICS', page: 5 },
      { title: 'PERFORMANCE OVERVIEW', page: 6 },
      { title: 'SUSTAINABILITY INITIATIVES', page: 7 },
      { title: 'SOCIAL IMPACT', page: 8 },
      { title: 'FUTURE GOALS & KPIS', page: 9 },
      { title: 'CONTACT INFORMATION', page: 10 }
    ];
    
    let yPosition = 200;
    tocEntries.forEach((entry) => {
      doc.fontSize(16)
         .font(this.fonts.body)
         .fillColor(this.colors.text.primary)
         .text(entry.title, 70, yPosition);
      
      doc.fontSize(16)
         .font(this.fonts.body)
         .fillColor(this.colors.text.primary)
         .text(entry.page.toString(), 350, yPosition);
      
      yPosition += 35;
    });
  }

  private generateExecutiveSummary(doc: PDFKit.PDFDocument, content: any, metrics: any) {
    // Page title
    this.addPageTitle(doc, 'EXECUTIVE SUMMARY');
    
    // Main content
    const summaryText = content?.summary || content?.introduction || 
      `This comprehensive sustainability report presents ${metrics?.companyName || 'our company'}'s environmental performance, key achievements, and future commitments to sustainable business practices. Our dedication to environmental stewardship drives continuous improvement across all operational areas.`;
    
    doc.fontSize(12)
       .font(this.fonts.body)
       .fillColor(this.colors.text.primary)
       .text(summaryText, 40, 160, {
         width: doc.page.width - 80,
         align: 'justify',
         lineGap: 6
       });
    
    // Key metrics boxes (inspired by template layout)
    const yStart = 280;
    
    // CO2e metric
    this.addMetricBox(doc, 40, yStart, `${Math.round(metrics?.co2e || 500)}`, 'tonnes CO₂e', 'Total carbon emissions');
    
    // Water metric  
    this.addMetricBox(doc, 200, yStart, `${Math.round((metrics?.water || 11700000) / 1000000)}M`, 'litres water', 'Water consumption');
    
    // Waste metric
    this.addMetricBox(doc, 360, yStart, `${metrics?.waste || 0.1}`, 'tonnes waste', 'Waste generated');
    
    // Achievement highlights
    doc.fontSize(14)
       .font(this.fonts.subheading)
       .fillColor(this.colors.primary)
       .text('KEY ACHIEVEMENTS', 40, 450);
    
    const achievements = [
      '12% reduction in carbon emissions',
      '8% reduction in waste generation',
      'Implemented sustainable sourcing practices',
      'Enhanced employee wellbeing programs'
    ];
    
    let yPos = 480;
    achievements.forEach(achievement => {
      doc.fontSize(11)
         .font(this.fonts.body)
         .fillColor(this.colors.text.primary)
         .text(`• ${achievement}`, 40, yPos);
      yPos += 20;
    });
  }

  private generateCompanyOverview(doc: PDFKit.PDFDocument, content: any, companyName: string) {
    this.addPageTitle(doc, 'COMPANY OVERVIEW');
    
    // Vision section
    doc.fontSize(16)
       .font(this.fonts.subheading)
       .fillColor(this.colors.primary)
       .text('VISION', 40, 160);
    
    const visionText = content?.company_info_narrative || 
      `${companyName} is committed to creating sustainable spirits that respect both tradition and environment. We strive to be a leader in sustainable distilling practices while delivering exceptional quality products.`;
    
    doc.fontSize(12)
       .font(this.fonts.body)
       .fillColor(this.colors.text.primary)
       .text(visionText, 40, 190, {
         width: doc.page.width - 80,
         align: 'justify',
         lineGap: 4
       });
    
    // Mission section
    doc.fontSize(16)
       .font(this.fonts.subheading)
       .fillColor(this.colors.primary)
       .text('MISSION', 40, 280);
    
    const missionPoints = [
      'Reduce environmental impact through innovative production methods',
      'Support local communities and sustainable sourcing practices',
      'Maintain transparency in all sustainability reporting and commitments',
      'Continuously improve our environmental performance year over year'
    ];
    
    let yPos = 310;
    missionPoints.forEach(point => {
      doc.fontSize(11)
         .font(this.fonts.body)
         .fillColor(this.colors.text.primary)
         .text(`• ${point}`, 50, yPos);
      yPos += 25;
    });
    
    // Company stats box
    doc.rect(40, 450, doc.page.width - 80, 100)
       .fillAndStroke(this.colors.background.accent, this.colors.accent);
    
    doc.fontSize(12)
       .font(this.fonts.subheading)
       .fillColor(this.colors.primary)
       .text('COMPANY PROFILE', 60, 470);
    
    doc.fontSize(10)
       .font(this.fonts.body)
       .fillColor(this.colors.text.primary)
       .text('Industry: Spirits & Distilleries', 60, 495);
    
    doc.text('Size: SME (10-250 employees)', 60, 510);
    doc.text('Location: United Kingdom', 60, 525);
  }

  private generateEnvironmentalMetrics(doc: PDFKit.PDFDocument, content: any, metrics: any) {
    this.addPageTitle(doc, 'ENVIRONMENTAL METRICS');
    
    const metricsText = content?.key_metrics_narrative || 
      'Our environmental metrics demonstrate our commitment to reducing our ecological footprint. Through systematic monitoring and targeted initiatives, we track key performance indicators across all operational areas.';
    
    doc.fontSize(12)
       .font(this.fonts.body)
       .fillColor(this.colors.text.primary)
       .text(metricsText, 40, 160, {
         width: doc.page.width - 80,
         align: 'justify',
         lineGap: 4
       });
    
    // Large metric displays (inspired by template)
    const yStart = 250;
    
    // CO2 Emissions
    doc.fontSize(16)
       .font(this.fonts.subheading)
       .fillColor(this.colors.text.secondary)
       .text('Carbon Emissions', 40, yStart);
    
    doc.fontSize(32)
       .font(this.fonts.heading)
       .fillColor(this.colors.primary)
       .text(`${Math.round(metrics?.co2e || 500)} tonnes`, 40, yStart + 20);
    
    // Water Usage
    doc.fontSize(16)
       .font(this.fonts.subheading)
       .fillColor(this.colors.text.secondary)
       .text('Water Usage', 300, yStart);
    
    doc.fontSize(32)
       .font(this.fonts.heading)
       .fillColor(this.colors.primary)
       .text(`${Math.round((metrics?.water || 11700000) / 1000000)}M litres`, 300, yStart + 20);
    
    // Waste Generated
    doc.fontSize(16)
       .font(this.fonts.subheading)
       .fillColor(this.colors.text.secondary)
       .text('Waste Generated', 40, yStart + 120);
    
    doc.fontSize(32)
       .font(this.fonts.heading)
       .fillColor(this.colors.primary)
       .text(`${metrics?.waste || 0.1} tonnes`, 40, yStart + 140);
    
    // Scope breakdown
    doc.fontSize(14)
       .font(this.fonts.subheading)
       .fillColor(this.colors.primary)
       .text('EMISSIONS BREAKDOWN', 40, 450);
    
    const scopes = [
      { name: 'Scope 1 - Direct', value: '22.1 tonnes', percentage: '4.4%' },
      { name: 'Scope 2 - Electricity', value: '0.0 tonnes', percentage: '0.0%' },
      { name: 'Scope 3 - Indirect', value: '477.9 tonnes', percentage: '95.6%' }
    ];
    
    let yPos = 480;
    scopes.forEach(scope => {
      doc.fontSize(10)
         .font(this.fonts.body)
         .fillColor(this.colors.text.primary)
         .text(scope.name, 40, yPos);
      
      doc.text(scope.value, 200, yPos);
      doc.text(scope.percentage, 320, yPos);
      yPos += 18;
    });
  }

  private generatePerformanceOverview(doc: PDFKit.PDFDocument, content: any, metrics: any) {
    this.addPageTitle(doc, 'PERFORMANCE OVERVIEW');
    
    const performanceText = content?.carbon_footprint_narrative || 
      'Our performance overview demonstrates significant progress in key sustainability areas. Through targeted initiatives and improved processes, we have achieved measurable reductions in our environmental impact.';
    
    doc.fontSize(12)
       .font(this.fonts.body)
       .fillColor(this.colors.text.primary)
       .text(performanceText, 40, 160, {
         width: doc.page.width - 80,
         align: 'justify',
         lineGap: 4
       });
    
    // Performance metrics section
    doc.fontSize(16)
       .font(this.fonts.subheading)
       .fillColor(this.colors.primary)
       .text('KEY PERFORMANCE INDICATORS', 40, 240);
    
    // Two-column layout for performance metrics
    const leftCol = 40;
    const rightCol = 300;
    
    // Left column metrics
    doc.fontSize(12)
       .font(this.fonts.body)
       .fillColor(this.colors.text.secondary)
       .text('Carbon intensity reduction', leftCol, 280);
    
    doc.fontSize(24)
       .font(this.fonts.heading)
       .fillColor(this.colors.green)
       .text('12%', leftCol, 300);
    
    doc.fontSize(12)
       .font(this.fonts.body)
       .fillColor(this.colors.text.secondary)
       .text('Energy efficiency improvement', leftCol, 360);
    
    doc.fontSize(24)
       .font(this.fonts.heading)
       .fillColor(this.colors.green)
       .text('15%', leftCol, 380);
    
    // Right column metrics
    doc.fontSize(12)
       .font(this.fonts.body)
       .fillColor(this.colors.text.secondary)
       .text('Waste reduction achieved', rightCol, 280);
    
    doc.fontSize(24)
       .font(this.fonts.heading)
       .fillColor(this.colors.green)
       .text('8%', rightCol, 300);
    
    doc.fontSize(12)
       .font(this.fonts.body)
       .fillColor(this.colors.text.secondary)
       .text('Water conservation', rightCol, 360);
    
    doc.fontSize(24)
       .font(this.fonts.heading)
       .fillColor(this.colors.green)
       .text('10%', rightCol, 380);
  }

  private generateSustainabilityInitiatives(doc: PDFKit.PDFDocument, content: any) {
    this.addPageTitle(doc, 'SUSTAINABILITY INITIATIVES');
    
    const initiativesText = content?.initiatives_narrative || 
      'Our sustainability initiatives represent concrete actions toward environmental stewardship. Each initiative is designed to address specific environmental challenges while supporting business objectives.';
    
    doc.fontSize(12)
       .font(this.fonts.body)
       .fillColor(this.colors.text.primary)
       .text(initiativesText, 40, 160, {
         width: doc.page.width - 80,
         align: 'justify',
         lineGap: 4
       });
    
    // Initiative cards
    const initiatives = [
      {
        title: 'WATER RECYCLING SYSTEM',
        description: 'Implementation of advanced water treatment and recycling infrastructure to reduce consumption by 30%.',
        target: 'Target: June 2025',
        status: 'In Progress'
      },
      {
        title: 'CARBON EMISSION REDUCTION',
        description: 'Comprehensive program to reduce carbon emissions through energy efficiency and renewable sources.',
        target: 'Target: December 2025',
        status: 'Active'
      },
      {
        title: 'SUSTAINABLE SOURCING',
        description: 'Partnership with local suppliers to ensure sustainable and ethical sourcing of raw materials.',
        target: 'Target: Ongoing',
        status: 'Completed'
      }
    ];
    
    let yStart = 250;
    initiatives.forEach((initiative, index) => {
      const cardY = yStart + (index * 120);
      
      // Initiative card
      doc.rect(40, cardY, doc.page.width - 80, 100)
         .fillAndStroke(this.colors.background.light, this.colors.text.light);
      
      doc.fontSize(14)
         .font(this.fonts.subheading)
         .fillColor(this.colors.primary)
         .text(initiative.title, 60, cardY + 20);
      
      doc.fontSize(10)
         .font(this.fonts.body)
         .fillColor(this.colors.text.primary)
         .text(initiative.description, 60, cardY + 45, {
           width: doc.page.width - 140,
           lineGap: 2
         });
      
      doc.fontSize(9)
         .font(this.fonts.body)
         .fillColor(this.colors.text.secondary)
         .text(initiative.target, 60, cardY + 75);
      
      // Status indicator
      const statusColor = initiative.status === 'Completed' ? this.colors.green : 
                         initiative.status === 'In Progress' ? this.colors.accent : this.colors.primary;
      
      doc.fontSize(9)
         .font(this.fonts.subheading)
         .fillColor(statusColor)
         .text(initiative.status, doc.page.width - 140, cardY + 75);
    });
  }

  private generateSocialImpact(doc: PDFKit.PDFDocument, content: any, sustainabilityData: any) {
    this.addPageTitle(doc, 'SOCIAL IMPACT');
    
    const socialText = content?.social_impact || 
      'Our social impact initiatives focus on employee wellbeing, community engagement, and responsible business practices. We believe that sustainable business includes positive social outcomes.';
    
    doc.fontSize(12)
       .font(this.fonts.body)
       .fillColor(this.colors.text.primary)
       .text(socialText, 40, 160, {
         width: doc.page.width - 80,
         align: 'justify',
         lineGap: 4
       });
    
    // Social metrics from data
    const socialData = sustainabilityData?.socialData || {};
    const employeeMetrics = socialData?.employeeMetrics || {};
    const communityImpact = socialData?.communityImpact || {};
    
    // Employee section
    doc.fontSize(16)
       .font(this.fonts.subheading)
       .fillColor(this.colors.primary)
       .text('EMPLOYEE WELLBEING', 40, 240);
    
    // Employee metrics in grid
    const empMetrics = [
      { label: 'Training Hours/Employee', value: `${employeeMetrics.trainingHoursPerEmployee || 34}h` },
      { label: 'Gender Diversity', value: `${employeeMetrics.genderDiversityLeadership || 26}%` },
      { label: 'Turnover Rate', value: `${employeeMetrics.turnoverRate || 9}%` },
      { label: 'Satisfaction Score', value: `${employeeMetrics.satisfactionScore || 4.2}/5` }
    ];
    
    let yPos = 270;
    empMetrics.forEach((metric, index) => {
      const xPos = 40 + (index % 2) * 250;
      const yOffset = Math.floor(index / 2) * 40;
      
      doc.fontSize(10)
         .font(this.fonts.body)
         .fillColor(this.colors.text.secondary)
         .text(metric.label, xPos, yPos + yOffset);
      
      doc.fontSize(18)
         .font(this.fonts.heading)
         .fillColor(this.colors.primary)
         .text(metric.value, xPos, yPos + yOffset + 15);
    });
    
    // Community section
    doc.fontSize(16)
       .font(this.fonts.subheading)
       .fillColor(this.colors.primary)
       .text('COMMUNITY ENGAGEMENT', 40, 400);
    
    const commMetrics = [
      { label: 'Local Suppliers', value: `${communityImpact.localSuppliersPercentage || 75}%` },
      { label: 'Community Investment', value: `£${(communityImpact.communityInvestment || 25000).toLocaleString()}` },
      { label: 'Jobs Created', value: `${communityImpact.jobsCreated || 12}` },
      { label: 'Volunteer Hours', value: `${communityImpact.volunteerHours || 120}h` }
    ];
    
    yPos = 430;
    commMetrics.forEach((metric, index) => {
      const xPos = 40 + (index % 2) * 250;
      const yOffset = Math.floor(index / 2) * 40;
      
      doc.fontSize(10)
         .font(this.fonts.body)
         .fillColor(this.colors.text.secondary)
         .text(metric.label, xPos, yPos + yOffset);
      
      doc.fontSize(18)
         .font(this.fonts.heading)
         .fillColor(this.colors.primary)
         .text(metric.value, xPos, yPos + yOffset + 15);
    });
  }

  private generateFutureGoals(doc: PDFKit.PDFDocument, content: any) {
    this.addPageTitle(doc, 'FUTURE GOALS & KPIS');
    
    const goalsText = content?.kpi_tracking_narrative || content?.summary || 
      'Our future goals represent ambitious yet achievable targets for continued environmental improvement. These commitments guide our strategic planning and operational decisions.';
    
    doc.fontSize(12)
       .font(this.fonts.body)
       .fillColor(this.colors.text.primary)
       .text(goalsText, 40, 160, {
         width: doc.page.width - 80,
         align: 'justify',
         lineGap: 4
       });
    
    // Future targets
    doc.fontSize(16)
       .font(this.fonts.subheading)
       .fillColor(this.colors.primary)
       .text('2025 TARGETS', 40, 240);
    
    const targets = [
      { goal: 'Carbon Neutral Operations', target: '2025', progress: '65%' },
      { goal: 'Renewable Energy', target: '80%', progress: '45%' },
      { goal: 'Waste Reduction', target: '25%', progress: '18%' },
      { goal: 'Water Conservation', target: '30%', progress: '22%' }
    ];
    
    let yPos = 280;
    targets.forEach(target => {
      doc.fontSize(12)
         .font(this.fonts.body)
         .fillColor(this.colors.text.primary)
         .text(target.goal, 40, yPos);
      
      doc.fontSize(12)
         .font(this.fonts.subheading)
         .fillColor(this.colors.green)
         .text(`Target: ${target.target}`, 250, yPos);
      
      doc.fontSize(12)
         .font(this.fonts.subheading)
         .fillColor(this.colors.accent)
         .text(`Progress: ${target.progress}`, 400, yPos);
      
      yPos += 30;
    });
    
    // Innovation section
    doc.fontSize(16)
       .font(this.fonts.subheading)
       .fillColor(this.colors.primary)
       .text('INNOVATION INITIATIVES', 40, 450);
    
    doc.fontSize(11)
       .font(this.fonts.body)
       .fillColor(this.colors.text.primary)
       .text('Investment in sustainable technologies and processes continues to drive our environmental performance improvements. Our innovation pipeline includes advanced water treatment, renewable energy integration, and circular economy initiatives.', 40, 480, {
         width: doc.page.width - 80,
         lineGap: 4
       });
  }

  private generateContactPage(doc: PDFKit.PDFDocument, companyName: string) {
    this.addPageTitle(doc, 'CONTACT US');
    
    // Large company name
    doc.fontSize(48)
       .font(this.fonts.heading)
       .fillColor(this.colors.primary)
       .text(companyName.toUpperCase(), 40, 200);
    
    // Contact details
    const contactInfo = [
      { label: 'Email/', value: 'sustainability@company.com' },
      { label: 'Website/', value: 'www.company.com/sustainability' },
      { label: 'Address/', value: '123 Sustainability St., Green City, EC1 12345' }
    ];
    
    let yPos = 320;
    contactInfo.forEach(contact => {
      doc.fontSize(14)
         .font(this.fonts.subheading)
         .fillColor(this.colors.text.secondary)
         .text(contact.label, 40, yPos);
      
      doc.fontSize(12)
         .font(this.fonts.body)
         .fillColor(this.colors.text.primary)
         .text(contact.value, 40, yPos + 20);
      
      yPos += 60;
    });
  }

  // Helper methods
  private addPageTitle(doc: PDFKit.PDFDocument, title: string) {
    doc.fontSize(32)
       .font(this.fonts.heading)
       .fillColor(this.colors.primary)
       .text(title, 40, 80);
  }

  private addMetricBox(doc: PDFKit.PDFDocument, x: number, y: number, value: string, unit: string, description: string) {
    // Background box
    doc.rect(x, y, 140, 80)
       .fillAndStroke(this.colors.background.light, this.colors.text.light);
    
    // Value
    doc.fontSize(24)
       .font(this.fonts.heading)
       .fillColor(this.colors.primary)
       .text(value, x + 10, y + 15);
    
    // Unit
    doc.fontSize(10)
       .font(this.fonts.body)
       .fillColor(this.colors.text.secondary)
       .text(unit, x + 10, y + 45);
    
    // Description
    doc.fontSize(8)
       .font(this.fonts.body)
       .fillColor(this.colors.text.light)
       .text(description, x + 10, y + 60);
  }
}

export const professionalPdfService = new ProfessionalPDFService();