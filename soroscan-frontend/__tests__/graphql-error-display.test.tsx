/**
 * Tests for the GraphQL error parsing utility and the GraphQLErrorDisplay component.
 *
 * Coverage matrix:
 *   Parser  — validation error, BAD_USER_INPUT, parse/syntax error,
 *             network error, unauthenticated, rate-limited, multiple errors,
 *             unknown/generic errors, field_errors extension, null safety.
 *   Display — inline / banner / toast variants, suggestion text, details expand,
 *             dismiss behaviour, multi-error list, accessible roles & attributes.
 */

import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import {
  parseGraphQLError,
  parseSingleGraphQLError,
  parseGraphQLErrors,
} from "../lib/graphql-error-parser";
import { GraphQLErrorDisplay, GraphQLErrorList } from "../components/ui/GraphQLErrorDisplay";
import type { ApolloError } from "@apollo/client";
import type { GraphQLError } from "graphql";

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Build a minimal GraphQLError-like object. */
function makeGQLError(
  message: string,
  extensions?: Record<string, unknown>,
  path?: string[]
): GraphQLError {
  return {
    message,
    extensions: extensions ?? {},
    path,
    locations: undefined,
    nodes: undefined,
    source: undefined,
    positions: undefined,
    originalError: null,
    name: "GraphQLError",
    [Symbol.toStringTag]: "GraphQLError",
    toJSON: () => ({ message }),
  } as unknown as GraphQLError;
}

