/**
 * Design Tokens for NightPomodoro
 * Generated deterministically based on project seed
 */

export const designTokens = {
  // Color palette
  colors: {
    // Primary: Night Sky theme
    primary: {
      main: "#1E3A8A",
      light: "#4F46E5",
      dark: "#312E81",
      contrast: "#FFFFFF",
    },
    // Accent: Focus Glow
    accent: {
      main: "#8B5CF6",
      light: "#A855F7",
      dark: "#7C3AED",
      contrast: "#FFFFFF",
    },
    // Achievement: Gold
    achievement: {
      main: "#F59E0B",
      light: "#FBBF24",
      dark: "#D97706",
      contrast: "#000000",
    },
    // Feedback colors
    success: "#10B981",
    warning: "#EF4444",
    info: "#3B82F6",
    // Dark theme backgrounds
    background: {
      primary: "#0F1419",
      secondary: "#1A1F2E",
      tertiary: "#252B3B",
    },
    // Text colors
    text: {
      primary: "#F9FAFB",
      secondary: "#D1D5DB",
      tertiary: "#9CA3AF",
      disabled: "#6B7280",
    },
    // Border colors
    border: {
      default: "#2D3748",
      light: "#374151",
      dark: "#1F2937",
    },
  },

  // Typography
  typography: {
    fontFamily: {
      primary: "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      mono: "'JetBrains Mono', 'Fira Code', Consolas, monospace",
    },
    fontSize: {
      xs: "0.75rem",      // 12px
      sm: "0.875rem",     // 14px
      base: "1rem",       // 16px
      lg: "1.125rem",     // 18px
      xl: "1.25rem",      // 20px
      "2xl": "1.5rem",    // 24px
      "3xl": "1.875rem",  // 30px
      "4xl": "2.25rem",   // 36px
      "5xl": "3rem",      // 48px
    },
    fontWeight: {
      normal: 400,
      medium: 500,
      semibold: 600,
      bold: 700,
    },
    lineHeight: {
      tight: 1.25,
      normal: 1.5,
      relaxed: 1.75,
    },
  },

  // Spacing (based on 8px grid for compact, 12px for comfortable)
  spacing: {
    compact: {
      xs: "0.25rem",   // 4px
      sm: "0.5rem",    // 8px
      md: "1rem",      // 16px
      lg: "1.5rem",    // 24px
      xl: "2rem",      // 32px
      "2xl": "3rem",   // 48px
    },
    comfortable: {
      xs: "0.375rem",  // 6px
      sm: "0.75rem",   // 12px
      md: "1.5rem",    // 24px
      lg: "2.25rem",   // 36px
      xl: "3rem",      // 48px
      "2xl": "4.5rem", // 72px
    },
  },

  // Border radius
  borderRadius: {
    none: "0",
    sm: "0.25rem",   // 4px
    md: "0.5rem",    // 8px
    lg: "0.75rem",   // 12px
    xl: "1rem",      // 16px
    full: "9999px",
  },

  // Shadows
  shadows: {
    sm: "0 1px 2px 0 rgba(0, 0, 0, 0.05)",
    md: "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
    lg: "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)",
    xl: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
    glass: "0 8px 32px 0 rgba(31, 38, 135, 0.37)",
  },

  // Animations
  animations: {
    transition: {
      fast: "150ms",
      normal: "200ms",
      slow: "300ms",
    },
    easing: {
      default: "cubic-bezier(0.4, 0, 0.2, 1)",
      easeIn: "cubic-bezier(0.4, 0, 1, 1)",
      easeOut: "cubic-bezier(0, 0, 0.2, 1)",
      easeInOut: "cubic-bezier(0.4, 0, 0.2, 1)",
    },
  },

  // Breakpoints (responsive)
  breakpoints: {
    mobile: "768px",
    tablet: "1024px",
    desktop: "1280px",
  },

  // Z-index layers
  zIndex: {
    dropdown: 1000,
    sticky: 1100,
    modal: 1200,
    popover: 1300,
    tooltip: 1400,
  },

  // Accessibility
  accessibility: {
    focusRing: "0 0 0 3px rgba(139, 92, 246, 0.5)",
    minContrastRatio: 4.5, // WCAG AA
  },
} as const;

export type DesignTokens = typeof designTokens;

// Helper function to get spacing value
export function getSpacing(
  size: keyof typeof designTokens.spacing.compact,
  density: "compact" | "comfortable" = "compact"
): string {
  return designTokens.spacing[density][size];
}

// Helper function to get color
export function getColor(path: string): string {
  const parts = path.split(".");
  let value: any = designTokens.colors;
  
  for (const part of parts) {
    value = value[part];
    if (value === undefined) return "#000000";
  }
  
  return typeof value === "string" ? value : "#000000";
}

