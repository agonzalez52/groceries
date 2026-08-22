//
// Version 4.1.0
//
// Created By: Angel Gonzalez
//

"use client";

import { useRef, useState } from "react";

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

function isMonday(dateString: string): boolean {
  if (!dateString) return false;
  const date = new Date(dateString + "T00:00:00");
  return date.getDay() === 1;
}

function getMealBoxDate(startDate: string, index: number): Date | null {
  if (!startDate) return null;
  const d = new Date(startDate + "T00:00:00");
  d.setDate(d.getDate() + index);
  return d;
}

export default function Home() {
  const [date, setDate] = useState("");
  const [mealValues, setMealValues] = useState<string[]>(["0", "0", "0", "0", "0", "0"]);
  const [activeMeal, setActiveMeal] = useState<boolean[]>([false, false, false, false, false, false]);
  const mealInputRefs = useRef<Array<HTMLInputElement | null>>([]);
  const [firstWeek, setFirstWeek] = useState(true);
  const [checklist, setChecklist] = useState(true);
  const [test, setTest] = useState(false);
  const [onlyReminders, setOnlyReminders] = useState(false);
  const [showOptional, setShowOptional] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [isError, setIsError] = useState(false);
  const [isRunning, setIsRunning] = useState(false);

  const isStartDateInvalid = date !== "" && !isMonday(date);
  const isAddGroceriesDisabled = date === "" || isStartDateInvalid;

  function goToMealBox(newIndex: number) {
    if (newIndex < 0 || newIndex > 5) return;
    setActiveMeal((prev) => prev.map((_, i) => i === newIndex));
    const el = mealInputRefs.current[newIndex];
    if (el) {
      el.focus();
      el.select();
    }
  }

  async function runScript() {
    setResult(null);
    setIsError(false);
    setIsRunning(true);

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
            meal_ids: mealValues.map((v) => v || "0").join(","),
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
    } finally {
      setIsRunning(false);
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
        .start-date-input::-webkit-calendar-picker-indicator {
          filter: invert(48%) sepia(79%) saturate(2476%) hue-rotate(86deg) brightness(118%) contrast(119%);
          cursor: pointer;
        }
      `}</style>

      {/* Header */}
      <div style={{ marginBottom: "2rem" }}>
        <h1 style={{ color: "var(--accent)", fontSize: "2rem", marginBottom: "0.5rem" }}>Add Groceries</h1>
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
            className="start-date-input"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            style={{
              padding: "0.75rem",
              background: "var(--bg-tertiary)",
              border: "none",
              borderBottom: "1px solid var(--border)",
              borderRadius: "2px",
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
          {isStartDateInvalid && (
            <p style={{ fontSize: "0.8rem", color: "#ff6b6b", margin: 0 }}>
              Start Date is not Monday
            </p>
          )}
        </div>

        {/* Meal IDs Input */}
        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
            <label style={{ fontSize: "0.9rem", color: "var(--text-primary)", fontWeight: 500 }}>
              Enter a Meal ID for each day
            </label>
            <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)", margin: 0 }}>
              0 to skip that day
            </p>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: "0.5rem" }}>
            {mealValues.map((value, index) => {
              const boxDate = getMealBoxDate(date, index);
              const weekday = boxDate ? boxDate.toLocaleDateString("en-US", { weekday: "short" }) : "";
              const dayOfMonth = boxDate ? String(boxDate.getDate()) : "";
              const isActive = activeMeal[index];

              return (
                <div
                  key={index}
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "0.25rem",
                    padding: "0.5rem",
                    background: "var(--bg-tertiary)",
                    borderBottom: `1px solid ${isActive ? "var(--accent)" : "var(--border)"}`,
                    borderRadius: "2px",
                    transition: "all 0.2s ease"
                  }}
                >
                  <div style={{ textAlign: "left", fontSize: "0.7rem", color: isStartDateInvalid ? "#ff6b6b" : "gray" }}>
                    {weekday}
                  </div>
                  <div style={{ textAlign: "left", fontSize: "0.8rem", color: isStartDateInvalid ? "#ff6b6b" : "var(--accent)", fontWeight: 600 }}>
                    {dayOfMonth}
                  </div>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={value}
                    ref={(el) => {
                      mealInputRefs.current[index] = el;
                    }}
                    onClick={(e) => {
                      if (value === "0") {
                        e.currentTarget.select();
                      } else {
                        setActiveMeal((prev) => prev.map((v, i) => (i === index ? true : v)));
                      }
                    }}
                    onChange={(e) => {
                      const digitsOnly = e.target.value.replace(/\D/g, "");
                      const clamped = digitsOnly === "" ? "" : String(Math.min(999, parseInt(digitsOnly, 10)));
                      setMealValues((prev) => prev.map((v, i) => (i === index ? clamped : v)));
                    }}
                    onBlur={(e) => {
                      setActiveMeal((prev) => prev.map((v, i) => (i === index ? false : v)));
                      if (e.target.value === "") {
                        setMealValues((prev) => prev.map((v, i) => (i === index ? "0" : v)));
                      }
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        if (index < 5) {
                          goToMealBox(index + 1);
                        } else {
                          e.currentTarget.blur();
                        }
                      } else if (e.key === "ArrowRight") {
                        e.preventDefault();
                        goToMealBox(index + 1);
                      } else if (e.key === "ArrowLeft") {
                        e.preventDefault();
                        goToMealBox(index - 1);
                      }
                    }}
                    style={{
                      width: "100%",
                      textAlign: "center",
                      background: "transparent",
                      border: "none",
                      outline: "none",
                      color: "white",
                      fontSize: "1rem",
                      fontFamily: "monospace"
                    }}
                  />
                </div>
              );
            })}
          </div>
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
          disabled={isAddGroceriesDisabled}
          style={{
            background: isAddGroceriesDisabled ? "var(--bg-tertiary)" : "var(--accent)",
            color: isAddGroceriesDisabled ? "var(--text-secondary)" : "#000",
            padding: "1rem",
            borderRadius: "2px",
            border: "none",
            fontSize: "1rem",
            fontWeight: 600,
            cursor: isAddGroceriesDisabled ? "not-allowed" : "pointer",
            transition: "all 0.2s ease",
            marginTop: "0.5rem"
          }}
          onMouseEnter={(e) => {
            if (isAddGroceriesDisabled) return;
            e.currentTarget.style.background = "var(--accent-hover)";
            e.currentTarget.style.boxShadow = "0 4px 12px rgba(107, 182, 35, 0.3)";
          }}
          onMouseLeave={(e) => {
            if (isAddGroceriesDisabled) return;
            e.currentTarget.style.background = "var(--accent)";
            e.currentTarget.style.boxShadow = "none";
          }}
        >
          Add Groceries
        </button>
      </div>

      {/* Running Indicator */}
      {isRunning && (
        <div
          style={{
            marginTop: "2rem",
            padding: "1.5rem 0",
            borderTop: "2px solid rgba(107, 182, 35, 0.5)",
            animation: "slideIn 0.3s ease"
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.2rem",
              color: "var(--accent)",
              fontSize: "0.9rem",
              fontFamily: "monospace"
            }}
          >
            Running
            <span style={{ display: "inline-flex" }}>
              <span className="bounce-dot" style={{ animationDelay: "0s" }}>.</span>
              <span className="bounce-dot" style={{ animationDelay: "0.2s" }}>.</span>
              <span className="bounce-dot" style={{ animationDelay: "0.4s" }}>.</span>
            </span>
          </div>
        </div>
      )}

      {/* Result Display */}
      {!isRunning && result && (
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
        @keyframes bounceDot {
          0%, 80%, 100% {
            transform: translateY(0);
          }
          40% {
            transform: translateY(-4px);
          }
        }
        .bounce-dot {
          display: inline-block;
          animation: bounceDot 1s infinite ease-in-out;
        }
      `}</style>
    </main>
  );
}
