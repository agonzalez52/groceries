"use client";

import Link from "next/link";

export default function Sidebar() {
  return (
    <aside style={{ width: "200px", padding: "1rem", borderRight: "1px solid #ccc" }}>
      <h3>Menu</h3>
      <ul>
        <li><Link href="/">Grocery Run</Link></li>
        <li><a href="https://docs.google.com/document/d/1j2HUVs1Rwm2eemLie3qiHGDNazYtaXIYsPhcjjaBjrQ/edit?tab=t.0" target="_blank">Food For Week</a></li>
        <li><a href="https://docs.google.com/spreadsheets/d/1a4cOzCh81sp19dl3Oww3BkHmRcxAZcigq0Z5cHah0LU/edit?gid=0#gid=0" target="_blank">Meals</a></li>
        <li><a href="https://docs.google.com/spreadsheets/d/1a4cOzCh81sp19dl3Oww3BkHmRcxAZcigq0Z5cHah0LU/edit?gid=150359050#gid=150359050" target="_blank">Ingredients</a></li>
        <li><a href="https://docs.google.com/document/d/1fzSVQAaERQ938fgjDosOHjsYG6Z9fJltzHMCjTPRMtA/edit?tab=t.0" target="_blank">Groceries List</a></li>
        <li><Link href="/add_meal">Add Meal</Link></li>
      </ul>
    </aside>
  );
}