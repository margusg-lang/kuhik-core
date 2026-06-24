"use client";
import { Icon } from "./Icons";
import Link from "next/link";

export interface ActionButton {
  label: string;
  href?: string;
  onClick?: () => void;
  icon?: string;
  variant?: "primary" | "secondary";
}

export interface ContextHeaderProps {
  entityName: string;
  entityType: string; // e.g. "Korter", "Hoone", "Ühistu", "Arve"
  parentContext?: string; // e.g. "Hoone A / Ühistu 1"
  actions?: ActionButton[];
}

export default function ContextHeader({ entityName, entityType, parentContext, actions }: ContextHeaderProps) {
  const typeColors: Record<string, string> = {
    "Ühistu": "bg-purple-100 text-purple-700",
    "Hoone": "bg-blue-100 text-blue-700",
    "Korter": "bg-green-100 text-green-700",
    "Inimene": "bg-amber-100 text-amber-700",
    "Arvesti": "bg-cyan-100 text-cyan-700",
    "Arve": "bg-indigo-100 text-indigo-700",
    "Makse": "bg-emerald-100 text-emerald-700",
  };

  const badgeColor = typeColors[entityType] || "bg-slate-100 text-slate-700";

  return (
    <div className="mb-6 pb-4 border-b border-slate-200">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          {/* Badge */}
          <span className={`inline-block px-2.5 py-0.5 rounded-md text-xs font-semibold ${badgeColor} mb-1`}>
            {entityType}
          </span>

          {/* Entity name */}
          <h1 className="text-2xl font-bold text-slate-900">{entityName}</h1>

          {/* Parent context */}
          {parentContext && (
            <p className="text-sm text-slate-500 mt-0.5">{parentContext}</p>
          )}
        </div>

        {/* Quick actions */}
        {actions && actions.length > 0 && (
          <div className="flex items-center gap-2 flex-wrap">
            {actions.map((action, i) => {
              const baseClass = "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors";
              if (action.href) {
                return (
                  <Link
                    key={i}
                    href={action.href}
                    className={`${baseClass} ${
                      action.variant === "primary"
                        ? "bg-brand-600 text-white hover:bg-brand-700"
                        : "bg-white border border-slate-300 text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    {action.icon && <Icon name={action.icon} />}
                    {action.label}
                  </Link>
                );
              }
              return (
                <button
                  key={i}
                  onClick={action.onClick}
                  className={`${baseClass} ${
                    action.variant === "primary"
                      ? "bg-brand-600 text-white hover:bg-brand-700"
                      : "bg-white border border-slate-300 text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  {action.icon && <Icon name={action.icon} />}
                  {action.label}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}