import nodemailer from 'nodemailer';
import { logger } from '../config/logger';

export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export class EmailService {
  private transporter: nodemailer.Transporter | null = null;
  private isConfigured = false;

  constructor() {
    this.initializeTransporter();
  }

  private initializeTransporter() {
    try {
      // Check for email configuration
      const emailUser = process.env.EMAIL_USER;
      const emailPassword = process.env.EMAIL_PASSWORD;
      const emailHost = process.env.EMAIL_HOST || 'smtp.gmail.com';
      const emailPort = parseInt(process.env.EMAIL_PORT || '587');

      console.log('📧 Email configuration check:', {
        hasEmailUser: !!emailUser,
        hasEmailPassword: !!emailPassword,
        emailHost,
        emailPort
      });

      if (!emailUser || !emailPassword) {
        logger.warn('Email service not configured - EMAIL_USER and EMAIL_PASSWORD required');
        return;
      }

      this.transporter = nodemailer.createTransport({
        host: emailHost,
        port: emailPort,
        secure: emailPort === 465, // true for 465, false for other ports
        auth: {
          user: emailUser,
          pass: emailPassword,
        },
        tls: {
          rejectUnauthorized: false // For development
        }
      });

      this.isConfigured = true;
      logger.info('Email service initialized successfully');
      console.log('✅ Email service initialized and configured');
    } catch (error) {
      logger.error({ error }, 'Failed to initialize email service');
      console.error('❌ Email service initialization failed:', error);
    }
  }

  async sendEmail(options: EmailOptions): Promise<boolean> {
    if (!this.isConfigured || !this.transporter) {
      console.warn('📧 Email service not configured - cannot send email:', {
        isConfigured: this.isConfigured,
        hasTransporter: !!this.transporter
      });
      logger.warn('Email service not configured - cannot send email');
      return false;
    }

    try {
      const mailOptions = {
        from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
        to: options.to,
        subject: options.subject,
        html: options.html,
        text: options.text || this.stripHtml(options.html),
      };

      const result = await this.transporter.sendMail(mailOptions);
      logger.info({ messageId: result.messageId, to: options.to }, 'Email sent successfully');
      return true;
    } catch (error) {
      logger.error({ error, to: options.to }, 'Failed to send email');
      return false;
    }
  }

  async sendSupplierInvitation(
    email: string,
    companyName: string,
    category: string,
    invitationToken: string,
    contactName?: string,
    customMessage?: string
  ): Promise<boolean> {
    const invitationUrl = `${process.env.BASE_URL || 'https://localhost:5000'}/supplier-onboarding?token=${invitationToken}`;
    
    const subject = `Invitation to Join ${companyName}'s Supplier Network`;
    
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Supplier Network Invitation</title>
        <style>
          body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f8faf9;
          }
          .container {
            background: white;
            border-radius: 12px;
            padding: 30px;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
          }
          .header {
            text-align: center;
            border-bottom: 2px solid #16a34a;
            padding-bottom: 20px;
            margin-bottom: 30px;
          }
          .logo {
            color: #16a34a;
            font-size: 24px;
            font-weight: bold;
            margin-bottom: 10px;
          }
          .tagline {
            color: #6b7280;
            font-size: 14px;
          }
          .greeting {
            font-size: 18px;
            color: #1f2937;
            margin-bottom: 20px;
          }
          .content {
            margin-bottom: 30px;
            line-height: 1.7;
          }
          .highlight {
            background-color: #f0fdf4;
            border-left: 4px solid #16a34a;
            padding: 15px;
            margin: 20px 0;
            border-radius: 4px;
          }
          .cta-button {
            display: inline-block;
            background-color: #16a34a;
            color: white;
            text-decoration: none;
            padding: 14px 28px;
            border-radius: 8px;
            font-weight: 600;
            text-align: center;
            margin: 20px 0;
          }
          .footer {
            text-align: center;
            font-size: 12px;
            color: #6b7280;
            margin-top: 40px;
            padding-top: 20px;
            border-top: 1px solid #e5e7eb;
          }
          .category-badge {
            background-color: #dbeafe;
            color: #1d4ed8;
            padding: 4px 12px;
            border-radius: 20px;
            font-size: 12px;
            font-weight: 500;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="logo">🌱 Sustainability Platform</div>
            <div class="tagline">Supplier Network Invitation</div>
          </div>
          
          <div class="greeting">
            Hello${contactName ? ` ${contactName}` : ''},
          </div>
          
          <div class="content">
            <p>
              You've been invited by <strong>${companyName}</strong> to join their sustainability supplier network 
              as a <span class="category-badge">${this.formatCategory(category)}</span>.
            </p>
            
            ${customMessage ? `
              <div class="highlight">
                <strong>Personal Message:</strong><br>
                ${customMessage}
              </div>
            ` : ''}
            
            <p>
              By joining this network, you'll be able to:
            </p>
            <ul>
              <li>📊 Share your sustainability data and certifications</li>
              <li>🤝 Collaborate on environmental impact reporting</li>
              <li>🌍 Contribute to supply chain transparency</li>
              <li>📈 Track your environmental metrics</li>
            </ul>
            
            <p style="text-align: center; margin-top: 30px;">
              <a href="${invitationUrl}" class="cta-button">
                🚀 Complete Your Registration
              </a>
            </p>
            
            <p style="font-size: 14px; color: #6b7280;">
              This invitation will expire in 7 days. If you're unable to click the button above, 
              copy and paste this link into your browser:<br>
              <a href="${invitationUrl}" style="color: #16a34a; word-break: break-all;">${invitationUrl}</a>
            </p>
          </div>
          
          <div class="footer">
            <p>
              This invitation was sent by ${companyName} through our Sustainability Platform.<br>
              If you have any questions, please contact their sustainability team.
            </p>
          </div>
        </div>
      </body>
      </html>
    `;

    return this.sendEmail({
      to: email,
      subject,
      html,
    });
  }

  private formatCategory(category: string): string {
    const categoryMap: Record<string, string> = {
      'ingredient_supplier': 'Ingredient Supplier',
      'bottle_producer': 'Bottle Producer',
      'closure_producer': 'Closure Producer',
      'label_maker': 'Label Maker',
      'packaging_supplier': 'Packaging Supplier',
      'contract_distillery': 'Contract Distillery',
      'contract_brewery': 'Contract Brewery',
    };
    
    return categoryMap[category] || category;
  }

  private stripHtml(html: string): string {
    return html.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
  }

  isEmailConfigured(): boolean {
    return this.isConfigured;
  }
}

// Export singleton instance
export const emailService = new EmailService();