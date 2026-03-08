"use client"

import { usePathname } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import { type ReactNode, useRef, useEffect, useState } from "react"

export default function PageTransition({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const [displayChildren, setDisplayChildren] = useState(children)
  const [transitionKey, setTransitionKey] = useState(pathname)
  const prevPathname = useRef(pathname)

  useEffect(() => {
    if (pathname !== prevPathname.current) {
      prevPathname.current = pathname
      setTransitionKey(pathname)
      setDisplayChildren(children)
    }
  }, [pathname, children])

  // Also update children when they change on same route (e.g. data refresh)
  useEffect(() => {
    setDisplayChildren(children)
  }, [children])

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={transitionKey}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -4 }}
        transition={{ duration: 0.15, ease: "easeOut" }}
      >
        {displayChildren}
      </motion.div>
    </AnimatePresence>
  )
}
