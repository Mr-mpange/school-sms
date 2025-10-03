// Sequelize-based authentication service
// Note: This uses server-side database operations

// Note: In a real application, these imports would need to be handled differently
// since Sequelize models are typically server-side only
// For this demo, we'll create a simplified version that works with the existing structure

interface LoginCredentials {
  email: string;
  password: string;
}

interface RegisterData {
  email: string;
  password: string;
  fullName: string;
  schoolName: string;
}

interface Admin {
  id: string;
  email: string;
  full_name: string;
  school_name: string;
  password_hash?: string;
  created_at: string;
  updated_at: string;
}

interface Session {
  id: string;
  admin_id: string;
  token: string;
  expires_at: string;
  created_at: string;
}

// Generate UUID using crypto.randomUUID() (available in modern browsers)
function generateUUID(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // Fallback for older browsers
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}
class AuthService {
  private static instance: AuthService;

  constructor() {
    // Initialize database connection if needed
    this.initializeDatabase();
  }

  public static getInstance(): AuthService {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService();
    }
    return AuthService.instance;
  }

  private async initializeDatabase(): Promise<void> {
    // For demo purposes, we'll continue using localStorage
    // In a real application, this would initialize Sequelize connection
    console.log('AuthService initialized');
  }

  async register(registerData: RegisterData): Promise<{ success: boolean; message: string; admin?: Admin }> {
    try {
      const { email, password, fullName, schoolName } = registerData;

      // For demo purposes, using localStorage
      const storedAdmins = localStorage.getItem('sms_admins');
      let admins: Admin[] = storedAdmins ? JSON.parse(storedAdmins) : [];

      // Check if user already exists
      const existingAdmin = admins.find(admin => admin.email === email);

      if (existingAdmin) {
        return { success: false, message: 'User with this email already exists' };
      }

      // Hash password (client-side demo)
      const passwordHash = await this.hashPassword(password);

      // Generate UUID for admin ID
      const adminId = generateUUID();

      // Create new admin
      const newAdmin: Admin = {
        id: adminId,
        email,
        password_hash: passwordHash,
        full_name: fullName,
        school_name: schoolName,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      admins.push(newAdmin);
      localStorage.setItem('sms_admins', JSON.stringify(admins));

      // Return admin data without password hash
      const { password_hash, ...adminWithoutPassword } = newAdmin;

      return {
        success: true,
        message: 'Account created successfully',
        admin: adminWithoutPassword
      };
    } catch (error) {
      console.error('Registration error:', error);
      return { success: false, message: 'Failed to create account. Please try again.' };
    }
  }

  async login(credentials: LoginCredentials): Promise<{ success: boolean; message: string; admin?: Admin; session?: Session }> {
    try {
      const { email, password } = credentials;

      // For demo purposes, using localStorage
      const storedAdmins = localStorage.getItem('sms_admins');
      if (!storedAdmins) {
        return { success: false, message: 'No users found. Please register first.' };
      }

      const admins: Admin[] = JSON.parse(storedAdmins);
      const admin = admins.find(a => a.email === email);

      if (!admin) {
        return { success: false, message: 'Invalid email or password' };
      }

      // Verify password
      const isPasswordValid = await this.verifyPassword(password, admin.password_hash);

      if (!isPasswordValid) {
        return { success: false, message: 'Invalid email or password' };
      }

      // Create session
      const sessionId = generateUUID();
      const sessionToken = generateUUID();
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 24); // 24 hours from now

      const newSession: Session = {
        id: sessionId,
        admin_id: admin.id,
        token: sessionToken,
        expires_at: expiresAt.toISOString(),
        created_at: new Date().toISOString()
      };

      // Store session
      const storedSessions = localStorage.getItem('sms_sessions');
      let sessions: Session[] = storedSessions ? JSON.parse(storedSessions) : [];
      sessions.push(newSession);
      localStorage.setItem('sms_sessions', JSON.stringify(sessions));

      // Return admin data without password hash
      const { password_hash, ...adminWithoutPassword } = admin;

      return {
        success: true,
        message: 'Login successful',
        admin: adminWithoutPassword,
        session: newSession
      };
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, message: 'Login failed. Please try again.' };
    }
  }

  async logout(sessionToken: string): Promise<{ success: boolean; message: string }> {
    try {
      // Remove session from localStorage
      const storedSessions = localStorage.getItem('sms_sessions');
      if (storedSessions) {
        let sessions: Session[] = JSON.parse(storedSessions);
        sessions = sessions.filter(session => session.token !== sessionToken);
        localStorage.setItem('sms_sessions', JSON.stringify(sessions));
      }

      return { success: true, message: 'Logout successful' };
    } catch (error) {
      console.error('Logout error:', error);
      return { success: false, message: 'Logout failed. Please try again.' };
    }
  }

  async validateSession(sessionToken: string): Promise<{ valid: boolean; admin?: Admin }> {
    try {
      // Get session by token
      const storedSessions = localStorage.getItem('sms_sessions');
      if (!storedSessions) {
        return { valid: false };
      }

      const sessions: Session[] = JSON.parse(storedSessions);
      const session = sessions.find(s => s.token === sessionToken);

      if (!session) {
        return { valid: false };
      }

      // Check if session is expired
      const expiresAt = new Date(session.expires_at);
      if (expiresAt < new Date()) {
        // Remove expired session
        const updatedSessions = sessions.filter(s => s.id !== session.id);
        localStorage.setItem('sms_sessions', JSON.stringify(updatedSessions));
        return { valid: false };
      }

      // Get admin data
      const storedAdmins = localStorage.getItem('sms_admins');
      if (!storedAdmins) {
        return { valid: false };
      }

      const admins: Admin[] = JSON.parse(storedAdmins);
      const admin = admins.find(a => a.id === session.admin_id);

      if (!admin) {
        return { valid: false };
      }

      return { valid: true, admin };
    } catch (error) {
      console.error('Session validation error:', error);
      return { valid: false };
    }
  }

  async getAdminById(adminId: string): Promise<Admin | null> {
    try {
      const storedAdmins = localStorage.getItem('sms_admins');
      if (!storedAdmins) {
        return null;
      }

      const admins: Admin[] = JSON.parse(storedAdmins);
      const admin = admins.find(a => a.id === adminId);
      return admin || null;
    } catch (error) {
      console.error('Get admin error:', error);
      return null;
    }
  }

  // Demo method to create a default admin account
  async createDefaultAdmin(): Promise<void> {
    const defaultAdmin: RegisterData = {
      email: 'admin@school.com',
      password: 'password123',
      fullName: 'School Administrator',
      schoolName: 'Demo School'
    };

    const storedAdmins = localStorage.getItem('sms_admins');
    let admins: Admin[] = storedAdmins ? JSON.parse(storedAdmins) : [];

    const existingAdmin = admins.find(admin => admin.email === defaultAdmin.email);
    if (!existingAdmin) {
      const result = await this.register(defaultAdmin);
      if (result.success) {
        console.log('Default admin account created');
      }
    }
  }

  // Helper methods for password hashing (client-side demo)
  private async hashPassword(password: string): Promise<string> {
    // For demo purposes, using a simple hash
    // In production, this should use proper bcrypt
    const encoder = new TextEncoder();
    const data = encoder.encode(password + 'salt');
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  private async verifyPassword(password: string, hash: string): Promise<boolean> {
    const hashedPassword = await this.hashPassword(password);
    return hashedPassword === hash;
  }
}

// Export singleton instance
export const authService = new AuthService();
export default AuthService;
