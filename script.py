import re

with open("src/components/booking/booking-request-form.tsx", "r", encoding="utf-8") as f:
    content = f.read()

content = re.sub(r'function isDateUnavailable\(date: DateValue\): boolean \{\s*if \(availableDays\.size === 0\) return false;\s*const jsDay = date\.toDate\(getLocalTimeZone\(\)\)\.getDay\(\);\s*return !availableDays\.has\(jsDay\);\s*\}', '', content)

with open("src/components/booking/booking-request-form.tsx", "w", encoding="utf-8") as f:
    f.write(content)
