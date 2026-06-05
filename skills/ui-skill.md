# UI-SKILL.MD

# Purpose

This document defines the mandatory UI/UX standards for this project.

Every AI agent, coding assistant, contributor, or automated system must follow these guidelines when creating, modifying, or refactoring user interfaces.

The objective is to maintain a consistent **Neubrutalist Design System** across the entire application.

---

# Core Design Philosophy

The interface should feel:

* Bold
* Memorable
* Playful
* Confident
* Human
* High Contrast
* Functional
* Accessible

The design should intentionally avoid:

* Generic SaaS appearance
* Excessive gradients
* Glassmorphism
* Heavy blur effects
* Corporate minimalism
* Overly rounded interfaces
* Soft shadows
* Generic dashboard aesthetics

The experience should immediately communicate personality and confidence.

---

# Design Style

## Primary Style

Neubrutalism

Characteristics:

* Thick black borders
* Large typography
* Strong contrast
* Flat colors
* Hard shadows
* Visible hierarchy
* Raw aesthetics
* Intentional asymmetry
* Geometric visual language

---

# Visual Identity Rules

## Borders

All interactive components must use strong visible borders.

Examples:

* Buttons
* Inputs
* Cards
* Dialogs
* Dropdowns
* Navigation Items

Requirements:

* Border color: Pure Black
* Border thickness: 2px–4px
* Never use subtle borders
* Never use transparent borders

Preferred:

```css
border: 3px solid #000;
```

---

# Shadows

Shadows are structural.

Never use blur-based shadows.

Allowed:

```css
box-shadow: 6px 6px 0 #000;
```

```css
box-shadow: 8px 8px 0 #000;
```

Avoid:

```css
box-shadow: 0 10px 30px rgba(...)
```

Rules:

* Hard edge shadows only
* No blur
* No spread effects
* Shadow should feel printed

---

# Corner Radius

Use minimal radius.

Preferred:

```css
border-radius: 8px;
```

Allowed:

```css
border-radius: 0;
border-radius: 6px;
border-radius: 8px;
border-radius: 12px;
```

Avoid:

```css
border-radius: 24px;
border-radius: 999px;
```

Unless creating intentionally pill-shaped components.

---

# Typography System

## Philosophy

Typography is the primary design element.

Users should understand hierarchy instantly.

---

## Font Categories

### Headings

Use bold geometric sans-serif fonts.

Examples:

* Inter
* Space Grotesk
* Geist
* Archivo
* IBM Plex Sans
* General Sans

Weight:

```text
700
800
900
```

---

## Body Text

Weight:

```text
400
500
```

Maintain excellent readability.

---

# Typography Scale

## H1

* Very large
* Attention grabbing

Desktop:

```text
56px–72px
```

Mobile:

```text
36px–48px
```

---

## H2

```text
40px–56px
```

---

## H3

```text
28px–40px
```

---

## Body

```text
16px–18px
```

---

## Small Text

```text
14px
```

Minimum.

Never go below:

```text
12px
```

---

# Color Philosophy

Colors should create energy.

Never create a dull interface.

---

# Primary Palette

Use vibrant colors.

Examples:

```text
Yellow
Pink
Orange
Blue
Green
Purple
```

---

# Contrast Requirements

Every screen must pass:

* Clear text contrast
* Clear component separation
* Clear interaction states

Avoid:

* Gray on gray
* Low opacity text
* Faded interfaces

---

# Recommended Color Structure

## Primary

Bold accent color

## Secondary

Support accent color

## Surface

Light neutral

## Background

Clean neutral

## Border

Pure black

## Text

Pure black

---

# Layout Philosophy

Layouts should feel dynamic.

Avoid perfectly symmetrical corporate layouts.

---

# Allowed Layout Patterns

* Offset cards
* Uneven grids
* Broken grid systems
* Intentional asymmetry
* Mixed card sizes
* Layered elements

---

# Avoid

* Everything perfectly centered
* Repetitive card grids
* Generic admin panels
* Template-like layouts

---

# Component Standards

## Buttons

Requirements:

* Thick border
* Hard shadow
* Large label
* Strong hover state

Hover:

* Slight movement
* Shadow reduction

Pressed:

```css
transform: translate(4px, 4px);
```

Shadow collapses.

---

## Cards

Requirements:

* Strong border
* Hard shadow
* High contrast background

Card hierarchy should be obvious.

---

## Inputs

Requirements:

* Thick border
* Large padding
* Strong focus state

Focus:

```css
outline: 4px solid accent;
```

Never use subtle focus indicators.

---

## Dialogs

Requirements:

* High contrast
* Large titles
* Thick border
* Hard shadow

Dialog should clearly dominate the screen.

---

## Navigation

Navigation should be:

* Simple
* Bold
* Obvious

Avoid:

* Hidden actions
* Tiny icons
* Complex nested navigation

---

# Icon Guidelines

Use icons only when helpful.

Icons must:

* Be visually bold
* Support labels
* Never replace labels

Preferred icon styles:

* Stroke icons
* Simple geometric icons

Avoid:

* Detailed illustrations
* Thin-line icon sets

---

# Motion Guidelines

Motion exists to communicate.

Not decorate.

---

# Allowed Animations

* Hover movement
* Press movement
* Panel reveal
* Fade in
* Slide in

Duration:

```text
150ms–300ms
```

---

# Avoid

* Long transitions
* Floating effects
* Continuous animations
* Excessive motion

---

# Spacing System

Use consistent spacing scale.

```text
4
8
12
16
24
32
48
64
96
```

Never use random spacing values.

---

# Accessibility Requirements

Mandatory.

Every interface must support:

* Keyboard navigation
* Focus indicators
* Screen readers
* Semantic HTML
* Sufficient color contrast

Minimum target size:

```text
44px × 44px
```

---

# Responsive Design Rules

Every screen must work on:

* Mobile
* Tablet
* Desktop
* Ultra-wide displays

Mobile-first approach.

Never hide critical functionality on mobile.

---

# Empty States

Every empty state must contain:

* Explanation
* Call to action
* Visual personality

Never show blank screens.

---

# Loading States

Use:

* Skeletons
* Progress indicators
* Status messages

Never leave users guessing.

---

# Error States

Errors should:

* Explain the issue
* Explain why it happened
* Explain how to fix it

Avoid generic messages.

Bad:

```text
Something went wrong
```

Good:

```text
Unable to load projects.
Check your internet connection and try again.
```

---

# AI Agent Decision Rules

When creating UI:

1. Prioritize clarity over decoration.
2. Prioritize hierarchy over density.
3. Prioritize usability over aesthetics.
4. Maintain neubrutalist styling everywhere.
5. Use strong borders before adding color.
6. Use typography before adding graphics.
7. Use contrast before adding effects.
8. Keep interactions obvious.
9. Design for accessibility first.
10. Every component must look intentional.

---

# Quality Checklist

Before finishing any UI:

* Thick borders present
* Hard shadows present
* Typography hierarchy clear
* Strong contrast achieved
* Responsive behavior verified
* Accessibility verified
* Interactive states implemented
* No glassmorphism
* No excessive gradients
* No generic SaaS appearance
* Consistent neubrutalist styling

If any item fails, the UI is not complete.
