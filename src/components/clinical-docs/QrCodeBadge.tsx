import React, { useMemo } from "react";

interface QrCodeBadgeProps {
  value: string;
  size?: number;
  label?: string;
  className?: string;
}

/**
 * Deterministic SVG matrix generator for visual QR verification codes.
 */
export function QrCodeBadge({ value, size = 96, label, className = "" }: QrCodeBadgeProps) {
  // Generate a deterministic 21x21 matrix based on input hash string
  const matrix = useMemo(() => {
    const n = 21;
    const grid: boolean[][] = Array.from({ length: n }, () => Array(n).fill(false));

    // Simple hash function
    let hash = 0;
    for (let i = 0; i < value.length; i++) {
      hash = (hash << 5) - hash + value.charCodeAt(i);
      hash |= 0;
    }

    // Standard 3 Finder patterns (top-left, top-right, bottom-left)
    const placeFinder = (r: number, c: number) => {
      for (let i = 0; i < 7; i++) {
        for (let j = 0; j < 7; j++) {
          if (
            i === 0 ||
            i === 6 ||
            j === 0 ||
            j === 6 ||
            (i >= 2 && i <= 4 && j >= 2 && j <= 4)
          ) {
            grid[r + i]![c + j] = true;
          }
        }
      }
    };

    placeFinder(0, 0);
    placeFinder(0, n - 7);
    placeFinder(n - 7, 0);

    // Timing patterns
    for (let i = 8; i < n - 8; i++) {
      grid[6]![i] = i % 2 === 0;
      grid[i]![6] = i % 2 === 0;
    }

    // Fill data area pseudorandomly based on hash
    let state = Math.abs(hash);
    for (let r = 0; r < n; r++) {
      for (let c = 0; c < n; c++) {
        // Skip finders
        if (
          (r < 8 && c < 8) ||
          (r < 8 && c >= n - 8) ||
          (r >= n - 8 && c < 8) ||
          r === 6 ||
          c === 6
        ) {
          continue;
        }
        state = (state * 1664525 + 1013904223) % 4294967296;
        grid[r]![c] = (state & 1) === 1;
      }
    }

    return grid;
  }, [value]);

  const n = matrix.length;
  const cellSize = size / n;

  return (
    <div className={`flex flex-col items-center gap-1 ${className}`}>
      <div
        className="rounded-lg border border-border/80 bg-white p-1.5 shadow-xs"
        style={{ width: size + 12, height: size + 12 }}
      >
        <svg
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          className="block"
          aria-label={`QR verification code for ${value}`}
        >
          <rect width={size} height={size} fill="#ffffff" />
          {matrix.map((row, r) =>
            row.map((isFilled, c) =>
              isFilled ? (
                <rect
                  key={`${r}-${c}`}
                  x={c * cellSize}
                  y={r * cellSize}
                  width={cellSize}
                  height={cellSize}
                  fill="#0f172a"
                />
              ) : null
            )
          )}
        </svg>
      </div>
      {label && <span className="text-[9px] font-medium text-muted-foreground">{label}</span>}
    </div>
  );
}
