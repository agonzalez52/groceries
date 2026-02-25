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
    <main style={{ padding: "2rem" }}>
      <h1>Grocery Run</h1>

      <br />

      <div>
        <label>Start Date (Must be a Monday):</label><br />
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
        />
      </div>

      <br />

      <div>
        <label>Enter 6 Meal IDs (e.g. 1,2,3,4,5,6):</label><br />
        <input
          type="text"
          value={mealIds}
          onChange={(e) => setMealIds(e.target.value)}
        />
      </div>

      <br />

      <div>
        <label>
          <input
            type="radio"
            name="week"
            checked={firstWeek === true}
            onChange={() => setFirstWeek(true)}
          />
          First week
        </label>
        <label>
          <input
            type="radio"
            name="week"
            checked={firstWeek === false}
            onChange={() => setFirstWeek(false)}
          />
          Second week
        </label>
      </div>

      <br />

      <div>
        <button
          onClick={() => setShowOptional(!showOptional)}
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            fontSize: "1rem",
            padding: 0,
            fontWeight: "inherit"
          }}
        >
          <span
            style={{
              display: "inline-block",
              marginRight: "0.5rem",
              transform: showOptional ? "rotate(90deg)" : "rotate(0deg)",
              transition: "transform 0.2s"
            }}
          >
            ▶
          </span>
          Optional
        </button>

        {showOptional && (
          <div style={{ marginLeft: "1rem", marginTop: "0.5rem" }}>
            <div>
              <label>
                <input
                  type="checkbox"
                  checked={onlyReminders}
                  onChange={(e) => setOnlyReminders(e.target.checked)}
                />
                Only create calendar events
              </label>
            </div>

            <div>
              <label>
                <input
                  type="checkbox"
                  checked={checklist}
                  onChange={(e) => setChecklist(e.target.checked)}
                />
                Checklist
              </label>
            </div>

            <div>
              <label>
                <input
                  type="checkbox"
                  checked={test}
                  onChange={(e) => setTest(e.target.checked)}
                />
                Test
              </label>
            </div>
          </div>
        )}
      </div>

      <br />

      <button onClick={runScript}>
        Run
      </button>

      <br /><br />

      {result && (
        <pre style={{ color: isError ? "red" : "inherit" }}>{result}</pre>
      )}
    </main>
  );
}
