# Ledger — Personal Expense Tracker

A beginner-friendly MERN application for recording income and expenses, setting monthly budgets, and reviewing a personal finance dashboard. Each account's transactions and budgets are private to that account.

## Features

- Register and log in with hashed passwords and JWT authentication.
- Add, view, edit, and delete income and expense transactions.
- Search by title and filter transactions by category, type, and month.
- Set a separate budget for each month, see spending progress, and get an overspending warning.
- View income, expenses, balance, budget, and a monthly comparison chart based on MongoDB records.
- Responsive layout for desktop and mobile.

## Technologies

React, Vite, JavaScript, HTML, regular CSS, Fetch API, Node.js, Express, MongoDB, Mongoose, bcryptjs, JWT, dotenv, and cors.

## Folder structure

```text
ExpenseTracker/
├── backend/
│   ├── .env.example
│   ├── middleware.js
│   ├── models.js
│   ├── package.json
│   ├── routes.js
│   └── server.js
├── frontend/
│   ├── index.html
│   ├── package.json
│   └── src/
│       ├── App.css
│       ├── App.jsx
│       └── main.jsx
└── README.md
```

## Requirements and setup

Install Node.js and run MongoDB locally, or use a MongoDB connection URI. Open two terminals from the project folder.

### 1. Start the backend

```bash
cd backend
npm install
```

Copy `.env.example` to `.env`, then set `MONGO_URI` and a private, random `JWT_SECRET`. The example URI uses a local MongoDB database named `expense_tracker`.

```bash
npm run dev
```

The API starts at `http://localhost:4000` by default. Use `npm start` to run without nodemon.

### 2. Start the frontend

In a second terminal:

```bash
cd frontend
npm install
npm run dev
```

Open the local URL Vite prints (normally `http://localhost:5173`). If the backend uses a different address, create `frontend/.env` with `VITE_API_URL=http://localhost:4000/api` (adjust the address as needed), then restart Vite.

## API endpoints

All private endpoints require `Authorization: Bearer <token>`.

| Method | Endpoint | Purpose |
| --- | --- | --- |
| POST | `/api/auth/register` | Create an account |
| POST | `/api/auth/login` | Verify credentials and receive a token |
| POST | `/api/transactions` | Create a transaction |
| GET | `/api/transactions` | List transactions; optional `search`, `category`, `type`, and `month=YYYY-MM` filters |
| PUT | `/api/transactions/:id` | Update an owned transaction |
| DELETE | `/api/transactions/:id` | Delete an owned transaction |
| POST | `/api/budget` | Create or save a monthly budget (upsert) |
| GET | `/api/budget?month=MM&year=YYYY` | Read a monthly budget |
| PUT | `/api/budget/:id` | Update an owned budget by ID |
| GET | `/api/dashboard?month=MM&year=YYYY` | Get monthly income, expenses, balance, and budget figures |

## How the main parts work

1. **React and Express:** React sends JSON requests with the browser Fetch API to the Express API. The API sends JSON responses, which React stores in state and renders.
2. **Express and MongoDB:** Express routes call Mongoose model methods such as `find`, `create`, and `findOneAndUpdate`. Mongoose sends those operations to MongoDB.
3. **Schemas:** The schemas in `backend/models.js` describe each document's fields, types, required values, and validation rules. Transactions and budgets store a `userId` reference to their owner in the Users collection.
4. **CRUD:** Create inserts a document, Read queries documents, Update changes an existing document, and Delete removes it. Private transaction and budget queries include both the document ID and the logged-in user's ID.
5. **JWT authentication:** Login checks the password and signs a token containing the user's ID. The frontend sends the token in an authorization header. `middleware.js` verifies it and attaches that ID to the request before a private route runs.
6. **Password hashing:** Registration uses bcryptjs to store a salted hash. Login compares the entered password with that hash; the original password is never saved.
7. **Dashboard calculations:** The API loads that user's transactions for the selected month, adds income and expenses separately, calculates balance as income minus expenses, and subtracts expenses from the saved budget to find the remaining budget.

## Data relationships

One user can have many transactions and monthly budgets. Every transaction and budget has a `userId` reference to the Users collection. Routes filter by this ID, so one account cannot read or alter another account's records.
