//
// Version 4.1.0
//
// Created By: Angel Gonzalez
//

"use client";

import { useState } from "react";

const API_URL = process.env.NEXT_PUBLIC_API_URL

export default function Home() {
  const [date, setDate] = useState("");
  const [mealIds, setMealIds] = useState("");
  const [firstWeek, setFirstWeek] = useState(true);
  const [checklist, setChecklist] = useState(true);
  const [test, setTest] = useState(false);
  const [onlyReminders, setOnlyReminders] = useState(false);
  const [showOptional, setShowOptional] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  async function runScript() {
    setResult("Running...");

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

    const data = await response.json();
    setResult(JSON.stringify(data, null, 2));
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
        <pre>{result}</pre>
      )}
    </main>
  );
}
