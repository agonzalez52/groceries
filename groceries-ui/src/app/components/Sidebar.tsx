"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

const PAGE_TITLES: Record<string, string> = {
  "/": "Add Groceries",
  "/add_meal": "Add Meal"
};

export default function Sidebar() {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();
  const title = PAGE_TITLES[pathname] ?? "";

  return (
    <>
      {/* Fixed Header Bar */}
      <header
        className="header-bar"
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          zIndex: 1000,
          display: "flex",
          alignItems: "center",
          gap: "1rem",
          background: "var(--bg-secondary)",
          borderBottom: "1px solid var(--border)"
        }}
      >
        <button
          onClick={() => setIsOpen(!isOpen)}
          aria-label={isOpen ? "Close menu" : "Open menu"}
          style={{
            width: "2.75rem",
            height: "2.75rem",
            flexShrink: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "var(--accent)",
            border: "none",
            color: "#000",
            borderRadius: "4px",
            cursor: "pointer",
            fontSize: "1.1rem",
            fontWeight: 600
          }}
        >
          {isOpen ? "✕" : "☰"}
        </button>
        <h1 style={{ color: "var(--accent)", margin: 0 }}>{title}</h1>
      </header>

      {/* Backdrop */}
      {isOpen && (
        <div
          onClick={() => setIsOpen(false)}
          className="sidebar-backdrop"
          style={{
            position: "fixed",
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0, 0, 0, 0.5)",
            zIndex: 998
          }}
        />
      )}

      {/* Sidebar Drawer */}
      <aside
        className="sidebar-drawer"
        style={{
          width: "220px",
          padding: "2rem 1.5rem",
          borderRight: `1px solid var(--border)`,
          background: "var(--bg-secondary)",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
          gap: "2rem",
          position: "fixed",
          left: 0,
          bottom: 0,
          zIndex: 999,
          transform: isOpen ? "translateX(0)" : "translateX(-100%)",
          transition: "transform 0.3s ease"
        }}
      >
        {/* Logo/Title */}
        <div style={{ marginBottom: "1rem" }}>
          <h2 style={{
            fontSize: "1.5rem",
            color: "var(--accent)",
            letterSpacing: "-1px"
          }}>
            Grocery Run
          </h2>
        </div>

        {/* Navigation */}
        <nav style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
          <NavLink href="/" onNavigate={() => setIsOpen(false)}>Add Groceries</NavLink>
          <NavLink href="https://docs.google.com/document/d/1j2HUVs1Rwm2eemLie3qiHGDNazYtaXIYsPhcjjaBjrQ/edit?tab=t.0" external onNavigate={() => setIsOpen(false)}>
            Food For Week
          </NavLink>
          <NavLink href="https://docs.google.com/spreadsheets/d/1a4cOzCh81sp19dl3Oww3BkHmRcxAZcigq0Z5cHah0LU/edit?gid=0#gid=0" external onNavigate={() => setIsOpen(false)}>
            Meals
          </NavLink>
          <NavLink href="https://docs.google.com/spreadsheets/d/1a4cOzCh81sp19dl3Oww3BkHmRcxAZcigq0Z5cHah0LU/edit?gid=150359050#gid=150359050" external onNavigate={() => setIsOpen(false)}>
            Ingredients
          </NavLink>
          <NavLink href="https://docs.google.com/document/d/1fzSVQAaERQ938fgjDosOHjsYG6Z9fJltzHMCjTPRMtA/edit?tab=t.0" external onNavigate={() => setIsOpen(false)}>
            Groceries List
          </NavLink>
          <NavLink href="/add_meal" onNavigate={() => setIsOpen(false)}>Add Meal</NavLink>
        </nav>
      </aside>

      <style>{`
        .header-bar {
          height: 4rem;
          padding: 0 2rem;
        }
        .header-bar h1 {
          font-size: 1.75rem;
        }
        .sidebar-backdrop,
        .sidebar-drawer {
          top: 4rem;
        }
        @media (max-width: 768px) {
          .header-bar {
            padding: 0 1rem;
          }
          .header-bar h1 {
            font-size: 1.5rem;
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
  onNavigate?: () => void;
}

function NavLink({ href, children, external, onNavigate }: NavLinkProps) {
  return external ? (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      onClick={onNavigate}
      style={{
        padding: "0.75rem 0",
        paddingLeft: "1rem",
        borderRadius: "2px",
        background: "transparent",
        color: "var(--text-primary)",
        transition: "all 0.2s ease",
        border: "none",
        fontSize: "0.95rem",
        fontWeight: 500
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.color = "var(--text-hover)";
        e.currentTarget.style.backgroundColor = "var(--bg-tertiary)"
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.color = "var(--text-primary)";
        e.currentTarget.style.backgroundColor = "var(--bg-secondary)"
      }}
    >
      {children}
    </a>
  ) : (
    <Link
      href={href}
      onClick={onNavigate}
      style={{
        padding: "0.75rem 0",
        paddingLeft: "1rem",
        borderRadius: "0",
        background: "transparent",
        color: "var(--text-primary)",
        transition: "all 0.2s ease",
        border: "none",
        fontSize: "0.95rem",
        display: "block",
        fontWeight: 500
      }}
      onMouseEnter={(e) => {
        const el = e.currentTarget as HTMLAnchorElement;
        el.style.color = "var(--text-hover)";
        el.style.backgroundColor = "var(--bg-tertiary)";
      }}
      onMouseLeave={(e) => {
        const el = e.currentTarget as HTMLAnchorElement;
        el.style.color = "var(--text-primary)";
        el.style.backgroundColor = "var(--bg-secondary)"
      }}
    >
      {children}
    </Link>
  );
}
