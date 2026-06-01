const MAX_EMAIL_LENGTH = 254;
const MAX_PASSWORD_LENGTH = 72;
const MAX_NAME_LENGTH = 100;

const validateStringInput = (value, maxLength, fieldName, req) => {
  if (value === undefined || value === null) return `${fieldName} is required`;
  if (typeof value !== "string") return `${fieldName} must be a valid string`;
  if (value.length === 0) return `${fieldName} cannot be empty`;
  if (value.length > maxLength) return `${fieldName} exceeds allowed size`;
  if (fieldName === "Email") {
    const emailStr = value.toLowerCase().trim();
    const isAdminOrManager = req && (req.originalUrl.includes("/api/admin") || req.originalUrl.includes("/api/manager"));
    if (!isAdminOrManager && !emailStr.endsWith("@gmail.com")) {
      return "Only @gmail.com email addresses are allowed";
    }
  }
  return null;
};

const validatePassword = (value) => {
  if (value === undefined || value === null) return "Password is required";
  if (typeof value !== "string") return "Password must be a valid string";
  if (value.length < 8) return "Password must be at least 8 characters long";
  if (value.length > 72) return "Password must be at most 72 characters long";
  if (!/[A-Z]/.test(value)) return "Password must contain at least one uppercase letter";
  if (!/[!@#$%^&*(),.?":{}|<>]/.test(value)) return "Password must contain at least one special character";
  return null;
};

// Validates standard email/password login payloads
export const validateLoginPayload = (req, res, next) => {
  const { email, password } = req.body;

  const emailError = validateStringInput(email, MAX_EMAIL_LENGTH, "Email", req);
  if (emailError) return res.status(400).json({ success: false, message: emailError });

  const passwordError = validateStringInput(password, MAX_PASSWORD_LENGTH, "Password", req);
  if (passwordError) return res.status(400).json({ success: false, message: passwordError });

  next();
};

// Validates registration payloads
export const validateRegisterPayload = (req, res, next) => {
  const { name, email, password } = req.body;

  const nameError = validateStringInput(name, MAX_NAME_LENGTH, "Name", req);
  if (nameError) return res.status(400).json({ success: false, message: nameError });

  const emailError = validateStringInput(email, MAX_EMAIL_LENGTH, "Email", req);
  if (emailError) return res.status(400).json({ success: false, message: emailError });

  const passwordError = validatePassword(password);
  if (passwordError) return res.status(400).json({ success: false, message: passwordError });

  next();
};

// Validates payloads that only require email (e.g. forgot password)
export const validateEmailPayload = (req, res, next) => {
  const { email } = req.body;

  const emailError = validateStringInput(email, MAX_EMAIL_LENGTH, "Email", req);
  if (emailError) return res.status(400).json({ success: false, message: emailError });

  next();
};

// Validates password reset payloads (token + new password)
export const validateResetPasswordPayload = (req, res, next) => {
  const { email, token, password } = req.body;

  const emailError = validateStringInput(email, MAX_EMAIL_LENGTH, "Email", req);
  if (emailError) return res.status(400).json({ success: false, message: emailError });

  const tokenError = validateStringInput(token, 256, "Token", req);
  if (tokenError) return res.status(400).json({ success: false, message: tokenError });

  const passwordError = validatePassword(password);
  if (passwordError) return res.status(400).json({ success: false, message: passwordError });

  next();
};