/** Build a minimal ApolloError-like object. */
function makeApolloError(
  graphQLErrors: GraphQLError[] = [],
  networkError: Error | null = null
): ApolloError {
  return {
    message: graphQLErrors[0]?.message ?? networkError?.message ?? "Unknown",
    graphQLErrors,
    networkError,
    clientErrors: [],
    protocolErrors: [],
    extraInfo: undefined,
    name: "ApolloError",
  } as unknown as ApolloError;
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 1 — parseGraphQLError (utility)
// ─────────────────────────────────────────────────────────────────────────────

describe("parseGraphQLError — utility", () => {
  describe("authentication errors", () => {
    it("maps UNAUTHENTICATED extension code", () => {
      const err = makeApolloError([
        makeGQLError("Not authenticated", { code: "UNAUTHENTICATED" }),
      ]);
      const parsed = parseGraphQLError(err);
      expect(parsed.code).toBe("UNAUTHENTICATED");
      expect(parsed.message).toMatch(/session has expired/i);
      expect(parsed.suggestion).toMatch(/sign in/i);
    });

    it("maps 401 HTTP network error to UNAUTHENTICATED", () => {
      const netErr = Object.assign(new Error("Unauthorized"), { statusCode: 401 });
      const err = makeApolloError([], netErr);
      const parsed = parseGraphQLError(err);
      expect(parsed.code).toBe("UNAUTHENTICATED");
    });
  });

  describe("authorisation errors", () => {
    it("maps FORBIDDEN extension code", () => {
      const err = makeApolloError([
        makeGQLError("Access denied", { code: "FORBIDDEN" }),
      ]);
      const parsed = parseGraphQLError(err);
      expect(parsed.code).toBe("FORBIDDEN");
      expect(parsed.message).toMatch(/permission/i);
      expect(parsed.suggestion).toMatch(/administrator/i);
    });

    it("maps 403 HTTP network error to FORBIDDEN", () => {
      const netErr = Object.assign(new Error("Forbidden"), { statusCode: 403 });
      const err = makeApolloError([], netErr);
      const parsed = parseGraphQLError(err);
      expect(parsed.code).toBe("FORBIDDEN");
    });

    it("uses message heuristic for permission denied", () => {
      const err = makeApolloError([
        makeGQLError("You do not have permission denied to perform this action"),
      ]);
      const parsed = parseGraphQLError(err);
      expect(parsed.code).toBe("FORBIDDEN");
    });
  });

  describe("validation / bad input errors", () => {
    it("maps BAD_USER_INPUT extension code", () => {
      const err = makeApolloError([
        makeGQLError("Bad input", { code: "BAD_USER_INPUT" }),
      ]);
      const parsed = parseGraphQLError(err);
      expect(parsed.code).toBe("BAD_USER_INPUT");
      expect(parsed.message).toMatch(/invalid data/i);
      expect(parsed.suggestion).toMatch(/highlighted fields/i);
    });

    it("maps VALIDATION_FAILED extension code", () => {
      const err = makeApolloError([
        makeGQLError("Validation failed", { code: "VALIDATION_FAILED" }),
      ]);
      const parsed = parseGraphQLError(err);
      expect(parsed.code).toBe("VALIDATION_FAILED");
      expect(parsed.message).toMatch(/validation/i);
    });

    it("extracts field_errors from extensions into details", () => {
      const err = makeApolloError([
        makeGQLError("Validation failed", {
          code: "BAD_USER_INPUT",
          field_errors: {
            email: ["Enter a valid email address."],
            password: ["This field may not be blank."],
          },
        }),
      ]);
      const parsed = parseGraphQLError(err);
      expect(parsed.details).toContain("email");
      expect(parsed.details).toContain("password");
    });

    it("uses message heuristic for 'invalid' keyword", () => {
      const err = makeApolloError([
        makeGQLError("Field 'email' is an invalid type"),
      ]);
      const parsed = parseGraphQLError(err);
      expect(parsed.code).toBe("VALIDATION_FAILED");
    });

    it("uses message heuristic for 'required' keyword", () => {
      const err = makeApolloError([
        makeGQLError("contractId is required"),
      ]);
      const parsed = parseGraphQLError(err);
      expect(parsed.code).toBe("VALIDATION_FAILED");
    });
  });

  describe("parse / syntax errors", () => {
    it("maps GRAPHQL_PARSE_FAILED extension code", () => {
      const err = makeApolloError([
        makeGQLError("Syntax error", { code: "GRAPHQL_PARSE_FAILED" }),
      ]);
      const parsed = parseGraphQLError(err);
      expect(parsed.code).toBe("PARSE_FAILED");
      expect(parsed.message).toMatch(/could not understand/i);
      expect(parsed.suggestion).toMatch(/report/i);
    });

    it("uses message heuristic for 'syntax' keyword", () => {
      const err = makeApolloError([
        makeGQLError("Unexpected syntax near token"),
      ]);
      const parsed = parseGraphQLError(err);
      expect(parsed.code).toBe("PARSE_FAILED");
    });
  });

  describe("network errors", () => {
    it("maps a generic network error", () => {
      const netErr = new Error("Failed to fetch");
      const err = makeApolloError([], netErr);
      const parsed = parseGraphQLError(err);
      expect(parsed.code).toBe("NETWORK_ERROR");
      expect(parsed.message).toMatch(/could not reach/i);
      expect(parsed.suggestion).toMatch(/internet connection/i);
    });

    it("maps 500 HTTP error to INTERNAL_SERVER_ERROR", () => {
      const netErr = Object.assign(new Error("Server Error"), { statusCode: 500 });
      const err = makeApolloError([], netErr);
      const parsed = parseGraphQLError(err);
      expect(parsed.code).toBe("INTERNAL_SERVER_ERROR");
      expect(parsed.message).toMatch(/unexpected server error/i);
    });

    it("maps 429 HTTP error to RATE_LIMITED", () => {
      const netErr = Object.assign(new Error("Too Many Requests"), { statusCode: 429 });
      const err = makeApolloError([], netErr);
      const parsed = parseGraphQLError(err);
      expect(parsed.code).toBe("RATE_LIMITED");
      expect(parsed.suggestion).toMatch(/wait/i);
    });

    it("maps plain Error with 'fetch' in message to NETWORK_ERROR", () => {
      const parsed = parseGraphQLError(new Error("fetch error: network unreachable"));
      expect(parsed.code).toBe("NETWORK_ERROR");
    });
  });

  describe("multiple GraphQL errors", () => {
    it("returns the first error's code and combines all details", () => {
      const err = makeApolloError([
        makeGQLError("Email invalid", { code: "BAD_USER_INPUT", field_errors: { email: ["Bad email"] } }),
        makeGQLError("Password too short", { code: "BAD_USER_INPUT", field_errors: { password: ["Min 8 chars"] } }),
      ]);
      const parsed = parseGraphQLError(err);
      expect(parsed.code).toBe("BAD_USER_INPUT");
      // details should contain info from both errors
      expect(parsed.details).toContain("email");
      expect(parsed.details).toContain("password");
    });
  });

  describe("parseGraphQLErrors — array variant", () => {
    it("returns an empty array for an empty input", () => {
      expect(parseGraphQLErrors([])).toEqual([]);
    });

    it("parses each error individually", () => {
      const errors = [
        makeGQLError("Invalid email", { code: "VALIDATION_FAILED" }),
        makeGQLError("Server blew up", { code: "INTERNAL_SERVER_ERROR" }),
      ];
      const results = parseGraphQLErrors(errors);
      expect(results).toHaveLength(2);
      expect(results[0].code).toBe("VALIDATION_FAILED");
      expect(results[1].code).toBe("INTERNAL_SERVER_ERROR");
    });
  });

  describe("unknown / generic errors", () => {
    it("returns a safe fallback for null", () => {
      const parsed = parseGraphQLError(null);
      expect(parsed.code).toBe("UNKNOWN");
      expect(parsed.message).toBeTruthy();
      expect(parsed.suggestion).toBeTruthy();
    });

    it("returns a safe fallback for undefined", () => {
      const parsed = parseGraphQLError(undefined);
      expect(parsed.code).toBe("UNKNOWN");
    });

    it("returns a safe fallback for an empty ApolloError", () => {
      const err = makeApolloError([], null);
      const parsed = parseGraphQLError(err);
      expect(parsed.code).toBe("UNKNOWN");
      expect(parsed.message).toMatch(/try again/i);
    });

    it("never throws — handles arbitrary objects gracefully", () => {
      expect(() => parseGraphQLError({ weird: true })).not.toThrow();
      expect(() => parseGraphQLError("string error")).not.toThrow();
      expect(() => parseGraphQLError(42)).not.toThrow();
    });
  });

  describe("path context in details", () => {
    it("surfaces field path when no field_errors extension is present", () => {
      const err = makeGQLError("Value too long", {}, ["updateProfile", "bio"]);
      const parsed = parseSingleGraphQLError(err);
      expect(parsed.details).toContain("updateProfile");
      expect(parsed.details).toContain("bio");
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 2 — GraphQLErrorDisplay (component)
// ─────────────────────────────────────────────────────────────────────────────

describe("GraphQLErrorDisplay — component", () => {
  const validationError = {
    code: "VALIDATION_FAILED" as const,
    message: "Your request failed validation.",
    suggestion: "Check that all required fields are filled in.",
    details: "email: Enter a valid email · password: This field is required",
  };

  const networkError = {
    code: "NETWORK_ERROR" as const,
    message: "Could not reach the server.",
    suggestion: "Check your internet connection and try again.",
  };

  const unknownError = {
    code: "UNKNOWN" as const,
    message: "Something went wrong. Please try again.",
    suggestion: "If the issue continues, contact support.",
  };

  describe("rendering", () => {
    it("renders the error message", () => {
      render(<GraphQLErrorDisplay error={validationError} />);
      expect(screen.getByTestId("graphql-error-display-message")).toHaveTextContent(
        "Your request failed validation."
      );
    });

    it("renders the actionable suggestion", () => {
      render(<GraphQLErrorDisplay error={validationError} />);
      expect(screen.getByTestId("graphql-error-display-suggestion")).toHaveTextContent(
        "Check that all required fields are filled in."
      );
    });

    it("renders nothing when error is null", () => {
      const { container } = render(<GraphQLErrorDisplay error={null} />);
      expect(container).toBeEmptyDOMElement();
    });

    it("renders nothing when error is undefined", () => {
      const { container } = render(<GraphQLErrorDisplay error={undefined} />);
      expect(container).toBeEmptyDOMElement();
    });

    it("renders the UNKNOWN fallback safely", () => {
      render(<GraphQLErrorDisplay error={unknownError} />);
      expect(screen.getByTestId("graphql-error-display-message")).toHaveTextContent(
        "Something went wrong. Please try again."
      );
      expect(screen.getByTestId("graphql-error-display-suggestion")).toHaveTextContent(
        "contact support"
      );
    });

    it("renders a network error with correct message and suggestion", () => {
      render(<GraphQLErrorDisplay error={networkError} />);
      expect(screen.getByTestId("graphql-error-display-message")).toHaveTextContent(
        "Could not reach the server."
      );
      expect(screen.getByTestId("graphql-error-display-suggestion")).toHaveTextContent(
        "internet connection"
      );
    });
  });

  describe("accessibility", () => {
    it("has role=alert", () => {
      render(<GraphQLErrorDisplay error={validationError} />);
      expect(screen.getByRole("alert")).toBeInTheDocument();
    });

    it("has aria-live=assertive", () => {
      render(<GraphQLErrorDisplay error={validationError} />);
      expect(screen.getByRole("alert")).toHaveAttribute("aria-live", "assertive");
    });

    it("exposes data-error-code attribute for test targeting", () => {
      render(<GraphQLErrorDisplay error={validationError} />);
      expect(screen.getByTestId("graphql-error-display")).toHaveAttribute(
        "data-error-code",
        "VALIDATION_FAILED"
      );
    });
  });

  describe("variants", () => {
    it.each(["inline", "banner", "toast"] as const)(
      'renders the "%s" variant without crashing',
      (variant) => {
        render(<GraphQLErrorDisplay error={networkError} variant={variant} />);
        expect(screen.getByRole("alert")).toBeInTheDocument();
      }
    );
  });

  describe("details expand/collapse", () => {
    it("shows a 'Show details' toggle when details are present", () => {
      render(<GraphQLErrorDisplay error={validationError} />);
      expect(screen.getByRole("button", { name: /show details/i })).toBeInTheDocument();
    });

    it("expands details when toggle is clicked", () => {
      render(<GraphQLErrorDisplay error={validationError} />);
      const toggle = screen.getByRole("button", { name: /show details/i });
      fireEvent.click(toggle);
      expect(screen.getByTestId("graphql-error-display-details")).toHaveTextContent(
        "email"
      );
    });

    it("collapses details on second click", () => {
      render(<GraphQLErrorDisplay error={validationError} />);
      const toggle = screen.getByRole("button", { name: /show details/i });
      fireEvent.click(toggle);
      fireEvent.click(screen.getByRole("button", { name: /hide details/i }));
      expect(screen.queryByTestId("graphql-error-display-details")).not.toBeInTheDocument();
    });

    it("does not show details toggle when details are absent", () => {
      render(<GraphQLErrorDisplay error={networkError} />);
      expect(screen.queryByRole("button", { name: /details/i })).not.toBeInTheDocument();
    });

    it("hides details section when showDetails=false", () => {
      render(<GraphQLErrorDisplay error={validationError} showDetails={false} />);
      expect(screen.queryByRole("button", { name: /details/i })).not.toBeInTheDocument();
    });
  });

  describe("dismiss behaviour", () => {
    it("shows a dismiss button when dismissible=true", () => {
      render(<GraphQLErrorDisplay error={validationError} dismissible />);
      expect(screen.getByLabelText("Dismiss error")).toBeInTheDocument();
    });

    it("removes the error from the DOM after dismissal", () => {
      render(<GraphQLErrorDisplay error={validationError} dismissible />);
      fireEvent.click(screen.getByLabelText("Dismiss error"));
      expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    });

    it("calls onDismiss callback when dismiss button is clicked", () => {
      const onDismiss = jest.fn();
      render(<GraphQLErrorDisplay error={validationError} onDismiss={onDismiss} />);
      fireEvent.click(screen.getByLabelText("Dismiss error"));
      expect(onDismiss).toHaveBeenCalledTimes(1);
    });

    it("does not show dismiss button by default", () => {
      render(<GraphQLErrorDisplay error={validationError} />);
      expect(screen.queryByLabelText("Dismiss error")).not.toBeInTheDocument();
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 3 — GraphQLErrorList (multi-error component)
// ─────────────────────────────────────────────────────────────────────────────

describe("GraphQLErrorList — component", () => {
  const errors = [
    {
      code: "VALIDATION_FAILED" as const,
      message: "Email is invalid.",
      suggestion: "Enter a valid email address.",
    },
    {
      code: "VALIDATION_FAILED" as const,
      message: "Password is too short.",
      suggestion: "Use at least 8 characters.",
    },
  ];

  it("renders all errors", () => {
    render(<GraphQLErrorList errors={errors} />);
    expect(screen.getByText("Email is invalid.")).toBeInTheDocument();
    expect(screen.getByText("Password is too short.")).toBeInTheDocument();
  });

  it("renders nothing for an empty array", () => {
    const { container } = render(<GraphQLErrorList errors={[]} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("renders a dismiss button for each item when dismissible=true", () => {
    render(<GraphQLErrorList errors={errors} dismissible />);
    const buttons = screen.getAllByLabelText("Dismiss error");
    expect(buttons).toHaveLength(2);
  });

  it("removes an individual error after dismissal", () => {
    render(<GraphQLErrorList errors={errors} dismissible />);
    const buttons = screen.getAllByLabelText("Dismiss error");
    fireEvent.click(buttons[0]);
    expect(screen.queryByText("Email is invalid.")).not.toBeInTheDocument();
    expect(screen.getByText("Password is too short.")).toBeInTheDocument();
  });

  it("disappears entirely when all errors are dismissed", () => {
    render(<GraphQLErrorList errors={[errors[0]]} dismissible />);
    fireEvent.click(screen.getByLabelText("Dismiss error"));
    expect(screen.queryByTestId("graphql-error-list")).not.toBeInTheDocument();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 4 — End-to-end: parse + render
// ─────────────────────────────────────────────────────────────────────────────

describe("Parse → render integration", () => {
  it("validation error renders user-friendly message and suggestion", () => {
    const apolloErr = makeApolloError([
      makeGQLError("Validation failed", {
        code: "VALIDATION_FAILED",
        field_errors: { email: ["Enter a valid email address."] },
      }),
    ]);
    const parsed = parseGraphQLError(apolloErr);
    render(<GraphQLErrorDisplay error={parsed} />);

    expect(screen.getByTestId("graphql-error-display-message")).toHaveTextContent(
      "failed validation"
    );
    expect(screen.getByTestId("graphql-error-display-suggestion")).toBeInTheDocument();
    // Details should be toggleable
    fireEvent.click(screen.getByRole("button", { name: /show details/i }));
    expect(screen.getByTestId("graphql-error-display-details")).toHaveTextContent("email");
  });

  it("parse/syntax error renders correct copy", () => {
    const apolloErr = makeApolloError([
      makeGQLError("Syntax error: unexpected token", { code: "GRAPHQL_PARSE_FAILED" }),
    ]);
    const parsed = parseGraphQLError(apolloErr);
    render(<GraphQLErrorDisplay error={parsed} />);

    expect(screen.getByTestId("graphql-error-display-message")).toHaveTextContent(
      "could not understand"
    );
    expect(screen.getByTestId("graphql-error-display-suggestion")).toHaveTextContent(
      "report"
    );
  });

  it("network error renders correct copy", () => {
    const netErr = new Error("Failed to fetch");
    const apolloErr = makeApolloError([], netErr);
    const parsed = parseGraphQLError(apolloErr);
    render(<GraphQLErrorDisplay error={parsed} />);

    expect(screen.getByTestId("graphql-error-display-message")).toHaveTextContent(
      "Could not reach"
    );
    expect(screen.getByTestId("graphql-error-display-suggestion")).toHaveTextContent(
      "internet connection"
    );
  });

  it("unknown error renders safe fallback", () => {
    const parsed = parseGraphQLError(null);
    render(<GraphQLErrorDisplay error={parsed} />);

    expect(screen.getByTestId("graphql-error-display-message")).toHaveTextContent(
      "Something went wrong"
    );
    expect(screen.getByTestId("graphql-error-display-suggestion")).toHaveTextContent(
      "contact support"
    );
  });
});
