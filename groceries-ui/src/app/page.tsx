//
// Version 4.1.0
//
// Created By: Angel Gonzalez
//

"use client";

import { useState } from "react";

const API_URL = process.env.NEXT_PUBLIC_API_URL

interface MealDetail {
  meal_name: string;
  meal_day: string;
}

interface ApiResponse {
  start_date: string;
  meal_count: number;
  meals: string[];
  meal_details: MealDetail[];
  error?: string;
  message?: string;
}

function formatDate(dateString: string): string {
  const date = new Date(dateString + "T00:00:00");
  const dayOfWeek = date.toLocaleDateString("en-US", { weekday: "long" });
  const day = date.getDate();
  const month = date.toLocaleDateString("en-US", { month: "long" });
  const year = date.getFullYear();

  // Get ordinal suffix
  let suffix = "th";
  if (day % 10 === 1 && day !== 11) suffix = "st";
  else if (day % 10 === 2 && day !== 12) suffix = "nd";
  else if (day % 10 === 3 && day !== 13) suffix = "rd";

  return `${dayOfWeek}, ${month} ${day}${suffix} ${year}`;
}

export default function Home() {
  const [date, setDate] = useState("");
  const [mealIds, setMealIds] = useState("");
  const [firstWeek, setFirstWeek] = useState(true);
  const [checklist, setChecklist] = useState(true);
  const [test, setTest] = useState(false);
  const [onlyReminders, setOnlyReminders] = useState(false);
  const [showOptional, setShowOptional] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [isError, setIsError] = useState(false);

  async function runScript() {
    setResult("Running...");
    setIsError(false);

    try {
      const response = await fetch(
        `${API_URL}/run`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            date: date,
            meal_ids: mealIds,
            first_week: firstWeek,
            options: {
              only_reminders: onlyReminders,
              checklist: checklist,
              test: test
            },
          }),
        }
      );

      const data = await response.json() as ApiResponse;
      
      // Handle HTTP errors (4xx, 5xx)
      if (!response.ok) {
        setIsError(true);
        const errorMessage = `Error ${response.status}: ${data.error || data.message || JSON.stringify(data)}`;
        setResult(errorMessage);
      } else {
        let displayText = `Done!\n\nStart Date: ${formatDate(data.start_date)}\n\nMeals:\n`;
        data.meal_details.forEach((meal, index) => {
          displayText += `${index + 1}. ${meal.meal_name} (${meal.meal_day})\n`;
        });
        displayText += `\nHave a lovely day! :)`
        setResult(displayText);
      }
    } 
    // Handle Network errors (connection refused, timeout,...)
    catch (error) {
      setIsError(true);
      const errorMessage = error instanceof Error ? error.message : String(error);
      setResult(`Network Error: ${errorMessage}`);
    }
  }

  return (
    <main style={{ maxWidth: "600px", margin: "0 auto", width: "100%" }}>
      <style>{`
        @media (max-width: 768px) {
          h1 {
            font-size: 1.75rem;
          }
          .form-container {
            padding: 1.5rem !important;
          }
        }
      `}</style>

      {/* Header */}
      <div style={{ marginBottom: "2rem" }}>
        <h1 style={{ color: "var(--accent)", fontSize: "2rem", marginBottom: "0.5rem" }}>Add Groceries</h1>
        <p style={{ color: "var(--text-secondary)", fontSize: "0.95rem" }}>
          Prep for your grocery run in seconds
        </p>
      </div>

      {/* Form Container */}
      <div
        className="form-container"
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "1.5rem"
        }}
      >
        {/* Date Input */}
        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
            <label style={{ fontSize: "0.9rem", color: "var(--text-primary)", fontWeight: 500 }}>
              Start Date
            </label>
            <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)", margin: 0 }}>
              Must be a Monday
            </p>
          </div>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            style={{
              padding: "0.75rem",
              background: "transparent",
              border: "none",
              borderBottom: "1px solid var(--border)",
              borderRadius: "0",
              color: "var(--text-primary)",
              fontSize: "0.95rem",
              transition: "all 0.2s ease",
              outline: "none"
            }}
            onFocus={(e) => {
              e.currentTarget.style.borderBottomColor = "var(--accent)";
              e.currentTarget.style.boxShadow = "none";
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderBottomColor = "var(--border)";
              e.currentTarget.style.boxShadow = "none";
            }}
          />
        </div>

        {/* Meal IDs Input */}
        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
            <label style={{ fontSize: "0.9rem", color: "var(--text-primary)", fontWeight: 500 }}>
              Enter 6 Meal IDs
            </label>
            <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)", margin: 0 }}>
              e.g 1,2,3,4,5,6
            </p>
          </div>
          <input
            type="text"
            value={mealIds}
            onChange={(e) => setMealIds(e.target.value)}
            style={{
              padding: "0.75rem",
              background: "transparent",
              border: "none",
              borderBottom: "1px solid var(--border)",
              borderRadius: "0",
              color: "var(--text-primary)",
              fontSize: "0.95rem",
              transition: "all 0.2s ease",
              outline: "none",
              fontFamily: "monospace"
            }}
            onFocus={(e) => {
              e.currentTarget.style.borderBottomColor = "var(--accent)";
              e.currentTarget.style.boxShadow = "none";
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderBottomColor = "var(--border)";
              e.currentTarget.style.boxShadow = "none";
            }}
          />
        </div>

        {/* Week Selection */}
        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          <label style={{ fontSize: "0.9rem", color: "var(--text-primary)", fontWeight: 500 }}>
            Select Week
          </label>
          <div style={{ display: "flex", gap: "1rem" }}>
            {[true, false].map((week) => (
              <label
                key={week.toString()}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  cursor: "pointer",
                  padding: "0.75rem 1rem",
                  borderRadius: "0",
                  background: firstWeek === week ? "transparent" : "transparent",
                  border: `none`,
                  transition: "all 0.2s ease"
                }}
                onMouseEnter={(e) => {
                  if (firstWeek !== week) {
                    e.currentTarget.style.borderBottomColor = "var(--accent)";
                    e.currentTarget.style.background = "transparent";
                  }
                }}
                onMouseLeave={(e) => {
                  if (firstWeek !== week) {
                    e.currentTarget.style.borderBottomColor = "var(--border)";
                    e.currentTarget.style.background = "transparent";
                  }
                }}
              >
                <input
                  type="radio"
                  name="week"
                  checked={firstWeek === week}
                  onChange={() => setFirstWeek(week)}
                  style={{ cursor: "pointer",  accentColor: "var(--bg-tertiary)"}}
                />
                <span style={{ fontSize: "0.95rem" }}>
                  {week ? "First week" : "Second week"}
                </span>
              </label>
            ))}
          </div>
        </div>

        {/* Optional Settings */}
        <div style={{ paddingTop: "0.5rem", borderTop: "1px solid var(--border)" }}>
          <button
            onClick={() => setShowOptional(!showOptional)}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              fontSize: "0.95rem",
              padding: "0.5rem 0",
              color: "var(--text-primary)",
              fontWeight: 500,
              transition: "color 0.2s ease",
              display: "flex",
              alignItems: "center",
              gap: "0.5rem"
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = "var(--text-hover)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = "var(--text-primary)";
            }}
          >
            <span
              style={{
                display: "inline-block",
                transform: showOptional ? "rotate(90deg)" : "rotate(0deg)",
                transition: "transform 0.2s ease"
              }}
            >
              ▶
            </span>
            Additional Options
          </button>

          {showOptional && (
            <div style={{ marginTop: "1rem", display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              {[
                { key: "onlyReminders", label: "Only create calendar events", value: onlyReminders, setter: setOnlyReminders },
                { key: "checklist", label: "Create checklist", value: checklist, setter: setChecklist },
                { key: "test", label: "Test mode", value: test, setter: setTest }
              ].map(({ key, label, value, setter }) => (
                <label
                  key={key}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.75rem",
                    cursor: "pointer",
                    padding: "0.5rem 0",
                    borderRadius: "0",
                    transition: "background 0.2s ease"
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "transparent";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "transparent";
                  }}
                >
                  <input
                    type="checkbox"
                    checked={value}
                    onChange={(e) => setter(e.currentTarget.checked)}
                    style={{ cursor: "pointer", accentColor: "var(--bg-tertiary)", width: "18px", height: "18px" }}
                  />
                  <span style={{ fontSize: "0.95rem" }}>{label}</span>
                </label>
              ))}
            </div>
          )}
        </div>

        {/* Action Button */}
        <button
          onClick={runScript}
          style={{
            background: "var(--accent)",
            color: "#000",
            padding: "1rem",
            borderRadius: "2px",
            border: "none",
            fontSize: "1rem",
            fontWeight: 600,
            cursor: "pointer",
            transition: "all 0.2s ease",
            marginTop: "0.5rem"
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "var(--accent-hover)";
            e.currentTarget.style.boxShadow = "0 4px 12px rgba(107, 182, 35, 0.3)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "var(--accent)";
            e.currentTarget.style.boxShadow = "none";
          }}
        >
          Add Groceries
        </button>
      </div>

      {/* Result Display */}
      {result && (
        <div
          style={{
            marginTop: "2rem",
            padding: "1.5rem 0",
            borderRadius: "0",
            background: "transparent",
            border: `none`,
            borderTop: `2px solid ${isError ? "rgba(255, 59, 48, 0.5)" : "rgba(107, 182, 35, 0.5)"}`,
            animation: "slideIn 0.3s ease"
          }}
        >
          <pre
            style={{
              color: isError ? "#ff6b6b" : "var(--accent)",
              fontSize: "0.9rem",
              fontFamily: "monospace",
              whiteSpace: "pre-wrap",
              wordWrap: "break-word",
              margin: 0,
              lineHeight: "1.6"
            }}
          >
            {result}
          </pre>
        </div>
      )}

      <style>{`
        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </main>
  );
}
