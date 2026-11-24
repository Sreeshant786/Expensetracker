const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { User, Transaction, Budget } = require('./models');
const requireAuth = require('./middleware');

const router = express.Router();
const categories = ['Food', 'Transportation', 'Shopping', 'Education', 'Entertainment', 'Health', 'Salary', 'Freelance', 'Other'];

router.post('/auth/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password || password.length < 6) {
      return res.status(400).json({ message: 'Enter your name, email and a password with at least 6 characters.' });
    }
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) return res.status(409).json({ message: 'An account with this email already exists.' });
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await User.create({ name, email, password: hashedPassword });
    res.status(201).json({ message: 'Account created. You can now log in.', user: { id: user._id, name: user.name, email: user.email } });
  } catch (error) { res.status(500).json({ message: 'Could not create your account.' }); }
});

router.post('/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email: String(email || '').toLowerCase() });
    if (!user || !(await bcrypt.compare(password || '', user.password))) {
      return res.status(401).json({ message: 'Email or password is incorrect.' });
    }
    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user: { id: user._id, name: user.name, email: user.email } });
  } catch (error) { res.status(500).json({ message: 'Could not log in.' }); }
});

router.use(requireAuth);

router.get('/transactions', async (req, res) => {
  try {
    const query = { userId: req.userId };
    if (req.query.search) query.title = { $regex: req.query.search, $options: 'i' };
    if (req.query.category) query.category = req.query.category;
    if (req.query.type) query.type = req.query.type;
    if (req.query.month) {
      const [year, month] = req.query.month.split('-').map(Number);
      if (year && month) {
        query.date = { $gte: new Date(year, month - 1, 1), $lt: new Date(year, month, 1) };
      }
    }
    res.json(await Transaction.find(query).sort({ date: -1, createdAt: -1 }));
  } catch (error) { res.status(500).json({ message: 'Could not load transactions.' }); }
});

router.post('/transactions', async (req, res) => {
  try {
    const { title, description, amount, type, category, date } = req.body;
    if (!title || !Number.isFinite(Number(amount)) || Number(amount) <= 0 || !['income', 'expense'].includes(type) || !categories.includes(category) || !date) {
      return res.status(400).json({ message: 'Check the title, amount, type, category and date.' });
    }
    const transaction = await Transaction.create({ userId: req.userId, title, description, amount: Number(amount), type, category, date });
    res.status(201).json(transaction);
  } catch (error) { res.status(400).json({ message: 'Could not save this transaction.' }); }
});

router.put('/transactions/:id', async (req, res) => {
  try {
    const transaction = await Transaction.findOneAndUpdate({ _id: req.params.id, userId: req.userId }, req.body, { new: true, runValidators: true });
    if (!transaction) return res.status(404).json({ message: 'Transaction not found.' });
    res.json(transaction);
  } catch (error) { res.status(400).json({ message: 'Could not update this transaction.' }); }
});

router.delete('/transactions/:id', async (req, res) => {
  try {
    const transaction = await Transaction.findOneAndDelete({ _id: req.params.id, userId: req.userId });
    if (!transaction) return res.status(404).json({ message: 'Transaction not found.' });
    res.json({ message: 'Transaction deleted.' });
  } catch (error) { res.status(400).json({ message: 'Could not delete this transaction.' }); }
});

async function getMonthBudget(userId, month, year) {
  return Budget.findOne({ userId, month, year });
}

router.get('/budget', async (req, res) => {
  try {
    const now = new Date();
    const month = Number(req.query.month) || now.getMonth() + 1;
    const year = Number(req.query.year) || now.getFullYear();
    const budget = await getMonthBudget(req.userId, month, year);
    res.json(budget || { monthlyLimit: 0, month, year });
  } catch (error) { res.status(500).json({ message: 'Could not load your budget.' }); }
});

router.post('/budget', async (req, res) => {
  try {
    const monthlyLimit = Number(req.body.monthlyLimit);
    const month = Number(req.body.month);
    const year = Number(req.body.year);
    if (!Number.isFinite(monthlyLimit) || monthlyLimit < 0 || month < 1 || month > 12 || !year) return res.status(400).json({ message: 'Enter a valid budget, month and year.' });
    const budget = await Budget.findOneAndUpdate({ userId: req.userId, month, year }, { monthlyLimit }, { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true });
    res.json(budget);
  } catch (error) { res.status(400).json({ message: 'Could not save your budget.' }); }
});

router.put('/budget/:id', async (req, res) => {
  try {
    const budget = await Budget.findOneAndUpdate({ _id: req.params.id, userId: req.userId }, { monthlyLimit: req.body.monthlyLimit }, { new: true, runValidators: true });
    if (!budget) return res.status(404).json({ message: 'Budget not found.' });
    res.json(budget);
  } catch (error) { res.status(400).json({ message: 'Could not update your budget.' }); }
});

router.get('/dashboard', async (req, res) => {
  try {
    const now = new Date();
    const month = Number(req.query.month) || now.getMonth() + 1;
    const year = Number(req.query.year) || now.getFullYear();
    const monthStart = new Date(year, month - 1, 1);
    const monthEnd = new Date(year, month, 1);
    const transactions = await Transaction.find({ userId: req.userId, date: { $gte: monthStart, $lt: monthEnd } });
    let income = 0;
    let expenses = 0;
    transactions.forEach((item) => {
      if (item.type === 'income') income += item.amount;
      else expenses += item.amount;
    });
    const budget = await getMonthBudget(req.userId, month, year);
    const monthlyLimit = budget ? budget.monthlyLimit : 0;
    res.json({ income, expenses, balance: income - expenses, monthlyLimit, remainingBudget: monthlyLimit - expenses, budgetId: budget ? budget._id : null, month, year });
  } catch (error) { res.status(500).json({ message: 'Could not load dashboard data.' }); }
});

module.exports = router;
