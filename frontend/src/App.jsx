import React from 'react';
import { useEffect, useMemo, useState } from 'react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';
const categories = ['Food', 'Transportation', 'Shopping', 'Education', 'Entertainment', 'Health', 'Salary', 'Freelance', 'Other'];
const money = (value) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(value || 0);
const monthValue = (date = new Date()) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

async function api(path, token, options = {}) {
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...options.headers }
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.message || 'Something went wrong.');
  return data;
}

function App() {
  const [token, setToken] = useState(localStorage.getItem('expenseToken') || '');
  const [user, setUser] = useState(JSON.parse(localStorage.getItem('expenseUser') || 'null'));
  const [view, setView] = useState('overview');
  const [transactions, setTransactions] = useState([]);
  const [dashboard, setDashboard] = useState(null);
  const [budget, setBudget] = useState(null);
  const [filters, setFilters] = useState({ search: '', category: '', type: '', month: monthValue() });
  const [editing, setEditing] = useState(null);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function loadData() {
    if (!token) return;
    setLoading(true);
    setError('');
    try {
      const [rows, summary, monthlyBudget] = await Promise.all([
        api(`/transactions?search=${encodeURIComponent(filters.search)}&category=${encodeURIComponent(filters.category)}&type=${filters.type}&month=${filters.month}`, token),
        api(`/dashboard?month=${filters.month.slice(5)}&year=${filters.month.slice(0, 4)}`, token),
        api(`/budget?month=${filters.month.slice(5)}&year=${filters.month.slice(0, 4)}`, token)
      ]);
      setTransactions(rows);
      setDashboard(summary);
      setBudget(monthlyBudget);
    } catch (requestError) {
      setError(requestError.message);
      if (requestError.message.includes('session has expired')) logout();
    } finally { setLoading(false); }
  }

  useEffect(() => { loadData(); }, [token, filters.search, filters.category, filters.type, filters.month]);

  function saveSession(result) {
    localStorage.setItem('expenseToken', result.token);
    localStorage.setItem('expenseUser', JSON.stringify(result.user));
    setToken(result.token);
    setUser(result.user);
    setView('overview');
  }

  function logout() {
    localStorage.removeItem('expenseToken');
    localStorage.removeItem('expenseUser');
    setToken(''); setUser(null); setTransactions([]); setDashboard(null); setBudget(null);
  }

  async function submitTransaction(form) {
    try {
      if (editing) await api(`/transactions/${editing._id}`, token, { method: 'PUT', body: JSON.stringify(form) });
      else await api('/transactions', token, { method: 'POST', body: JSON.stringify(form) });
      setEditing(null); setView('transactions'); setNotice(editing ? 'Transaction updated.' : 'Transaction added.');
      await loadData();
    } catch (requestError) { setError(requestError.message); }
  }

  async function deleteTransaction(id) {
    if (!window.confirm('Delete this transaction?')) return;
    try { await api(`/transactions/${id}`, token, { method: 'DELETE' }); setNotice('Transaction deleted.'); await loadData(); }
    catch (requestError) { setError(requestError.message); }
  }

  async function saveBudget(amount) {
    try {
      const [year, month] = filters.month.split('-');
      await api('/budget', token, { method: 'POST', body: JSON.stringify({ monthlyLimit: Number(amount), month: Number(month), year: Number(year) }) });
      setNotice('Monthly budget saved.'); await loadData();
    } catch (requestError) { setError(requestError.message); }
  }

  if (!token) return <AuthScreen onLogin={saveSession} />;

  const spentPercent = dashboard?.monthlyLimit > 0 ? Math.min(100, (dashboard.expenses / dashboard.monthlyLimit) * 100) : 0;
  return <div className="app-shell">
    <aside className="sidebar">
      <div className="brand"><span className="brand-mark">L</span><span>ledger<span className="brand-period">.</span></span></div>
      <div className="side-label">WORKSPACE</div>
      <nav className="side-nav">
        <button className={view === 'overview' ? 'active' : ''} onClick={() => setView('overview')}><span className="nav-icon">◫</span> Overview</button>
        <button className={view === 'transactions' ? 'active' : ''} onClick={() => setView('transactions')}><span className="nav-icon">↕</span> Transactions</button>
        <button className={view === 'budget' ? 'active' : ''} onClick={() => setView('budget')}><span className="nav-icon">▤</span> Monthly budget</button>
      </nav>
      <div className="sidebar-bottom"><div className="profile"><div className="avatar">{user?.name?.slice(0, 1).toUpperCase()}</div><div className="profile-text"><strong>{user?.name}</strong><span>Personal account</span></div><button className="logout-button" title="Log out" onClick={logout}>↗</button></div></div>
    </aside>

    <main className="main-area">
      <header className="topbar"><div className="breadcrumb">Workspace <span>/</span> <strong>{view === 'overview' ? 'Overview' : view === 'budget' ? 'Monthly budget' : 'Transactions'}</strong></div><div className="topbar-right"><span className="live-dot"></span><span>All changes saved</span><div className="top-avatar">{user?.name?.slice(0, 1).toUpperCase()}</div></div></header>
      <div className="content">
        <div className="page-heading"><div><div className="eyebrow">PERSONAL FINANCE</div><h1>{view === 'overview' ? 'Good to see you, ' + (user?.name?.split(' ')[0] || 'there') : view === 'budget' ? 'Monthly budget' : 'Transactions'}</h1><p>{view === 'overview' ? 'Here’s your financial snapshot for the month.' : view === 'budget' ? 'Plan your spending and stay on track.' : 'Keep track of where your money goes.'}</p></div><div className="heading-actions"><label className="month-picker"><span>◷</span><input aria-label="Select month" type="month" value={filters.month} onChange={(event) => setFilters({ ...filters, month: event.target.value })} /></label><button className="primary-button" onClick={() => { setEditing(null); setView('add'); }}>＋ <span>Add transaction</span></button></div></div>
        {(error || notice) && <div className={error ? 'message error-message' : 'message success-message'}>{error || notice}<button onClick={() => { setError(''); setNotice(''); }}>×</button></div>}
        {loading && <div className="loading-line">Updating your records…</div>}
        {view === 'overview' && <Overview dashboard={dashboard} transactions={transactions.slice(0, 5)} budget={budget} spentPercent={spentPercent} onViewTransactions={() => setView('transactions')} onEdit={() => setView('budget')} />}
        {view === 'transactions' && <TransactionTable transactions={transactions} filters={filters} setFilters={setFilters} onEdit={(item) => { setEditing(item); setView('add'); }} onDelete={deleteTransaction} />}
        {view === 'add' && <TransactionForm key={editing?._id || 'new'} initial={editing} onSave={submitTransaction} onCancel={() => { setEditing(null); setView('transactions'); }} />}
        {view === 'budget' && <BudgetPanel budget={budget} dashboard={dashboard} spentPercent={spentPercent} onSave={saveBudget} />}
      </div>
      <footer className="footer">Ledger <span>·</span> Personal finance, made clear.</footer>
    </main>
  </div>;
}

