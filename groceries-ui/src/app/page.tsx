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

interface RunRecord {
  id: string;
  ranAt: string; // ISO timestamp of when the run completed
  startDate: string;
  test: boolean;
  mealDetails: MealDetail[];
  error?: string; // set when the run failed
}

// Runs are kept for the browser session only (cleared when the tab is closed).
const RUN_HISTORY_KEY = "groceries_run_history";

function readRunHistory(): RunRecord[] {
  try {
    const raw = sessionStorage.getItem(RUN_HISTORY_KEY);
    return raw ? (JSON.parse(raw) as RunRecord[]) : [];
  } catch {
    return [];
  }
}

function writeRunHistory(runs: RunRecord[]) {
  try {
    sessionStorage.setItem(RUN_HISTORY_KEY, JSON.stringify(runs));
  } catch {
    // sessionStorage unavailable - history lives in memory only
  }
}

// API sends meal_day as e.g. "Monday 11/16"; split it so the day and date can be styled separately.
function splitMealDay(mealDay: string): { weekday: string; date: string } {
  const [weekday, ...rest] = mealDay.split(" ");
  return { weekday: weekday ?? mealDay, date: rest.join(" ") };
}

function formatRunTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

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
  const [isRunning, setIsRunning] = useState(false);
  const [runHistory, setRunHistory] = useState<RunRecord[]>([]);
  const [openRun, setOpenRun] = useState<RunRecord | null>(null);
  const [showHistoryList, setShowHistoryList] = useState(false);
  const [showHistoryCta, setShowHistoryCta] = useState(false);

  // Restore this session's runs (e.g. after a refresh). The History CTA is shown
  // straight away if there are any, since a run's modal was already seen/closed.
  useEffect(() => {
    const stored = readRunHistory();
    if (stored.length > 0) {
      setRunHistory(stored);
      setShowHistoryCta(true);
    }
  }, []);

  // Escape closes whichever modal is open.
  useEffect(() => {
    if (!openRun && !showHistoryList) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") closeModals();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [openRun, showHistoryList]);

  function closeModals() {
    setOpenRun(null);
    setShowHistoryList(false);
    setShowHistoryCta(true);
  }

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

    // Cache hit: show the name instantly so it updates live as the user types.
    const cachedName = mealsMapRef.current[idNum];
    if (cachedName !== undefined) {
      setMealLookups((prev) => prev.map((v, i) => (i === index ? { visible: true, loading: false, name: cachedName, error: false } : v)));
      setMealIdErrors((prev) => prev.map((v, i) => (i === index ? false : v)));
      return;
    }

    setMealLookups((prev) => prev.map((v, i) => (i === index ? { visible: true, loading: true, name: "", error: false } : v)));
    setMealIdErrors((prev) => prev.map((v, i) => (i === index ? false : v)));

    // Debounce cache misses so a refetch only happens once the user pauses typing.

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

  function recordRun(fields: Pick<RunRecord, "startDate" | "mealDetails" | "error">) {
    const run: RunRecord = {
      id: `${Date.now()}`,
      ranAt: new Date().toISOString(),
      test: test,
      ...fields,
    };
    setRunHistory((prev) => {
      const next = [run, ...prev];
      writeRunHistory(next);
      return next;
    });
    setOpenRun(run);
  }

  async function runScript() {
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
        recordRun({
          startDate: date,
          mealDetails: [],
          error: `Error ${response.status}: ${data.error || data.message || JSON.stringify(data)}`,
        });
      } else {
        recordRun({ startDate: data.start_date, mealDetails: data.meal_details });
      }
    }
    // Handle Network errors (connection refused, timeout,...)
    catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      recordRun({ startDate: date, mealDetails: [], error: `Network Error: ${errorMessage}` });
    } finally {
      setIsRunning(false);
    }
  }


  return (
    <div style={{ maxWidth: "600px", margin: "0 auto", width: "100%", paddingBottom: "8rem" }}>
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
                        if (clamped === value) return;
                        const idNum = parseInt(clamped, 10);
                        if (!idNum) {
                          mealLookupSeqRef.current[index] += 1;
                          setMealLookups((prev) => prev.map((v, i) => (i === index ? { ...emptyLookup } : v)));
                          setMealIdErrors((prev) => prev.map((v, i) => (i === index ? false : v)));
                        } else {
                          lookupMealName(index, idNum);
                        }
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

      </div>

      {/* Action Button (pinned to the bottom of the screen) */}
      <div className="cta-bar">
        <div style={{ maxWidth: "600px", margin: "0 auto", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
          {isRunning && (
            <p
              style={{
                margin: 0,
                textAlign: "center",
                fontSize: "0.8rem",
                color: "var(--text-secondary)",
                animation: "slideIn 0.3s ease"
              }}
            >
              Running... This may take a minute or two
            </p>
          )}
          <button
            onClick={runScript}
            disabled={isAddGroceriesDisabled || isRunning}
            aria-label={isRunning ? "Running" : undefined}
            aria-busy={isRunning}
            style={{
              position: "relative",
              width: "100%",
              height: "3.25rem",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              overflow: "hidden",
              background: isRunning ? "var(--accent)" : isAddGroceriesDisabled ? "var(--bg-tertiary)" : "var(--accent)",
              color: isRunning ? "#000" : isAddGroceriesDisabled ? "var(--text-secondary)" : "#000",
              padding: "0 1rem",
              borderRadius: "2px",
              border: "none",
              fontSize: "1rem",
              fontWeight: 600,
              cursor: isRunning ? "progress" : isAddGroceriesDisabled ? "not-allowed" : "pointer",
              transition: "all 0.2s ease"
            }}
            onMouseEnter={(e) => {
              if (isAddGroceriesDisabled || isRunning) return;
              e.currentTarget.style.background = "var(--accent-hover)";
              e.currentTarget.style.boxShadow = "0 4px 12px rgba(107, 182, 35, 0.3)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = isAddGroceriesDisabled && !isRunning ? "var(--bg-tertiary)" : "var(--accent)";
              e.currentTarget.style.boxShadow = "none";
            }}
          >
            {isRunning ? (
              // Checkbox drawn counterclockwise from its top-right corner, then a line
              // "written" out to its right (a grocery list item), then it slides away and repeats.
              <svg
                className="list-item-anim"
                width="120"
                height="24"
                viewBox="0 0 120 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                aria-hidden="true"
              >
                <g className="list-item-anim__group">
                  <path
                    className="list-item-anim__box"
                    d="M20 4 H4 V20 H20 Z"
                    pathLength={100}
                    strokeLinejoin="round"
                  />
                  <path
                    className="list-item-anim__line"
                    d="M28 12 H116"
                    pathLength={100}
                  />
                </g>
              </svg>
            ) : (
              "Add Groceries"
            )}
          </button>
        </div>
      </div>

      {/* History CTA (top right, over the header) - appears once a run's modal has been closed */}
      {showHistoryCta && runHistory.length > 0 && (
        <button
          className="history-cta"
          onClick={() => {
            setOpenRun(null);
            setShowHistoryList(true);
          }}
        >
          History
        </button>
      )}

      {/* Run History List Modal */}
      {showHistoryList && (
        <div className="modal-backdrop" onClick={closeModals}>
          <div
            className="modal-panel"
            role="dialog"
            aria-modal="true"
            aria-labelledby="history-title"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <h2 id="history-title" className="modal-title">History</h2>
              <button className="modal-close" onClick={closeModals} aria-label="Close">✕</button>
            </div>
            <p className="modal-subtitle">Runs from this session</p>
            <ul className="modal-list">
              {runHistory.map((run) => {
                const added = run.mealDetails.filter((m) => m.meal_name !== "Skipped").length;
                return (
                  <li key={run.id}>
                    <button
                      className={run.error ? "history-row history-row--error" : "history-row"}
                      onClick={() => {
                        setShowHistoryList(false);
                        setOpenRun(run);
                      }}
                    >
                      <span className="history-row__main">
                        Week of {formatDate(run.startDate)}
                        {run.test && <span className="test-badge">Test</span>}
                      </span>
                      <span className="history-row__meta">
                        {formatRunTime(run.ranAt)} ·{" "}
                        {run.error ? "Failed" : `${added} ${added === 1 ? "meal" : "meals"}`}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      )}

      {/* Run Details Modal */}
      {openRun && (
        <div className="modal-backdrop" onClick={closeModals}>
          <div
            className={openRun.error ? "modal-panel modal-panel--error" : "modal-panel"}
            role="dialog"
            aria-modal="true"
            aria-labelledby="run-title"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <h2 id="run-title" className="modal-title">
                {openRun.error ? "Run failed" : "Done!"}
                {openRun.test && <span className="test-badge">Test</span>}
              </h2>
              <button className="modal-close" onClick={closeModals} aria-label="Close">✕</button>
            </div>
            <p className="modal-subtitle">
              {openRun.startDate ? `Week of ${formatDate(openRun.startDate)}` : "No start date"} · {formatRunTime(openRun.ranAt)}
            </p>
            {openRun.error ? (
              <pre className="modal-error">{openRun.error}</pre>
            ) : (
            <ul className="modal-list">
              {openRun.mealDetails.map((meal, index) => {
                const { weekday, date: mealDate } = splitMealDay(meal.meal_day);
                const skipped = meal.meal_name === "Skipped";
                return (
                  <li key={index} className="meal-row">
                    <span className="meal-row__day">
                      <span>{weekday.slice(0, 3)}</span>
                      <span className="meal-row__date">{mealDate}</span>
                    </span>
                    <span className={skipped ? "meal-row__name meal-row__name--skipped" : "meal-row__name"}>
                      {meal.meal_name}
                    </span>
                  </li>
                );
              })}
            </ul>
            )}
            {!openRun.error && <p className="modal-footer">Have a lovely day! :)</p>}
          </div>
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
        .cta-bar {
          position: fixed;
          left: 0;
          right: 0;
          bottom: 0;
          z-index: 100;
          padding: 0.75rem 2rem calc(1rem + env(safe-area-inset-bottom));
          background: var(--bg-primary);
          border-top: 1px solid var(--border);
        }
        @media (max-width: 768px) {
          .cta-bar {
            padding-left: 1rem;
            padding-right: 1rem;
          }
        }
        .history-cta {
          position: fixed;
          top: 0;
          right: 2rem;
          height: 4rem;
          z-index: 1001;
          display: flex;
          align-items: center;
          background: none;
          border: none;
          color: var(--accent);
          font-size: 0.95rem;
          font-weight: 600;
          cursor: pointer;
          animation: fadeIn 0.3s ease;
        }
        .history-cta:hover {
          color: var(--accent-hover);
        }
        .modal-backdrop {
          position: fixed;
          inset: 0;
          z-index: 2000;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 1rem;
          background: rgba(0, 0, 0, 0.6);
          animation: fadeIn 0.2s ease;
        }
        .modal-panel {
          width: 100%;
          max-width: 420px;
          max-height: calc(100vh - 2rem);
          overflow-y: auto;
          padding: 1.5rem;
          background: var(--bg-secondary);
          border: 1px solid var(--border);
          border-top: 2px solid var(--accent);
          border-radius: 4px;
          animation: slideIn 0.25s ease;
        }
        .modal-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 1rem;
        }
        .modal-title {
          margin: 0;
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 1.25rem;
          color: var(--accent);
        }
        .modal-close {
          background: none;
          border: none;
          color: var(--text-secondary);
          font-size: 1rem;
          cursor: pointer;
          padding: 0.25rem;
        }
        .modal-close:hover {
          color: var(--text-hover);
        }
        .modal-subtitle {
          margin: 0.25rem 0 1.25rem;
          font-size: 0.85rem;
          color: var(--text-secondary);
        }
        .modal-list {
          list-style: none;
          margin: 0;
          padding: 0;
        }
        .modal-list > li + li {
          border-top: 1px solid var(--border);
        }
        .meal-row {
          display: flex;
          align-items: baseline;
          gap: 1rem;
          padding: 0.7rem 0;
        }
        .meal-row__day {
          display: flex;
          align-items: baseline;
          gap: 0.35rem;
          width: 5.5rem;
          flex-shrink: 0;
          font-size: 0.8rem;
          color: var(--text-secondary);
        }
        .meal-row__date {
          font-family: monospace;
          color: var(--accent);
        }
        .meal-row__name {
          flex: 1;
          min-width: 0;
          font-size: 0.95rem;
          color: var(--text-primary);
          overflow-wrap: anywhere;
        }
        .meal-row__name--skipped {
          color: gray;
        }
        .modal-footer {
          margin: 1.25rem 0 0;
          padding-top: 1rem;
          border-top: 1px solid var(--border);
          text-align: center;
          font-size: 0.9rem;
          color: var(--accent);
        }
        .history-row {
          width: 100%;
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          gap: 0.2rem;
          padding: 0.75rem 0;
          background: none;
          border: none;
          text-align: left;
          cursor: pointer;
          color: var(--text-primary);
        }
        .history-row:hover .history-row__main {
          color: var(--accent);
        }
        .history-row__main {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.95rem;
          transition: color 0.2s ease;
        }
        .history-row__meta {
          font-size: 0.8rem;
          color: var(--text-secondary);
        }
        .modal-panel--error {
          border-top-color: #ff6b6b;
        }
        .modal-panel--error .modal-title {
          color: #ff6b6b;
        }
        .modal-error {
          margin: 0;
          padding: 0.75rem;
          background: var(--bg-tertiary);
          border-radius: 2px;
          color: #ff6b6b;
          font-family: monospace;
          font-size: 0.85rem;
          line-height: 1.6;
          white-space: pre-wrap;
          overflow-wrap: anywhere;
        }
        .history-row--error .history-row__main,
        .history-row--error .history-row__meta,
        .history-row--error:hover .history-row__main {
          color: #ff6b6b;
        }
        .test-badge {
          font-size: 0.65rem;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          padding: 0.1rem 0.4rem;
          border: 1px solid var(--border);
          border-radius: 2px;
          color: var(--text-secondary);
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @media (max-width: 768px) {
          .history-cta {
            right: 1rem;
          }
        }
        .list-item-anim__group {
          animation: listItemDismiss 2.4s infinite;
        }
        .list-item-anim__box,
        .list-item-anim__line {
          stroke-dasharray: 100;
          stroke-dashoffset: 100;
        }
        .list-item-anim__box {
          animation: listItemDrawBox 2.4s infinite;
        }
        .list-item-anim__line {
          animation: listItemDrawLine 2.4s infinite;
        }
        @keyframes listItemDrawBox {
          0% { stroke-dashoffset: 100; animation-timing-function: ease-in-out; }
          30%, 100% { stroke-dashoffset: 0; }
        }
        @keyframes listItemDrawLine {
          0%, 30% { stroke-dashoffset: 100; animation-timing-function: ease-out; }
          62%, 100% { stroke-dashoffset: 0; }
        }
        @keyframes listItemDismiss {
          0%, 74% { transform: translateY(0); opacity: 1; animation-timing-function: ease-in; }
          94%, 100% { transform: translateY(-24px); opacity: 0; }
        }
        @media (prefers-reduced-motion: reduce) {
          .list-item-anim__group,
          .list-item-anim__box,
          .list-item-anim__line {
            animation-duration: 4.8s;
          }
        }
      `}</style>
    </div>
  );
}
