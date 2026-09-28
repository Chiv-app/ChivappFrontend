with open("src/components/booking/booking-request-form.tsx", "r", encoding="utf-8") as f:
    content = f.read()

content = content.replace("    formatAvailabilitySummary,\n", "")

with open("src/components/booking/booking-request-form.tsx", "w", encoding="utf-8") as f:
    f.write(content)
