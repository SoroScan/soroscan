import React from "react"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import "@testing-library/jest-dom"

const mockLogin = jest.fn()
const mockReplace = jest.fn()
const mockRefresh = jest.fn()
const mockSetTokens = jest.fn()

jest.mock("@apollo/client", () => ({
  gql: (strings: TemplateStringsArray) => strings.join(""),
  useMutation: () => [mockLogin],
}))

jest.mock("next/navigation", () => ({
  useRouter: () => ({ replace: mockReplace, refresh: mockRefresh }),
  useSearchParams: () => new URLSearchParams("callbackUrl=/admin"),
}))

jest.mock("@/lib/auth", () => ({
  setTokens: (...args: unknown[]) => mockSetTokens(...args),
}))

import LoginPage from "@/app/login/page"

const env = process.env as Record<string, string | undefined>
const originalNodeEnv = env.NODE_ENV

function getFields() {
  return {
    email: screen.getByTestId("login-email"),
    password: screen.getByTestId("login-password"),
    submit: screen.getByTestId("login-submit"),
  }
}

describe("Admin Login page", () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  afterEach(() => {
    env.NODE_ENV = originalNodeEnv
  })

  it("renders the email and password inputs and the submit button", () => {
    render(<LoginPage />)
    const { email, password, submit } = getFields()

    expect(email).toHaveAttribute("type", "email")
    expect(password).toHaveAttribute("type", "password")
    expect(screen.getByLabelText("USER_EMAIL")).toBe(email)
    expect(screen.getByLabelText("ACCESS_PASSWORD")).toBe(password)
    expect(submit).toHaveTextContent("> SIGN_IN")
  })

  it("shows required errors and skips the mutation when submitted empty", async () => {
    const user = userEvent.setup()
    render(<LoginPage />)

    await user.click(getFields().submit)

    expect(await screen.findByText("EMAIL_REQUIRED")).toBeInTheDocument()
    expect(screen.getByText("PASSWORD_REQUIRED")).toBeInTheDocument()
    expect(mockLogin).not.toHaveBeenCalled()
  })

  it("rejects a malformed email and a short password", async () => {
    const user = userEvent.setup()
    render(<LoginPage />)
    const { email, password, submit } = getFields()

    await user.type(email, "not-an-email")
    await user.type(password, "short")
    await user.click(submit)

    expect(await screen.findByText("INVALID_EMAIL_FORMAT")).toBeInTheDocument()
    expect(screen.getByText("PASSWORD_MIN_8_CHARACTERS")).toBeInTheDocument()
    expect(mockLogin).not.toHaveBeenCalled()
  })

  it("calls the login mutation with the entered credentials and redirects on success", async () => {
    mockLogin.mockResolvedValue({
      data: {
        login: {
          access: "access-token",
          refresh: "refresh-token",
          user: { id: "1", email: "operator@soroscan.io" },
        },
      },
    })
    const user = userEvent.setup()
    render(<LoginPage />)
    const { email, password, submit } = getFields()

    await user.type(email, "operator@soroscan.io")
    await user.type(password, "correct-horse")
    await user.click(submit)

    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith("/admin"))
    expect(mockLogin).toHaveBeenCalledWith({
      variables: { email: "operator@soroscan.io", password: "correct-horse" },
    })
    expect(mockSetTokens).toHaveBeenCalledWith({
      access: "access-token",
      refresh: "refresh-token",
    })
  })

  it("displays an error message for invalid credentials", async () => {
    // The dev auth fallback is disabled only in production builds.
    env.NODE_ENV = "production"
    mockLogin.mockRejectedValue(new Error("Invalid credentials"))
    const user = userEvent.setup()
    render(<LoginPage />)
    const { email, password, submit } = getFields()

    await user.type(email, "operator@soroscan.io")
    await user.type(password, "wrong-password")
    await user.click(submit)

    expect(
      await screen.findByText("ERROR: INVALID_CREDENTIALS")
    ).toBeInTheDocument()
    expect(mockLogin).toHaveBeenCalledTimes(1)
    expect(mockSetTokens).not.toHaveBeenCalled()
    expect(mockReplace).not.toHaveBeenCalled()
  })

  it("displays AUTHENTICATION_FAILED when the mutation returns no login payload", async () => {
    env.NODE_ENV = "production"
    mockLogin.mockResolvedValue({ data: { login: null } })
    const user = userEvent.setup()
    render(<LoginPage />)
    const { email, password, submit } = getFields()

    await user.type(email, "operator@soroscan.io")
    await user.type(password, "wrong-password")
    await user.click(submit)

    expect(
      await screen.findByText("ERROR: AUTHENTICATION_FAILED")
    ).toBeInTheDocument()
    expect(mockReplace).not.toHaveBeenCalled()
  })
})
