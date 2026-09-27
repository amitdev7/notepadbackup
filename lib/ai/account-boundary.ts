// ---------------------------------------------------------------------------
// Zenith AI — Account Security Boundary & Safe Guidance
// ---------------------------------------------------------------------------

export interface AccountCheckResult {
  isRestrictedAccountAction: boolean
  category?: "password" | "recovery_codes" | "profile" | "delete_account" | "api_key" | "permissions"
  safeGuidanceMessage?: string
}

export class AccountSecurityBoundary {
  /**
   * Evaluates user input for restricted account operations.
   * If detected, returns an authoritative, helpful step-by-step guidance message.
   * The AI NEVER directly mutates account credentials, passwords, or recovery codes.
   */
  static checkRequest(input: string): AccountCheckResult {
    const text = input.toLowerCase().trim()

    // 1. Password change / reset
    if (
      text.includes("change my password") ||
      text.includes("change password") ||
      text.includes("reset password") ||
      text.includes("new password") ||
      text.includes("update password") ||
      text.includes("forgot password")
    ) {
      return {
        isRestrictedAccountAction: true,
        category: "password",
        safeGuidanceMessage: `### 🔒 Account Security: Password Management

To protect your workspace and cryptographic keys, **Zenith AI cannot directly modify passwords or authentication secrets**.

**To update your password:**
1. Click your **User Avatar** in the top-right corner of Zenithsui.
2. Select **Account Settings**.
3. Go to the **Security & Password** tab.
4. Enter your current password and your new secure password.
5. Click **Save Password**.`,
      }
    }

    // 2. Recovery codes / 2FA secrets
    if (
      text.includes("recovery code") ||
      text.includes("recovery codes") ||
      text.includes("2fa backup") ||
      text.includes("backup codes") ||
      text.includes("show my recovery")
    ) {
      return {
        isRestrictedAccountAction: true,
        category: "recovery_codes",
        safeGuidanceMessage: `### 🛡️ Account Security: Recovery Codes

**Zenith AI is strictly prohibited from viewing or generating account recovery codes.** Recovery codes provide emergency access to your vault and must remain exclusively in your possession.

**To access or regenerate your recovery codes:**
1. Click your **User Avatar** in the top-right corner.
2. Choose **Account Settings**.
3. Select the **Recovery Codes** tab.
4. Verify your master password to reveal or generate a fresh set of emergency recovery codes.
5. Store them offline in a safe password vault.`,
      }
    }

    // 3. Profile details (name, email, avatar)
    if (
      text.includes("update my profile") ||
      text.includes("change my email") ||
      text.includes("change email") ||
      text.includes("change my username") ||
      text.includes("edit profile")
    ) {
      return {
        isRestrictedAccountAction: true,
        category: "profile",
        safeGuidanceMessage: `### 👤 Account Profile Management

**Zenith AI cannot alter your personal identity or account email directly.**

**To update your profile:**
1. Click your **User Avatar** in the top-right header.
2. Select **Account Settings**.
3. In the **Profile** tab, you can update your Display Name, Email Address, and Avatar.
4. Click **Save Changes** to commit your updates.`,
      }
    }

    // 4. Delete account
    if (
      text.includes("delete my account") ||
      text.includes("close my account") ||
      text.includes("delete account")
    ) {
      return {
        isRestrictedAccountAction: true,
        category: "delete_account",
        safeGuidanceMessage: `### ⚠️ Account Termination

Account deletion permanently purges your private documents, BYOK encryption keys, and team associations. **Zenith AI cannot execute account deletion.**

**To delete your account manually:**
1. Open the **User Avatar** menu in the top-right corner.
2. Open **Account Settings**.
3. Scroll to the **Danger Zone** section at the bottom.
4. Click **Delete Account** and confirm by entering your account password.`,
      }
    }

    // 5. Raw API credential retrieval
    if (
      text.includes("reveal my api key") ||
      text.includes("show my api key") ||
      text.includes("what is my groq key") ||
      text.includes("what is my openai key") ||
      text.includes("what is my gemini key") ||
      text.includes("give me my secret key")
    ) {
      return {
        isRestrictedAccountAction: true,
        category: "api_key",
        safeGuidanceMessage: `### 🔐 Secret Protection Policy

**Zenith AI will never reveal raw API keys or decryption tokens.** All provider credentials in Zenithsui are securely hashed and stored in your private vault with server-side masking.

To manage, rotate, or replace your AI keys, click the **Gear icon (⚙️)** at the top of the Zenith AI panel to open **AI Provider Settings**.`,
      }
    }

    // 6. Privilege escalation / admin impersonation
    if (
      text.includes("make me admin") ||
      text.includes("give me admin") ||
      text.includes("escalate privileges") ||
      text.includes("bypass permission")
    ) {
      return {
        isRestrictedAccountAction: true,
        category: "permissions",
        safeGuidanceMessage: `### 🛡️ Workspace Permissions Notice

Workspace roles (**Owner**, **Editor**, **Viewer**) are strictly enforced by Zenithsui Role-Based Access Control (RBAC). Zenith AI cannot modify your permission role.

To request role changes, contact the document owner or team administrator via **Team Settings** or the **Share** modal.`,
      }
    }

    return { isRestrictedAccountAction: false }
  }
}
