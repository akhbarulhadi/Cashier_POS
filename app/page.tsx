import Link from "next/link";
import { ArrowRight, Bot, Globe, Package, ShoppingCart, Store } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Footer } from "@/components/layout/Footer";
import { createClient } from "@/utils/supabase/server";

export default async function HomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Navigation */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-between mx-auto px-4 md:px-6">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
              <Store className="h-5 w-5 text-primary" />
            </div>
            <span className="text-xl font-bold tracking-tight">POS Enterprise</span>
          </div>
          <nav className="flex items-center gap-4">
            {user ? (
              <Link href="/dashboard">
                <Button>
                  Go to Dashboard <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            ) : (
              <Link href="/login">
                <Button variant="default">Login</Button>
              </Link>
            )}
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1">
        {/* Hero Section */}
        <section className="w-full py-24 md:py-32 lg:py-48 bg-gradient-to-b from-primary/5 via-background to-background">
          <div className="container px-4 md:px-6 mx-auto text-center">
            <div className="mx-auto max-w-3xl space-y-6">
              <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl md:text-6xl lg:text-7xl text-foreground">
                Modern Cashier & <br className="hidden sm:block" />
                <span className="text-primary">Store Management</span>
              </h1>
              <p className="mx-auto max-w-[700px] text-lg text-muted-foreground md:text-xl">
                A full-stack, enterprise-grade Point of Sale web application. 
                Experience a highly responsive, English-localized interface designed for maximum efficiency.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-6">
                {user ? (
                  <Link href="/dashboard">
                    <Button size="lg" className="w-full sm:w-auto h-12 px-8 text-base">
                      Access Dashboard <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </Link>
                ) : (
                  <Link href="/login">
                    <Button size="lg" className="w-full sm:w-auto h-12 px-8 text-base">
                      Get Started Now <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </Link>
                )}
                <a
                  href="#features"
                  className="text-sm font-medium hover:underline underline-offset-4 text-muted-foreground h-12 flex items-center px-4"
                >
                  Learn more &darr;
                </a>
              </div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section id="features" className="w-full py-16 md:py-24 lg:py-32 border-t bg-muted/30">
          <div className="container px-4 md:px-6 mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
                Everything you need to run your store
              </h2>
              <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
                Built with modern web technologies, offering robust tools for inventory, CRM, and AI-driven business insights.
              </p>
            </div>
            
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4 max-w-6xl mx-auto">
              {/* Feature 1 */}
              <Card className="border-0 shadow-md">
                <CardHeader>
                  <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                    <ShoppingCart className="h-5 w-5 text-primary" />
                  </div>
                  <CardTitle>Smart Transactions</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-sm">
                    Streamlined checkout process with support for holding orders, applying taxes and discounts, and processing multiple payment methods (Cash, Card, QRIS).
                  </CardDescription>
                </CardContent>
              </Card>

              {/* Feature 2 */}
              <Card className="border-0 shadow-md">
                <CardHeader>
                  <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                    <Package className="h-5 w-5 text-primary" />
                  </div>
                  <CardTitle>Master Data & Inventory</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-sm">
                    Comprehensive master data management featuring a unique "Soft Delete" mechanism to safely archive products while preserving historical transaction data.
                  </CardDescription>
                </CardContent>
              </Card>

              {/* Feature 3 */}
              <Card className="border-0 shadow-md">
                <CardHeader>
                  <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                    <Bot className="h-5 w-5 text-primary" />
                  </div>
                  <CardTitle>AI Business Advisor</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-sm">
                    Built-in AI chat powered by Groq API to provide store owners and managers with intelligent business strategies and insights based on sales data.
                  </CardDescription>
                </CardContent>
              </Card>

              {/* Feature 4 */}
              <Card className="border-0 shadow-md">
                <CardHeader>
                  <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                    <Globe className="h-5 w-5 text-primary" />
                  </div>
                  <CardTitle>English Localized UI</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-sm">
                    Fully translated, intuitive user interface designed for maximum efficiency and clarity. Built with Tailwind CSS and Radix UI primitives.
                  </CardDescription>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* CTA Bottom Section */}
        <section className="w-full py-16 md:py-24 border-t">
          <div className="container px-4 md:px-6 mx-auto text-center">
            <h2 className="text-3xl font-bold tracking-tight">Ready to elevate your business?</h2>
            <p className="mt-4 text-lg text-muted-foreground mb-8">
              Join now and experience the next generation of Point of Sale systems.
            </p>
            {user ? (
              <Link href="/dashboard">
                <Button size="lg" className="h-12 px-8">
                  Enter Dashboard <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            ) : (
              <Link href="/login">
                <Button size="lg" className="h-12 px-8">
                  Sign In to Continue <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            )}
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
