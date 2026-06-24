"use client";
import Link from "next/link";
import { Icon } from "./Icons";

export interface BreadcrumbSegment {
  label: string;
  href?: string;
}

export default function Breadcrumb({ segments }: { segments: BreadcrumbSegment[] }) {
  if (!segments || segments.length === 0) return null;

  return (
    <nav aria-label="Breadcrumb" className="mb-2">
      <ol className="flex items-center gap-1.5 text-sm text-slate-500">
        {segments.map((seg, i) => {
          const isLast = i === segments.length - 1;
          return (
            <li key={i} className="flex items-center gap-1.5">
              {i > 0 && <Icon name="ChevronRight" />}
              {isLast || !seg.href ? (
                <span className={isLast ? "font-medium text-slate-800" : ""}>{seg.label}</span>
              ) : (
                <Link href={seg.href} className="hover:text-brand-600 transition-colors">
                  {seg.label}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}