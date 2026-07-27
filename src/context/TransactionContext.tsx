import React, { createContext, useContext, useState, useMemo } from 'react';

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

// কনটেক্সটের ভেতরের ভ্যালুগুলোর ইন্টারফেস বা টাইপ ডিফাইন করা হচ্ছে।
// এর মাধ্যমে আমরা জানতে পারব এই কনটেক্সট থেকে আমরা কী কী ডেটা এবং ফাংশন ব্যবহার করতে পারব।
interface TransactionContextType {
  transactions: Transaction[];
  totalBalance: number;
  totalIncome: number;
  totalExpenses: number;
  addTransaction: (transaction: Omit<Transaction, 'id'>) => void;
  deleteTransaction: (id: string) => void;
}

// React Context তৈরি করা হচ্ছে। 
// অ্যাপ্লিকেশনের বিভিন্ন কম্পোনেন্টের মধ্যে প্রপস ড্রিলিং (props drilling) না করে সরাসরি ডেটা শেয়ার করার জন্য কনটেক্সট ব্যবহার করা হয়।
const TransactionContext = createContext<TransactionContextType | undefined>(undefined);

// প্রোভাইডার কম্পোনেন্ট যা আমাদের পুরো অ্যাপকে ট্রানজেকশন ডেটা সরবরাহ করবে।
export const TransactionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // প্রাথমিক কিছু ডামি ডেটা (Mock Data) সহ ট্রানজেকশন স্টেট তৈরি করা হচ্ছে।
  // এর ফলে অ্যাপটি প্রথমবার চালু করলেই ব্যবহারকারী কিছু ডেমো ডেটা দেখতে পাবেন যা অ্যাপটির কার্যকারিতা বুঝতে সাহায্য করবে।
  const [transactions, setTransactions] = useState<Transaction[]>([
    {
      id: '1',
      title: 'Salary (বেতন)',
      amount: 5000,
      type: 'income',
      category: 'Salary',
      date: '2026-07-25',
    },
    {
      id: '2',
      title: 'Monthly Rent (বাসা ভাড়া)',
      amount: 1500,
      type: 'expense',
      category: 'Rent',
      date: '2026-07-01',
    },
    {
      id: '3',
      title: 'Groceries (বাজার করা)',
      amount: 120,
      type: 'expense',
      category: 'Food',
      date: '2026-07-26',
    },
    {
      id: '4',
      title: 'Freelance Design (ফ্রিল্যান্স কাজ)',
      amount: 850,
      type: 'income',
      category: 'Others',
      date: '2026-07-27',
    },
    {
      id: '5',
      title: 'Netflix (নেটফ্লিক্স)',
      amount: 15,
      type: 'expense',
      category: 'Entertainment',
      date: '2026-07-27',
    },
  ]);

  // নতুন ট্রানজেকশন যুক্ত করার ফাংশন।
  // এখানে Omit ব্যবহার করা হয়েছে কারণ আমরা id ছাড়া বাকি ডেটা পাঠাব এবং এখানে ডাইনামিকভাবে unique ID তৈরি করে নেব।
  const addTransaction = (newTx: Omit<Transaction, 'id'>) => {
    const transactionWithId: Transaction = {
      ...newTx,
      id: Math.random().toString(36).substring(2, 9), // একটি র‍্যান্ডম ইউনিক আইডি তৈরি করা হচ্ছে
    };
    // পূর্ববর্তী স্টেটের সাথে নতুন ট্রানজেকশনটি যুক্ত করে স্টেট আপডেট করা হচ্ছে।
    setTransactions((prev) => [transactionWithId, ...prev]);
  };

  // ট্রানজেকশন ডিলিট বা মুছে ফেলার ফাংশন।
  // ফিল্টার ব্যবহার করে নির্দিষ্ট আইডি বাদে বাকি সব ট্রানজেকশন স্টেটে রাখা হচ্ছে।
  const deleteTransaction = (id: string) => {
    setTransactions((prev) => prev.filter((tx) => tx.id !== id));
  };

  // হিসাব-নিকাশ সহজ ও পারফরম্যান্স উন্নত করতে useMemo ব্যবহার করা হয়েছে।
  // এর ফলে ট্রানজেকশন পরিবর্তন না হওয়া পর্যন্ত এই হিসাবগুলো রি-ক্যালকুলেট হবে না।
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

  // প্রোভাইডার ভ্যালু অবজেক্ট যা সাব-কম্পোনেন্টগুলোকে সমস্ত স্টেট ও ফাংশন প্রদান করবে।
  const value = {
    transactions,
    addTransaction,
    deleteTransaction,
    totalBalance: stats.totalBalance,
    totalIncome: stats.totalIncome,
    totalExpenses: stats.totalExpenses,
  };

  return (
    <TransactionContext.Provider value={value}>
      {children}
    </TransactionContext.Provider>
  );
};

// এই কাস্টম হুকটি ব্যবহার করে অ্যাপের যেকোনো কম্পোনেন্ট সহজেই ট্রানজেকশন ডেটা অ্যাক্সেস করতে পারবে।
// প্রতিবার useContext(TransactionContext) লেখার বদলে এই কাস্টম হুকটি ব্যবহার করা সহজ ও পরিচ্ছন্ন।
export const useTransactions = () => {
  const context = useContext(TransactionContext);
  if (context === undefined) {
    throw new Error('useTransactions অবশ্যই TransactionProvider এর ভেতরে ব্যবহার করতে হবে।');
  }
  return context;
};
