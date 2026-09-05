# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: collaboration.spec.ts >> brand and creator collaboration >> a brand discovers, invites, and accepts a creator
- Location: tests/browser/collaboration.spec.ts:17:7

# Error details

```
Test timeout of 30000ms exceeded.
```

# Page snapshot

```yaml
- generic [active] [ref=f1e1]:
  - banner [ref=f1e2]:
    - link "P Publiq Publish everywhere" [ref=f1e3] [cursor=pointer]:
      - /url: /
      - generic [ref=f1e4]: P
      - generic [ref=f1e5]:
        - generic [ref=f1e6]: Publiq
        - generic [ref=f1e7]: Publish everywhere
    - navigation [ref=f1e8]:
      - link "Pricing" [ref=f1e9] [cursor=pointer]:
        - /url: /pricing
      - link "Discover" [ref=f1e10] [cursor=pointer]:
        - /url: /discover
      - link "Log in" [ref=f1e11] [cursor=pointer]:
        - /url: /auth/login
      - link "Get started" [ref=f1e12] [cursor=pointer]:
        - /url: /auth/signup
  - generic [ref=f1e14]:
    - generic [ref=f1e15]:
      - generic [ref=f1e16]: Sign Up
      - generic [ref=f1e17]: Create your creator account to get started.
    - generic [ref=f1e19]:
      - generic [ref=f1e20]:
        - generic [ref=f1e21]: Name
        - textbox "Name" [ref=f1e22]:
          - /placeholder: Sipho Ngcobo
      - generic [ref=f1e23]:
        - generic [ref=f1e24]: Email
        - textbox "Email" [ref=f1e25]:
          - /placeholder: siphongcobo@gmail.com
      - generic [ref=f1e26]:
        - generic [ref=f1e27]: Password
        - generic [ref=f1e28]:
          - textbox "Password" [ref=f1e29]
          - button [ref=f1e30]
      - button "Sign Up" [ref=f1e34]
    - paragraph [ref=f1e36]:
      - text: Already have an account?
      - link "Login" [ref=f1e37] [cursor=pointer]:
        - /url: /auth/login
  - region "Notifications alt+T"
```