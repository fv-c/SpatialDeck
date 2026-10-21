interface SchemaError {
  instancePath: string;
  message?: string;
}
declare const validate: {
  (input: unknown): boolean;
  errors?: SchemaError[] | null;
};
export default validate;
