# 05: Check-in pull-up assistance as a number

**What to build:** The check-in's pull-up test records a number in pounds (0–150) plus an optional band note. Old text values stay readable and are never rewritten. The field is not prefilled from Forge. The measurement summary and backup validation handle both forms.

**Blocked by:** 01

**Status:** done

**Model / effort:** Sonnet 5.5, medium

- [ ] Validation rejects values outside 0–150 with a plain message
- [ ] Journal/measurement summary shows old text and new numbers
- [ ] Existing measurement history and backups restore unchanged
- [ ] Tests and build pass
