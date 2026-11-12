import jwt from "jsonwebtoken";
import dotenv from "dotenv";
dotenv.config();
const secretKey = process.env.SECRET_KEY;

const authenticationMiddleware = (req, res, next) => {
  // Check Authorization header first
  const authHeader = req.headers.authorization;
  let token;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.split(' ')[1];
  } else {
    // If no Authorization header, check cookies
    const cookie = req.cookies;
    if (cookie && cookie.token) {
      token = cookie.token;
    }
  }

  if (!token) {
    return res.status(401).json({ message: "No authentication token provided" });
  }

  jwt.verify(token, secretKey, (error, decoded) => {
    if (error) {
      return res.status(403).json({ message: "Invalid token" });
    }

    req.user = decoded.user;
    next();
  });
};

export default authenticationMiddleware;
