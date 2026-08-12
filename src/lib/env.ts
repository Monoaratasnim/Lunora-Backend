import "dotenv/config";

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} environment variable is required`);
  }
  return value;
}

const jwtSecret = requireEnv("JWT_SECRET");
const jwtExpiresIn = process.env.JWT_EXPIRES_IN ?? "7d";

const env = {
  jwtSecret,
  jwtExpiresIn,
} as const;

export { env };
