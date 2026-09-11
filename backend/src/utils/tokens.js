import jwt from "jsonwebtoken";

const JWT_SECRET =
  process.env.JWT_SECRET || "dev_secret_change_me";

const JWT_EXPIRES_IN =
  process.env.JWT_EXPIRES_IN || "7d";

export function signToken(user) {
  return jwt.sign(
    {
      id: user.id,
      role: user.role,
      name: user.name,
      phone: user.phone,

      // Important:
      // Center admins get their assigned center.
      // Master admin has null.
      centerId: user.centerId || null,
    },
    JWT_SECRET,
    {
      expiresIn: JWT_EXPIRES_IN,
    }
  );
}

export function verifyToken(token) {
  return jwt.verify(token, JWT_SECRET);
}