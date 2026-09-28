import { validate, type PathKind, type SchemaPath, type SchemaPathRules } from '@angular/forms/signals';

const DECIMAL = /^(?:\d+(?:\.\d{0,2})?|\.\d{1,2})$/;
const WHOLE = /^\d{1,4}$/;

/** Up to two decimal places, strictly between the bounds. */
export function decimalIn(min: number, max: number) {
  return (text: string) => DECIMAL.test(text) && Number(text) > min && Number(text) < max;
}

/** Up to two decimal places, from 0 up to and including `max`. */
export function decimalUpTo(max: number) {
  return (text: string) => DECIMAL.test(text) && Number(text) <= max;
}

/** A whole number within the bounds, inclusive. */
export function wholeIn(min: number, max: number) {
  return (text: string) => WHOLE.test(text) && Number(text) >= min && Number(text) <= max;
}

/** A blank answer passes here; `required` decides whether it may be blank. */
export function checkText<TPathKind extends PathKind>(
  field: SchemaPath<string, SchemaPathRules.Supported, TPathKind>,
  isValid: (text: string) => boolean,
  message: string,
): void {
  validate(field, ({ value }) => {
    const text = value().trim();
    return !text || isValid(text) ? undefined : { kind: 'range', message };
  });
}
