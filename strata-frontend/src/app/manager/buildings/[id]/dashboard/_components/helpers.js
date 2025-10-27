export const startOfDayISO = (d) => {
    const x = new Date(d)
    x.setHours(0, 0, 0, 0)
    return x.toISOString()
}

export const endOfDayISO = (d) => {
    const x = new Date(d)
    x.setHours(23, 59, 59, 999)
    return x.toISOString()
}

export function labelForType(type) {
    switch (type) {
        case "booking":
            return "Resources"
        case "announcement":
            return "Announcements"
        case "maintenance":
            return "Maintenance"
        default:
            return "Item"
    }
}

export function badgeVariantForType(type) {
    switch (type) {
        case "booking":
            return "outline"
        case "announcement":
            return "secondary"
        case "maintenance":
            return "destructive"
        default:
            return "secondary"
    }
}
