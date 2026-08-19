<div id="top"></div>

# <p align="center">✨ Cashier POS ✨</p>
<p align="center">
   
<div align="center"> 
    <h1> 
      <img src="https://readme-typing-svg.herokuapp.com?font=Jetbrains+mono&size=25&duration=3200&color=4FC3F7&center=true&vCenter=true&width=550&lines=Welcome+to+Cashier+POS+Enterprise!;" alt="Title"/> 
    </h1>
</div>

<div align="center">
  <img src="https://img.icons8.com/color/344/cash-register.png" alt="POS Logo" width="120">
</div>

 <h2>Hi there👋, Welcome to the Cashier & Store Management Platform! </h2>

<p>
A full-stack, enterprise-grade Point of Sale (POS) and Store Management web application. Built with modern web technologies, this application offers a robust, highly responsive, and localized (English) interface for cashiers, alongside powerful managerial tools for inventory, CRM, and AI-driven business insights.
</p>

<!--line-->
<img src="https://raw.githubusercontent.com/akhbarulhadi/akhbarulhadi.github.io/refs/heads/master/animated-line-image.gif" width="1920" />

<h2>Table of Contents🧾</h2>

- [Overview📌](#overview)
- [Key Features🚀](#key-features)
- [Tech Stack💻](#tech-stack)
- [Demo🌐](#demo)
- [Installation⚙️](#installation)
- [Creator⚡](#creator)

<br>
<!--line-->
<img src="https://raw.githubusercontent.com/akhbarulhadi/akhbarulhadi.github.io/refs/heads/master/animated-line-image.gif" width="1920" />

<h2 id="overview">Overview📌</h2>

<p>
This project was built with the goal of delivering a seamless and accessible checkout and store management platform. Key objectives include:
</p>

<ol>
  <li>
    <strong>Transaction & Cart Management:</strong> Streamlined cashier checkout process with support for holding/resuming orders, applying taxes and discounts, and processing multiple payment methods (Cash, Card, QRIS, E-Wallet).
  </li>
  <li>
    <strong>Advanced Inventory Tracking:</strong> Detailed stock movement ledgers (purchases, sales, refunds, and manual adjustments) to trace every single item entering or leaving the system.
  </li>
  <li>
    <strong>AI Business Advisor:</strong> Built-in AI chat using the Groq API to provide owners and managers with intelligent business strategies based on sales data.
  </li>
</ol>


<!--line-->
<img src="https://raw.githubusercontent.com/akhbarulhadi/akhbarulhadi.github.io/refs/heads/master/animated-line-image.gif" width="1920" />

<h2 id="key-features">Key Features🚀</h2>
<ul>
  <li>🛒 <strong>Point of Sale (POS):</strong> Fast and responsive cart management.</li>
  <li>🌍 <strong>English Localized UI:</strong> Fully translated, intuitive user interface.</li>
  <li>📦 <strong>Product & Category Management:</strong> Comprehensive master data management.</li>
  <li>👥 <strong>Customer Relationship Management (CRM):</strong> Track customer data and transaction history.</li>
  <li>🔒 <strong>Role-Based Access Control:</strong> Differentiated access levels for <code>OWNER</code>, <code>ADMIN</code>, and <code>CASHIER</code>.</li>
  <li>🖨️ <strong>Printable Receipts:</strong> Dynamic receipt generation using <code>html2canvas</code> and <code>jspdf</code>.</li>
</ul>

<p align="right"><a href="#top"><img src="https://img.shields.io/badge/Move%20to%20top-Blue?style=plastic" alt="Back To Top"></a></p>

<!--line-->
<img src="https://raw.githubusercontent.com/akhbarulhadi/akhbarulhadi.github.io/refs/heads/master/animated-line-image.gif" width="1920" />

<h2 id="tech-stack">Tech Stack💻</h2>

* **Framework:** [Next.js 14](https://nextjs.org/) (App Router)
* **Language:** TypeScript
* **Database:** PostgreSQL (Hosted on [Supabase](https://supabase.com/))
* **ORM:** [Prisma](https://www.prisma.io/)
* **Authentication:** Supabase SSR Auth
* **Styling:** Tailwind CSS & [shadcn/ui](https://ui.shadcn.com/)
* **State Management:** Zustand
* **AI Integration:** Groq SDK

<p align="right"><a href="#top"><img src="https://img.shields.io/badge/Move%20to%20top-Blue?style=plastic" alt="Back To Top"></a></p>

<!--line-->
<img src="https://raw.githubusercontent.com/akhbarulhadi/akhbarulhadi.github.io/refs/heads/master/animated-line-image.gif" width="1920" />

<h2 id="demo">Demo🌐</h2>

<h3>🌐 Live Web Demo</h3>
<p>
  You can try out the live web application here: 
  <strong><a href="https://cashier-pos-five.vercel.app/">cashier-pos-five.vercel.app</a></strong>
</p>

<hr>

<p>
  🔐 <strong>Demo Accounts:</strong><br>
  The application provides three user roles with different access privileges:
</p>

<ul>
  <li>
    <strong>OWNER</strong> – Full access to everything, including AI Advisor, staff management, and all financial reports.
    <ul>
      <li><strong>Email:</strong> <code>owner@gmail.com</code></li>
      <li><strong>Password:</strong> <code>123456</code></li>
    </ul>
  </li>
  <li>
    <strong>ADMIN</strong> – Access to inventory management, transaction history, and basic reports, but cannot access AI Advisor or manage staff.
    <ul>
      <li><strong>Email:</strong> <code>admin@gmail.com</code></li>
      <li><strong>Password:</strong> <code>123456</code></li>
    </ul>
  </li>
  <li>
    <strong>CASHIER</strong> – Access restricted only to the POS checkout interface and customer registration.
    <ul>
      <li><strong>Email:</strong> <code>cashier@gmail.com</code></li>
      <li><strong>Password:</strong> <code>123456</code></li>
    </ul>
  </li>
</ul>

<p align="right"><a href="#top"><img src="https://img.shields.io/badge/Move%20to%20top-Blue?style=plastic" alt="Back To Top"></a></p>

<!--line-->
<img src="https://raw.githubusercontent.com/akhbarulhadi/akhbarulhadi.github.io/refs/heads/master/animated-line-image.gif" width="1920" />

<h2 id="installation">Installation⚙️</h2>

### 1. Clone the repository
```bash
git clone https://github.com/akhbarulhadi/Cashier_POS.git
cd Cashier_POS
```

### 2. Install dependencies
```bash
npm install
```

### 3. Environment Variables
Copy the `.env.example` file and rename it to `.env` in the root directory, then configure the following keys:

```bash
cp .env.example .env
```

```env
# SUPABASE
NEXT_PUBLIC_SUPABASE_URL="https://xxxxxxxxxxxxxxxxxxxx.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="ey.dummy.anon.key.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"

# Service Role Key HANYA dipakai di server (API routes/admin tasks).
SUPABASE_SERVICE_ROLE_KEY="ey.dummy.service.role.key.xxxxxxxxxxxxxxxxxxxxxxxxxxxx"

# Connection Pooling
DATABASE_URL="postgresql://postgres.xxxxxxxxxxxxxxxxxxxx:YOUR-PASSWORD@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true"

# Direct Connection
DIRECT_URL="postgresql://postgres.xxxxxxxxxxxxxxxxxxxx:YOUR-PASSWORD@aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres"

# GROQ AI API
GROQ_API_KEY="gsk_dummy_groq_api_key_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
GROQ_MODEL="openai/gpt-oss-120b"

# APP CONFIG
NEXT_PUBLIC_APP_URL="http://localhost:3000"
NEXT_PUBLIC_APP_NAME="POS Enterprise"

# Timezone default untuk laporan & struk
APP_TIMEZONE="Asia/Jakarta"
```

### 4. Database Setup & Migration
```bash
npx prisma generate
npx prisma db push
npm run prisma:seed
```

### 5. Setup Supabase Auth Triggers
Since Prisma does not automatically migrate custom database functions and triggers, you need to manually add them to your Supabase project to ensure the authentication system syncs properly with the `public.users` table:

1. Open the file `prisma/sql/sync_auth_user_trigger.sql` in your code editor and copy all of its contents.
2. Go to your project dashboard on **Supabase**.
3. Navigate to the **SQL Editor** menu on the left panel.
4. Click **New query**, paste the copied SQL code, and click **Run**.

### 6. Run the Development Server
```bash
npm run dev
```

<p align="right"><a href="#top"><img src="https://img.shields.io/badge/Move%20to%20top-Blue?style=plastic" alt="Back To Top"></a></p>

<!--line-->
<img src="https://raw.githubusercontent.com/akhbarulhadi/akhbarulhadi.github.io/refs/heads/master/animated-line-image.gif" width="1920" />

<div align="center">
  
<h2 id="creator">Creator </h2>

<table>
<tr>
<td align="center"><a href="https://github.com/akhbarulhadi"><img src="https://avatars.githubusercontent.com/u/129871091?v=4" width=130px height=130px /></a></br> <h4 style="color:red;">Akhbarul Hadi</h4>
 <a href="https://github.com/akhbarulhadi"><img src="https://img.icons8.com/fluency/2x/github.png" width="32px" height="32px"></img></a>
</td>
</tr>
</table>
  
</div>

<!--line-->
<img src="https://raw.githubusercontent.com/akhbarulhadi/akhbarulhadi.github.io/refs/heads/master/animated-line-image.gif" width="1920" />

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for more details.

<p align="center">
  <img src="https://img.shields.io/badge/License-MIT-blue.svg?style=for-the-badge" alt="License: MIT">
</p>

<p align="right"><a href="#top"><img src="https://img.shields.io/badge/Move%20to%20top-Blue?style=plastic" alt="Back To Top"></a></p>
