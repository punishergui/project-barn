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
    <div className="w-full space-y-3 px-4 pb-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Expense Categories</h1>
        <Link href="/expenses" className="see-all-link">
          Back to expenses
        </Link>
      </div>

      <section className="barn-card space-y-2 text-sm">
        <p>Total expenses: {expenses.length}</p>
        <p>
          Total spent: ${expenses.reduce((sum, item) => sum + item.amount, 0).toFixed(2)}
        </p>
      </section>

      {categorySummary.length === 0 ? (
        <p className="barn-row text-sm text-[var(--barn-muted)]">No expenses logged yet.</p>
      ) : (
        categorySummary.map((item) => (
          <article key={item.category} className="barn-row">
            <p className="font-medium capitalize">{item.category}</p>
            <p className="text-xs text-[var(--barn-muted)]">
              {item.count} {item.count === 1 ? "expense" : "expenses"} • ${item.total.toFixed(2)}
            </p>
          </article>
        ))
      )}
    </div>
  );
}
