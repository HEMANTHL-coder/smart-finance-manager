import { useEffect, useMemo, useState } from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Pie,
  PieChart,
  LineChart,
  Line,
  Legend,
  Cell,
} from "recharts";
import { format } from "date-fns";

// Simple color palette for charts
const COLORS = ["#22c55e", "#38bdf8", "#f97316", "#a855f7", "#facc15", "#fb7185"];

const CATEGORY_KEYWORDS = {
  Food: ["swiggy", "zomato", "restaurant", "hotel", "food", "pizza", "burger", "caf\u00e9", "cafe"],
  Transport: ["uber", "ola", "bus", "metro", "train", "fuel", "petrol", "diesel", "parking"],
  Shopping: ["amazon", "flipkart", "myntra", "shopping", "clothes", "shoes", "electronics"],
  Bills: ["electricity", "wifi", "internet", "mobile", "recharge", "gas", "bill"],
  Entertainment: ["netflix", "spotify", "movie", "cinema", "games", "gaming"],
  Education: ["course", "udemy", "coursera", "college", "exam", "book", "tuition"],
};

const DEFAULT_CATEGORIES = ["Food", "Transport", "Shopping", "Bills", "Entertainment", "Education", "Other"];

// 🔧 Hook for persistent localStorage state
function useLocalStorageState(key, initialValue) {
  const [value, setValue] = useState(() => {
    try {
      const raw = window.localStorage.getItem(key);
      return raw ? JSON.parse(raw) : initialValue;
    } catch {
      return initialValue;
    }
  });

  useEffect(() => {
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // ignore
    }
  }, [key, value]);

  return [value, setValue];
}

// 🧠 Simple “AI” auto categorization using keyword rules
function autoCategorize(description) {
  if (!description) return "Other";
  const text = description.toLowerCase();

  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    if (keywords.some((kw) => text.includes(kw))) {
      return category;
    }
  }
  return "Other";
}

