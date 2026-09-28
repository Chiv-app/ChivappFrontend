import re

with open("src/components/booking/booking-request-form.tsx", "r", encoding="utf-8") as f:
    content = f.read()

# I will add description to TimeInput
time_input_pattern = r'(<TimeInput\s*label="Hora"\s*variant="bordered"\s*isRequired\s*hourCycle=\{12\}\s*value=\{timeValue\})'

# We format the description
new_time_input = r'''\1
            description={
              daySlots.length > 0
                ? `Disp: ${daySlots
                    .map(
                      (s) =>
                        `${formatTimeLabel(s.start_time)} - ${formatTimeLabel(s.end_time)}`,
                    )
                    .join(", ")}`
                : undefined
            }'''

content = re.sub(time_input_pattern, new_time_input, content)

with open("src/components/booking/booking-request-form.tsx", "w", encoding="utf-8") as f:
    f.write(content)
