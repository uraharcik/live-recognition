# Orange Brand UI & UX Guidelines (Comprehensive)

This document is a technical specification for AI agents and developers to build UI kits and applications that strictly adhere to the Orange Brand identity.

---

## 1. Color Palette & Accessibility

### Core Palette
We are a **Black, White, and Orange** brand. This trio must dominate all layouts.

| Color | HEX | RGB | Role |
| :--- | :--- | :--- | :--- |
| **Brand Orange** | `#FF7900` | `255, 121, 0` | Hero highlight, primary actions, logo. |
| **Black** | `#000000` | `0, 0, 0` | Primary digital background, text. |
| **White** | `#FFFFFF` | `255, 255, 255` | Secondary background, text on black. |
| **Accessible Orange**| `#F16E00` | `241, 110, 0` | **AA Contrast** for orange text on white. |

### Color Rules
*   **80/20 Rule**: 80% Core colors, max 20% supporting colors (Blue, Green, etc.).
*   **30% Orange Rule**: Minimum 30% of the layout must be Orange to ensure brand attribution.
*   **Digital Backgrounds**: Prefer **Black** (Eco-branding).

---

## 2. Spacing System
The system uses a **modular 8px base unit** with 4px half-steps for fine-tuning.

| Level | Value (px/pt/dp) | REM (16px base) | Usage Example |
| :--- | :--- | :--- | :--- |
| `0` | 0 | 0rem | Reset |
| `1` | 4 | 0.25rem | Micro-spacing (icons, labels) |
| `2` | 8 | 0.5rem | Small gaps, internal padding |
| `3` | 16 | 1rem | **Standard gutter**, component padding |
| `4` | 24 | 1.5rem | Medium component spacing |
| `5` | 32 | 2rem | Large section padding |
| `6` | 48 | 3rem | Major section margins |

---

## 3. Grid & Layout (Responsive)
Orange uses a fluid **12-column grid** with fixed gutters.

| Breakpoint | Width | Columns | Gutter | Outer Margin |
| :--- | :--- | :--- | :--- | :--- |
| **XS (Mobile)** | `< 480px` | 4 | 10px | 10px |
| **SM (Tablet)** | `480px - 767px` | 6 | 20px | 20px |
| **MD (Desktop)** | `768px - 1023px`| 12 | 20px | 20px |
| **LG (Large)** | `1024px - 1279px`| 12 | 20px | 40px |
| **XL (Max)** | `≥ 1280px` | 12 | 20px | Auto (Centered) |

---

## 5. Typography
*   **Font Family**: `HelvNeue75Bold` (Headings) and `HelvNeue55Roman` (Body).
*   **Line Height**: Standard body text must use `1.5` (e.g., 24px height for 16px font).
*   **Hierarchy**:
    *   **H1 (Headline)**: Should be Orange where possible.
    *   **Body**: White on Black, or Black on White.
    *   **Secondary Text**: 60% Black (`#999999`) or Mid-Grey (`#8F8F8F`).

---

## 6. Mobile Platform Guidelines (iOS & Android)

### **Common Mobile Rules**
*   **Grid**: Built on an **8pt/8dp grid** to ensure visual harmony.
*   **Margins**: Standard side margins of **16pt/16dp** for mobile devices.
*   **Iconography**: Standard size is **24x24** with a minimum of **4px padding** within the bounding box.

### **iOS Specifics**
*   **Navigation**:
    *   **Tab Bar**: 2 to 5 sections; active state highlighted in Brand Orange.
    *   **Navigation Bar**: Centered or large left-aligned title; action buttons (e.g., "Edit") on the right.
*   **Buttons**:
    *   **Primary**: Solid Orange background with White text.
    *   **Secondary**: Outlined Orange borders with Orange text.
    *   **Tertiary**: Plain text buttons for subtle interactions.
*   **Typography**: Uses **Helvetica Neue** (or San Francisco as a fallback).

### **Android Specifics**
*   **Navigation**:
    *   **Top Bar**: Branding, titles, and key actions with a "Back" arrow.
    *   **Bottom Navigation**: 3 to 5 destinations with icons and labels.
    *   **Navigation Drawer**: Used for complex app structures; slides from the left.
    *   **Tabs**: For organizing content within a screen.
*   **Buttons (Material Adaptations)**:
    *   **Contained (Primary)**: High-emphasis, uses Brand Orange.
    *   **Outlined (Secondary)**: Medium-emphasis actions.
    *   **Text (Tertiary)**: Low-emphasis, used in cards or dialogs.
    *   **Floating Action Button (FAB)**: Hero action circular button; must be Orange.
*   **Safe Areas**: Must account for system bars (Status Bar and Navigation Bar) in all layouts.

---

## 7. Iconography & Logo
*   **Icon Size**: Standard `24px x 24px`.
*   **Icon Padding**: Minimum `4px` clear space inside the bounding box.
*   **Logo Clear Space**: Must maintain a "safe zone" of **50% of the logo's width** on all sides.
*   **Logo Minimum Size**: `40px` for digital Master Logo.

---

## 8. Strategic "Don'ts"
1.  **NO Rounded Corners** (Always 0px radius).
2.  **NO Gradients** (Use flat color only).
3.  **NO Shadows** (Prefer flat borders or high-contrast separations).
4.  **NO Text on Supporting Colors** (Keep text on Black, White, or Orange).
5.  **NO categorization by color** (Don't use "Blue for Business").