// Helper to generate a simple unique id
function generateId() {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function App() {
  const [transactions, setTransactions] = useLocalStorageState("sfm:transactions", []);
  const [budget, setBudget] = useLocalStorageState("sfm:monthlyBudget", 20000); // example default
  const [form, setForm] = useState({
    type: "expense",
    amount: "",
    description: "",
    date: format(new Date(), "yyyy-MM-dd"),
    category: "",
  });

  // Derived stats
  const { totalIncome, totalExpenses, savings } = useMemo(() => {
    let income = 0;
    let expense = 0;
    transactions.forEach((t) => {
      if (t.type === "income") income += t.amount;
      else expense += t.amount;
    });
    return {
      totalIncome: income,
      totalExpenses: expense,
      savings: income - expense,
    };
  }, [transactions]);

  // Category-wise aggregation
  const categoryData = useMemo(() => {
    const map = {};
    transactions
      .filter((t) => t.type === "expense")
      .forEach((t) => {
        map[t.category] = (map[t.category] || 0) + t.amount;
      });

    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [transactions]);

  // Timeline data (by date)
  const timelineData = useMemo(() => {
    const byDate = {};
    transactions.forEach((t) => {
      const key = t.date;
      if (!byDate[key]) {
        byDate[key] = { date: key, income: 0, expense: 0 };
      }
      if (t.type === "income") byDate[key].income += t.amount;
      else byDate[key].expense += t.amount;
    });

    return Object.values(byDate).sort((a, b) => a.date.localeCompare(b.date));
  }, [transactions]);

  // Budget prediction & savings insights
  const insights = useMemo(() => {
    const spendingRate = (totalExpenses / (budget || 1)) * 100;
    let budgetMessage = "";
    if (spendingRate < 50) {
      budgetMessage = "You're in a safe zone. Continue this pace to save more this month.";
    } else if (spendingRate < 90) {
      budgetMessage = "You're getting close to your monthly budget. Track expenses more carefully now.";
    } else {
      budgetMessage = "You are about to cross your monthly budget. Try to pause non-essential spends.";
    }

    let savingsMessage = "";
    if (savings > 0) {
      savingsMessage = "Nice! You are in positive savings. Consider investing or putting this into a goal.";
    } else if (savings === 0) {
      savingsMessage = "You are breaking even. Try to reduce small recurring costs to build a buffer.";
    } else {
      savingsMessage = "You are in negative savings. Identify 2–3 big non-essential expenses to cut next month.";
    }

    return { spendingRate: Math.round(spendingRate), budgetMessage, savingsMessage };
  }, [totalExpenses, budget, savings]);

  // 🧾 Handle form input
  function handleChange(e) {
    const { name, value } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: name === "amount" ? value.replace(/[^\d.]/g, "") : value,
    }));
  }

  // ➕ Add transaction
  function handleAddTransaction(e) {
    e.preventDefault();
    const amountNum = parseFloat(form.amount);
    if (!amountNum || amountNum <= 0) return;

    const category =
      form.type === "expense"
        ? form.category || autoCategorize(form.description)
        : "Income";

    const newTx = {
      id: generateId(),
      type: form.type,
      amount: amountNum,
      description: form.description || (form.type === "income" ? "Income" : "Expense"),
      date: form.date,
      category,
      auto: !form.category && form.type === "expense",
    };

    setTransactions((prev) => [newTx, ...prev]);
    setForm((prev) => ({
      ...prev,
      amount: "",
      description: "",
    }));
  }

  function handleDeleteTransaction(id) {
    setTransactions((prev) => prev.filter((t) => t.id !== id));
  }

  return (
    <div className="app-root">
      {/* Top header */}
      <header style={{ display: "flex", justifyContent: "space-between", marginBottom: 24 }}>
        <div>
          <div className="chip" style={{ marginBottom: 8 }}>
            <span style={{ marginRight: 6 }}>🪙</span> Smart Personal Finance Manager
          </div>
          <h1 style={{ margin: 0, fontSize: 26, fontWeight: 600 }}>Your Personal Fintech Dashboard</h1>
          <p style={{ marginTop: 4, fontSize: 13, color: "#9ca3af" }}>
            Track income, expenses, budgets & savings with an AI-inspired rules engine.
          </p>
        </div>
        <div style={{ textAlign: "right" }}>
          <div className="badge-pill">Resume-ready Project • React + Recharts</div>
          <div style={{ marginTop: 8, fontSize: 12, color: "#9ca3af" }}>
            Data stored securely in your browser (LocalStorage).
          </div>
        </div>
      </header>

      {/* Layout: left form + stats, right charts */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(0, 1.1fr) minmax(0, 1.4fr)",
          gap: 20,
          alignItems: "flex-start",
        }}
      >
        {/* Left column */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Add transaction card */}
          <div className="card">
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
              <div className="card-title">New transaction</div>
              <span style={{ fontSize: 12, color: "#9ca3af" }}>AI-based auto-categorization</span>
            </div>

            <form
              onSubmit={handleAddTransaction}
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                gap: 10,
                alignItems: "center",
              }}
            >
              <div style={{ gridColumn: "1 / 3", display: "flex", gap: 10 }}>
                <button
                  type="button"
                  className="primary"
                  style={{
                    flex: 1,
                    background:
                      form.type === "expense"
                        ? "linear-gradient(to right, #f97316, #fb7185)"
                        : "#020617",
                    color: form.type === "expense" ? "#020617" : "#e5e7eb",
                    border: form.type === "expense" ? "none" : "1px solid #374151",
                  }}
                  onClick={() => setForm((prev) => ({ ...prev, type: "expense" }))}
                >
                  Expense
                </button>
                <button
                  type="button"
                  className="primary"
                  style={{
                    flex: 1,
                    background:
                      form.type === "income"
                        ? "linear-gradient(to right, #22c55e, #22d3ee)"
                        : "#020617",
                    color: form.type === "income" ? "#020617" : "#e5e7eb",
                    border: form.type === "income" ? "none" : "1px solid #374151",
                  }}
                  onClick={() => setForm((prev) => ({ ...prev, type: "income" }))}
                >
                  Income
                </button>
              </div>

              <div>
                <label style={{ fontSize: 11, color: "#9ca3af" }}>Amount (₹)</label>
                <input
                  type="text"
                  name="amount"
                  placeholder="e.g. 500"
                  value={form.amount}
                  onChange={handleChange}
                />
              </div>

              <div>
                <label style={{ fontSize: 11, color: "#9ca3af" }}>Date</label>
                <input type="date" name="date" value={form.date} onChange={handleChange} />
              </div>

              <div>
                <label style={{ fontSize: 11, color: "#9ca3af" }}>Description</label>
                <input
                  type="text"
                  name="description"
                  placeholder="e.g. Swiggy, Netflix, Salary"
                  value={form.description}
                  onChange={handleChange}
                />
              </div>

              {form.type === "expense" && (
                <div>
                  <label style={{ fontSize: 11, color: "#9ca3af" }}>
                    Category <span style={{ color: "#22c55e" }}>(optional)</span>
                  </label>
                  <select name="category" value={form.category} onChange={handleChange}>
                    <option value="">Auto-detect using AI rules</option>
                    {DEFAULT_CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div style={{ gridColumn: "1 / 3", marginTop: 4 }}>
                <button type="submit" className="primary" style={{ width: "100%" }}>
                  + Add transaction
                </button>
              </div>
            </form>
          </div>

          {/* Stats cards */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
              gap: 12,
            }}
          >
            <div className="card">
              <div className="card-title">Total income</div>
              <div style={{ fontSize: 22, fontWeight: 600, marginTop: 6 }}>₹{totalIncome.toFixed(0)}</div>
              <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 4 }}>
                All credits recorded in the system.
              </div>
            </div>

            <div className="card">
              <div className="card-title">Total expenses</div>
              <div style={{ fontSize: 22, fontWeight: 600, marginTop: 6 }}>₹{totalExpenses.toFixed(0)}</div>
              <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 4 }}>
                Sum of all expense transactions.
              </div>
            </div>

            <div className="card">
              <div className="card-title">Net savings</div>
              <div
                style={{
                  fontSize: 22,
                  fontWeight: 600,
                  marginTop: 6,
                  color: savings >= 0 ? "#4ade80" : "#f87171",
                }}
              >
                ₹{savings.toFixed(0)}
              </div>
              <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 4 }}>
                Income minus expenses for the selected period.
              </div>
            </div>
          </div>

          {/* Budget & insights */}
          <div className="card">
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginBottom: 8,
                alignItems: "center",
              }}
            >
              <div>
                <div className="card-title">Budget & savings insights</div>
                <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 3 }}>
                  Basic prediction engine based on current month usage.
                </div>
              </div>
              <div style={{ textAlign: "right" }}>
                <label style={{ fontSize: 11, color: "#9ca3af", display: "block" }}>
                  Monthly budget (₹)
                </label>
                <input
                  type="number"
                  value={budget}
                  onChange={(e) => setBudget(Number(e.target.value || 0))}
                  style={{ width: 120, marginTop: 3 }}
                />
              </div>
            </div>

            <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginTop: 8 }}>
              <div
                style={{
                  flex: 1,
                  minWidth: 180,
                  padding: 10,
                  borderRadius: 14,
                  background:
                    "linear-gradient(to right, rgba(34,197,94,0.18), rgba(45,212,191,0.08))",
                  border: "1px solid rgba(34,197,94,0.4)",
                }}
              >
                <div style={{ fontSize: 12, color: "#a7f3d0" }}>Budget usage</div>
                <div style={{ fontSize: 28, fontWeight: 600, marginTop: 4 }}>
                  {insights.spendingRate}%
                </div>
                <div style={{ fontSize: 11, marginTop: 6 }}>{insights.budgetMessage}</div>
              </div>

              <div
                style={{
                  flex: 1,
                  minWidth: 180,
                  padding: 10,
                  borderRadius: 14,
                  background:
                    "linear-gradient(to right, rgba(56,189,248,0.16), rgba(129,140,248,0.06))",
                  border: "1px solid rgba(56,189,248,0.45)",
                }}
              >
                <div style={{ fontSize: 12, color: "#bae6fd" }}>Savings health</div>
                <div style={{ fontSize: 13, marginTop: 6 }}>{insights.savingsMessage}</div>
              </div>
            </div>
          </div>

          {/* Recent transactions */}
          <div className="card">
            <div className="card-title" style={{ marginBottom: 8 }}>
              Recent transactions
            </div>
            {transactions.length === 0 ? (
              <div style={{ fontSize: 12, color: "#9ca3af" }}>
                No transactions yet. Add your first income or expense above.
              </div>
            ) : (
              <div style={{ maxHeight: 220, overflowY: "auto" }}>
                {transactions.map((t) => (
                  <div
                    key={t.id}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      padding: "7px 0",
                      borderBottom: "1px dashed rgba(31,41,55,0.7)",
                    }}
                  >
                    <div>
                      <div style={{ fontSize: 13 }}>
                        {t.description}{" "}
                        {t.auto && t.type === "expense" && (
                          <span
                            style={{
                              fontSize: 10,
                              marginLeft: 4,
                              padding: "2px 6px",
                              borderRadius: 999,
                              border: "1px solid rgba(56,189,248,0.6)",
                              color: "#7dd3fc",
                            }}
                          >
                            AI
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: 10, color: "#9ca3af", marginTop: 1 }}>
                        {format(new Date(t.date), "dd MMM yyyy")} · {t.category}
                      </div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div
                        style={{
                          fontSize: 13,
                          color: t.type === "income" ? "#4ade80" : "#fb7185",
                          fontWeight: 500,
                        }}
                      >
                        {t.type === "income" ? "+" : "-"}₹{t.amount.toFixed(0)}
                      </div>
                      <button
                        className="danger"
                        style={{ marginTop: 4, fontSize: 10, padding: "3px 8px" }}
                        onClick={() => handleDeleteTransaction(t.id)}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right column: Charts */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Category chart + pie chart */}
          <div
            className="card"
            style={{ display: "grid", gridTemplateColumns: "1.3fr 1fr", gap: 14 }}
          >
            <div>
              <div className="card-title">Spending by category</div>
              <div style={{ height: 220, marginTop: 10 }}>
                {categoryData.length === 0 ? (
                  <div style={{ fontSize: 12, color: "#9ca3af" }}>
                    Add some expense transactions to see category-wise bars.
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={categoryData}>
                      <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip contentStyle={{ fontSize: 11 }} />
                      <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                        {categoryData.map((entry, index) => (
                          <Cell key={entry.name} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>
            <div>
              <div className="card-title">Distribution</div>
              <div style={{ height: 220, marginTop: 10 }}>
                {categoryData.length === 0 ? (
                  <div style={{ fontSize: 12, color: "#9ca3af" }}>
                    Pie chart will appear after you add expenses.
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={categoryData}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        outerRadius={70}
                        labelLine={false}
                        label={(props) => `${props.name}`}
                      >
                        {categoryData.map((entry, index) => (
                          <Cell key={entry.name} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={{ fontSize: 11 }} />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>
          </div>

          {/* Timeline chart */}
          <div className="card">
            <div className="card-title">Cash flow timeline</div>
            <div style={{ height: 250, marginTop: 10 }}>
              {timelineData.length === 0 ? (
                <div style={{ fontSize: 12, color: "#9ca3af" }}>
                  Once you record a few days of activity, a timeline of income vs expenses will show here.
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={timelineData}>
                    <XAxis
                      dataKey="date"
                      tickFormatter={(d) => format(new Date(d), "dd MMM")}
                      tick={{ fontSize: 11 }}
                    />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip
                      labelFormatter={(d) => format(new Date(d), "dd MMM yyyy")}
                      contentStyle={{ fontSize: 11 }}
                    />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Line
                      type="monotone"
                      dataKey="income"
                      stroke="#22c55e"
                      strokeWidth={2}
                      dot={false}
                      name="Income"
                    />
                    <Line
                      type="monotone"
                      dataKey="expense"
                      stroke="#fb7185"
                      strokeWidth={2}
                      dot={false}
                      name="Expense"
                    />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App; 