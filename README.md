# SmartFarm Crop IoT Dashboard

A full-stack web app for creating and managing simulated private health insurance quotes.

Stack: React (Vite) frontend, Node.js + Express backend, SQLite database (better-sqlite3), plain CSS.

## Project Structure

```text
health-app/
  server/
    index.js
    db.js
    errorMsgConfig.js
    records.db (auto-generates on first run)
  client/
    index.html
    src/
      App.jsx
      App.css
      QuoteModal.jsx
      calculateQuote.js
      pricingConfig.js
```

## Setup

Run the setup script from the project root:

chmod +x setup_ubuntu.sh run_backend.sh run_frontend.sh
./setup_ubuntu.sh

This checks for Node.js (installing it via nvm if missing), installs backend and
frontend dependencies, and validates that the database schema and frontend build
are both working correctly.

## Run

Terminal 1:

./run_backend.sh

Runs the API on http://localhost:3001

Terminal 2:

./run_frontend.sh

Runs the app on http://localhost:5173

## Database Setup

The database is SQLite, created and initialised by server/db.js. There is no
separate init.sql file, since better-sqlite3 lets the schema be defined directly
in JavaScript.

When the server starts, db.js:

1. Opens or creates, if missing, a file called records.db in the server folder.
   This file is the entire database.
2. Runs CREATE TABLE IF NOT EXISTS records (...), defining the columns for a
   quote record: customer name, cover type, applicant ages and hospital history,
   cover levels, payment frequency, discount, notes, and an auto-filled
   created_at timestamp.

No manual setup step is required. Running ./setup_ubuntu.sh, or simply starting
the server, creates the database on first launch.

To reset the database, stop the server, delete records.db, and restart it. The
table is recreated automatically, empty.

## How the Quote Calculation Works

Pricing rules can be found in client/src/pricingConfig.js. Calculation rules can be found in client/src/calculateQuote.js. They are kept separate so prices can be changed without touching calculation code.

The formula, step by step:

- Hospital premium per adult = tier price x (1 + that adult's LHC loading)
- Hospital total = sum of the above across all adults premiums
- Extras total = extras tier price x number of adults
- Family fee = $30/month if cover type is Family
- Monthly premium = hospital total + extras total + family fee
- Yearly premium before discount = monthly premium x 12
- Yearly premium after discount = yearly before discount x (1 - annual discount %), only applied if paying Yearly
- Final total shown = yearly-after-discount if paying Yearly, otherwise the monthly premium

Lifetime Health Cover (LHC) loading applies only to the hospital premium cover:

- Hospital cover level is None: no loading applies (nothing to load).
- Applicant's cover history is Yes: 0% loading.
- Applicant's cover history is No: (age - 30) x 2% if age is over 30, otherwise 0%.
- Applicant's cover history is Not sure: 0% loading is applied, but a warning is shown in the quote details, since the true loading is unknown and the quote may be inaccurate.

The annual-payment discount (0-10%) only applies when Payment Frequency is Yearly. It has no effect on monthly pricing.

## How Family Cover Is Calculated

Selecting Family as the cover type affects pricing in two ways:

1. Adult count is 2, the same as Couple cover. Both applicants' hospital and extras
   premiums are calculated individually, including separate LHC loading per
   applicant based on each one's own age and hospital cover history.
2. A flat $30 a month family upgrade fee is added once per policy, not per adult,
   on top of both adults' hospital and extras totals. Children are not counted or
   priced individually.

So a Family quote's monthly premium equals Applicant 1's loaded hospital premium
plus Applicant 2's loaded hospital premium, plus extras tier price x 2, plus $30.

## AI Assistance

This project was built through an interactive, step-by-step collaboration with Claude, used as a coding tutor and pair-programmer throughout development.

What the AI helped with:

- Explaining core concepts as they came up: Express routing, middleware, React state and hooks, controlled forms, SQLite schema design, CORS, HTTP methods and status codes, JS operators such as ?? and the spread operator.
- Writing initial code, it guided me step by step for setting up backend and frontend framework. Also assisted me with terminal commands for Git and setting up Ubunutu.
- Suggesting fixes when I described bugs or pasted error messages.

What I did myself:

- Coded the specific form fields, validation rules, and pricing rules, and the UI layout, based on a mockup I made.
- Wrote and edited the code in my own files, integrating and adjusting AI-suggested code rather than pasting it in unreviewed.
- Diagnosed the root cause of at least two real bugs myself during debugging: a const reassignment error, and an operator-precedence logic error in a conditional render.
- I chose to separate configurable values into their own files rather than hardcoding them inline. Error messages can be found in errorMsgConfig.js, and all pricing figures and rules are located in pricingConfig.js.

## Limitation

This is a simulator, not a real insurance quoting engine. The pricing figures, LHC loading formula, and discount range are simplified rules defined for this project.