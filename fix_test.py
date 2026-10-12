import os

p = "src/components/auth/login-form.test.tsx"
if os.path.exists(p):
    c = open(p, encoding='utf-8').read()
    
    # We must mock loginStepOne to return "requires_password"
    # because that's what makes the Contraseña input show up.
    
    mock_str = """
    it("submits the entered credentials to loginUser", async () => {
        const { loginUser, loginStepOne } = await import("@/lib/auth");
        vi.mocked(loginStepOne).mockResolvedValue({ status: "requires_password" } as any);
        vi.mocked(loginUser).mockResolvedValue({
"""
    c = c.replace(
        'it("submits the entered credentials to loginUser", async () => {\n        const { loginUser } = await import("@/lib/auth");\n        vi.mocked(loginUser).mockResolvedValue({',
        mock_str
    )

    mock_str2 = """
    it("shows a specific message when the email is already taken", async () => {
        const { loginUser, loginStepOne } = await import("@/lib/auth");
        vi.mocked(loginStepOne).mockResolvedValue({ status: "requires_password" } as any);
        vi.mocked(loginUser).mockRejectedValue(
"""
    c = c.replace(
        'it("shows a specific message when the email is already taken", async () => {\n        const { loginUser } = await import("@/lib/auth");\n        vi.mocked(loginUser).mockRejectedValue(',
        mock_str2
    )

    mock_str3 = """
    it("shows the backend's raw message for other login errors", async () => {
        const { loginUser, loginStepOne } = await import("@/lib/auth");
        vi.mocked(loginStepOne).mockResolvedValue({ status: "requires_password" } as any);
        vi.mocked(loginUser).mockRejectedValue(
"""
    c = c.replace(
        'it("shows the backend\'s raw message for other login errors", async () => {\n        const { loginUser } = await import("@/lib/auth");\n        vi.mocked(loginUser).mockRejectedValue(',
        mock_str3
    )

    # Need to add loginStepOne to the global vi.mock("@/lib/auth")
    if 'loginStepOne: vi.fn()' not in c:
        c = c.replace('loginUser: vi.fn(),', 'loginStepOne: vi.fn(),\n    loginUser: vi.fn(),')
        
    open(p, 'w', encoding='utf-8').write(c)
    print("done")
