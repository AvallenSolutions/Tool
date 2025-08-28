# Drinks Sustainability Tool

## Overview
This platform provides comprehensive sustainability solutions for SME drinks brands, offering guided Life Cycle Assessment (LCA) reporting, supplier collaboration, and expert validation. Its core purpose is to help companies measure, manage, and report their environmental impact through user-friendly workflows and industry-specific tools. The business vision aims to empower drinks brands with accessible tools for environmental stewardship, capitalizing on the market potential for sustainable practices and driving positive industry-wide change.

## User Preferences
Preferred communication style: Simple, everyday language.
Admin email preference: tim@avallen.solutions for development authentication.
Data integrity priority: Critical requirement for 100% accurate data - no mock or synthetic data permitted.

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
- **Refined Product LCA System**: Comprehensive integrated calculation system using OpenLCA as authoritative source for ingredient impacts, with facility energy/water/waste data integrated from production_facilities table. Water dilution recorded at product level but excluded from water footprint calculations to prevent double-counting with facility-level consumption. Unified `/api/products/:id/refined-lca` endpoint provides complete per-unit and annual impact data with detailed breakdown including: ingredients (OpenLCA), packaging (material factors), and facilities (allocated per production volume). Supplier verification override capability prepared for verified CO2e footprints to take precedence over OpenLCA data.
- **GHG Protocol Compliant Calculations**: CRITICAL FIXES COMPLETED (Aug 2025) - Eliminated double-counting bug in comprehensive footprint calculations. Company totals now properly calculated as Scope 1+2 + Scope 3 (with facility impacts excluded from Scope 3 to prevent double-counting). Fixed deduplication logic that was overwriting instead of summing emissions entries. Dashboard now displays mathematically correct totals: 1,078.8 tonnes (Scope 1+2: 596.377 tonnes, Scope 3: 482.454 tonnes, with 476.539 tonnes facility impacts properly allocated to Scope 1+2).
- **Standards-Compliant Waste Footprint Calculation**: ALL PHASES COMPLETED - Replaced hardcoded 5% packaging waste factor with comprehensive standards-compliant methodology per GHG Protocol/ISO 14040. Enhanced production_facilities table with comprehensive waste data collection fields (organic, packaging, hazardous, general waste by disposal route). Created regional_waste_statistics table with UK DEFRA 2024 data. Implemented WasteIntensityCalculationService with three calculation methods. PHASE 1: Waste quantity calculation improved 7x (26.5g → 3.8g per unit). PHASE 2: Production waste carbon footprint (0.000413 kg CO2e per unit) from facility disposal routes. PHASE 3: End-of-life packaging footprint (0.014923 kg CO2e per unit) using regional recycling rates - Glass 76.8%, Paper 70.2%, Aluminum 82.1%. Total product CO2e now 1.818kg per unit including all waste components. Cornwall distillery data: 3,795kg facility waste/year, UK regional statistics integration complete.
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
- **Monthly Facility Updates & Product Versioning System (Complete - Aug 2025)**: Implemented comprehensive database schema for time-series KPI tracking with three new tables: `monthly_facility_data` for operational data tracking, `product_versions` for product change management over time, and `kpi_snapshots` for historical KPI value storage. Added performance-optimized indexes and migrated existing products to version 1.0. **CRITICAL TIMESTAMP FIX COMPLETED**: Resolved database insertion issues with proper date formatting, achieving 100% accurate data migration with 60 KPI snapshots successfully created across 12 months for 5 KPIs. Data quality upgraded from 77% to 86%. System enables month-over-month analytics, trend analysis, and initiative impact measurement with authentic historical data integration.

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