"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { apiClientJson, Expense } from "@/lib/api";

export default function ExpenseCategoriesPage() {
  const [expenses, setExpenses] = useState<Expense[]>([]);

  useEffect(() => {
    apiClientJson<Expense[]>("/expenses")
      .then(setExpenses)
      .catch(() => setExpenses([]));
  }, []);

  const categorySummary = useMemo(() => {
    const grouped = new Map<string, { count: number; total: number }>();

    for (const expense of expenses) {
      const key = expense.category?.trim() || "uncategorized";
      const current = grouped.get(key) ?? { count: 0, total: 0 };
      grouped.set(key, {
        count: current.count + 1,
        total: current.total + expense.amount
      });
    }

    return Array.from(grouped.entries())
      .map(([category, values]) => ({ category, ...values }))
      .sort((a, b) => b.total - a.total);
  }, [expenses]);

  return (
    <div className="w-full px-4 pb-4">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="font-serif text-2xl text-foreground">Expense Categories</h1>
        <Link href="/expenses" className="text-sm text-primary">
          Back to expenses
        </Link>
      </div>

      <section className="mb-4 rounded-2xl border border-border bg-card px-4 py-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">Total expenses</p>
            <p className="text-base font-semibold text-foreground">{expenses.length}</p>
          </div>
          <div className="text-right">
            <p className="text-sm text-muted-foreground">Total spent</p>
            <p className="text-base font-semibold text-foreground">${expenses.reduce((sum, item) => sum + item.amount, 0).toFixed(2)}</p>
          </div>
        </div>
      </section>

      {categorySummary.length === 0 ? (
        <p className="rounded-2xl border border-border bg-card px-4 py-3 text-sm text-muted-foreground">
          No expenses logged yet.
        </p>
      ) : (
        categorySummary.map((item) => (
          <article key={item.category} className="mb-2 flex items-center justify-between rounded-2xl border border-border bg-card px-4 py-3">
            <div>
              <p className="text-sm font-medium capitalize text-foreground">{item.category}</p>
              <p className="text-xs text-muted-foreground">{item.count} expenses</p>
            </div>
            <p className="text-sm font-semibold text-foreground">${item.total.toFixed(2)}</p>
          </article>
        ))
      )}
    </div>
  );
}