function AuthScreen({ onLogin }) {
  const [mode, setMode] = useState('login');
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  async function submit(event) {
    event.preventDefault(); setError(''); setBusy(true);
    try {
      const data = await api(`/auth/${mode === 'login' ? 'login' : 'register'}`, '', { method: 'POST', body: JSON.stringify(form) });
      if (mode === 'register') { setMode('login'); setError('Account created. Log in with your details.'); }
      else onLogin(data);
    } catch (requestError) { setError(requestError.message); }
    finally { setBusy(false); }
  }
  return <div className="auth-page"><div className="auth-side"><div className="brand auth-brand"><span className="brand-mark">L</span><span>ledger<span className="brand-period">.</span></span></div><div className="auth-pitch"><div className="eyebrow">A CLEARER VIEW OF YOUR MONEY</div><h1>Make every<br />dollar make sense.</h1><p>A simple space to understand your spending, plan ahead, and feel in control.</p><div className="auth-decoration"><div className="decor-line"><span>INCOME</span><b>+{money(4250)}</b></div><div className="decor-line"><span>EXPENSES</span><b>−{money(1820)}</b></div><div className="decor-track"><i></i></div></div></div><div className="auth-copyright">© 2025 Ledger Finance</div></div><div className="auth-main"><form className="auth-form" onSubmit={submit}><div className="eyebrow">WELCOME {mode === 'login' ? 'BACK' : 'TO LEDGER'}</div><h2>{mode === 'login' ? 'Sign in to your account' : 'Create your account'}</h2><p className="auth-subtitle">{mode === 'login' ? 'Enter your details to continue.' : 'Start managing your money with clarity.'}</p>{mode === 'register' && <label>Full name<input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Your name" /></label>}<label>Email address<input type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="you@example.com" /></label><label>Password<input type="password" minLength="6" required value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="At least 6 characters" /></label>{error && <div className={error.startsWith('Account created') ? 'auth-note' : 'auth-error'}>{error}</div>}<button className="primary-button auth-submit" disabled={busy}>{busy ? 'Please wait…' : mode === 'login' ? 'Sign in' : 'Create account'} <span>→</span></button><div className="auth-switch">{mode === 'login' ? 'New to Ledger?' : 'Already have an account?'} <button type="button" onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError(''); }}>{mode === 'login' ? 'Create an account' : 'Sign in'}</button></div></form></div></div>;
}

function Overview({ dashboard, transactions, budget, spentPercent, onViewTransactions, onEdit }) {
  const monthName = new Date(`${dashboard?.year || new Date().getFullYear()}-${String(dashboard?.month || new Date().getMonth() + 1).padStart(2, '0')}-01T12:00:00`).toLocaleString('en-US', { month: 'long' });
  return <>
    <section className="summary-grid"><SummaryCard label="Total income" value={money(dashboard?.income)} icon="↗" tone="green" caption={`In ${monthName}`} /><SummaryCard label="Total expenses" value={money(dashboard?.expenses)} icon="↙" tone="red" caption={`In ${monthName}`} /><SummaryCard label="Current balance" value={money(dashboard?.balance)} icon="＝" tone="navy" caption="Income minus expenses" /><SummaryCard label="Monthly budget" value={money(dashboard?.monthlyLimit)} icon="▤" tone="blue" caption={dashboard?.monthlyLimit ? `${money(dashboard?.remainingBudget)} remaining` : 'No budget set yet'} /></section>
    <section className="middle-grid"><div className="panel chart-panel"><div className="panel-heading"><div><h2>Income vs. expenses</h2><p>Monthly overview</p></div><span className="period-tag">{monthName} {dashboard?.year}</span></div><MonthlyChart income={dashboard?.income || 0} expenses={dashboard?.expenses || 0} /></div><div className="panel budget-panel"><div className="panel-heading"><div><h2>Budget overview</h2><p>{monthName} spending limit</p></div><button className="text-button" onClick={onEdit}>Edit budget ↗</button></div><div className="budget-total"><strong>{money(dashboard?.expenses)}</strong><span>of {money(dashboard?.monthlyLimit)}</span></div><div className="progress-track"><div className={`progress-fill ${spentPercent >= 100 ? 'over-budget' : ''}`} style={{ width: `${spentPercent}%` }}></div></div><div className="progress-caption"><span>{spentPercent.toFixed(0)}% used</span><span>{money(dashboard?.remainingBudget)} left</span></div>{dashboard?.monthlyLimit > 0 && dashboard?.remainingBudget < 0 && <div className="budget-warning">You’re over budget by {money(Math.abs(dashboard.remainingBudget))}.</div>}{!dashboard?.monthlyLimit && <div className="budget-empty">Set a monthly budget to track your spending.</div>}<div className="budget-foot"><span className="mini-label">MONTHLY LIMIT</span><b>{money(dashboard?.monthlyLimit)}</b></div></div></section>
    <section className="panel recent-panel"><div className="panel-heading"><div><h2>Recent transactions</h2><p>Your latest activity for {monthName}</p></div><button className="text-button" onClick={onViewTransactions}>View all transactions →</button></div><TransactionRows transactions={transactions} compact /></section>
  </>;
}

function SummaryCard({ label, value, icon, tone, caption }) { return <div className="summary-card"><div className="summary-top"><span>{label}</span><span className={`summary-icon ${tone}`}>{icon}</span></div><strong className="summary-value">{value}</strong><span className="summary-caption">{caption}</span></div>; }

function MonthlyChart({ income, expenses }) {
  const maxValue = Math.max(income, expenses, 1);
  const incomeHeight = Math.max(income > 0 ? 8 : 2, (income / maxValue) * 100);
  const expenseHeight = Math.max(expenses > 0 ? 8 : 2, (expenses / maxValue) * 100);
  return <div className="chart-content"><div className="chart-axis"><span>{money(maxValue)}</span><span>{money(maxValue / 2)}</span><span>{money(0)}</span></div><div className="chart-plot"><div className="chart-gridline first"></div><div className="chart-gridline second"></div><div className="chart-gridline third"></div><div className="bars"><div className="bar-group"><div className="bar income-bar" style={{ height: `${incomeHeight}%` }} title={`Income ${money(income)}`}></div><div className="bar expense-bar" style={{ height: `${expenseHeight}%` }} title={`Expenses ${money(expenses)}`}></div></div></div><div className="chart-month">This month</div></div><div className="chart-legend"><span><i className="legend-income"></i>Income</span><span><i className="legend-expense"></i>Expenses</span></div></div>;
}

function TransactionTable({ transactions, filters, setFilters, onEdit, onDelete }) { return <section className="panel transaction-panel"><div className="filter-row"><label className="search-box"><span>⌕</span><input aria-label="Search transactions" value={filters.search} onChange={(e) => setFilters({ ...filters, search: e.target.value })} placeholder="Search transactions" /></label><select aria-label="Filter category" value={filters.category} onChange={(e) => setFilters({ ...filters, category: e.target.value })}><option value="">All categories</option>{categories.map((item) => <option key={item}>{item}</option>)}</select><select aria-label="Filter type" value={filters.type} onChange={(e) => setFilters({ ...filters, type: e.target.value })}><option value="">All types</option><option value="income">Income</option><option value="expense">Expense</option></select></div><TransactionRows transactions={transactions} onEdit={onEdit} onDelete={onDelete} /></section>; }

function TransactionRows({ transactions, onEdit, onDelete, compact = false }) {
  if (!transactions.length) return <div className="empty-state"><div className="empty-icon">↕</div><strong>No transactions yet</strong><span>Your activity will show up here once you add a transaction.</span></div>;
  return <div className="table-wrap"><table><thead><tr><th>TRANSACTION</th><th>CATEGORY</th><th>DATE</th><th>TYPE</th><th className="amount-cell">AMOUNT</th>{!compact && <th className="actions-cell">ACTIONS</th>}</tr></thead><tbody>{transactions.map((item) => <tr key={item._id}><td><div className="transaction-name"><span className={`transaction-mark ${item.type}`}>{item.type === 'income' ? '↗' : '↙'}</span><span><strong>{item.title}</strong><small>{item.description || item.category}</small></span></div></td><td><span className="category-label">{item.category}</span></td><td className="date-label">{new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' })}</td><td><span className={`type-label ${item.type}`}>{item.type === 'income' ? 'Income' : 'Expense'}</span></td><td className={`amount-cell amount ${item.type}`}>{item.type === 'income' ? '+' : '−'}{money(item.amount)}</td>{!compact && <td className="actions-cell"><button className="row-action" onClick={() => onEdit(item)}>Edit</button><button className="row-action delete-action" onClick={() => onDelete(item._id)}>Delete</button></td>}</tr>)}</tbody></table></div>;
}

function TransactionForm({ initial, onSave, onCancel }) {
  const [form, setForm] = useState({ title: initial?.title || '', description: initial?.description || '', amount: initial?.amount || '', type: initial?.type || 'expense', category: initial?.category || 'Food', date: initial ? new Date(initial.date).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10) });
  function change(field, value) { setForm({ ...form, [field]: value }); }
  return <section className="panel form-panel"><div className="panel-heading form-heading"><div><h2>{initial ? 'Edit transaction' : 'Add a transaction'}</h2><p>Enter the details below. Fields marked * are required.</p></div></div><form onSubmit={(e) => { e.preventDefault(); onSave({ ...form, amount: Number(form.amount) }); }}><div className="form-grid"><label className="full-width">Title *<input required maxLength="80" value={form.title} onChange={(e) => change('title', e.target.value)} placeholder="e.g. Weekly groceries" /></label><label className="full-width">Description<input maxLength="200" value={form.description} onChange={(e) => change('description', e.target.value)} placeholder="Add a note (optional)" /></label><label>Type *<select value={form.type} onChange={(e) => change('type', e.target.value)}><option value="expense">Expense</option><option value="income">Income</option></select></label><label>Category *<select value={form.category} onChange={(e) => change('category', e.target.value)}>{categories.map((item) => <option key={item}>{item}</option>)}</select></label><label>Amount *<div className="amount-input"><span>₹</span><input required type="number" min="0.01" step="0.01" value={form.amount} onChange={(e) => change('amount', e.target.value)} placeholder="0.00" /></div></label><label>Date *<input required type="date" value={form.date} onChange={(e) => change('date', e.target.value)} /></label></div><div className="form-footer"><span>All amounts are recorded in INR.</span><div><button type="button" className="secondary-button" onClick={onCancel}>Cancel</button><button className="primary-button">{initial ? 'Save changes' : 'Add transaction'}</button></div></div></form></section>;
}

function BudgetPanel({ budget, dashboard, spentPercent, onSave }) {
  const [amount, setAmount] = useState(budget?.monthlyLimit || '');
  useEffect(() => setAmount(budget?.monthlyLimit || ''), [budget?.monthlyLimit]);
  return <section className="panel budget-editor"><div className="panel-heading"><div><h2>Your spending plan</h2><p>Set a limit for this month and track your progress.</p></div></div><div className="budget-editor-grid"><form onSubmit={(e) => { e.preventDefault(); onSave(amount); }}><label>Monthly budget limit<div className="amount-input large"><span>₹</span><input type="number" min="0" step="0.01" required value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" /></div></label><p className="field-help">This limit applies to the month selected above.</p><button className="primary-button">Save monthly budget</button></form><div className="budget-detail"><div className="budget-detail-top"><div><span className="mini-label">SPENT THIS MONTH</span><strong>{money(dashboard?.expenses)}</strong></div><div className="budget-limit-side"><span className="mini-label">YOUR LIMIT</span><strong>{money(dashboard?.monthlyLimit)}</strong></div></div><div className="progress-track"><div className={`progress-fill ${spentPercent >= 100 ? 'over-budget' : ''}`} style={{ width: `${spentPercent}%` }}></div></div><div className="progress-caption"><span>{spentPercent.toFixed(0)}% used</span><span>{money(dashboard?.remainingBudget)} remaining</span></div>{dashboard?.monthlyLimit > 0 && dashboard?.remainingBudget < 0 && <div className="budget-warning">You have exceeded your budget by {money(Math.abs(dashboard.remainingBudget))}.</div>}</div></div><div className="budget-note"><span>ⓘ</span>Budgets are saved separately for each month, so you can plan ahead and compare your spending over time.</div></section>;
}

export default App;
