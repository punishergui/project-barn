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
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-xl font-semibold text-foreground">Expense Categories</h1>
        <Link
          href="/expenses"
          className="text-xs font-medium text-primary underline-offset-4 transition hover:underline"
        >
          Back to expenses
        </Link>
      </div>

      <section className="space-y-2 rounded-lg border border-border bg-card p-4 text-sm text-foreground">
        <p>Total expenses: {expenses.length}</p>
        <p>
          Total spent: ${expenses.reduce((sum, item) => sum + item.amount, 0).toFixed(2)}
        </p>
      </section>

      {categorySummary.length === 0 ? (
        <p className="rounded-lg border border-border bg-card p-4 text-sm text-muted-foreground">
          No expenses logged yet.
        </p>
      ) : (
        categorySummary.map((item) => (
          <article
            key={item.category}
            className="space-y-1 rounded-lg border border-border bg-card p-4"
          >
            <p className="font-medium capitalize text-foreground">{item.category}</p>
            <p className="text-xs text-muted-foreground">
              {item.count} {item.count === 1 ? "expense" : "expenses"} • ${item.total.toFixed(2)}
            </p>
          </article>
        ))
      )}
    </div>
  );
}
