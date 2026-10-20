import React from "react"
import { render, screen } from "@testing-library/react"
import BillingOverview from "../BillingOverview"

describe("BillingOverview", () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it("renders default Free plan and None payment method", () => {
    render(<BillingOverview />)

    expect(screen.getByText("Billing Overview")).toBeInTheDocument()
    expect(screen.getByText("Plan: Free")).toBeInTheDocument()
    expect(screen.getByText("Payment: None")).toBeInTheDocument()
  })

  it("renders custom plan and payment method from localStorage", () => {
    localStorage.setItem(
      "billing_info",
      JSON.stringify({ plan: "Enterprise Pro", paymentMethod: "Stripe Card (**** 4242)" })
    )

    render(<BillingOverview />)

    expect(screen.getByText("Plan: Enterprise Pro")).toBeInTheDocument()
    expect(screen.getByText("Payment: Stripe Card (**** 4242)")).toBeInTheDocument()
  })
})
