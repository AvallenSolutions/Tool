# Drinks Sustainability Tool

## Overview

This is a comprehensive sustainability platform designed for SME drinks brands, providing guided Life Cycle Assessment (LCA) reporting, supplier collaboration, and expert validation. The application helps companies measure, manage, and report their environmental impact with a focus on user-friendly workflows and industry-specific requirements. The business vision is to empower drinks brands with accessible tools for environmental stewardship, leveraging market potential for sustainable practices and driving industry-wide positive change.

## Recent Changes (January 2025)

### MVP Enhancement - 5-Phase Implementation Complete ✅
- **Phase 1**: Enhanced database schema with comprehensive image storage support via Google Cloud Storage integration
- **Phase 2**: Complete image upload system with ObjectUploader component and secure object storage workflows  
- **Phase 3**: Advanced product search with SearchAndFilterBar component integrated into supplier selection modals
- **Phase 4**: Full supplier invitation & onboarding system with secure token-based workflows (7-day expiration), admin management interface, and complete supplier registration workflow
- **Phase 5**: Final testing, polish, and system validation - all core functionality verified and ready for deployment

### Critical Security & Stability Fixes (January 18, 2025) ✅
- **TypeScript Safety**: Resolved all 55 LSP diagnostics - zero compilation errors
- **Database Integrity**: Fixed schema mismatches in supplier invitation system
- **Security Enhancement**: Added Helmet.js, CSP, rate limiting, input sanitization
- **API Updates**: Updated Stripe API to latest version (2024-12-18.acacia)
- **Typography**: Updated to Space Grotesk (headlines) and Raleway (body text)

### Supplier Logo Upload System Complete (August 12, 2025) ✅
- **Upload Integration**: Fixed ObjectUploader component to prevent form submission conflicts
- **Path Conversion**: Implemented proper Google Cloud Storage URL to API path conversion
- **Database Updates**: Resolved backend filtering issues preventing logoUrl field saves
- **Full Workflow**: Complete supplier logo upload with automatic database updates and display across all pages

### Key Features Added
- **Secure Supplier Invitations**: Token-based invitation system with email integration and admin management dashboard
- **Enhanced Product Search**: Real-time filtering by category, search terms, and supplier selection in modal interfaces  
- **Professional Image Management**: Complete upload, storage, and retrieval system with Google Cloud Storage backend
- **Comprehensive Onboarding**: Multi-step supplier registration with validation, approval workflows, and admin oversight

## User Preferences

Preferred communication style: Simple, everyday language.

**Critical UI Requirements:**
- NEVER make popups/dialogs transparent - all dialog components must have opaque backgrounds with explicit styling (bg-white, border, shadow)
- User explicitly stated: "NEVER make popups transparent" - this is mandatory for all dialog interfaces

## System Architecture

### Frontend Architecture
- **Framework**: React with TypeScript
- **Build Tool**: Vite
- **UI Library**: Shadcn/ui (built on Radix UI)
- **Styling**: Tailwind CSS with custom design tokens
- **State Management**: TanStack Query
- **Routing**: Wouter
- **Forms**: React Hook Form with Zod validation
- **UI/UX Decisions**:
    - **Color Scheme**: Green primary (Avallen brand), slate gray, and muted gold accents
    - **Typography**: Space Grotesk (headlines/subtitles), Raleway (body text)
    - **Responsive Design**: Mobile-first approach with Tailwind breakpoints
    - **Design System**: Shadcn/ui with custom Avallen branding
    - **Interactive Onboarding**: Shepherd.js for guided tours with CSS animations, visual highlights, and professional styling.

### Backend Architecture
- **Runtime**: Node.js with Express.js
- **Language**: TypeScript with ES modules
- **Database**: PostgreSQL with Drizzle ORM (using Neon for serverless PostgreSQL)
- **Authentication**: Replit Auth with OpenID Connect, managed via passport.js and PostgreSQL-backed sessions.
- **Monorepo Structure**: Shared types between frontend and backend for type safety.

### System Design Choices
- **Authentication**: Replit Auth integration, PostgreSQL session storage with TTL, automatic user creation/update on login.
- **Database Layer**: Drizzle ORM for type-safe queries, comprehensive schema for users, companies, products, suppliers, and reports, Drizzle Kit for migrations.
- **Data Management**: TanStack Query for server state and caching, optimistic updates, intelligent query invalidation, centralized error handling, and loading states.
- **Company Onboarding**: Streamlined 4-step wizard for company setup, including country selection and optional data entry.
- **Supplier Collaboration**: Companies create supplier records with unique tokens, suppliers submit data via a dedicated portal, data integrates into calculations. Supports admin, supplier self-entry, and client submission workflows.
- **Report Generation**: Users generate multi-page LCA reports (ISO 14040/14044 compliant) with status tracking, expert validation for premium features, and background job processing. Reports include 7 sections with professional styling.
- **Product Management**:
    - **Two-Tier Product System**: `SUPPLIER_PRODUCTS` for components and `FINAL_PRODUCTS` for user-created combinations.
    - **Enhanced Product Form**: 8-tab comprehensive data collection (Basic Info, Ingredients, Packaging, Production, Environmental Impact, Certifications, Distribution, End of Life) with auto-sync to LCA data.
    - **Dynamic Data Entry**: Support for multiple ingredients, comprehensive packaging specifications, and detailed production/end-of-life data.
    - **Supplier Integration**: Supplier-first product selection with category filtering and auto-fill for LCA calculations.
- **Image Management**: Scraped image selection with limits, delete/reorder functionality, and post-save manual image upload via Multer.
- **GreenwashGuardian Integration**: Functionality to assess marketing materials against UK DMCC Act 2024 compliance, with a step-by-step wizard, traffic light system for compliance, and actionable solutions.
- **Admin Dashboard**: Role-Based Access Control (RBAC) for 'user' and 'admin' roles, comprehensive three-section interface (Platform Analytics & Health, Supplier Management, Action Items Queue) for real-time metrics, supplier verification, and LCA approvals.
- **Data Extraction**: Automated supplier data capture via URL web scraping (cheerio) and PDF document upload (Anthropic API), with mandatory human verification workflow. Includes bulk import capabilities for catalogs.

## External Dependencies

### Core Dependencies
- **@neondatabase/serverless**: PostgreSQL database connectivity
- **drizzle-orm**: Type-safe database queries and migrations
- **express**: Web server framework
- **passport**: Authentication middleware
- **openid-client**: OpenID Connect authentication
- **multer**: For server-side image uploads
- **cheerio**: For HTML parsing during web scraping
- **Anthropic API**: For AI-powered PDF data extraction

### Frontend Dependencies
- **@tanstack/react-query**: Server state management
- **@radix-ui/***: Accessible UI primitives
- **wouter**: Lightweight client-side routing
- **recharts**: Data visualization
- **react-hook-form**: Form handling
- **zod**: Schema validation
- **shepherd.js**: For interactive tours

### Development Dependencies
- **vite**: Build tool and dev server
- **typescript**: Type checking
- **tailwindcss**: Utility-first CSS
- **tsx**: TypeScript execution for development