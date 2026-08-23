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
          filter: invert(48%) sepia(79%) saturate(2476%) hue-rotate(86deg) brightness(118%) contrast(119%);
          cursor: pointer;
        }
        .meal-name-box {
          scrollbar-width: none;
        }
        .meal-name-box::-webkit-scrollbar {
          display: none;
        }
      `}</style>

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
          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
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
                    padding: "0.5rem 0.75rem",
                    background: "var(--bg-tertiary)",
                    borderBottom: `1px solid ${isActive ? "var(--accent)" : "var(--border)"}`,
                    borderRadius: "2px",
                    transition: "all 0.2s ease"
                  }}
                >
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0.35rem", width: "3.5rem", flexShrink: 0 }}>
                    <div style={{ display: "flex", alignItems: "baseline", gap: "0.35rem" }}>
                      <span style={{ fontSize: "0.7rem", color: isStartDateInvalid ? "#ff6b6b" : "gray" }}>
                        {weekday}
                      </span>
                      <span style={{ fontSize: "0.8rem", color: isStartDateInvalid ? "#ff6b6b" : "var(--accent)", fontWeight: 600 }}>
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
                        color: mealIdErrors[index] ? "#ff6b6b" : "white",
                        fontSize: "1rem",
                        fontFamily: "monospace"
                      }}
                    />
                  </div>
                  <div
                    className="meal-name-box"
                    style={{
                      flex: 1,
                      minWidth: 0,
                      padding: "0.65rem 0.75rem",
                      border: "1px solid var(--border)",
                      borderRadius: "4px",
                      fontSize: "0.8rem",
                      fontFamily: "monospace",
                      whiteSpace: "nowrap",
                      overflowX: "auto",
                      overflowY: "hidden",
                      WebkitOverflowScrolling: "touch",
                      color: lookup.error ? "#ff6b6b" : isSkip ? "gray" : "var(--accent)"
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
    </div>
  );
}
