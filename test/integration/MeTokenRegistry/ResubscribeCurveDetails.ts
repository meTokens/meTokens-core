describe("MeToken Resubscribe - Same curve, new Curve Details", () => {
  before(async () => {});

  describe("Warmup", () => {
    it("mint(): meTokens received based on initial Curve details", async () => {});
    it("burn() [buyer]: assets received based on initial Curve details", async () => {});
    it("burn() [owner]: assets received based on initial Curve details", async () => {});
  });

  describe("Duration", () => {
    it("mint(): meTokens received based on weighted average curve details", async () => {});
    it("burn() [buyer]: assets received based on weighted average Curve details", async () => {});
    it("burn() [owner]: assets received based on weighted average Curve details", async () => {});
  });

  describe("Cooldown", () => {
    it("mint(): assets received based on target Curve details", async () => {});
    it("burn() [buyer]: assets received based on target Curve details", async () => {});
    it("burn() [owner]: assets received based on target Curve details", async () => {});
  });
});
