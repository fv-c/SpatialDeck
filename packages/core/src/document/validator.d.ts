interface SchemaError {
  instancePath: string;
  message?: string;
}
interface Validator {
  (input: unknown): boolean;
  errors?: SchemaError[] | null;
}
export const validateLegacy: Validator;
export const validateCurrent: Validator;
