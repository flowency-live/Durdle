'use client';

import { Menu, X } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useState } from 'react';

import { buttonVariants } from '@/components/ui/button';

const navLinks = [
  { href: '/', label: 'Home' },
  { href: '/services', label: 'Services' },
  { href: '/#vehicles', label: 'Vehicles' },
  { href: '/faq', label: 'FAQ' },
  { href: '/pricing', label: 'Pricing' },
  { href: '/contact', label: 'Contact' },
];

export default function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-[#FBF7F0] shadow-sm">
      <div className="container px-4 md:px-6 mx-auto">
        <div className="flex items-center justify-between h-20">
          <Link href="/" className="flex items-center">
            <Image
              src="/dtc-letterhead-logo.png"
              alt="The Dorset Transfer Company"
              width={280}
              height={80}
              className="h-14 w-auto"
              priority
            />
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-8">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                {link.label}
              </Link>
            ))}
          </nav>

          {/* Desktop Actions */}
          <div className="hidden md:flex items-center gap-3">
            <Link
              href="/quote"
              className={buttonVariants({ variant: "hero-golden", size: "default" })}
            >
              Get a Quote
            </Link>
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 rounded-lg hover:bg-sage-light/20 transition-colors"
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? (
              <X className="w-6 h-6 text-foreground" />
            ) : (
              <Menu className="w-6 h-6 text-foreground" />
            )}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-sage-light/50 bg-[#FBF7F0]">
          <div className="container px-4 py-6 mx-auto">
            <nav className="flex flex-col gap-4">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className="text-base font-medium text-muted-foreground hover:text-foreground transition-colors py-2"
                >
                  {link.label}
                </Link>
              ))}
              <Link
                href="/quote"
                onClick={() => setMobileMenuOpen(false)}
                className={buttonVariants({ variant: "hero-golden", size: "xl", className: "mt-2" })}
              >
                Get a Quote
              </Link>
            </nav>
          </div>
        </div>
      )}
      {/* Full-width sage bar */}
      <div className="h-1 bg-sage" />
    </header>
  );
}
