"use client";

import Link from "next/link";
import { useState } from "react";

export default function Sidebar() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      {/* Mobile Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          display: "none",
          position: "fixed",
          top: "1rem",
          left: "1rem",
          zIndex: 1000,
          background: "var(--accent)",
          border: "none",
          color: "#000",
          padding: "0.5rem 1rem",
          borderRadius: "4px",
          cursor: "pointer",
          fontSize: "1rem",
          fontWeight: 600
        }}
        className="mobile-menu-toggle"
      >
        ☰
      </button>

      {/* Sidebar */}
      <aside
        style={{
          width: "220px",
          height: "100vh",
          padding: "2rem 1.5rem",
          borderRight: `1px solid var(--border)`,
          background: "var(--bg-secondary)",
          position: "relative",
          overflow: "hidden",
          display: isOpen ? "flex" : "flex",
          flexDirection: "column",
          gap: "2rem"
        }}
        className="sidebar"
      >
        {/* Logo/Title */}
        <div style={{ marginBottom: "1rem" }}>
          <h2 style={{ 
            fontSize: "1.5rem", 
            color: "var(--accent)",
            letterSpacing: "-1px"
          }}>
            🛒
          </h2>
        </div>

        {/* Navigation */}
        <nav style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
          <NavLink href="/">Grocery Run</NavLink>
          <NavLink href="https://docs.google.com/document/d/1j2HUVs1Rwm2eemLie3qiHGDNazYtaXIYsPhcjjaBjrQ/edit?tab=t.0" external>
            Food For Week
          </NavLink>
          <NavLink href="https://docs.google.com/spreadsheets/d/1a4cOzCh81sp19dl3Oww3BkHmRcxAZcigq0Z5cHah0LU/edit?gid=0#gid=0" external>
            Meals
          </NavLink>
          <NavLink href="https://docs.google.com/spreadsheets/d/1a4cOzCh81sp19dl3Oww3BkHmRcxAZcigq0Z5cHah0LU/edit?gid=150359050#gid=150359050" external>
            Ingredients
          </NavLink>
          <NavLink href="https://docs.google.com/document/d/1fzSVQAaERQ938fgjDosOHjsYG6Z9fJltzHMCjTPRMtA/edit?tab=t.0" external>
            Groceries List
          </NavLink>
          <NavLink href="/add_meal">Add Meal</NavLink>
        </nav>
      </aside>

      <style>{`
        @media (max-width: 768px) {
          .mobile-menu-toggle {
            display: block !important;
          }
          
          .sidebar {
            position: fixed;
            left: 0;
            top: 0;
            width: 220px;
            height: 100vh;
            z-index: 999;
            transform: ${isOpen ? "translateX(0)" : "translateX(-100%)"};
            transition: transform 0.3s ease;
          }
        }
      `}</style>
    </>
  );
}

interface NavLinkProps {
  href: string;
  children: React.ReactNode;
  external?: boolean;
}

function NavLink({ href, children, external }: NavLinkProps) {
  return external ? (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      style={{
        padding: "0.75rem 0",
        paddingLeft: "0",
        borderRadius: "0",
        background: "transparent",
        color: "var(--text-primary)",
        transition: "all 0.2s ease",
        border: "none",
        fontSize: "0.95rem"
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.color = "var(--accent)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.color = "var(--text-primary)";
      }}
    >
      {children}
    </a>
  ) : (
    <Link
      href={href}
      style={{
        padding: "0.75rem 0",
        paddingLeft: "0",
        borderRadius: "0",
        background: "transparent",
        color: "var(--text-primary)",
        transition: "all 0.2s ease",
        border: "none",
        fontSize: "0.95rem",
        display: "block"
      }}
      onMouseEnter={(e) => {
        const el = e.currentTarget as HTMLAnchorElement;
        el.style.color = "var(--accent)";
      }}
      onMouseLeave={(e) => {
        const el = e.currentTarget as HTMLAnchorElement;
        el.style.color = "var(--text-primary)";
      }}
    >
      {children}
    </Link>
  );
}