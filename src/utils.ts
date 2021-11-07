export function escapeRegex(s: string): string {
    return s.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')
}

export function debug(message: string) {
    console.log(__DYE_YELLOW__ + __DYE_BOLD__ + __DYE_DIM__ + '[rewrite] DEBUG: ' + message + __DYE_RESET__)
}
