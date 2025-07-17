# Drinks Sustainability Tool

## Overview

This is a comprehensive sustainability platform designed for SME drinks brands, providing guided Life Cycle Assessment (LCA) reporting, supplier collaboration, and expert validation. The application helps companies measure, manage, and report their environmental impact with a focus on user-friendly workflows and industry-specific requirements.

## User Preferences

Preferred communication style: Simple, everyday language.

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
1. New users complete multi-step onboarding wizard
2. Company profile, operational data, and initial products created
3. Supplier invitations sent during setup
4. Onboarding completion unlocks main dashboard

### Supplier Collaboration Flow
1. Companies create supplier records with unique tokens
2. Suppliers receive portal links via email
3. Suppliers submit environmental data through dedicated portal
4. Data integrated into company's sustainability calculations

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