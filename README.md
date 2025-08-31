# Overview

This is a full-stack deployment platform for XYLO-MD, a WhatsApp bot project. The application enables users to authenticate with GitHub and deploy their bot instances through GitHub Actions workflows. It features a React frontend with shadcn/ui components and an Express.js backend with PostgreSQL database integration via Drizzle ORM.

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend Architecture
- **Framework**: React 18 with TypeScript and Vite for development/build tooling
- **UI Library**: shadcn/ui components built on Radix UI primitives with Tailwind CSS for styling
- **State Management**: TanStack Query (React Query) for server state management and caching
- **Routing**: Wouter for lightweight client-side routing
- **Styling**: Tailwind CSS with CSS custom properties for theming and dark mode support

## Backend Architecture
- **Runtime**: Node.js with Express.js framework using TypeScript
- **Database ORM**: Drizzle ORM with PostgreSQL dialect for type-safe database operations
- **Session Management**: Express sessions with PostgreSQL session store (connect-pg-simple)
- **Authentication**: GitHub OAuth 2.0 flow for user authentication
- **API Structure**: RESTful API endpoints under `/api` prefix with proper error handling middleware

## Data Storage
- **Primary Database**: PostgreSQL with Neon Database serverless driver
- **Schema Design**: 
  - Users table for storing GitHub user credentials
  - Deployments table for tracking deployment history and status
- **Migration System**: Drizzle Kit for schema migrations and database management
- **Fallback Storage**: In-memory storage implementation for development/testing

## Authentication & Authorization
- **OAuth Provider**: GitHub OAuth with repository and workflow permissions
- **Session Security**: Secure session cookies with configurable security settings
- **Token Management**: GitHub access tokens stored securely in user sessions
- **Authorization Flow**: State parameter validation for CSRF protection

## GitHub Integration
- **API Integration**: GitHub REST API v3 for repository and workflow operations
- **Deployment Triggers**: GitHub Actions workflow dispatch for automated deployments
- **Repository Management**: Dynamic repository targeting with configurable owner/name
- **Error Handling**: Comprehensive error handling for GitHub API rate limits and failures

## Development & Build
- **Development Server**: Vite dev server with HMR and TypeScript compilation
- **Production Build**: Separate client and server builds with esbuild for server bundling
- **Code Quality**: TypeScript strict mode with path mapping for clean imports
- **Asset Handling**: Static asset serving with Vite plugin integration for Replit environment

# External Dependencies

## Core Framework Dependencies
- **@neondatabase/serverless**: Serverless PostgreSQL driver for Neon Database
- **drizzle-orm & drizzle-kit**: Type-safe ORM and migration toolkit
- **express & express-session**: Web framework and session management
- **axios**: HTTP client for GitHub API requests
- **connect-pg-simple**: PostgreSQL session store for Express

## UI/UX Dependencies
- **@radix-ui/***: Comprehensive set of unstyled UI primitives
- **@tanstack/react-query**: Server state management and caching
- **tailwindcss**: Utility-first CSS framework
- **class-variance-authority & clsx**: Conditional styling utilities
- **react-hook-form & @hookform/resolvers**: Form handling with validation

## Development Tools
- **vite & @vitejs/plugin-react**: Build tooling and React plugin
- **typescript**: Type checking and compilation
- **@replit/vite-plugin-***: Replit-specific development plugins
- **wouter**: Lightweight routing library for React

## External Services
- **GitHub OAuth API**: User authentication and authorization
- **GitHub REST API**: Repository and workflow management
- **Neon Database**: Serverless PostgreSQL hosting
- **GitHub Actions**: Automated deployment workflows
