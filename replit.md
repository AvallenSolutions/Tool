# Drinks Sustainability Tool

## Overview

This is a comprehensive sustainability platform designed for SME drinks brands, providing guided Life Cycle Assessment (LCA) reporting, supplier collaboration, and expert validation. The application helps companies measure, manage, and report their environmental impact with a focus on user-friendly workflows and industry-specific requirements.

## User Preferences

Preferred communication style: Simple, everyday language.

## Recent Changes

### January 18, 2025
- **System Consolidation**: Successfully completed major system overhaul consolidating dual product types (simplified vs enhanced) into single unified enhanced form
- **Onboarding Streamlining**: Reduced onboarding from 5 steps to 4 steps by removing product data collection, focusing purely on company setup
- **Database Schema Enhancement**: Expanded database schema with all enhanced fields as proper columns instead of JSONB storage
- **Products Section Cleanup**: Renamed "Product Catalog" to "Products", removed multiple viewing/editing options, streamlined to single view and edit action per product
- **Navigation Simplification**: Consolidated product creation workflow to use enhanced form as primary and only method
- **UI Improvements**: Fixed duplicate buttons, clarified action tooltips, and improved user experience flow

## System Architecture

### Frontend Architecture
- **Framework**: React with TypeScript
- **Build Tool**: Vite for fast development and optimized builds
- **UI Library**: Shadcn/ui components built on Radix UI primitives
- **Styling**: Tailwind CSS with custom design tokens for brand consistency
- **State Management**: TanStack Query for server state and caching
- **Routing**: Wouter for lightweight client-side routing
- **Forms**: React Hook Form with Zod validation

### Backend Architecture
- **Runtime**: Node.js with Express.js
- **Language**: TypeScript with ES modules
- **Database**: PostgreSQL with Drizzle ORM
- **Database Provider**: Neon (serverless PostgreSQL)
- **Authentication**: Replit Auth with OpenID Connect
- **Session Management**: PostgreSQL-backed sessions with connect-pg-simple

## Key Components

### Authentication System
- **Strategy**: Replit Auth integration with passport.js
- **Session Storage**: PostgreSQL sessions table with TTL management
- **User Management**: Automatic user creation/update on login
- **Security**: HTTP-only cookies with secure flags

### Database Layer
- **ORM**: Drizzle with type-safe queries
- **Schema**: Comprehensive tables for users, companies, products, suppliers, and reports
- **Migrations**: Drizzle Kit for schema management
- **Connection**: Neon serverless with connection pooling

### UI Components
- **Design System**: Shadcn/ui with custom Avallen branding
- **Color Scheme**: Green primary (Avallen brand), slate gray, and muted gold accents
- **Typography**: Roboto Slab font family
- **Responsive Design**: Mobile-first approach with Tailwind breakpoints

### Data Management
- **Server State**: TanStack Query with optimistic updates
- **Caching**: Intelligent query invalidation and background refetching
- **Error Handling**: Centralized error boundaries with user-friendly messages
- **Loading States**: Skeleton loaders and spinners throughout the app

## Data Flow

### User Authentication Flow
1. Unauthenticated users see landing page
2. Login redirects to Replit Auth
3. Successful auth creates/updates user record
4. Session established with PostgreSQL storage
5. User redirected to appropriate dashboard or onboarding

