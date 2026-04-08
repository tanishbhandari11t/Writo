"use client"

import { useState } from "react"
import { cn } from "../../lib/utils"

interface RatingInteractionProps {
  onChange?: (rating: number) => void
  className?: string
}

const ratingData = [
  { emoji: "😔", label: "Terrible", color: "from-red-400 to-red-500", shadowColor: "shadow-red-500/30" },
  { emoji: "😕", label: "Poor", color: "from-orange-400 to-orange-500", shadowColor: "shadow-orange-500/30" },
  { emoji: "😐", label: "Okay", color: "from-yellow-400 to-yellow-500", shadowColor: "shadow-yellow-500/30" },
  { emoji: "🙂", label: "Good", color: "from-lime-400 to-lime-500", shadowColor: "shadow-lime-500/30" },
  { emoji: "😍", label: "Amazing", color: "from-emerald-400 to-emerald-500", shadowColor: "shadow-emerald-500/30" },
]

export function RatingInteraction({ onChange, className }: RatingInteractionProps) {
  const [rating, setRating] = useState(0)
  const [hoverRating, setHoverRating] = useState(0)

  const handleClick = (value: number) => {
    setRating(value)
    onChange?.(value)
  }

  const displayRating = hoverRating || rating

  return (
    <div className={cn("rating-container", className)}>
      {/* Emoji rating buttons */}
      <div className="emoji-row">
        {ratingData.map((item, i) => {
          const value = i + 1
          const isActive = value <= displayRating

          return (
            <button
              key={value}
              onClick={() => handleClick(value)}
              onMouseEnter={() => setHoverRating(value)}
              onMouseLeave={() => setHoverRating(0)}
              className="group relative focus:outline-none"
              aria-label={`Rate ${value}: ${item.label}`}
            >
              <div
                className={cn(
                  "relative flex h-14 w-14 items-center justify-center rounded-xl transition-all duration-300 ease-out",
                  isActive ? "bg-[#334155] shadow-lg scale-110" : "bg-[#1e293b] group-hover:bg-[#334155] scale-100 group-hover:scale-105",
                )}
              >
                {/* Emoji with smooth grayscale transition */}
                <span
                  className={cn(
                    "text-2xl transition-all duration-300 ease-out select-none",
                    isActive
                      ? "grayscale-0"
                      : "grayscale opacity-50 group-hover:opacity-100 group-hover:grayscale-0",
                  )}
                >
                  {item.emoji}
                </span>
              </div>
            </button>
          )
        })}
      </div>

      <div className="label-container">
        {/* Default "Rate us" text */}
        <div
          className="rating-label"
          style={{ 
            opacity: displayRating > 0 ? 0 : 1,
            transform: `scale(${displayRating > 0 ? 0.95 : 1})`,
            filter: displayRating > 0 ? 'blur(8px)' : 'none'
          }}
        >
          <span className="text-sm font-medium opacity-60">Rate us</span>
        </div>

        {/* Rating labels with blur in/out effect */}
        {ratingData.map((item, i) => (
          <div
            key={i}
            className="rating-label"
            style={{ 
              opacity: displayRating === i + 1 ? 1 : 0,
              transform: `scale(${displayRating === i + 1 ? 1 : 1.05})`,
              filter: displayRating === i + 1 ? 'none' : 'blur(8px)'
            }}
          >
            <span className="text-sm font-semibold tracking-wide">{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
