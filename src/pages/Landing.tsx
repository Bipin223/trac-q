import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/theme-toggle';
import { 
  Wallet, 
  TrendingUp, 
  PieChart, 
  Shield, 
  BarChart3, 
  ArrowRight,
  CheckCircle2,
  DollarSign,
  Target,
  LineChart,
  Mail,
  MessageCircle,
  Handshake,
  Calculator,
  Repeat,
  Tags
} from 'lucide-react';

const Landing = () => {
  const navigate = useNavigate();

  const handleGetStarted = () => {
    navigate('/signup');
  };
  const features = [
    {
      icon: <Wallet className="h-8 w-8 text-purple-600 dark:text-purple-400" />,
      title: "Track Your Money",
      description: "Effortlessly monitor all your income and expenses in one centralized dashboard."
    },
    {
      icon: <TrendingUp className="h-8 w-8 text-purple-600 dark:text-purple-400" />,
      title: "Smart Analytics",
      description: "Get intelligent insights into your spending patterns and financial trends."
    },
    {
      icon: <PieChart className="h-8 w-8 text-purple-600 dark:text-purple-400" />,
      title: "Budget Management",
      description: "Set budgets for different categories and stay on track with your financial goals."
    },
    {
      icon: <BarChart3 className="h-8 w-8 text-purple-600 dark:text-purple-400" />,
      title: "Visual Reports",
      description: "Beautiful charts and graphs that make understanding your finances simple."
    },
    {
      icon: <DollarSign className="h-8 w-8 text-purple-600 dark:text-purple-400" />,
      title: "Multi-Currency Support",
      description: "Track transactions in multiple currencies with real-time exchange rates."
    },
    {
      icon: <Shield className="h-8 w-8 text-purple-600 dark:text-purple-400" />,
      title: "Secure & Private",
      description: "Your financial data is encrypted and protected with industry-standard security."
    }
  ];

  const testimonials = [
    {
      name: "Bipin Rizal",
      role: "Freelance Designer",
      content: "Trac-Q has revolutionized how I manage my freelance income. The budget tracking feature helps me save more each month!",
      avatar: "BR"
    },
    {
      name: "Sanam Shrestha",
      role: "Small Business Owner",
      content: "Finally, a money management tool that's simple yet powerful. I can track all my business expenses effortlessly.",
      avatar: "SS"
    },
    {
      name: "Aakash Limbu",
      role: "Student",
      content: "As a student, budgeting is crucial. Trac-Q's visual reports help me understand where my money goes and plan better.",
      avatar: "AL"
    }
  ];

  const benefits = [
    "Real-time expense tracking",
    "Customizable budget categories",
    "Monthly financial summaries",
    "Secure data encryption",
    "Multi-device sync",
    "Finance Tools integration"
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-purple-50 to-blue-50 dark:from-gray-900 dark:via-purple-950 dark:to-gray-900">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border-b border-gray-200 dark:border-gray-800">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-3">
              <img src="/logo.png" alt="Trac-Q Logo" className="h-14 w-14" />
              <span className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                Trac-Q
              </span>
            </div>
            <div className="flex items-center space-x-4">
              <ThemeToggle />
              <Link to="/login">
                <Button variant="ghost" className="hidden sm:inline-flex">
                  Login
                </Button>
              </Link>
              <Button onClick={handleGetStarted} className="bg-purple-600 hover:bg-purple-700 text-white">
                Get Started
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4 sm:px-6 lg:px-8">
        <div className="container mx-auto max-w-6xl">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div className="space-y-6">
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold leading-tight">
                Take Control of Your{' '}
                <span className="bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                  Financial Future
                </span>
              </h1>
              <p className="text-lg text-gray-600 dark:text-gray-300">
                Trac-Q is your all-in-one money management platform. Track expenses, manage budgets, 
                and achieve your financial goals with intelligent insights and beautiful visualizations.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Button onClick={handleGetStarted} size="lg" className="bg-purple-600 hover:bg-purple-700 text-white w-full sm:w-auto">
                  Start Tracking Free
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
                <Link to="/login">
                  <Button size="lg" variant="outline" className="w-full sm:w-auto">
                    Login
                  </Button>
                </Link>
              </div>
            </div>
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-purple-600 to-blue-600 rounded-3xl blur-3xl opacity-20"></div>
              <img 
                src="https://i.imgur.com/nAG1Nb2.jpeg" 
                alt="Financial Management Illustration" 
                className="relative rounded-2xl shadow-2xl w-full"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-white dark:bg-gray-900">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
              Powerful Features for Complete Financial Control
            </h2>
            <p className="text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
              Everything you need to manage your money efficiently and achieve your financial goals.
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <div 
                key={index}
                className="p-6 rounded-xl bg-gradient-to-br from-purple-50 to-blue-50 dark:from-gray-800 dark:to-purple-900/20 border border-purple-100 dark:border-purple-800 hover:shadow-lg transition-shadow"
              >
                <div className="mb-4">{feature.icon}</div>
                <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
                <p className="text-gray-600 dark:text-gray-400">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="container mx-auto max-w-6xl">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl sm:text-4xl font-bold mb-6">
                Why Choose Trac-Q?
              </h2>
              <p className="text-lg text-gray-600 dark:text-gray-300 mb-8">
                Join thousands of users who have transformed their financial lives with Trac-Q's 
                comprehensive money management tools.
              </p>
              <div className="space-y-4">
                {benefits.map((benefit, index) => (
                  <div key={index} className="flex items-center space-x-3">
                    <div className="flex-shrink-0 w-6 h-6 rounded-full bg-purple-600 flex items-center justify-center">
                      <CheckCircle2 className="h-4 w-4 text-white" />
                    </div>
                    <span className="text-gray-700 dark:text-gray-300">{benefit}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-6">
              <div className="p-6 rounded-xl bg-gradient-to-br from-purple-600 to-purple-700 text-white">
                <Handshake className="h-10 w-10 mb-4" />
                <div className="text-3xl font-bold mb-2">Lend & Borrow</div>
                <div className="text-purple-100">Track Money Owed</div>
              </div>
              <div className="p-6 rounded-xl bg-gradient-to-br from-blue-600 to-blue-700 text-white">
                <Calculator className="h-10 w-10 mb-4" />
                <div className="text-3xl font-bold mb-2">4 Calculators</div>
                <div className="text-blue-100">Financial Tools</div>
              </div>
              <div className="p-6 rounded-xl bg-gradient-to-br from-green-600 to-green-700 text-white">
                <Repeat className="h-10 w-10 mb-4" />
                <div className="text-3xl font-bold mb-2">Recurring</div>
                <div className="text-green-100">Auto Transaction Alerts</div>
              </div>
              <div className="p-6 rounded-xl bg-gradient-to-br from-pink-600 to-pink-700 text-white">
                <Tags className="h-10 w-10 mb-4" />
                <div className="text-3xl font-bold mb-2">30+ Categories</div>
                <div className="text-pink-100">Custom Subcategories</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-white dark:bg-gray-900">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
              What Our Users Say
            </h2>
            <p className="text-lg text-gray-600 dark:text-gray-300">
              Join thousands of satisfied users who trust Trac-Q for their financial management.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <div 
                key={index}
                className="p-6 rounded-xl bg-gradient-to-br from-purple-50 to-blue-50 dark:from-gray-800 dark:to-purple-900/20 border border-purple-100 dark:border-purple-800"
              >
                <div className="flex items-center space-x-4 mb-4">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center text-white font-semibold">
                    {testimonial.avatar}
                  </div>
                  <div>
                    <div className="font-semibold">{testimonial.name}</div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">{testimonial.role}</div>
                  </div>
                </div>
                <p className="text-gray-700 dark:text-gray-300 italic">"{testimonial.content}"</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="container mx-auto max-w-4xl">
          <div className="bg-gradient-to-r from-purple-600 to-blue-600 rounded-3xl p-12 text-center text-white">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
              Ready to Transform Your Financial Life?
            </h2>
            <p className="text-xl mb-8 text-purple-100">
              Join thousands of users who are already managing their money smarter with Trac-Q.
            </p>
            <Button onClick={handleGetStarted} size="lg" className="bg-white text-purple-600 hover:bg-gray-100">
              Get Started for Free
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-300 py-12 px-4 sm:px-6 lg:px-8">
        <div className="container mx-auto max-w-6xl">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div>
              <div className="flex items-center space-x-2 mb-4">
                <img src="/logo.png" alt="Trac-Q Logo" className="h-12 w-12" />
                <span className="text-xl font-bold text-white">Trac-Q</span>
              </div>
              <p className="text-sm text-gray-400">
                Your trusted partner for smart money management and financial success.
              </p>
            </div>
            <div>
              <h3 className="text-white font-semibold mb-4">Features</h3>
              <ul className="space-y-2 text-sm">
                <li><Link to="/login" className="hover:text-purple-400 transition-colors">Track Money</Link></li>
                <li><Link to="/login" className="hover:text-purple-400 transition-colors">Budget Management</Link></li>
                <li><Link to="/login" className="hover:text-purple-400 transition-colors">Analytics</Link></li>
                <li><Link to="/login" className="hover:text-purple-400 transition-colors">Reports</Link></li>
              </ul>
            </div>
            <div>
              <h3 className="text-white font-semibold mb-4">Resources</h3>
              <ul className="space-y-2 text-sm">
                <li><Link to="/login" className="hover:text-purple-400 transition-colors">Getting Started</Link></li>
                <li><Link to="/login" className="hover:text-purple-400 transition-colors">Documentation</Link></li>
                <li><Link to="/login" className="hover:text-purple-400 transition-colors">Support</Link></li>
                <li><Link to="/login" className="hover:text-purple-400 transition-colors">FAQ</Link></li>
              </ul>
            </div>
            <div>
              <h3 className="text-white font-semibold mb-4">Contact</h3>
              <ul className="space-y-2 text-sm">
                <li>
                  <a href="mailto:bipinrijal24@gmail.com" className="hover:text-purple-400 transition-colors flex items-center gap-2">
                    <Mail className="h-4 w-4" />
                    Email Us
                  </a>
                </li>
                <li>
                  <a href="https://wa.me/9779816034809" target="_blank" rel="noopener noreferrer" className="hover:text-purple-400 transition-colors flex items-center gap-2">
                    <MessageCircle className="h-4 w-4" />
                    WhatsApp
                  </a>
                </li>
                <li><Link to="/login" className="hover:text-purple-400 transition-colors">Privacy Policy</Link></li>
                <li><Link to="/login" className="hover:text-purple-400 transition-colors">Terms of Service</Link></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 pt-8 flex flex-col md:flex-row justify-between items-center">
            <p className="text-sm text-gray-400">
              © 2025 Trac-Q. All rights reserved.
            </p>
            <div className="flex space-x-6 mt-4 md:mt-0">
              <a href="https://github.com/Bipin223" target="_blank" rel="noopener noreferrer" className="hover:text-purple-400 transition-all hover:scale-110">
                <span className="sr-only">GitHub</span>
                <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24">
                  <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" />
                </svg>
              </a>
              <a href="https://wa.me/9779816034809" target="_blank" rel="noopener noreferrer" className="hover:text-purple-400 transition-all hover:scale-110">
                <span className="sr-only">WhatsApp</span>
                <MessageCircle className="h-6 w-6" />
              </a>
              <a href="mailto:bipinrijal24@gmail.com" className="hover:text-purple-400 transition-all hover:scale-110">
                <span className="sr-only">Email</span>
                <Mail className="h-6 w-6" />
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
