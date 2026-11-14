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
            width: "2.5rem",
            height: "2.5rem",
            flexShrink: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: isOpen ? "var(--bg-tertiary)" : "var(--accent)",
            border: isOpen ? "1px solid var(--border-strong)" : "none",
            color: isOpen ? "var(--text-primary)" : "#000",
            borderRadius: "var(--radius-pill)",
            cursor: "pointer",
            fontSize: "1rem",
            fontWeight: 700,
            transition: "all 0.2s ease"
          }}
        >
          {isOpen ? "✕" : "☰"}
        </button>
        <h1 style={{ color: "var(--text-primary)", margin: 0, fontWeight: 800 }}>{title}</h1>
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
            background: "rgba(0, 0, 0, 0.6)",
            backdropFilter: "blur(2px)",
            zIndex: 998
          }}
        />
      )}

      {/* Sidebar Drawer */}
      <aside
        className="sidebar-drawer"
        style={{
          width: "240px",
          padding: "1.5rem 1rem",
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
          transition: "transform 0.3s ease",
          boxShadow: isOpen ? "var(--shadow-md)" : "none"
        }}
      >
        {/* Logo/Title */}
        <div style={{ padding: "0.5rem 0.75rem 1rem" }}>
          <h2 style={{
            fontSize: "1.4rem",
            color: "var(--accent)",
            letterSpacing: "-0.03em",
            fontWeight: 800
          }}>
            Grocery Run
          </h2>
        </div>

        {/* Navigation */}
        <nav style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
          <NavLink href="/" active={pathname === "/"} onNavigate={() => setIsOpen(false)}>Add Groceries</NavLink>
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
          <NavLink href="/add_meal" active={pathname === "/add_meal"} onNavigate={() => setIsOpen(false)}>Add Meal</NavLink>
        </nav>
      </aside>

      <style>{`
        .header-bar {
          height: 4rem;
          padding: 0 1.5rem;
        }
        .header-bar h1 {
          font-size: 1.5rem;
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
            font-size: 1.25rem;
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
  active?: boolean;
  onNavigate?: () => void;
}

function NavLink({ href, children, external, active, onNavigate }: NavLinkProps) {
  const baseStyle: React.CSSProperties = {
    padding: "0.7rem 0.9rem",
    borderRadius: "var(--radius-md)",
    background: active ? "var(--accent-soft)" : "transparent",
    color: active ? "var(--accent)" : "var(--text-primary)",
    transition: "all 0.2s ease",
    border: "none",
    fontSize: "0.9rem",
    fontWeight: active ? 700 : 500,
    display: "block"
  };

  return external ? (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      onClick={onNavigate}
      style={baseStyle}
      onMouseEnter={(e) => {
        if (!active) {
          e.currentTarget.style.color = "var(--text-hover)";
          e.currentTarget.style.backgroundColor = "var(--bg-hover)";
        }
      }}
      onMouseLeave={(e) => {
        if (!active) {
          e.currentTarget.style.color = "var(--text-primary)";
          e.currentTarget.style.backgroundColor = "transparent";
        }
      }}
    >
      {children}
    </a>
  ) : (
    <Link
      href={href}
      onClick={onNavigate}
      style={baseStyle}
      onMouseEnter={(e) => {
        if (!active) {
          const el = e.currentTarget as HTMLAnchorElement;
          el.style.color = "var(--text-hover)";
          el.style.backgroundColor = "var(--bg-hover)";
        }
      }}
      onMouseLeave={(e) => {
        if (!active) {
          const el = e.currentTarget as HTMLAnchorElement;
          el.style.color = "var(--text-primary)";
          el.style.backgroundColor = "transparent";
        }
      }}
    >
      {children}
    </Link>
  );
}
