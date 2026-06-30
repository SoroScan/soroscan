import { render, screen } from "@testing-library/react";
import { RateLimitChart } from "../components/RateLimitChart";

describe("RateLimitChart", () => {
  it("renders chart title and quota line", () => {
    render(
      <RateLimitChart
        title="Hourly Hits"
        quotaLine={50}
        data={[
          { label: "H1", value: 10 },
          { label: "H2", value: 60 },
        ]}
      />,
    );

    expect(screen.getByText("[Hourly Hits]")).toBeInTheDocument();
    expect(screen.getByText("Quota: 50/hr")).toBeInTheDocument();
  });
});
