import { EventChart } from "../EventChart"
import { MetricsCard } from "../MetricsCard"
import { WebhookStats } from "../WebhookStats"
import { ErrorLog } from "../ErrorLog"

describe("Admin Components Module Exports", () => {
  it("exports all admin chart, metric, and log components", () => {
    expect(typeof EventChart).toBe("function")
    expect(typeof MetricsCard).toBe("function")
    expect(typeof WebhookStats).toBe("function")
    expect(typeof ErrorLog).toBe("function")
  })
})
