// Security utilities for input validation and sanitization

const MAX_MESSAGE_LENGTH = 10000;
const MAX_USERNAME_LENGTH = 50;
const MAX_ROOM_SLUG_LENGTH = 100;
const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25MB (increased for PDF support)
const ALLOWED_FILE_TYPES = [
  'image/jpeg', 
  'image/png', 
  'image/gif', 
  'image/webp',
  'application/pdf' // PDF support
];

// Sanitize HTML to prevent XSS
function sanitizeHTML(html) {
  if (!html) return '';
  
  // Basic XSS prevention - remove script tags and dangerous attributes
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/on\w+\s*=\s*["'][^"']*["']/gi, '')
    .replace(/on\w+\s*=\s*[^\s>]*/gi, '')
    .replace(/javascript:/gi, '');
}

// Validate and sanitize message content
function validateMessage(content, type = 'text') {
  if (!content || typeof content !== 'string') {
    return { valid: false, error: 'Message content is required' };
  }

  const trimmed = content.trim();
  
  if (trimmed.length === 0) {
    return { valid: false, error: 'Message cannot be empty' };
  }

  if (trimmed.length > MAX_MESSAGE_LENGTH) {
    return { valid: false, error: `Message too long (max ${MAX_MESSAGE_LENGTH} characters)` };
  }

  // Sanitize based on type
  let sanitized = trimmed;
  if (type === 'text') {
    sanitized = sanitizeHTML(trimmed);
  }

  return { valid: true, sanitized };
}

// Validate username
function validateUsername(username) {
  if (!username || typeof username !== 'string') {
    return { valid: false, error: 'Username is required' };
  }

  const trimmed = username.trim();

  if (trimmed.length === 0) {
    return { valid: false, error: 'Username cannot be empty' };
  }

  if (trimmed.length > MAX_USERNAME_LENGTH) {
    return { valid: false, error: `Username too long (max ${MAX_USERNAME_LENGTH} characters)` };
  }

  // Only allow alphanumeric, spaces, and basic punctuation
  if (!/^[a-zA-Z0-9\s\-_\.]+$/.test(trimmed)) {
    return { valid: false, error: 'Username contains invalid characters' };
  }

  return { valid: true, sanitized: sanitizeHTML(trimmed) };
}

// Validate room slug
function validateRoomSlug(slug) {
  if (!slug || typeof slug !== 'string') {
    return { valid: false, error: 'Room name is required' };
  }

  const trimmed = slug.trim();

  if (trimmed.length === 0) {
    return { valid: false, error: 'Room name cannot be empty' };
  }

  if (trimmed.length > MAX_ROOM_SLUG_LENGTH) {
    return { valid: false, error: `Room name too long (max ${MAX_ROOM_SLUG_LENGTH} characters)` };
  }

  // Only allow alphanumeric, hyphens, underscores
  if (!/^[a-zA-Z0-9\-_]+$/.test(trimmed)) {
    return { valid: false, error: 'Room name can only contain letters, numbers, hyphens, and underscores' };
  }

  return { valid: true, sanitized: trimmed.toLowerCase() };
}

// Validate max users
function validateMaxUsers(maxUsers) {
  if (maxUsers === null || maxUsers === undefined || maxUsers === 'unlimited') {
    return { valid: true, sanitized: null };
  }

  const num = parseInt(maxUsers, 10);

  if (isNaN(num) || num < 1) {
    return { valid: false, error: 'Max users must be a positive number' };
  }

  if (num > 1000) {
    return { valid: false, error: 'Max users cannot exceed 1000' };
  }

  return { valid: true, sanitized: num };
}

// Validate file upload
function validateFile(file, mimetype, size) {
  if (!file || !mimetype || !size) {
    return { valid: false, error: 'Invalid file data' };
  }

  if (size > MAX_FILE_SIZE) {
    return { valid: false, error: `File too large (max ${MAX_FILE_SIZE / 1024 / 1024}MB)` };
  }

  if (!ALLOWED_FILE_TYPES.includes(mimetype)) {
    return { valid: false, error: 'File type not allowed. Only images (JPEG, PNG, GIF, WebP) and PDF files are permitted' };
  }

  return { valid: true };
}

// Validate PDF content for security threats
function validatePDFContent(base64Data) {
  try {
    // Decode base64 to check PDF header
    const buffer = Buffer.from(base64Data.split(',')[1] || base64Data, 'base64');
    const header = buffer.toString('ascii', 0, 5);
    
    // Check for valid PDF header
    if (!header.startsWith('%PDF-')) {
      return { valid: false, error: 'Invalid PDF file format' };
    }
    
    // Convert to string for content scanning (first 10KB only for performance)
    const scanLength = Math.min(buffer.length, 10240);
    const content = buffer.toString('ascii', 0, scanLength).toLowerCase();
    
    // Check for suspicious content
    const suspiciousPatterns = [
      '/javascript',
      '/js',
      '/launch',
      '/importdata',
      '/submitform',
      '/gotor',
      '/uri',
      '<script',
      'eval(',
    ];
    
    for (const pattern of suspiciousPatterns) {
      if (content.includes(pattern)) {
        return { valid: false, error: 'PDF contains potentially dangerous content and cannot be uploaded' };
      }
    }
    
    // Check file size doesn't exceed limits
    if (buffer.length > MAX_FILE_SIZE) {
      return { valid: false, error: `PDF file too large (max ${MAX_FILE_SIZE / 1024 / 1024}MB)` };
    }
    
    return { valid: true, size: buffer.length };
  } catch (error) {
    return { valid: false, error: 'Failed to validate PDF content' };
  }
}

// Validate color (hex color code)
function validateColor(color) {
  if (!color || typeof color !== 'string') {
    return { valid: false, error: 'Color is required' };
  }

  if (!/^#[0-9A-F]{6}$/i.test(color)) {
    return { valid: false, error: 'Invalid color format' };
  }

  return { valid: true, sanitized: color };
}

// Rate limiting helper - tracks actions per user/IP
class RateLimiter {
  constructor(maxActions, windowMs) {
    this.maxActions = maxActions;
    this.windowMs = windowMs;
    this.actions = new Map(); // key -> [timestamps]
  }

  isAllowed(key) {
    const now = Date.now();
    const userActions = this.actions.get(key) || [];
    
    // Remove old actions outside the window
    const recentActions = userActions.filter(timestamp => now - timestamp < this.windowMs);
    
    if (recentActions.length >= this.maxActions) {
      return false;
    }

    recentActions.push(now);
    this.actions.set(key, recentActions);
    
    return true;
  }

  reset(key) {
    this.actions.delete(key);
  }

  cleanup() {
    const now = Date.now();
    for (const [key, timestamps] of this.actions.entries()) {
      const recentActions = timestamps.filter(timestamp => now - timestamp < this.windowMs);
      if (recentActions.length === 0) {
        this.actions.delete(key);
      } else {
        this.actions.set(key, recentActions);
      }
    }
  }
}

module.exports = {
  sanitizeHTML,
  validateMessage,
  validateUsername,
  validateRoomSlug,
  validateMaxUsers,
  validateFile,
  validatePDFContent,
  validateColor,
  RateLimiter,
  MAX_MESSAGE_LENGTH,
  MAX_USERNAME_LENGTH,
  MAX_ROOM_SLUG_LENGTH,
  MAX_FILE_SIZE,
  ALLOWED_FILE_TYPES,
};
