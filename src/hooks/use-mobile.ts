import * as React from "react"

const MOBILE_BREAKPOINT = 768

export function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState<boolean | undefined>(undefined)

  React.useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`)
    const onChange = () => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT)
    }
    mql.addEventListener("change", onChange)
    setIsMobile(window.innerWidth < MOBILE_BREAKPOINT)
    return () => mql.removeEventListener("change", onChange)
  }, [])

  return !!isMobile
}

export function useIsTablet() {
  const [isTablet, setIsTablet] = React.useState<boolean | undefined>(undefined)

  React.useEffect(() => {
    const mql = window.matchMedia(`(min-width: 768px) and (max-width: 1024px)`)
    const onChange = () => {
      setIsTablet(window.innerWidth >= 768 && window.innerWidth <= 1024)
    }
    mql.addEventListener("change", onChange)
    setIsTablet(window.innerWidth >= 768 && window.innerWidth <= 1024)
    return () => mql.removeEventListener("change", onChange)
  }, [])

  return !!isTablet
}

export function useIsSmallMobile() {
  const [isSmallMobile, setIsSmallMobile] = React.useState<boolean | undefined>(undefined)

  React.useEffect(() => {
    const mql = window.matchMedia(`(max-width: 599px)`)
    const onChange = () => {
      setIsSmallMobile(window.innerWidth < 600)
    }
    mql.addEventListener("change", onChange)
    setIsSmallMobile(window.innerWidth < 600)
    return () => mql.removeEventListener("change", onChange)
  }, [])

  return !!isSmallMobile
}
