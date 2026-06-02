import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { EventRateMeter } from "./EventRateMeter";

describe("EventRateMeter Component", () => {
  describe("Rendering", () => {
    it("renders the component with initial rate", () => {
      render(
        <EventRateMeter
          contractId="CAQAA5L65"
          currentRate={25.5}
        />
      );

      expect(screen.getByText("Event Rate Meter")).toBeInTheDocument();
      expect(screen.getByText("events/second")).toBeInTheDocument();
    });

    it("displays the contract ID", () => {
      const contractId = "CAQAA5L65OQAPZNXN2HBV5Q4XBEOFYV2CKOL6MYGMTQTTMSTKUQN3Y4";
      render(
        <EventRateMeter
          contractId={contractId}
          currentRate={0}
        />
      );

      expect(screen.getByText(contractId)).toBeInTheDocument();
    });

    it("renders healthy status for normal rates", () => {
      render(
        <EventRateMeter
          contractId="test-contract"
          currentRate={50}
          threshold={{ warning: 100, critical: 500 }}
        />
      );

      expect(screen.getByText("HEALTHY")).toBeInTheDocument();
    });

    it("renders warning status when rate exceeds warning threshold", () => {
      render(
        <EventRateMeter
          contractId="test-contract"
          currentRate={150}
          threshold={{ warning: 100, critical: 500 }}
        />
      );

      expect(screen.getByText("WARNING")).toBeInTheDocument();
    });

    it("renders critical status when rate exceeds critical threshold", () => {
      render(
        <EventRateMeter
          contractId="test-contract"
          currentRate={600}
          threshold={{ warning: 100, critical: 500 }}
        />
      );

      expect(screen.getByText("CRITICAL")).toBeInTheDocument();
    });

    it("shows disconnected status when not connected", () => {
      render(
        <EventRateMeter
          contractId="test-contract"
          currentRate={0}
          isConnected={false}
        />
      );

      expect(screen.getByText("DISCONNECTED")).toBeInTheDocument();
      expect(screen.getByText(/Attempting to reconnect/i)).toBeInTheDocument();
    });
  });

  describe("Real-time Updates", () => {
    it("updates display rate when currentRate prop changes", async () => {
      const { rerender } = render(
        <EventRateMeter
          contractId="test-contract"
          currentRate={10}
        />
      );

      // Initial rate should be displayed
      expect(screen.getByText(/10.0/)).toBeInTheDocument();

      // Update to new rate
      rerender(
        <EventRateMeter
          contractId="test-contract"
          currentRate={50}
        />
      );

      // Updated rate should be reflected
      await waitFor(() => {
        expect(screen.getByText(/50.0|49\./)).toBeInTheDocument();
      });
    });

    it("tracks peak rate across updates", async () => {
      const { rerender } = render(
        <EventRateMeter
          contractId="test-contract"
          currentRate={10}
        />
      );

      // Check initial peak
      expect(screen.getByText(/Peak Rate:/)).toBeInTheDocument();

      // Increase rate
      rerender(
        <EventRateMeter
          contractId="test-contract"
          currentRate={100}
        />
      );

      // Peak should be updated
      await waitFor(() => {
        const peakText = screen.getByText(/Peak Rate:/).parentElement?.textContent;
        expect(peakText).toContain("100");
      });

      // Decrease rate - peak should remain
      rerender(
        <EventRateMeter
          contractId="test-contract"
          currentRate={50}
        />
      );

      // Peak should still be 100
      await waitFor(() => {
        const peakText = screen.getByText(/Peak Rate:/).parentElement?.textContent;
        expect(peakText).toContain("100");
      });
    });
  });

  describe("Threshold Display", () => {
    it("displays custom threshold values", () => {
      render(
        <EventRateMeter
          contractId="test-contract"
          currentRate={0}
          threshold={{ warning: 50, critical: 200 }}
        />
      );

      expect(screen.getByText("50/s")).toBeInTheDocument();
      expect(screen.getByText("200/s")).toBeInTheDocument();
    });

    it("uses default thresholds when not provided", () => {
      render(
        <EventRateMeter
          contractId="test-contract"
          currentRate={0}
        />
      );

      // Default: warning=100, critical=500
      expect(screen.getByText("100/s")).toBeInTheDocument();
      expect(screen.getByText("500/s")).toBeInTheDocument();
    });
  });

  describe("Accessibility", () => {
    it("renders SVG gauge with proper structure", () => {
      const { container } = render(
        <EventRateMeter
          contractId="test-contract"
          currentRate={25}
        />
      );

      const svg = container.querySelector("svg");
      expect(svg).toBeInTheDocument();
      expect(svg).toHaveAttribute("width", "240");
      expect(svg).toHaveAttribute("height", "140");
    });

    it("displays rate in readable format", () => {
      render(
        <EventRateMeter
          contractId="test-contract"
          currentRate={123.456}
        />
      );

      expect(screen.getByText(/123.4/)).toBeInTheDocument();
    });
  });
});
