"use client"

import { motion } from "framer-motion"
import { ButtonHTMLAttributes } from "react"
import { cn } from "@/lib/utils"

interface ShinyButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  asChild?: boolean
}

export function ShinyButton({ className, children, ...props }: ShinyButtonProps) {
  return (
    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      className={cn(
        "relative inline-flex h-12 items-center justify-center overflow-hidden rounded-full px-6 text-sm font-semibold tracking-wide text-white transition-colors",
        "bg-gradient-to-r from-purple-500 via-blue-500 to-cyan-400",
        "shadow-[0_10px_40px_rgba(56,189,248,0.35)]",
        className
      )}
      {...props}
    >
      <span className="absolute inset-0">
        <span className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.8),transparent_60%)] opacity-40" />
        <motion.span
          className="absolute inset-y-0 left-0 w-1/3 bg-white/40 blur-lg"
          initial={{ x: "-200%" }}
          animate={{ x: "200%" }}
          transition={{ repeat: Infinity, duration: 3.4, ease: "easeInOut" }}
        />
      </span>
      <span className="relative flex items-center gap-2">{children}</span>
    </motion.button>
  )
}
