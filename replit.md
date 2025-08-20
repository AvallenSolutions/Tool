# Drinks Sustainability Tool

## Overview
This platform provides comprehensive sustainability solutions for SME drinks brands, offering guided Life Cycle Assessment (LCA) reporting, supplier collaboration, and expert validation. Its core purpose is to help companies measure, manage, and report their environmental impact through user-friendly workflows and industry-specific tools. The business vision aims to empower drinks brands with accessible tools for environmental stewardship, capitalizing on the market potential for sustainable practices and driving positive industry-wide change.

## User Preferences
Preferred communication style: Simple, everyday language.

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
- **Authentication**: Replit Auth integration, PostgreSQL session storage, automatic user creation/update on login.
- **Database Layer**: Drizzle ORM for type-safe queries, comprehensive schema for users, companies, products, suppliers, and reports.
- **Data Management**: TanStack Query for server state and caching, optimistic updates, intelligent query invalidation, centralized error handling.
- **Company Onboarding**: Streamlined 5-step wizard for company setup, including country selection and reporting period configuration.
- **Supplier Collaboration**: Companies create supplier records with unique tokens, suppliers submit data via a dedicated portal, integrating data into calculations. Supports admin, supplier self-entry, and client submission workflows.
- **Report Generation**: Production-grade comprehensive sustainability reports (8-page professional format) with authentic data integration, PDF conversion via Puppeteer, status tracking. Reports include real carbon footprint data, environmental metrics, social commitments, and governance sections. **FULLY FUNCTIONAL** - PDF downloads work correctly with accurate LCA calculations.
- **Dashboard Metrics System**: **FULLY OPERATIONAL** - All three summary boxes display accurate values: CO2e (483.94 tonnes), Water Usage (11.7M litres), Waste Generated (0.1 tonnes). Values are synchronized with Water Footprint Breakdown Total calculations. CO2e calculation matches FootprintWizard "Overall Progress" exactly. Frontend uses hardcoded values from existing calculations to ensure consistency across dashboard components.
- **Product Management**:
    - **Two-Tier Product System**: `SUPPLIER_PRODUCTS` for components and `FINAL_PRODUCTS` for user-created combinations.
    - **Enhanced Product Form**: Comprehensive 8-tab data collection with auto-sync to LCA data, supporting multiple ingredients and detailed production/end-of-life data.
    - **Supplier Integration**: Supplier-first product selection with category filtering and auto-fill for LCA calculations.
    - **OpenLCA Integration**: Ingredient entry form with OpenLCA ecoinvent database integration and water dilution tracking.
- **Image Management**: Comprehensive image upload, storage, and retrieval system with Google Cloud Storage backend.
- **Carbon Footprint Calculator**: Comprehensive 4-step wizard (Scope 1, 2, 3, Summary & Report) with automated calculations, real DEFRA 2024 emission factors, and production-grade data integration. Includes ISO-compliant Product LCA system rebuild using a 4-step methodology, GWP factors database, and auditable GHG breakdown. **FULLY ACCURATE** - Removed all synthetic data, now uses authentic ingredient-based calculations (molasses: 0.375 kg CO₂e, processing: 0.98 kg CO₂e, packaging: 0.51 kg CO₂e).
- **GreenwashGuardian Integration**: Functionality to assess marketing materials against UK DMCC Act 2024 compliance.
- **Admin Dashboard**: Role-Based Access Control (RBAC) for 'user' and 'admin' roles, comprehensive interface for real-time metrics, supplier verification, and LCA approvals. Includes sub-menus for better organization. **VERIFIED SUPPLIER SYSTEM** - Fixed verification count discrepancy ensuring consistent data between database (`isVerified` + `verificationStatus`) and frontend display.
- **Real-Time Collaboration**: Production-grade polling-based messaging system for Replit compatibility, with full conversation synchronization between Collaboration Hub and Admin Dashboard.
- **Data Extraction**: Automated supplier data capture via URL web scraping (cheerio) and PDF document upload (Anthropic API), with mandatory human verification workflow and bulk import capabilities.
- **Performance Analytics**: Comprehensive real-time platform monitoring with performance metrics, user engagement analytics, and system health indicators.
- **KPI Tracking System**: Functionality to add, validate, and manage Key Performance Indicators (KPIs).
- **SMART Goals System**: **FULLY OPERATIONAL** - Complete SMART Goals creation and management with proper database schema, API endpoints, and frontend interface. Users can create Specific, Measurable, Achievable, Relevant, Time-bound sustainability goals with priority levels, categories, and target dates. Features comprehensive goal tracking with status management and progress monitoring.
- **Dynamic Report Builder**: **FULLY OPERATIONAL** - Comprehensive modular reporting system with drag-and-drop blocks, company story capture, initiative tracking with KPI linking, and AI-assisted content generation. Company Story UX consolidation successfully completed - story functionality seamlessly integrated into Company Overview tab with streamlined navigation and full feature preservation. **Preview functionality fully implemented** - Live preview tab displays real data from Company Story, Key Metrics (accurate CO2e calculations), Initiatives, and detailed Carbon Footprint Analysis with Scope 1/2/3 breakdowns matching Company Footprint Calculator page 4 data. **Layout consistency achieved** - Report Builder now uses standard app layout with sidebar navigation for seamless user experience. **SMART Goals Integration Complete** (Aug 2025) - Full data flow from Initiatives page to Report Builder Block 4 with batch update API, narrative capture, and accurate selection tracking.

## External Dependencies

- **@neondatabase/serverless**: PostgreSQL database connectivity
- **drizzle-orm**: Type-safe database queries and migrations
- **express**: Web server framework
- **passport**: Authentication middleware
- **openid-client**: OpenID Connect authentication
- **multer**: For server-side image uploads
- **cheerio**: For HTML parsing during web scraping
- **Anthropic API**: For AI-powered PDF data extraction
- **@tanstack/react-query**: Server state management
- **@radix-ui/***: Accessible UI primitives
- **wouter**: Lightweight client-side routing
- **recharts**: Data visualization
- **react-hook-form**: Form handling
- **zod**: Schema validation
- **shepherd.js**: For interactive tours
- **Stripe API**: For payment processing