export { Button } from "./button";
export { Input } from "./input";
export { Select } from "./select";
export { Card, CardHeader, CardBody, CardFooter } from "./card";
export { Skeleton, SkeletonCard, SkeletonList } from "./skeleton";
export { EmptyState } from "./empty-state";

// ============================================================
// FILE: src/components/ui/index.ts
// ============================================================
// PURPOSE: Barrel export for all reusable UI primitives.
// HOW IT WORKS: Re-exports Button, Input, Select, Card (with sub-components),
//   Skeleton (with variants), and EmptyState from their individual files.
//   Provides a single import path for all UI components.
// INTEGRATION: Used by all feature components for consistent UI
// ============================================================
