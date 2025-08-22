# Drinks Sustainability Tool

## Overview
This platform provides comprehensive sustainability solutions for SME drinks brands, offering guided Life Cycle Assessment (LCA) reporting, supplier collaboration, and expert validation. Its core purpose is to help companies measure, manage, and report their environmental impact through user-friendly workflows and industry-specific tools. The business vision aims to empower drinks brands with accessible tools for environmental stewardship, capitalizing on the market potential for sustainable practices and driving positive industry-wide change.

## User Preferences
Preferred communication style: Simple, everyday language.
Admin email preference: tim@avallen.solutions for development authentication.

## System Architecture

### Frontend Architecture
- **Framework**: React with TypeScript, Vite
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
    - **Interactive Onboarding**: Shepherd.js for guided tours.
    - **Critical UI Requirement**: All dialog components must have opaque backgrounds with explicit styling (e.g., `bg-white`, `border`, `shadow`). Popups/dialogs must never be transparent.

### Backend Architecture
- **Runtime**: Node.js with Express.js
- **Language**: TypeScript with ES modules
- **Database**: PostgreSQL with Drizzle ORM (using Neon for serverless PostgreSQL)
- **Authentication**: Replit Auth with OpenID Connect, via passport.js and PostgreSQL-backed sessions.
- **Monorepo Structure**: Shared types between frontend and backend for type safety.

### System Design Choices
- **Authentication**: Replit Auth integration with CAPTCHA security, PostgreSQL session storage, automatic user creation/update on login, comprehensive login page redesign, rate limiting protection, robust onboarding system, and development mode admin authentication (tim@avallen.solutions) with consistent user ID management across frontend and backend.
- **Database Layer**: Drizzle ORM for type-safe queries, comprehensive schema for users, companies, products, suppliers, and reports.
- **Data Management**: TanStack Query for server state and caching, optimistic updates, intelligent query invalidation, centralized error handling.
- **Company Onboarding**: Streamlined 5-step wizard for company setup, including country selection and reporting period configuration.
- **Supplier Collaboration**: Companies create supplier records with unique tokens, suppliers submit data via a dedicated portal, supporting admin, supplier self-entry, and client submission workflows with comprehensive data integrity and validation.
- **Report Generation**: Production-grade comprehensive sustainability reports (8-page professional format) with authentic data integration, PDF conversion via Puppeteer, and status tracking.
- **Dashboard Metrics System**: Displays accurate CO2e, Water Usage, and Waste Generated values, synchronized with calculations.
- **Product Management**: Two-tier product system (`SUPPLIER_PRODUCTS` and `FINAL_PRODUCTS`), enhanced 8-tab product form with auto-sync to LCA data, supplier-first product selection, and OpenLCA ecoinvent database integration.
- **Image Management**: Comprehensive image upload, storage, and retrieval system with Google Cloud Storage backend.
- **Carbon Footprint Calculator**: Comprehensive 4-step wizard (Scope 1, 2, 3, Summary & Report) with automated calculations, real DEFRA 2024 emission factors, production-grade data integration, and fully functional OpenLCA integration delivering authentic CO2 calculations for 1,400+ ingredients across 19 categories with category-based fallback system.
- **GreenwashGuardian Integration**: Functionality to assess marketing materials against UK DMCC Act 2024 compliance.
- **Admin Dashboard**: Role-Based Access Control (RBAC) for 'user' and 'admin' roles, comprehensive interface for real-time metrics, supplier verification, and LCA approvals.
- **Real-Time Collaboration**: Production-grade polling-based messaging system for Replit compatibility, with full conversation synchronization between Collaboration Hub and Admin Dashboard.
- **Data Extraction**: Automated supplier data capture via URL web scraping (cheerio) and PDF document upload (Anthropic API), with mandatory human verification workflow and bulk import capabilities.
- **Performance Analytics**: Comprehensive real-time platform monitoring with performance metrics, user engagement analytics, and system health indicators.
- **KPI Tracking System**: Functionality to add, validate, and manage Key Performance Indicators (KPIs).
- **SMART Goals System**: Complete SMART Goals creation and management with proper database schema, API endpoints, and frontend interface for tracking and progress monitoring.
- **Dynamic Report Builder**: Comprehensive modular reporting system with professional template selection (Comprehensive Sustainability, Carbon-Focused, Basic Compliance, Stakeholder Engagement), advanced export options (Standard PDF, Branded PDF, Interactive Web Report, PowerPoint, Google Slides), and guided workflow. Includes initiative selection functionality for report customization.
- **Social Impact Data Management**: Complete social data collection and management system integrated with company sustainability data, tracking employee metrics and community impact.
- **UI/UX Improvements**: Enhanced navigation with Reports menu positioned between Products and GreenwashGuardian for improved user flow. Fixed Company page auto-save loop with user change tracking to prevent unnecessary saves. Enhanced Products page with properly positioned product thumbnails, comprehensive environmental metrics display (CO₂, Water, Waste footprints), and improved visual layout with centered images and professional styling.

## External Dependencies

- **@neondatabase/serverless**: PostgreSQL database connectivity
- **drizzle-orm**: Type-safe database queries and migrations
- **express**: Web server framework
- **passport**: Authentication middleware
- **openid-client**: OpenID Connect authentication
- **multer**: For server-side image uploads
- **cheerio**: For HTML parsing during web scraping
- **Anthropic API**: For AI-powered PDF data extraction
- **pdfkit**: For native PDF generation and document creation
- **@tanstack/react-query**: Server state management
- **@radix-ui/***: Accessible UI primitives
- **wouter**: Lightweight client-side routing
- **recharts**: Data visualization
- **react-hook-form**: Form handling
- **zod**: Schema validation
- **shepherd.js**: For interactive tours
- **Stripe API**: For payment processing
- **PptxGenJS**: For PowerPoint generation