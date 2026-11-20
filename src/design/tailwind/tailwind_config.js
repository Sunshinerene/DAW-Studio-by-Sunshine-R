
    tailwind.config = {
      darkMode: 'class',
      theme: {
        extend: {
          fontFamily: {
            sans: ['Inter', 'sans-serif'],
            mono: ['JetBrains Mono', 'monospace'],
          },
          colors: {
            daw: {
              bg: 'rgb(var(--daw-bg) / <alpha-value>)',
              panel: 'rgb(var(--daw-panel) / <alpha-value>)',
              surface: 'rgb(var(--daw-surface) / <alpha-value>)',
              elevated: 'rgb(var(--daw-elevated) / <alpha-value>)',
              border: 'rgb(var(--daw-border) / <alpha-value>)',
              accent: 'rgb(var(--daw-accent) / <alpha-value>)',
            }
          }
        }
      }
    };
  