### Company Onboarding Flow
1. New users complete streamlined 5-step onboarding wizard
2. Company profile with country dropdown (22 common countries) and reporting period setup
3. Optional OCR document upload with skip functionality
4. Optional operational data entry with skip functionality (utilities can be added later)
5. Primary product information (#1 selling product focus)
6. Onboarding completion unlocks main dashboard with guided narrator for additional setup

### Supplier Collaboration Flow
1. Companies create supplier records with unique tokens (post-onboarding)
2. Suppliers receive portal links via email
3. Suppliers submit environmental data through dedicated portal
4. Data integrated into company's sustainability calculations
5. Supplier setup moved to post-onboarding guided narrator flow

### Report Generation Flow
1. Users initiate report generation from dashboard
2. System compiles data from products, suppliers, and operational metrics
3. Reports generated with status tracking (generating → completed → approved)
4. Expert validation available for premium features

## External Dependencies

### Core Dependencies
- **@neondatabase/serverless**: PostgreSQL database connectivity
- **drizzle-orm**: Type-safe database queries and migrations
- **express**: Web server framework
- **passport**: Authentication middleware
- **openid-client**: OIDC authentication

### Frontend Dependencies
- **@tanstack/react-query**: Server state management
- **@radix-ui/***: Accessible UI primitives
- **wouter**: Lightweight routing
- **recharts**: Data visualization
- **react-hook-form**: Form handling
- **zod**: Schema validation

### Development Dependencies
- **vite**: Build tool and dev server
- **typescript**: Type checking
- **tailwindcss**: Utility-first CSS
- **tsx**: TypeScript execution for development

## Deployment Strategy

### Build Process
1. **Frontend**: Vite builds React app to `dist/public`
2. **Backend**: esbuild bundles server code to `dist/index.js`
3. **Database**: Drizzle migrations applied via `db:push`

### Environment Configuration
- **Database**: `DATABASE_URL` for Neon PostgreSQL connection
- **Authentication**: Replit Auth environment variables
- **Sessions**: `SESSION_SECRET` for session encryption
- **Payments**: Stripe integration for premium features

### Development Workflow
- **Dev Server**: Concurrent frontend (Vite) and backend (tsx) processes
- **Hot Reload**: Vite HMR for frontend, nodemon-like restart for backend
- **Type Checking**: Continuous TypeScript checking across shared types
- **Database**: Live schema updates with Drizzle push

### Production Considerations
- **SSR**: Server-side rendering for initial page load
- **Static Assets**: Vite-optimized bundles with code splitting
- **Database**: Connection pooling with Neon serverless
- **Sessions**: PostgreSQL-backed for horizontal scaling
- **Security**: Environment-based secrets management

The application follows a monorepo structure with shared types between frontend and backend, ensuring type safety across the entire stack while maintaining clear separation of concerns.

## Recent Changes (January 2025)
- **Onboarding Optimization**: Successfully streamlined 5-step onboarding process with skip functionality
- **Country Selection**: Added dropdown with 22 common countries for company address
- **Optional Data Entry**: Made utilities (step 4) and document upload (step 3) optional with skip buttons
- **Product Focus**: Updated step 5 to emphasize #1 selling product entry
- **Error Resolution**: Fixed dashboard chart error that was preventing navigation completion
- **Completion Flow**: Simplified onboarding completion to avoid double mutations and ensure proper navigation
- **Product Catalog System**: Built comprehensive product SKU management with enhanced database schema
- **Dashboard Improvements**: Added Products tab to sidebar, combined product sections, fixed reporting period display
- **Data Integration**: Onboarding now creates first product automatically, operational data properly stored and displayed in metrics
- **PDF Download System**: Implemented comprehensive PDF generation for LCA reports with professional formatting
- **Enhanced Product Input**: Created comprehensive product data collection form with 6 detailed tabs covering all aspects needed for accurate LCA calculations including ingredients, packaging, production processes, distribution, and end-of-life management
- **Verified Supplier Network**: Completed comprehensive supplier network with pre-vetted suppliers for both packaging and ingredients, including automated LCA data integration and form auto-population (January 19, 2025)
- **LCA Assessment System**: Implemented comprehensive 5-phase LCA system with Phase 2 (simple self-produced) and Phase 3 (contract producer workflows) complete
- **Contract Producer Workflows**: Added three data collection methods: verified network selection, document upload system, and producer invitation portal for flexible environmental data gathering (January 21, 2025)

### January 21, 2025 - UI Consolidation Phase 1 Complete
- **Unified Product Form**: Successfully consolidated LCA data collection into single 8-tab product registration form
- **Tab Structure**: Extended product form from 6 to 8 tabs: Basic Info, Ingredients, Packaging, Production, Environmental Impact, Certifications & Awards, Distribution, End of Life
- **Environmental Integration**: Merged self-produced and contract producer LCA workflows into unified Environmental Impact tab
- **Certifications System**: Added comprehensive certifications and awards management with file upload capabilities
- **Navigation Cleanup**: Removed redundant "Environmental Impact" from main sidebar navigation after integration
- **UI Improvements**: Fixed tab layout for 8 tabs with responsive grid, updated copy from "Enhanced Product Data Collection" to "Register Product"
- **Sidebar Enhancement**: Updated main navigation with primary green (#209d50) background and improved active state visibility
- **Button Fixes**: Corrected create product button styling with proper green color and "Create Product" text

### January 23, 2025 - Phase 1: Supplier Data Capture Infrastructure Complete
- **Database Schema Extension**: Extended verified_suppliers table with comprehensive supplier data capture workflow fields
- **Three-Workflow System**: Implemented complete supplier data capture system supporting admin, supplier self-entry, and client submission workflows
- **Geocoding Integration**: Added Nominatim-based geocoding service for automatic address-to-coordinates conversion with distance calculations
- **Data Visibility Logic**: Implemented company-specific supplier visibility (verified suppliers globally visible, client-provided suppliers only visible to submitting company)
- **Service Layer**: Created comprehensive SupplierDataCaptureService with methods for all three workflows and company-specific data retrieval
- **API Routes**: Prepared complete API routes for supplier data capture (temporarily disabled pending authentication integration)
- **Verification Statuses**: Added verification_status field with three states: 'verified', 'pending_review', 'client_provided'
- **Infrastructure Testing**: Created comprehensive test suite validating database schema, geocoding service, and data capture workflows
- **End-to-End Testing Complete**: Successfully validated complete user journey with live test - created "Orchard Spirits Co." with 2 products, 4 verified suppliers, supplier linkages (schema compatibility noted), and LCA reports for both products

### January 23, 2025 - Enhanced LCA Report Generation System Complete
- **Professional PDF Service**: Implemented comprehensive EnhancedPDFService with ISO 14040/14044 compliant multi-page reports
- **HTML Chart Generation**: Created CSS-based chart system for carbon footprint contribution analysis without external dependencies
- **Report Data Processor**: Built service to aggregate LCA data from reports, products, companies, and questionnaires
- **Background Job System**: Implemented asynchronous report generation with SimpleJobQueue for development environment
- **Database Schema Enhancement**: Added enhancedPdfFilePath, enhancedReportStatus, and totalCarbonFootprint fields to reports table
- **Complete API Integration**: Created endpoints for enhanced report generation, status checking, and secure downloads
- **Frontend Component**: Built EnhancedReportButton with progress tracking, status badges, and download functionality
- **Reports Page Integration**: Added enhanced report functionality to existing Reports page with professional formatting
- **7-Section Report Structure**: Cover page, executive summary, introduction, inventory analysis, impact assessment, benchmarking, and references
- **Professional Styling**: Times New Roman typography, Avallen branding, proper page breaks, headers, and ISO-compliant formatting

### January 24, 2025 - Comprehensive Product Detail Page Redesign Complete
- **Complete UI Overhaul**: Redesigned individual product page from basic layout to comprehensive 6-tab information display system
- **Tabbed Navigation**: Implemented professional tabs for Overview, Ingredients, Packaging, Suppliers, Certifications, and Impact sections
- **Environmental Headlines**: Added prominent LCA metrics display showing carbon footprint, water footprint, and assessment history
- **Detailed Ingredient View**: Created comprehensive ingredient breakdown with supplier information, origin details, organic certification status, and processing methods
- **Packaging Specifications**: Integrated complete packaging data display including material types, weights, recycled content percentages, and closure systems
- **Supplier Integration**: Connected verified supplier network with product links, LCA data availability indicators, and detailed supplier information
- **Certifications Display**: Professional presentation of product certifications and awards with visual badges and categorization
- **Impact Integration**: Seamlessly connected existing LCA calculation system to new tabbed layout for comprehensive environmental impact analysis
- **Database Integration**: Full utilization of enhanced product schema displaying all available data fields in organized, user-friendly format
- **Professional Presentation**: Consistent Avallen branding, responsive design, and intuitive navigation for comprehensive product lifecycle information

### January 24, 2025 - Advanced Supplier Data Extraction System Complete
- **Dual Extraction Methods**: Implemented comprehensive system supporting both URL web scraping and PDF document upload for automated supplier data capture
- **WebScrapingService**: Built robust HTML parsing service using cheerio with pattern recognition for product specifications, materials, dimensions, and certifications
- **PDFExtractionService**: Created AI-powered PDF analysis using Anthropic API for extracting product data from supplier catalogs and specification sheets
- **Human Verification Workflow**: Developed mandatory verification system requiring human approval of all auto-extracted data before database entry
- **AutoDataExtraction Component**: Built frontend component with confidence indicators, extraction statistics, and error handling for URL-based imports
- **PDFUploadExtraction Component**: Created drag-and-drop PDF upload interface with progress tracking and AI extraction confidence scoring
- **Comprehensive API Endpoints**: Added secure `/api/suppliers/scrape-product` and `/api/suppliers/upload-pdf` endpoints with file validation and cleanup
- **Supplier Onboarding Integration**: Combined both extraction methods into unified supplier onboarding workflow with progress tracking and manual form completion
- **Security & Error Handling**: Implemented URL validation, file type checking, size limits, and comprehensive error messaging for production-ready deployment
- **Best-Effort Assistance**: Designed as productivity tool requiring human oversight, ensuring data integrity while speeding up supplier data entry process

### January 24, 2025 - GreenwashGuardian Integration Complete
- **Full App Integration**: Successfully incorporated GreenwashGuardian functionality as new sidebar tab in main sustainability platform
- **DMCC Act 2024 Compliance**: Built comprehensive analysis system for UK Digital Markets, Competition and Consumers Act 2024 requirements
- **Original Interface Recreation**: Recreated exact step-by-step wizard interface matching original GreenwashGuardian app design
- **Content Type Selection**: Four-card selection interface for Marketing Material, Website Content, Product Information, and Social Media
- **Progressive Steps**: Multi-step wizard with progress indicator and content-specific guidance for each analysis type
- **Backend API**: Implemented `/api/greenwash-guardian/analyze` endpoint with intelligent compliance assessment algorithms
- **Compliance Features**: Traffic light system (compliant/warning/non-compliant), specific DMCC section references, and actionable solutions
- **Educational Content**: Integrated DMCC Act 2024 information and best practices guidance directly in the interface
- **Pattern Recognition**: Automated detection of vague claims, substantiation levels, and evidence presence in marketing materials

### January 24, 2025 - GreenwashGuardian Navigation & Flow Improvements
- **Direct Card Navigation**: Removed continue button and made content type cards directly clickable for immediate step advancement
- **Fixed Analysis Flow**: Resolved premature "Analysis Complete" screen issue by implementing proper 4-step wizard progression
- **Complete Step 2**: Added comprehensive content input interface with textarea for content analysis and URL field for website scanning
- **Professional Step 3**: Built detailed analysis results page showing DMCC compliance assessment, risk scores, and actionable recommendations
- **Step 4 Completion**: Created review and download interface with report generation capability and wizard reset functionality
- **Enhanced Navigation**: Improved back button functionality to work seamlessly across all four wizard steps
- **User Experience**: Streamlined workflow eliminates unnecessary clicks and provides immediate feedback on content type selection

### January 24, 2025 - Application Loading Issues Resolved
- **Authentication Bypass**: Implemented temporary authentication bypass for development to resolve app loading issues
- **React App Debugging**: Added comprehensive debug logging to React startup process for troubleshooting
- **API Endpoint Issues**: Identified and documented routing conflicts between Express API and Vite dev server
- **App Functionality Restored**: Successfully resolved loading problems preventing access to GreenwashGuardian and other features
- **Debug Console Integration**: Added browser console logging to track React app initialization and rendering
- **Development Environment**: Confirmed working state with mock authentication for testing AI analysis functionality

### January 24, 2025 - Super Admin Dashboard Implementation Complete
- **Role-Based Access Control (RBAC)**: Added role column to users table with 'user' and 'admin' values, implemented admin middleware with secure permission checking
- **Admin API Endpoints**: Created comprehensive `/api/admin/` routes for analytics, supplier management, and LCA approval workflows
- **Platform Analytics**: Built real-time analytics dashboard showing user growth, supplier metrics, pending reviews with 30-second auto-refresh
- **Supplier Verification System**: Implemented admin supplier management with status filtering, detailed review modals, and one-click verification
- **LCA Approval Queue**: Created LCA report approval workflow with detailed review interface and admin approval tracking
- **Admin Navigation**: Added conditional admin navigation in sidebar, moved supplier data entry to admin-only access
- **Admin Seeding Script**: Created automated admin user seeding system for initial setup and role management
- **Security Architecture**: Implemented admin middleware protecting all admin routes with proper error handling and user role validation
- **UI Components**: Built comprehensive admin interface with real-time metrics, action items, platform health monitoring, and quick action buttons