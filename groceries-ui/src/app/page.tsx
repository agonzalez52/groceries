//
// Version 4.3.0
//
// Created By: Angel Gonzalez
//

"use client";

import { useEffect, useRef, useState } from "react";

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

interface MealData {
  id: number;
  name: string;
}

interface MealLookupState {
  visible: boolean;
  loading: boolean;
  name: string;
  error: boolean;
}

const emptyLookup: MealLookupState = { visible: false, loading: false, name: "", error: false };

// Local (browser-side) cache of the id -> name map, so the app can read it at any
// time without hitting the /meals endpoint on every lookup. Prod and test sheets
// are cached separately so switching "Test mode" never shows stale data from the other.
function getMealsCacheKey(test: boolean) {
  return test ? "groceries_meals_cache_test" : "groceries_meals_cache_prod";
}

function wait(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

function readMealsMapFromStorage(test: boolean): Record<number, string> {
  try {
    const raw = localStorage.getItem(getMealsCacheKey(test));
    return raw ? (JSON.parse(raw) as Record<number, string>) : {};
  } catch {
    return {};
  }
}

function writeMealsMapToStorage(test: boolean, map: Record<number, string>) {
  try {
    localStorage.setItem(getMealsCacheKey(test), JSON.stringify(map));
  } catch {
    // localStorage unavailable (private mode, quota, etc.) - fall back to in-memory only
  }
}

async function fetchMealsMap(test: boolean): Promise<Record<number, string>> {
  const response = await fetch(`${API_URL}/meals?test=${test}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch meals: ${response.status}`);
  }
  const data = (await response.json()) as MealData[];
  const map: Record<number, string> = {};
  data.forEach((meal) => {
    map[meal.id] = meal.name;
  });
  return map;
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
  const mealFocusValueRef = useRef<string[]>(["0", "0", "0", "0", "0", "0"]);
  const [mealLookups, setMealLookups] = useState<MealLookupState[]>(
    () => Array(6).fill(null).map(() => ({ ...emptyLookup }))
  );
  const [mealIdErrors, setMealIdErrors] = useState<boolean[]>([false, false, false, false, false, false]);
  const mealLookupSeqRef = useRef<number[]>([0, 0, 0, 0, 0, 0]);
  const mealsMapRef = useRef<Record<number, string>>({});
  const mealValuesRef = useRef<string[]>(mealValues);
  mealValuesRef.current = mealValues;
  const [firstWeek, setFirstWeek] = useState(true);
  const [checklist, setChecklist] = useState(true);
  const [test, setTest] = useState(false);
  const [onlyReminders, setOnlyReminders] = useState(false);
  const [showOptional, setShowOptional] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [isError, setIsError] = useState(false);
  const [isRunning, setIsRunning] = useState(false);

  const isStartDateInvalid = date !== "" && !isMonday(date);
  const hasMealIdError = mealIdErrors.some((e) => e);
  const allMealsSkipped = mealValues.every((v) => v === "0" || v === "");
  const hasMealLookupInProgress = mealLookups.some((l) => l.loading);
  const isAddGroceriesDisabled = date === "" || isStartDateInvalid || hasMealIdError || allMealsSkipped || hasMealLookupInProgress;

  // Seed from the browser-local cache immediately, then refresh it from the
  // endpoint on every page load, and again whenever "Test mode" is toggled so
  // the cache always matches the currently selected sheet (dev vs prod).
  useEffect(() => {
    mealsMapRef.current = readMealsMapFromStorage(test);

    fetchMealsMap(test)
      .then((map) => {
        mealsMapRef.current = map;
        writeMealsMapToStorage(test, map);
        // Re-check every currently filled-in meal id against the sheet that's now active
        mealValuesRef.current.forEach((v, i) => {
          const idNum = parseInt(v, 10);
          if (idNum) {
            lookupMealName(i, idNum);
          }
        });
      })
      .catch(() => {
        // Leave the cache as-is; a per-id lookup miss will retry the fetch.
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [test]);

  async function lookupMealName(index: number, idNum: number) {
    const seq = ++mealLookupSeqRef.current[index];

    setMealLookups((prev) => prev.map((v, i) => (i === index ? { visible: true, loading: true, name: "", error: false } : v)));
    setMealIdErrors((prev) => prev.map((v, i) => (i === index ? false : v)));

    await wait(500);
    if (mealLookupSeqRef.current[index] !== seq) return; // superseded by a newer lookup

    let name = mealsMapRef.current[idNum];

    if (name === undefined) {
      try {
        mealsMapRef.current = await fetchMealsMap(test);
        writeMealsMapToStorage(test, mealsMapRef.current);
      } catch {
        // keep the existing cache; the lookup below will simply miss again
      }
      name = mealsMapRef.current[idNum];
    }

    if (mealLookupSeqRef.current[index] !== seq) return; // superseded by a newer lookup

    if (name !== undefined) {
      setMealLookups((prev) => prev.map((v, i) => (i === index ? { visible: true, loading: false, name, error: false } : v)));
    } else {
      setMealLookups((prev) => prev.map((v, i) => (i === index ? { visible: true, loading: false, name: "No meal found", error: true } : v)));
      setMealIdErrors((prev) => prev.map((v, i) => (i === index ? true : v)));
    }
  }

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
    <div style={{ maxWidth: "600px", margin: "0 auto", width: "100%" }}>
      <style>{`
        .start-date-input::-webkit-calendar-picker-indicator {
          filter: invert(65%) sepia(60%) saturate(1000%) hue-rotate(88deg) brightness(105%) contrast(101%);
          cursor: pointer;
        }
        .meal-name-box {
          scrollbar-width: none;
        }
        .meal-name-box::-webkit-scrollbar {
          display: none;
        }
        .toggle-input {
          position: absolute;
          opacity: 0;
          width: 0;
          height: 0;
        }
        .toggle-track {
          width: 40px;
          height: 24px;
          border-radius: var(--radius-pill);
          background: var(--bg-tertiary);
          border: 1px solid var(--border-strong);
          position: relative;
          flex-shrink: 0;
          transition: background 0.2s ease, border-color 0.2s ease;
        }
        .toggle-thumb {
          position: absolute;
          top: 2px;
          left: 2px;
          width: 18px;
          height: 18px;
          border-radius: 50%;
          background: var(--text-secondary);
          transition: transform 0.2s ease, background 0.2s ease;
        }
        .toggle-input:checked + .toggle-track {
          background: var(--accent-soft);
          border-color: var(--accent);
        }
        .toggle-input:checked + .toggle-track .toggle-thumb {
          transform: translateX(16px);
          background: var(--accent);
        }
      `}</style>

      {/* Form Container */}
      <div
        className="form-container"
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "1.75rem",
          background: "var(--bg-secondary)",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius-lg)",
          padding: "1.75rem",
          boxShadow: "var(--shadow-md)"
        }}
      >
        {/* Date Input */}
        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
            <label style={{ fontSize: "0.9rem", color: "var(--text-primary)", fontWeight: 600 }}>
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
              padding: "0.75rem 1rem",
              background: "var(--bg-tertiary)",
              border: "1px solid var(--border-strong)",
              borderRadius: "var(--radius-md)",
              color: "var(--text-primary)",
              fontSize: "0.95rem",
              transition: "all 0.2s ease",
              outline: "none"
            }}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = "var(--accent)";
              e.currentTarget.style.boxShadow = "0 0 0 3px var(--accent-soft)";
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = "var(--border-strong)";
              e.currentTarget.style.boxShadow = "none";
            }}
          />
          {isStartDateInvalid && (
            <p style={{ fontSize: "0.8rem", color: "var(--danger)", margin: 0 }}>
              Start Date is not Monday
            </p>
          )}
        </div>

        {/* Meal IDs Input */}
        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
            <label style={{ fontSize: "0.9rem", color: "var(--text-primary)", fontWeight: 600 }}>
              Enter a Meal ID for each day
            </label>
            <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)", margin: 0 }}>
              0 to skip that day
            </p>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
            {mealValues.map((value, index) => {
              const boxDate = getMealBoxDate(date, index);
              const weekday = boxDate ? boxDate.toLocaleDateString("en-US", { weekday: "short" }) : "";
              const dayOfMonth = boxDate ? String(boxDate.getDate()) : "";
              const isActive = activeMeal[index];
              const isSkip = value === "0" || value === "";
              const lookup = mealLookups[index];

              return (
                <div
                  key={index}
                  style={{
                    display: "flex",
                    flexDirection: "row",
                    alignItems: "center",
                    gap: "0.75rem",
                    padding: "0.6rem 0.85rem",
                    background: "var(--bg-tertiary)",
                    border: `1px solid ${isActive ? "var(--accent)" : "var(--border-strong)"}`,
                    borderRadius: "var(--radius-md)",
                    boxShadow: isActive ? "0 0 0 3px var(--accent-soft)" : "none",
                    transition: "all 0.2s ease"
                  }}
                >
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0.35rem", width: "3.5rem", flexShrink: 0 }}>
                    <div style={{ display: "flex", alignItems: "baseline", gap: "0.35rem" }}>
                      <span style={{ fontSize: "0.7rem", color: isStartDateInvalid ? "var(--danger)" : "var(--text-secondary)" }}>
                        {weekday}
                      </span>
                      <span style={{ fontSize: "0.8rem", color: isStartDateInvalid ? "var(--danger)" : "var(--accent)", fontWeight: 700 }}>
                        {dayOfMonth}
                      </span>
                    </div>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={value}
                      ref={(el) => {
                        mealInputRefs.current[index] = el;
                      }}
                      onFocus={(e) => {
                        mealFocusValueRef.current[index] = e.target.value;
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
                        if (clamped === "0" || clamped === "") {
                          mealLookupSeqRef.current[index] += 1;
                          setMealLookups((prev) => prev.map((v, i) => (i === index ? { ...emptyLookup } : v)));
                          setMealIdErrors((prev) => prev.map((v, i) => (i === index ? false : v)));
                        }
                      }}
                      onBlur={(e) => {
                        setActiveMeal((prev) => prev.map((v, i) => (i === index ? false : v)));
                        const finalValue = e.target.value === "" ? "0" : e.target.value;
                        if (e.target.value === "") {
                          setMealValues((prev) => prev.map((v, i) => (i === index ? "0" : v)));
                        }
                        const idNum = parseInt(finalValue, 10);
                        if (!idNum) {
                          mealLookupSeqRef.current[index] += 1;
                          setMealLookups((prev) => prev.map((v, i) => (i === index ? { ...emptyLookup } : v)));
                          setMealIdErrors((prev) => prev.map((v, i) => (i === index ? false : v)));
                        } else {
                          const unchanged = mealFocusValueRef.current[index] === e.target.value;
                          const isMatched = !lookup.loading && !lookup.error && lookup.name !== "";
                          // Skip re-checking an unchanged value that's already matched or mid-flight.
                          if (!unchanged || (!isMatched && !lookup.loading)) {
                            lookupMealName(index, idNum);
                          }
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
                        } else if (e.key === "ArrowDown") {
                          e.preventDefault();
                          goToMealBox(index + 1);
                        } else if (e.key === "ArrowUp") {
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
                        color: mealIdErrors[index] ? "var(--danger)" : "var(--text-hover)",
                        fontSize: "1rem",
                        fontWeight: 600,
                        fontFamily: "var(--font-mono)",
                        fontVariantNumeric: "tabular-nums"
                      }}
                    />
                  </div>
                  <div
                    className="meal-name-box"
                    style={{
                      flex: 1,
                      minWidth: 0,
                      padding: "0.65rem 0.85rem",
                      border: "1px solid var(--border)",
                      borderRadius: "var(--radius-sm)",
                      fontSize: "0.8rem",
                      fontFamily: "var(--font-mono)",
                      whiteSpace: "nowrap",
                      overflowX: "auto",
                      overflowY: "hidden",
                      WebkitOverflowScrolling: "touch",
                      color: lookup.error ? "var(--danger)" : isSkip ? "var(--text-secondary)" : "var(--accent)"
                    }}
                  >
                    {lookup.loading ? (
                      <span style={{ display: "inline-flex" }}>
                        <span className="bounce-dot" style={{ animationDelay: "0s" }}>.</span>
                        <span className="bounce-dot" style={{ animationDelay: "0.2s" }}>.</span>
                        <span className="bounce-dot" style={{ animationDelay: "0.4s" }}>.</span>
                      </span>
                    ) : lookup.error ? (
                      "No meal found"
                    ) : isSkip ? (
                      "Skip"
                    ) : (
                      lookup.name
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Week Selection */}
        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          <label style={{ fontSize: "0.9rem", color: "var(--text-primary)", fontWeight: 600 }}>
            Select Week
          </label>
          <div
            style={{
              display: "flex",
              gap: "0.25rem",
              padding: "0.25rem",
              background: "var(--bg-tertiary)",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius-pill)"
            }}
          >
            {[true, false].map((week) => {
              const selected = firstWeek === week;
              return (
                <button
                  key={week.toString()}
                  type="button"
                  onClick={() => setFirstWeek(week)}
                  style={{
                    flex: 1,
                    cursor: "pointer",
                    padding: "0.6rem 1rem",
                    borderRadius: "var(--radius-pill)",
                    background: selected ? "var(--accent)" : "transparent",
                    color: selected ? "#000" : "var(--text-secondary)",
                    border: "none",
                    fontSize: "0.9rem",
                    fontWeight: selected ? 700 : 500,
                    transition: "all 0.2s ease"
                  }}
                >
                  {week ? "First week" : "Second week"}
                </button>
              );
            })}
          </div>
        </div>

        {/* Optional Settings */}
        <div style={{ paddingTop: "0.75rem", borderTop: "1px solid var(--border)" }}>
          <button
            onClick={() => setShowOptional(!showOptional)}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              fontSize: "0.9rem",
              padding: "0.5rem 0",
              color: "var(--text-primary)",
              fontWeight: 600,
              transition: "color 0.2s ease",
              display: "flex",
              alignItems: "center",
              gap: "0.5rem"
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = "var(--accent)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = "var(--text-primary)";
            }}
          >
            <span
              style={{
                display: "inline-block",
                fontSize: "0.75rem",
                transform: showOptional ? "rotate(90deg)" : "rotate(0deg)",
                transition: "transform 0.2s ease"
              }}
            >
              ▶
            </span>
            Additional Options
          </button>

          {showOptional && (
            <div style={{ marginTop: "1rem", display: "flex", flexDirection: "column", gap: "0.4rem" }}>
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
                    padding: "0.6rem 0.75rem",
                    borderRadius: "var(--radius-md)",
                    transition: "background 0.2s ease"
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "var(--bg-tertiary)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "transparent";
                  }}
                >
                  <input
                    type="checkbox"
                    className="toggle-input"
                    checked={value}
                    onChange={(e) => setter(e.currentTarget.checked)}
                  />
                  <span className="toggle-track"><span className="toggle-thumb" /></span>
                  <span style={{ fontSize: "0.9rem" }}>{label}</span>
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
            borderRadius: "var(--radius-pill)",
            border: isAddGroceriesDisabled ? "1px solid var(--border-strong)" : "none",
            fontSize: "1rem",
            fontWeight: 700,
            cursor: isAddGroceriesDisabled ? "not-allowed" : "pointer",
            transition: "all 0.2s ease",
            marginTop: "0.5rem"
          }}
          onMouseEnter={(e) => {
            if (isAddGroceriesDisabled) return;
            e.currentTarget.style.background = "var(--accent-hover)";
            e.currentTarget.style.boxShadow = "0 8px 20px var(--accent-glow)";
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
            marginTop: "1.5rem",
            padding: "1.25rem 1.5rem",
            background: "var(--bg-secondary)",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius-lg)",
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
              fontWeight: 600,
              fontFamily: "var(--font-mono)"
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
            marginTop: "1.5rem",
            padding: "1.25rem 1.5rem",
            borderRadius: "var(--radius-lg)",
            background: "var(--bg-secondary)",
            border: `1px solid ${isError ? "var(--danger-soft)" : "var(--accent-soft)"}`,
            animation: "slideIn 0.3s ease"
          }}
        >
          <pre
            style={{
              color: isError ? "var(--danger)" : "var(--accent)",
              fontSize: "0.9rem",
              fontFamily: "var(--font-mono)",
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
    </div>
  );
}
