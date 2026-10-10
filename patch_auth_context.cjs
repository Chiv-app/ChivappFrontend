const fs = require('fs');
let content = fs.readFileSync('src/contexts/auth-context.tsx', 'utf8');

// Add loginOtp import
content = content.replace('loginUser,', 'loginUser, loginOtp,');

// Add to type AuthContextType
content = content.replace('login: (credentials: LoginRequest) => Promise<UserOut>;', 'login: (credentials: LoginRequest) => Promise<UserOut>;\n    loginWithOtp: (email: string, otp: string) => Promise<UserOut>;');

// Add function inside AuthProvider
const loginWithOtpStr = `
    const loginWithOtp = useCallback(async (email: string, otp: string) => {
        const loggedIn = await loginOtp(email, otp);
        setUser(loggedIn);
        return loggedIn;
    }, []);
`;
content = content.replace('const login = useCallback(async (credentials: LoginRequest) => {', loginWithOtpStr + '\n    const login = useCallback(async (credentials: LoginRequest) => {');

// Add to return value
content = content.replace('login,', 'login,\n            loginWithOtp,');
content = content.replace('[user, isLoading, isClient, login, register, logout, refresh]', '[user, isLoading, isClient, login, loginWithOtp, register, logout, refresh]');

fs.writeFileSync('src/contexts/auth-context.tsx', content);
