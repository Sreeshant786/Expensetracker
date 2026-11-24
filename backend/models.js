const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true }
}, { timestamps: { createdAt: true, updatedAt: false } });

const transactionSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  title: { type: String, required: true, trim: true },
  description: { type: String, default: '' },
  amount: { type: Number, required: true, min: 0.01 },
  type: { type: String, enum: ['income', 'expense'], required: true },
  category: { type: String, required: true },
  date: { type: Date, required: true }
}, { timestamps: { createdAt: true, updatedAt: false } });

const budgetSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  monthlyLimit: { type: Number, required: true, min: 0 },
  month: { type: Number, required: true, min: 1, max: 12 },
  year: { type: Number, required: true }
}, { timestamps: { createdAt: true, updatedAt: true } });
budgetSchema.index({ userId: 1, month: 1, year: 1 }, { unique: true });

module.exports = {
  User: mongoose.model('User', userSchema),
  Transaction: mongoose.model('Transaction', transactionSchema),
  Budget: mongoose.model('Budget', budgetSchema)
};
