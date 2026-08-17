# Modern POS Enterprise - Cashier & Store Management

A full-stack, enterprise-grade Point of Sale (POS) and Store Management web application. Built with modern web technologies, this application offers a robust, highly responsive, and localized (English) interface for cashiers, alongside powerful managerial tools for inventory, CRM, and AI-driven business insights.

## Live Demo
[View Live Demo Here](#) *(Replace with your deployment link)*

## Key Features

* **Transaction & Cart Management:** Streamlined cashier checkout process with support for holding/resuming orders, applying taxes and discounts, and processing multiple payment methods (Cash, Card, QRIS, E-Wallet).
* **English Localized UI:** Fully translated, intuitive user interface designed for maximum efficiency and clarity.
* **Product & Category Management:** Comprehensive master data management for products and categories.
* **Smart Soft-Delete Mechanism:** Features a unique "Soft Delete" system. When products or categories are deleted, their unique identifiers (like SKUs and Names) are timestamped and archived. This ensures historical transaction data remains intact while freeing up the SKU/Name for new entries without database constraint errors.
* **Advanced Inventory Tracking:** Detailed stock movement ledgers (purchases, sales, refunds, and manual adjustments) to trace every single item entering or leaving the system.
* **Customer Relationship Management (CRM):** Track customer data, transaction history, and loyalty points.
* **Role-Based Access Control:** Differentiated access levels for `OWNER`, `ADMIN`, and `CASHIER`.
* **AI Business Advisor:** Built-in AI chat using the Groq API to provide owners and managers with intelligent business strategies based on sales data.
* **Printable Receipts:** Dynamic receipt generation using `html2canvas` and `jspdf`.

## Tech Stack

* **Framework:** [Next.js 14](https://nextjs.org/) (App Router)
* **Language:** TypeScript
* **Database:** PostgreSQL (Hosted on [Supabase](https://supabase.com/))
* **ORM:** [Prisma](https://www.prisma.io/)
* **Authentication:** Supabase SSR Auth
* **Styling:** Tailwind CSS & [shadcn/ui](https://ui.shadcn.com/) (Radix UI primitives)
* **Form & Validation:** React Hook Form + Zod
* **State Management:** Zustand
* **AI Integration:** Groq SDK
* **Charts:** Recharts

## Prerequisites

Before you begin, ensure you have the following installed:
* **Node.js:** Version 20.x or higher
* **npm** or **yarn** or **pnpm**
* **PostgreSQL:** A local instance or a cloud database like Supabase

## Local Setup & Installation

Follow these steps to get the project running locally on your machine.

### 1. Clone the repository
```bash
git clone https://github.com/your-username/pos-enterprise.git
cd pos-enterprise
```

### 2. Install dependencies
```bash
npm install
```

### 3. Environment Variables
Create a `.env` file in the root directory and add the following keys. 

```env
# Database connection string (e.g., Supabase transaction pooler)
DATABASE_URL="postgresql://postgres:[PASSWORD]@[HOST]:5432/postgres?pgbouncer=true"

# Direct connection for Prisma migrations
DIRECT_URL="postgresql://postgres:[PASSWORD]@[HOST]:5432/postgres"

# Supabase Auth
NEXT_PUBLIC_SUPABASE_URL="https://your-project.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="your-anon-key"

# Groq AI API Key
GROQ_API_KEY="gsk_your_groq_api_key_here"
```

### 4. Database Setup & Migration
Generate the Prisma client and push the schema to your database.
```bash
npx prisma generate
npx prisma db push
# or if you prefer using migrations: npx prisma migrate dev
```

*(Optional)* Seed the database with initial data:
```bash
npm run prisma:seed
```

### 5. Run the Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Folder Structure

```text
pos-enterprise/
├── app/                  # Next.js App Router (Pages, Layouts, API Routes)
│   ├── (dashboard)/      # Protected routes (POS, Inventory, CRM, Settings)
│   ├── api/              # Backend API endpoints (RESTful)
│   └── auth/             # Authentication pages (Login, Register)
├── components/           # Reusable React components
│   ├── pos/              # Cashier specific UI (Cart, Dialogs)
│   ├── products/         # Inventory UI components
│   ├── receipt/          # Receipt templates for printing
│   └── ui/               # Base UI components (shadcn/ui)
├── lib/                  # Utility functions, helpers, and config
│   └── validations/      # Zod schemas for API and Form validation
├── prisma/               # Prisma ORM setup
│   ├── schema.prisma     # Database models and relations
│   └── seed.ts           # Database seeder script
├── public/               # Static assets (images, fonts, icons)
├── package.json          # Project metadata and dependencies
└── tailwind.config.ts    # Tailwind CSS configuration
```

## License

This project is licensed under the MIT License - see the LICENSE file for details.

---
**Author:** Made by 💖 Akhbarul Hadi (2026)
