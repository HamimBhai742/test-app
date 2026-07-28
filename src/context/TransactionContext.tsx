import React, { useSyncExternalStore, useMemo } from 'react';

// ট্রানজেকশনের ডেটা টাইপ বা স্ট্রাকচার সংজ্ঞায়িত করা হয়েছে TypeScript-এর মাধ্যমে।
// এটি নিশ্চিত করে যে প্রতিটি ট্রানজেকশনে সঠিক ধরণের ডেটা (যেমন: id, title, amount ইত্যাদি) থাকছে।
export interface Transaction {
  id: string;
  title: string;
  amount: number;
  type: 'income' | 'expense'; // 'income' মানে আয় এবং 'expense' মানে ব্যয়
  category: 'Food' | 'Shopping' | 'Utilities' | 'Rent' | 'Entertainment' | 'Salary' | 'Others';
  date: string; // YYYY-MM-DD ফরম্যাটে তারিখ রাখার জন্য
}

interface TransactionContextType {
  transactions: Transaction[];
  totalBalance: number;
  totalIncome: number;
  totalExpenses: number;
  addTransaction: (transaction: Omit<Transaction, 'id'>) => void;
  deleteTransaction: (id: string) => void;
}

// ─── External Store for Transactions ─────────────────────────────────────────

let globalTransactions: Transaction[] = [
  // ── জুলাই ২০২৬ ──
  { id: '1',  title: 'Salary (বেতন)',                amount: 50000, type: 'income',  category: 'Salary',        date: '2026-07-01' },
  { id: '2',  title: 'Monthly Rent (বাসা ভাড়া)',    amount: 12000, type: 'expense', category: 'Rent',          date: '2026-07-01' },
  { id: '3',  title: 'Groceries (বাজার করা)',        amount: 3200,  type: 'expense', category: 'Food',          date: '2026-07-10' },
  { id: '4',  title: 'Freelance Design (ফ্রিল্যান্স)', amount: 8500, type: 'income', category: 'Others',       date: '2026-07-15' },
  { id: '5',  title: 'Netflix (নেটফ্লিক্স)',         amount: 400,   type: 'expense', category: 'Entertainment', date: '2026-07-20' },
  { id: '6',  title: 'Electric Bill (বিদ্যুৎ বিল)', amount: 1100,  type: 'expense', category: 'Utilities',     date: '2026-07-22' },
  { id: '7',  title: 'Clothes Shopping (কেনাকাটা)',  amount: 2500,  type: 'expense', category: 'Shopping',      date: '2026-07-25' },

  // ── জুন ২০২৬ ──
  { id: '8',  title: 'Salary (বেতন)',                amount: 50000, type: 'income',  category: 'Salary',        date: '2026-06-01' },
  { id: '9',  title: 'Monthly Rent (বাসা ভাড়া)',    amount: 12000, type: 'expense', category: 'Rent',          date: '2026-06-01' },
  { id: '10', title: 'Dinner Party (ডিনার পার্টি)', amount: 4500,  type: 'expense', category: 'Food',          date: '2026-06-12' },
  { id: '11', title: 'Tuition Income (টিউশনি)',      amount: 6000,  type: 'income',  category: 'Others',        date: '2026-06-15' },
  { id: '12', title: 'Internet Bill (ইন্টারনেট)',    amount: 700,   type: 'expense', category: 'Utilities',     date: '2026-06-18' },
  { id: '13', title: 'Movie Tickets (সিনেমা)',        amount: 600,   type: 'expense', category: 'Entertainment', date: '2026-06-28' },

  // ── মে ২০২৬ ──
  { id: '14', title: 'Salary (বেতন)',                amount: 50000, type: 'income',  category: 'Salary',        date: '2026-05-01' },
  { id: '15', title: 'Monthly Rent (বাসা ভাড়া)',    amount: 12000, type: 'expense', category: 'Rent',          date: '2026-05-01' },
  { id: '16', title: 'Eid Shopping (ঈদ কেনাকাটা)',   amount: 9000,  type: 'expense', category: 'Shopping',      date: '2026-05-05' },
  { id: '17', title: 'Bonus (বোনাস)',                 amount: 15000, type: 'income',  category: 'Salary',        date: '2026-05-10' },
  { id: '18', title: 'Restaurant (রেস্তোরাঁ)',       amount: 3500,  type: 'expense', category: 'Food',          date: '2026-05-20' },
  { id: '19', title: 'Gas Bill (গ্যাস বিল)',          amount: 900,   type: 'expense', category: 'Utilities',     date: '2026-05-25' },

  // ── এপ্রিল ২০২৬ ──
  { id: '20', title: 'Salary (বেতন)',                amount: 50000, type: 'income',  category: 'Salary',        date: '2026-04-01' },
  { id: '21', title: 'Monthly Rent (বাসা ভাড়া)',    amount: 12000, type: 'expense', category: 'Rent',          date: '2026-04-01' },
  { id: '22', title: 'Daily Food (দৈনন্দিন খাবার)', amount: 5200,  type: 'expense', category: 'Food',          date: '2026-04-15' },
  { id: '23', title: 'Mobile Recharge (মোবাইল)',     amount: 500,   type: 'expense', category: 'Utilities',     date: '2026-04-20' },
  { id: '24', title: 'Side Income (পার্ট টাইম)',     amount: 4000,  type: 'income',  category: 'Others',        date: '2026-04-25' },
  { id: '25', title: 'Gadget Purchase (গ্যাজেট)',    amount: 8500,  type: 'expense', category: 'Shopping',      date: '2026-04-28' },
];

const txListeners = new Set<() => void>();

const subscribeTx = (listener: () => void) => {
  txListeners.add(listener);
  return () => txListeners.delete(listener);
};

const getSnapshotTx = () => globalTransactions;

const addTxGlobal = (newTx: Omit<Transaction, 'id'>) => {
  const transactionWithId: Transaction = {
    ...newTx,
    id: Math.random().toString(36).substring(2, 9),
  };
  globalTransactions = [transactionWithId, ...globalTransactions];
  txListeners.forEach(l => l());
};

const deleteTxGlobal = (id: string) => {
  globalTransactions = globalTransactions.filter(tx => tx.id !== id);
  txListeners.forEach(l => l());
};

// ─── Provider & Hook ─────────────────────────────────────────────────────────

export const TransactionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return <>{children}</>;
};

export const useTransactions = (): TransactionContextType => {
  const transactions = useSyncExternalStore(subscribeTx, getSnapshotTx);

  const stats = useMemo(() => {
    let income = 0;
    let expenses = 0;

    transactions.forEach((tx) => {
      if (tx.type === 'income') {
        income += tx.amount;
      } else {
        expenses += tx.amount;
      }
    });

    return {
      totalIncome: income,
      totalExpenses: expenses,
      totalBalance: income - expenses,
    };
  }, [transactions]);

  return {
    transactions,
    addTransaction: addTxGlobal,
    deleteTransaction: deleteTxGlobal,
    totalBalance: stats.totalBalance,
    totalIncome: stats.totalIncome,
    totalExpenses: stats.totalExpenses,
  };
};
